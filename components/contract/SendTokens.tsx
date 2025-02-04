import { useState } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { parseUnits } from "ethers/utils";
import { writeContract, estimateGas, waitForTransaction } from "@wagmi/core";
import erc20ABI from "@/abis/erc20ABI.json";
import { useAtom } from "jotai";
import { tokenAtom, addressAtom } from "@/store/atoms";

const SendTokens = () => {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [tokenAddress, setTokenAddress] = useAtom(tokenAtom);
  const [recipientAddress, setRecipientAddress] = useAtom(addressAtom);
  const [amount, setAmount] = useState("");

  const sendTokens = async () => {
    if (!walletClient || !address) return;
    
    try {
      const parsedAmount = parseUnits(amount, 18);
      const tx = await writeContract({
        address: tokenAddress,
        abi: erc20ABI,
        functionName: "transfer",
        args: [recipientAddress, parsedAmount],
      });

      const receipt = await waitForTransaction(tx.hash);
      console.log("Transaction successful:", receipt);
    } catch (error) {
      console.error("Transaction failed:", error);
    }
  };

  return (
    <div>
      <input
        type="text"
        placeholder="Token Address"
        value={tokenAddress}
        onChange={(e) => setTokenAddress(e.target.value)}
      />
      <input
        type="text"
        placeholder="Recipient Address"
        value={recipientAddress}
        onChange={(e) => setRecipientAddress(e.target.value)}
      />
      <input
        type="text"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <button onClick={sendTokens}>Send Tokens</button>
    </div>
  );
};

export default SendTokens;
