import React, { useState, ChangeEvent } from "react";
import { Input } from "antd";  // Si tu utilises Ant Design ou un composant similaire
import { ethers } from "ethers";
import { useAccount, useNetwork, useSigner } from "wagmi";

const SendTokens = () => {
  const [destinationAddress, setDestinationAddress] = useState("");
  const [amountToSend, setAmountToSend] = useState("");
  const [tokenAddress, setTokenAddress] = useState("");
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const { address } = useAccount();
  const { chain } = useNetwork();
  const { data: signer } = useSigner();

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setDestinationAddress(e.target.value);
  };

  const handleAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    setAmountToSend(e.target.value);
  };

  const handleTokenChange = (e: ChangeEvent<HTMLInputElement>) => {
    setTokenAddress(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!signer || !destinationAddress || !amountToSend || !tokenAddress) {
      setTxStatus("Please fill in all fields.");
      return;
    }

    try {
      const tokenContract = new ethers.Contract(
        tokenAddress,
        [
          "function transfer(address to, uint256 amount) public returns (bool)",
        ],
        signer
      );

      const amount = ethers.utils.parseUnits(amountToSend, 18); // Ajuster selon la décimale du token

      const tx = await tokenContract.transfer(destinationAddress, amount);
      setTxStatus(`Transaction sent! Hash: ${tx.hash}`);
      await tx.wait();
      setTxStatus(`Transaction confirmed! Hash: ${tx.hash}`);
    } catch (error) {
      console.error(error);
      setTxStatus("Transaction failed.");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>Destination Address:</label>
      <Input
        required
        value={destinationAddress}
        placeholder="vitalik.eth"
        onChange={handleChange}
        type="text"
        style={{ width: "100%" }}
        crossOrigin="anonymous"  // Ajout de crossOrigin si nécessaire
      />
      <br />
      <label>Amount to Send:</label>
      <Input
        required
        value={amountToSend}
        placeholder="Amount"
        onChange={handleAmountChange}
        type="number"
        style={{ width: "100%" }}
      />
      <br />
      <label>Token Address:</label>
      <Input
        required
        value={tokenAddress}
        placeholder="0x..."
        onChange={handleTokenChange}
        type="text"
        style={{ width: "100%" }}
      />
      <br />
      <button type="submit">Send Tokens</button>
      {txStatus && <p>{txStatus}</p>}
    </form>
  );
};

export default SendTokens;
