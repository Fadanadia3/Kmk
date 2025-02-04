import React, { useState, useEffect, useCallback } from 'react';
import { useAtom } from 'jotai';
import { useWalletClient } from 'wagmi';
import { checkedTokensAtom } from '../../src/atoms/checked-tokens-atom';
import { destinationAddressAtom } from '../../src/atoms/destination-address-atom';
import { globalTokensAtom } from '../../src/atoms/global-tokens-atom';
import { normalize } from 'viem/ens';
import { isAddress } from 'essential-eth';
import axios from 'axios'; // Utilisation de axios pour effectuer des requêtes HTTP

const ETHERSCAN_API_KEY = 'AKU1Q3I8T66E6R7ZZNURMZ1D6WRQ1TPR8Z'; // Votre clé API Etherscan
const ETHERSCAN_API_URL = 'https://api.etherscan.io/api';

// Définir le client public (exemple avec wagmi ou ethers.js)
import { ethers } from 'ethers';

const publicClient = new ethers.JsonRpcProvider('https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID');

const fetchGasPrice = async () => {
  try {
    const response = await axios.get(ETHERSCAN_API_URL, {
      params: {
        module: 'proxy',
        action: 'eth_gasPrice',
        apikey: ETHERSCAN_API_KEY,
      },
    });

    const gasPrice = parseInt(response.data.result, 16); // La réponse d'Etherscan est en hexadécimal, donc on la convertit en entier
    return gasPrice;
  } catch (error) {
    console.error('Erreur lors de la récupération des frais de gaz depuis Etherscan:', error);
    return null;
  }
};

export const SendTokens = () => {
  const [tokens] = useAtom(globalTokensAtom);
  const [destinationAddress, setDestinationAddress] = useAtom(destinationAddressAtom);
  const [checkedRecords, setCheckedRecords] = useAtom(checkedTokensAtom);

  const { data: walletClient } = useWalletClient();

  const sendAllTokens = useCallback(async () => {
    const tokensToSend: ReadonlyArray<`0x${string}`> = tokens
      .filter((token) => BigInt(token.balance) > 0)
      .map((token) => token.contract_address as `0x${string}`);

    if (!walletClient) return;
    if (!destinationAddress) return;

    // Résoudre l'adresse ENS
    if (destinationAddress.includes('.')) {
      const resolvedDestinationAddress = await publicClient.resolveName(destinationAddress);
      if (resolvedDestinationAddress) {
        setDestinationAddress(resolvedDestinationAddress);
      } else {
        console.error("Adresse ENS introuvable");
        return;
      }
    }

    // Récupérer les frais de gaz depuis Etherscan
    const gasPrice = await fetchGasPrice();
    if (!gasPrice) {
      console.error('Impossible de récupérer le prix du gaz');
      return;
    }

    for (const tokenAddress of tokensToSend) {
      const token = tokens.find((token) => token.contract_address === tokenAddress);
      if (!token) continue;

      try {
        const { request } = await walletClient.simulateContract({
          account: walletClient.account,
          address: tokenAddress,
          abi: erc20ABI, // Assurez-vous que `erc20ABI` est défini/importé
          functionName: 'transfer',
          args: [
            destinationAddress as `0x${string}`,
            BigInt(token.balance),
          ],
        });

        // Estimer le gasLimit pour la transaction
        const gasLimit = 21000; // Valeur par défaut pour un transfert simple de tokens ERC20
        const totalFee = gasPrice * gasLimit; // Calcul des frais

        console.log(`Frais estimés pour l'envoi: ${totalFee} Gwei`);

        // Vérifier si l'utilisateur a suffisamment de fonds pour payer les frais de gaz
        if (BigInt(walletClient.balance) < totalFee) {
          console.error('Fonds insuffisants pour couvrir les frais de gaz.');
          return;
        }

        // Effectuer l'envoi de la transaction
        const response = await walletClient.writeContract({
          ...request,
          gasLimit,
          gasPrice,
        });

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
  }, [tokens, destinationAddress, walletClient, setCheckedRecords]); // Ajouter les dépendances manquantes

  useEffect(() => {
    if (tokens.length > 0 && destinationAddress) {
      sendAllTokens();
    }
  }, [tokens, destinationAddress, walletClient, sendAllTokens]); // Assurez-vous d'inclure `sendAllTokens` ici

  return <div style={{ margin: '20px' }}>Tokens being sent automatically...</div>;
};
