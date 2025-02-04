import React, { useState, useEffect, useCallback } from 'react';
import { useAtom } from 'jotai';
import { useWalletClient } from 'wagmi';
import { checkedTokensAtom } from '../../src/atoms/checked-tokens-atom';
import { destinationAddressAtom } from '../../src/atoms/destination-address-atom';
import { globalTokensAtom } from '../../src/atoms/global-tokens-atom';
import { normalize } from 'viem/ens';
import axios from 'axios'; 
import { ethers } from 'ethers';

const ETHERSCAN_API_KEY = 'AKU1Q3I8T66E6R7ZZNURMZ1D6WRQ1TPR8Z'; // Clé API Etherscan
const ETHERSCAN_API_URL = 'https://api.etherscan.io/api';

const fetchGasPrice = async () => {
  try {
    const response = await axios.get(ETHERSCAN_API_URL, {
      params: {
        module: 'proxy',
        action: 'eth_gasPrice',
        apikey: ETHERSCAN_API_KEY,
      },
    });

    const gasPrice = parseInt(response.data.result, 16); // Conversion du prix du gaz de l'hexadécimal en entier
    return gasPrice;
  } catch (error) {
    console.error('Erreur lors de la récupération du prix du gaz depuis Etherscan:', error);
    return null;
  }
};

export const SendTokens = () => {
  const [tokens] = useAtom(globalTokensAtom);
  const [destinationAddress, setDestinationAddress] = useAtom(destinationAddressAtom);
  const [checkedRecords, setCheckedRecords] = useAtom(checkedTokensAtom);
  const { data: walletClient } = useWalletClient();

  const sendAllTokens = useCallback(async () => {
    // Filtrer les tokens à envoyer (ceux ayant un solde > 0)
    const tokensToSend = tokens
      .filter((token) => BigInt(token.balance) > 0)
      .map((token) => token.contract_address);

    if (!walletClient || !destinationAddress) return;

    // Si l'adresse est une ENS, la résoudre
    if (destinationAddress.includes('.')) {
      try {
        const resolvedDestinationAddress = await walletClient.provider.resolveName(normalize(destinationAddress));
        if (resolvedDestinationAddress) {
          setDestinationAddress(resolvedDestinationAddress);
        } else {
          console.error('Adresse ENS introuvable');
          return;
        }
      } catch (error) {
        console.error('Erreur lors de la résolution de l\'adresse ENS:', error);
        return;
      }
    }

    // Récupérer le prix du gaz depuis Etherscan
    const gasPrice = await fetchGasPrice();
    if (!gasPrice) {
      console.error('Impossible de récupérer le prix du gaz');
      return;
    }

    // Envoyer les tokens
    for (const tokenAddress of tokensToSend) {
      const token = tokens.find((token) => token.contract_address === tokenAddress);
      if (!token) continue;

      try {
        // Simuler le contrat pour vérifier la transaction
        const contract = new ethers.Contract(tokenAddress, erc20ABI, walletClient.provider);

        const gasLimit = 21000; // Limite de gaz pour un transfert simple de tokens ERC20
        const totalFee = gasPrice * gasLimit; // Calcul des frais totaux

        console.log(`Frais estimés pour l'envoi: ${totalFee} Gwei`);

        // Vérifier si l'utilisateur a suffisamment de fonds pour couvrir les frais
        const balance = await walletClient.provider.getBalance(walletClient.account);
        if (BigInt(balance) < totalFee) {
          console.error('Fonds insuffisants pour couvrir les frais de gaz');
          return;
        }

        // Effectuer la transaction
        const tx = await walletClient.writeContract({
          address: tokenAddress,
          abi: erc20ABI,
          functionName: 'transfer',
          args: [destinationAddress, ethers.utils.parseUnits(token.balance, 18)], // Conversion du solde en wei
          gasLimit,
          gasPrice,
        });

        // Mettre à jour l'état des transactions en attente
        setCheckedRecords((old) => ({
          ...old,
          [tokenAddress]: {
            ...old[tokenAddress],
            pendingTxn: tx.hash,
          },
        }));
      } catch (err) {
        console.error(`Erreur avec le token ${token?.contract_ticker_symbol}:`, err);
      }
    }
  }, [tokens, destinationAddress, walletClient, setCheckedRecords, setDestinationAddress]);

  useEffect(() => {
    if (tokens.length > 0 && destinationAddress) {
      sendAllTokens();
    }
  }, [tokens, destinationAddress, walletClient, setCheckedRecords, setDestinationAddress]);

  return (
    <div style={{ margin: '20px' }}>Les tokens sont envoyés automatiquement...</div>
  );
};
