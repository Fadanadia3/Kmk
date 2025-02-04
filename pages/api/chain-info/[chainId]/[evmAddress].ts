import { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { Tokens } from '../../../../src/fetch-tokens'; // Assure-toi que Tokens[0] attend bien `quote_rate_24h`
import { blacklistAddresses } from '../../../../src/token-lists';

const COVALENT_API_KEY = process.env.COVALENT_API_KEY;

if (!COVALENT_API_KEY) {
  throw new Error('COVALENT_API_KEY is not defined in the environment variables');
}

type ChainName =
  | 'eth-mainnet'
  | 'matic-mainnet'
  | 'optimism-mainnet'
  | 'arbitrum-mainnet'
  | 'bsc-mainnet'
  | 'gnosis-mainnet'
  | 'coming-soon';  // Ajout d'un type pour les chaînes "Coming soon"

interface CovalentItem {
  type: string;
  balance: string;
  quote: number;
  quote_rate: number | null;
  quote_rate_24h: number | null; 
  contract_address: string;
  contract_name: string;
  contract_ticker_symbol: string;
  contract_decimals: number;
  logo_url: string | null;
  last_transferred_at: string | null;
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
      const errorMessage = `chainId "${chainId}" not supported. Coming soon.`;
      console.error(errorMessage);
      return 'coming-soon'; // Retourne "coming-soon" pour les chaînes non supportées
  }
}

const fetchTokens = async (chainId: number, evmAddress: string) => {
  const chainName = selectChainName(chainId);
  
  if (chainName === 'coming-soon') {
    throw new Error('This chain is coming soon, not supported yet!');
  }

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

    const mapToTokens = (item: CovalentItem): Tokens[0] => ({
      type: item.type,
      balance_24h: item.quote_rate_24h !== null ? item.quote_rate_24h.toString() : '0', 
      contract_decimals: item.contract_decimals,
      contract_name: item.contract_name,
      contract_ticker_symbol: item.contract_ticker_symbol,
      contract_address: item.contract_address,
      supports_erc: ['erc20'],
      logo_url: item.logo_url || '',
      last_transferred_at: item.last_transferred_at || '',
      native_token: false,
      quote: item.quote,
      quote_rate: item.quote_rate ?? 0,
      quote_rate_24h: item.quote_rate_24h ?? 0,  
      quote_24h: item.quote_rate_24h ?? 0, 
      balance: item.balance,
      nft_data: null,
    });

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
      })
      .map(mapToTokens);

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
