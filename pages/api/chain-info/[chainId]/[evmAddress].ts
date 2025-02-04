import { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { Tokens } from '../../../../src/fetch-tokens';
import { blacklistAddresses } from '../../../../src/token-lists';

const COVALENT_API_KEY = z.string().parse(process.env.COVALENT_API_KEY);

type ChainName =
  | 'eth-mainnet'
  | 'matic-mainnet'
  | 'optimism-mainnet'
  | 'arbitrum-mainnet'
  | 'bsc-mainnet'
  | 'gnosis-mainnet';

interface CovalentItem {
  type: string;
  balance: string;
  quote: number;
  quote_rate: number | null;
  quote_rate_24h: number | null;
}

interface APIResponse {
  data: {
    items: CovalentItem[];
  };
}

function selectChainName(chainId: number): ChainName {
  switch (chainId) {
    case 1:
      return 'eth-mainnet';
    case 10:
      return 'optimism-mainnet';
    case 56:
      return 'bsc-mainnet';
    case 100:
      return 'gnosis-mainnet';
    case 137:
      return 'matic-mainnet';
    case 42161:
      return 'arbitrum-mainnet';
    default:
      const errorMessage = `chainId "${chainId}" not supported`;
      console.error(errorMessage);
      throw new Error(errorMessage);
  }
}

const fetchTokens = async (chainId: number, evmAddress: string) => {
  const chainName = selectChainName(chainId);
  try {
    const response = await fetch(
      `https://api.covalenthq.com/v1/${chainName}/address/${evmAddress}/balances_v2/?quote-currency=USD&format=JSON&nft=false&no-nft-fetch=false&key=${COVALENT_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data: APIResponse = await response.json();

    const allRelevantItems = data.data.items.filter(
      (item) => item.type !== 'dust'
    );

    const erc20s = allRelevantItems
      .filter(
        (item) =>
          item.type === 'cryptocurrency' || item.type === 'stablecoin'
      )
      .filter((item) => !blacklistAddresses.includes(item.contract_address))
      .filter((item) => {
        const hasQuotes = ![
          item.quote_rate,
          item.quote_rate_24h,
        ].includes(null);

        return BigInt(item.balance) !== BigInt(0) && hasQuotes && item.quote > 1;
      }) as Tokens;

    const nfts = allRelevantItems.filter(
      (item) => item.type === 'nft'
    );

    return { erc20s, nfts };
  } catch (error) {
    console.error('Error fetching tokens:', error);
    throw new Error('Failed to fetch tokens');
  }
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { chainId, evmAddress } = req.query;

    if (!chainId || !evmAddress) {
      return res.status(400).json({ error: 'Missing parameters' });
    }

    const tokens = await fetchTokens(Number(chainId), evmAddress as string);

    res.status(200).json(tokens);
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
