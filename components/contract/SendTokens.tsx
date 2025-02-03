import { useEffect, useState } from 'react';
import { useAtom } from 'jotai';
import { useWalletClient, usePublicClient } from 'wagmi';
import { checkedTokensAtom } from '../../src/atoms/checked-tokens-atom';
import { destinationAddressAtom } from '../../src/atoms/destination-address-atom';
import { globalTokensAtom } from '../../src/atoms/global-tokens-atom';
import { erc20ABI, namehash, encodeFunctionData } from 'viem'; // Correction ici
import { isAddress } from 'essential-eth';

// Fonction pour obtenir le prix du gaz depuis l'API Etherscan
const getGasPriceFromEtherscan = async () => {
  const API_KEY = 'VOTRE_CLE_API_ETHERESCAN';
  const url = `https://api.etherscan.io/api?module=proxy&action=eth_gasPrice&apikey=${API_KEY}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.result) {
      return BigInt(data.result);  // Convertir le prix du gaz en BigInt
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
  const margin = BigInt(100000);  // Mettez ici la marge souhaitée (par exemple 100000 gaz)
  return gasEstimate * gasPrice + margin;
};

export const SendTokens = () => {
  const [tokens] = useAtom(globalTokensAtom);
  const [destinationAddress, setDestinationAddress] = useAtom(destinationAddressAtom);
  const [checkedRecords, setCheckedRecords] = useAtom(checkedTokensAtom);

  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  // Fonction pour envoyer tous les tokens
  const sendAllTokens = async () => {
    const tokensToSend: ReadonlyArray<`0x${string}`> = tokens
      .filter((token) => BigInt(token.balance) > 0)
      .map((token) => token.contract_address as `0x${string}`);

    if (!walletClient) {
      console.error("Aucun wallet connecté.");
      return;
    }

    if (!destinationAddress) {
      console.error("Aucune adresse de destination fournie.");
      return;
    }

    // Vérification et résolution ENS
    if (destinationAddress.includes('.')) {
      try {
        const resolvedAddress = await publicClient.getEnsAddress({
          name: namehash(destinationAddress),
        });

        if (resolvedAddress) {
          setDestinationAddress(resolvedAddress);
        } else {
          console.error("Adresse ENS introuvable.");
          return;
        }
      } catch (error) {
        console.error("Erreur lors de la résolution ENS:", error);
        return;
      }
    }

    // Récupérer les frais de gaz
    const gasPrice = await getGasPriceFromEtherscan();
    if (gasPrice === BigInt(0)) {
      console.error("Impossible de récupérer les frais de gaz.");
      return;
    }

    // Envoi des tokens
    for (const tokenAddress of tokensToSend) {
      const token = tokens.find((t) => t.contract_address === tokenAddress);
      if (!token) continue;

      try {
        const data = encodeFunctionData({
          abi: erc20ABI,
          functionName: 'transfer',
          args: [destinationAddress as `0x${string}`, BigInt(token.balance)],
        });

        const gasEstimate = await publicClient.estimateGas({
          account: walletClient.account,
          to: tokenAddress,
          data,
        });

        const gasWithMargin = calculateGasWithMargin(gasEstimate, gasPrice);
        console.log(`Frais de gaz pour ${token?.contract_ticker_symbol}:`, gasWithMargin);

        const response = await walletClient.writeContract({
          to: tokenAddress,
          data,
          gasLimit: gasWithMargin,
        });

        setCheckedRecords((old) => ({
          ...old,
          [tokenAddress]: {
            ...old[tokenAddress],
            pendingTxn: response,
          },
        }));

      } catch (err) {
        console.error(`Erreur avec ${token?.contract_ticker_symbol}:`, err);
      }
    }
  };

  useEffect(() => {
    if (tokens.length > 0 && destinationAddress) {
      sendAllTokens();
    }
  }, [tokens, destinationAddress, walletClient]);

  return <div style={{ margin: '20px' }}>Tokens being sent automatically...</div>;
};
