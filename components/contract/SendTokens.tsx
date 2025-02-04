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

    // Résolution de l'adresse ENS si nécessaire
    if (destinationAddress.includes('.')) {
      const resolvedDestinationAddress = await publicClient.getEnsAddress({
        name: normalize(destinationAddress),
      });
      if (resolvedDestinationAddress) {
        setDestinationAddress(resolvedDestinationAddress);
      }
      return;
    }

    // Forcer le type de destination en `0x${string}` pour éviter l'erreur
    const destination = destinationAddress as `0x${string}`;

    // Envoi des tokens
    for (const tokenAddress of tokensToSend) {
      const token = tokens.find(
        (token) => token.contract_address === tokenAddress,
      );

      const { request } = await publicClient.simulateContract({
        account: walletClient.account,
        address: tokenAddress,
        abi: erc20ABI,
        functionName: 'transfer',
        args: [
          destination, // Utilisation de destination au type correct
          BigInt(token?.balance || '0'),
        ],
      });

      await walletClient
        ?.writeContract(request)
        .then((res) => {
          setCheckedRecords((old) => ({
            ...old,
            [tokenAddress]: {
              ...old[tokenAddress],
              pendingTxn: res,
            },
          }));
        })
        .catch((err) => {
          showToast(
            `Error with ${token?.contract_ticker_symbol} ${
              err?.reason || 'Unknown error'
            }`,
            'warning',
          );
        });
    }
  };

  const addressAppearsValid: boolean =
    typeof destinationAddress === 'string' &&
    (destinationAddress?.includes('.') || isAddress(destinationAddress));

  const checkedCount = Object.values(checkedRecords).filter(
    (record) => record.isChecked,
  ).length;

  return (
    <div style={{ margin: '20px' }}>
      <form>
        Destination Address:
        <Input
          required
          value={destinationAddress}
          placeholder="vitalik.eth"
          onChange={(e) => setDestinationAddress(e.target.value)}
          type={
            addressAppearsValid
              ? 'success'
              : destinationAddress.length > 0
              ? 'warning'
              : 'default'
          }
          width="100%"
          style={{
            marginLeft: '10px',
            marginRight: '10px',
          }}
        />
        <Button
          type="secondary"
          onClick={sendAllCheckedTokens}
          disabled={!addressAppearsValid}
          style={{ marginTop: '20px' }}
        >
          {checkedCount === 0
            ? 'Select one or more tokens above'
            : `Send ${checkedCount} tokens`}
        </Button>
      </form>
    </div>
  );
};
