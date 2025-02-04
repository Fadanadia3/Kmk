import { useState } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { parseUnits } from "ethers";
import { writeContract, estimateGas, waitForTransaction } from "@wagmi/core";
import erc20ABI from "@/abis/erc20ABI.json";
import { useAtom } from "jotai";
import { tokenAtom, addressAtom } from "@/atoms/transferAtoms";
import { formatUnits } from "viem";

const SendTokens = () => {
  const { data: walletClient } = useWalletClient();
  const { address: userAddress } = useAccount();
  const [tokenAddress] = useAtom(tokenAtom);
  const [recipient] = useAtom(addressAtom);
  const [amount, setAmount] = useState<string>("");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!walletClient || !userAddress || !tokenAddress || !recipient || !amount) {
      setError("Tous les champs doivent être remplis.");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Vérifier et normaliser l'adresse du token et du destinataire
      const normalizedTokenAddress = tokenAddress.startsWith("0x") ? tokenAddress : `0x${tokenAddress}`;
      const normalizedRecipient = recipient.startsWith("0x") ? recipient : `0x${recipient}`;

      // Conversion de l'amount
      const amountInWei = parseUnits(amount, 18);

      // Construire les données de transaction
      const formattedData = `0x${new TextEncoder().encode(amount).toString()}` as `0x${string}`;

      // Estimer le gas
      const gasEstimate = await estimateGas({
        account: userAddress,
        to: normalizedTokenAddress,
        data: formattedData,
      });

      // Récupérer le prix du gas
      const gasPrice = await walletClient.getGasPrice();

      // Envoi de la transaction
      const tx = await writeContract({
        address: normalizedTokenAddress,
        abi: erc20ABI,
        functionName: "transfer",
        args: [normalizedRecipient, amountInWei],
      });

      // Attente de la confirmation de la transaction
      await waitForTransaction({ hash: tx.hash });

      setTxHash(tx.hash);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Une erreur est survenue lors de la transaction.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h2>Envoyer des Tokens</h2>
      <input
        type="text"
        placeholder="Montant"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <button onClick={handleSend} disabled={isLoading}>
        {isLoading ? "Envoi en cours..." : "Envoyer"}
      </button>
      {txHash && <p>Transaction envoyée: {txHash}</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
};

export default SendTokens;
