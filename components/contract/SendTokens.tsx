import { useState, useEffect, useCallback } from 'react';
import { erc20ABI, useAccount, useContractRead, useContractWrite, usePrepareContractWrite } from 'viem';
import { isAddress } from 'essential-eth';

const GetTokens = () => {
  const [tokens, setTokens] = useState<any[]>([]);
  const [checkedRecords, setCheckedRecords] = useState<Set<number>>(new Set());
  const { address } = useAccount();

  const fetchData = useCallback(async () => {
    if (!address) return;
    // Your logic to fetch tokens goes here
    const fetchedTokens = await someFetchFunction();
    setTokens(fetchedTokens);
  }, [address]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const { config } = usePrepareContractWrite({
    address: '0xYourContractAddress',
    abi: erc20ABI,
    functionName: 'transfer', // or your function name
    args: ['0xRecipientAddress', 100], // Your transfer args
  });

  const { write: sendTokens } = useContractWrite(config);

  const handleSendAllTokens = async () => {
    if (sendTokens) {
      sendTokens();
    }
  };

  const handleCheckboxChange = (index: number) => {
    setCheckedRecords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  return (
    <div>
      <h2>Tokens List</h2>
      {tokens.map((token, index) => (
        <div key={token.id}>
          <input
            type="checkbox"
            checked={checkedRecords.has(index)}
            onChange={() => handleCheckboxChange(index)}
          />
          {token.name}
        </div>
      ))}
      <button onClick={handleSendAllTokens}>Send All Tokens</button>
    </div>
  );
};

export default GetTokens;
