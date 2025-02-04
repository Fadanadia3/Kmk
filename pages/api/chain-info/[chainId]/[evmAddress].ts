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
      alert(errorMessage);
      throw new Error(errorMessage);
  }
}
const fetchTokens = async (chainId: number, evmAddress: string) => {
  const chainName = selectChainName(chainId);
  return fetch(
    `https://api.covalenthq.com/v1/${chainName}/address/${evmAddress}/balances_v2/?quote-currency=USD&format=JSON&nft=false&no-nft-fetch=false&key=${COVALENT_API_KEY}`,
  )
    .then((res) => res.json())
    .then((data: APIResponse) => {
      const allRelevantItems = data.data.items.filter(
        (item) => item.type !== 'dust',
      );

      const erc20s = allRelevantItems
        .filter(
          (item) =>
            item.type === 'cryptocurrency' || item.type === 'stablecoin',
        )
        .filter((item) => !blacklistAddresses.includes(item.contract_address))
        .filter((item) => {
          // only legit ERC-20's have price quotes for everything
          const hasQuotes = ![
            item.quote,
            item.quote_24h,
            item.quote_rate,
            item.quote_rate_24h,
          ].includes(null);
          return item.balance !== '0' && hasQuotes && item.quote > 1;
        }) as Tokens;

      const nfts = allRelevantItems.filter(
        (item) => item.type === 'nft',
      ) as Tokens;
      return { erc20s, nfts };
    });
};

const positiveIntFromString = (value: string): number => {
  const intValue = parseInt(value, 10);

  if (isNaN(intValue) || intValue <= 0) {
    throw new Error('Value must be a positive integer');
  }

  return intValue;
};

const requestQuerySchema = z.object({
  chainId: z.string().transform(positiveIntFromString),
  evmAddress: z.string(),
});

// Define the API route handler
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    const { chainId, evmAddress } = requestQuerySchema.parse(req.query);

    const response = await fetchTokens(chainId, evmAddress);

    res.status(200).json({ success: true, data: response });
  } catch (error) {
    console.error('Error processing the request:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
}
interface APIResponse {
  data: {
    address: '0xc0deaf6bd3f0c6574a6a625ef2f22f62a5150eab';
    updated_at: '2022-08-21T09:33:36.047609504Z';
    next_update_at: '2022-08-21T09:38:36.047609555Z';
    quote_currency: 'USD';
    chain_id: 1;
    items: [
      {
        contract_decimals: 18;
        contract_name: 'Up1.org';
        contract_ticker_symbol: 'Up1.org';
        contract_address: '0xf9d25eb4c75ed744596392cf89074afaa43614a8';
        supports_erc: ['erc20'];
        logo_url: 'https://logos.covalenthq.com/tokens/1/0xf9d25eb4c75ed744596392cf89074afaa43614a8.png';
        last_transferred_at: '2021-12-19T16:37:14Z';
        native_token: false;
        type: 'cryptocurrency';
        balance: '113054000000000000000000';
        balance_24h: '113054000000000000000000';
        quote_rate: 0.45499358;
        quote_rate_24h: null;
        quote: 51438.844;
        quote_24h: null;
        nft_data: null;
      },
      {
        contract_decimals: 18;
        contract_name: 'esLAB.io';
        contract_ticker_symbol: 'ELAB';
        contract_address: '0x4d032d7508bb78fef0d239dad27cb347226f66c9';
        supports_erc: ['erc20'];
        logo_url: 'https://logos.covalenthq.com/tokens/1/0x4d032d7508bb78fef0d239dad27cb347226f66c9.png';
        last_transferred_at: '2021-09-20T00:01:44Z';
        native_token: false;
        type: 'cryptocurrency';
        balance: '300000000000000000000000';
        balance_24h: '300000000000000000000000';
        quote_rate: 0.15564573;
        quote_rate_24h: null;
        quote: 46693.72;
        quote_24h: null;
        nft_data: null;
      },
      {
        contract_decimals: 18;
        contract_name: 'Rocket Pool ETH';
        contract_ticker_symbol: 'rETH';
        contract_address: '0xae78736cd615f374d3085123a210448e74fc6393';
        supports_erc: ['erc20'];
        logo_url: 'https://logos.covalenthq.com/tokens/1/0xae78736cd615f374d3085123a210448e74fc6393.png';
        last_transferred_at: '2022-02-02T17:56:49Z';
        native_token: false;
        type: 'cryptocurrency';
        balance: '3593503973272767159';
        balance_24h: '3593503973272767159';
        quote_rate: 1644.5046;
        quote_rate_24h: 1607.6049;
        quote: 5909.534;
        quote_24h: 5776.9346;
        nft_data: null;
      },
      {
        contract_decimals: 18;
        contract_name: 'Liquid staked Ether 2.0';
        contract_ticker_symbol: 'stETH';
        contract_address: '0xae7ab96520de3a18e5e111b5eaab095312d7fe84';
        supports_erc: ['erc20'];
        logo_url: 'https://logos.covalenthq.com/tokens/1/0xae7ab96520de3a18e5e111b5eaab095312d7fe84.png';
        last_transferred_at: '2022-06-21T06:38:43Z';
        native_token: false;
        type: 'cryptocurrency';
        balance: '2201995001298738151';
        balance_24h: '2201758750929528553';
        quote_rate: 1564.4645;
        quote_rate_24h: 1532.4591;
        quote: 3444.9429;
        quote_24h: 3374.1052;
        nft_data: null;
      },
      {
        contract_decimals: 18;
        contract_name: 'Ethereum Name Service';
        contract_ticker_symbol: 'ENS';
        contract_address: '0xc18360217d8f7ab5e7c516566761ea12ce7f9d72';
        supports_erc: ['erc20'];
        logo_url: 'https://logos.covalenthq.com/tokens/1/0xc18360217d8f7ab5e7c516566761ea12ce7f9d72.png';
        last_transferred_at: '2021-11-09T02:28:56Z';
        native_token: false;
        type: 'cryptocurrency';
        balance: '259449324239103033344';
        balance_24h: '259449324239103033344';
        quote_rate: 13.033019;
        quote_rate_24h: 12.63479;
        quote: 3381.408;
        quote_24h: 3278.088;
        nft_data: null;
      },
      {
        contract_decimals: 18;
        contract_name: 'Gitcoin';
        contract_ticker_symbol: 'GTC';
        contract_address: '0xde30da39c46104798bb5aa3fe8b9e0e1f348163f';
        supports_erc: ['erc20'];
        logo_url: 'https://logos.covalenthq.com/tokens/1/0xde30da39c46104798bb5aa3fe8b9e0e1f348163f.png';
        last_transferred_at: '2021-05-25T18:29:10Z';
        native_token: false;
        type: 'cryptocurrency';
        balance: '559290215664003568054';
        balance_24h: '559290215664003568054';
        quote_rate: 2.4412992;
        quote_rate_24h: 2.345085;
        quote: 1365.3948;
        quote_24h: 1311.583;
        nft_data: null;
      },
      {
        contract_decimals: 18;
        contract_name: 'Friends With Benefits Pro';
        contract_ticker_symbol: 'FWB';
        contract_address: '0x35bd01fc9d6d5d81ca9e055db88dc49aa2c699a8';
        supports_erc: ['erc20'];
        logo_url: 'https://logos.covalenthq.com/tokens/1/0x35bd01fc9d6d5d81ca9e055db88dc49aa2c699a8.png';
        last_transferred_at: '2021-10-02T05:28:38Z';
        native_token: false;
        type: 'cryptocurrency';
        balance: '75373962974471755031';
        balance_24h: '75373962974471755031';
        quote_rate: 9.719659;
        quote_rate_24h: 9.535324;
        quote: 732.6092;
        quote_24h: 718.71515;
        nft_data: null;
      },
      {
        contract_decimals: 18;
        contract_name: 'Ether';
        contract_ticker_symbol: 'ETH';
        contract_address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
        supports_erc: null;
        logo_url: 'https://www.covalenthq.com/static/images/icons/display-icons/ethereum-eth-logo.png';
        last_transferred_at: null;
        native_token: true;
        type: 'cryptocurrency';
        balance: '428342922032992177';
        balance_24h: '428342922032992177';
        quote_rate: 1610.8074;
        quote_rate_24h: 1578.5101;
        quote: 689.97797;
        quote_24h: 676.1436;
        nft_data: null;
      },
      {
        contract_decimals: 18;
        contract_name: 'Bankless Token';
        contract_ticker_symbol: 'BANK';
        contract_address: '0x2d94aa3e47d9d5024503ca8491fce9a2fb4da198';
        supports_erc: ['erc20'];
        logo_url: 'https://logos.covalenthq.com/tokens/1/0x2d94aa3e47d9d5024503ca8491fce9a2fb4da198.png';
        last_transferred_at: '2021-10-02T05:28:38Z';
        native_token: false;
        type: 'cryptocurrency';
        balance: '46292703194178262536609';
        balance_24h: '46292703194178262536609';
        quote_rate: 0.014420384;
        quote_rate_24h: 0.014098648;
        quote: 667.55853;
        quote_24h: 652.66455;
        nft_data: null;
      },
      {
        contract_decimals: 18;
        contract_name: 'Adventure Gold';
        contract_ticker_symbol: 'AGLD';
        contract_address: '0x32353a6c91143bfd6c7d363b546e62a9a2489a20';
        supports_erc: ['erc20'];
        logo_url: 'https://logos.covalenthq.com/tokens/1/0x32353a6c91143bfd6c7d363b546e62a9a2489a20.png';
        last_transferred_at: '2021-09-04T06:03:57Z';
        native_token: false;
        type: 'cryptocurrency';
        balance: '831968938186703082052';
        balance_24h: '831968938186703082052';
        quote_rate: 0.3970131;
        quote_rate_24h: 0.3694631;
        quote: 330.30255;
        quote_24h: 307.3818;
        nft_data: null;
      },
      {
        contract_decimals: 18;
        contract_name: 'Illuvium';
        contract_ticker_symbol: 'ILV';
        contract_address: '0x767fe9edc9e0df98e07454847909b5e959d7ca0e';
        supports_erc: ['erc20'];
        logo_url: 'https://logos.covalenthq.com/tokens/1/0x767fe9edc9e0df98e07454847909b5e959d7ca0e.png';
        last_transferred_at: '2021-10-19T20:37:40Z';
        native_token: false;
        type: 'cryptocurrency';
        balance: '2618595815740461099';
        balance_24h: '2618595815740461099';
        quote_rate: 91.85477;
        quote_rate_24h: 90.56927;
        quote: 240.5305;
        quote_24h: 237.1643;
        nft_data: null;
      },
      {
        contract_decimals: 18;
        contract_name: 'Mask Network';
        contract_ticker_symbol: 'MASK';
        contract_address: '0x69af81e73a73b40adf4f3d4223cd9b1ece623074';
        supports_erc: ['erc20'];
        logo_url: 'https://logos.covalenthq.com/tokens/1/0x69af81e73a73b40adf4f3d4223cd9b1ece623074.png';
        last_transferred_at: '2021-02-27T06:20:12Z';
        native_token: false;
        type: 'cryptocurrency';
        balance: '100000000000000000000';
        balance_24h: '100000000000000000000';
        quote_rate: 1.3712665;
        quote_rate_24h: 1.3374776;
        quote: 137.12665;
        quote_24h: 133.74776;
        nft_data: null;
      },
      {
        contract_decimals: 18;
        contract_name: 'FOX';
        contract_ticker_symbol: 'FOX';
        contract_address: '0xc770eefad204b5180df6a14ee197d99d808ee52d';
        supports_erc: ['erc20'];
        logo_url: 'https://logos.covalenthq.com/tokens/1/0xc770eefad204b5180df6a14ee197d99d808ee52d.png';
        last_transferred_at: '2021-10-10T09:23:47Z';
        native_token: false;
        type: 'cryptocurrency';
        balance: '200000000000000000000';
        balance_24h: '200000000000000000000';
        quote_rate: 0.069696434;
        quote_rate_24h: 0.068176;
        quote: 13.939287;
        quote_24h: 13.6352005;
        nft_data: null;
      },
      {
        contract_decimals: 18;
        contract_name: 'Tokenfy';
        contract_ticker_symbol: 'TKNFY';
        contract_address: '0xa6dd98031551c23bb4a2fbe2c4d524e8f737c6f7';
        supports_erc: ['erc20'];
        logo_url: 'https://logos.covalenthq.com/tokens/1/0xa6dd98031551c23bb4a2fbe2c4d524e8f737c6f7.png';
        last_transferred_at: '2022-02-04T15:49:09Z';
        native_token: false;
        type: 'cryptocurrency';
        balance: '57730113135500000000000';
        balance_24h: '57730113135500000000000';
        quote_rate: 2.1163342e-4;
        quote_rate_24h: 2.0958825e-4;
        quote: 12.217622;
        quote_24h: 12.099553;
        nft_data: null;
      },
      {
        contract_decimals: 18;
        contract_name: 'Furucombo';
        contract_ticker_symbol: 'COMBO';
        contract_address: '0xffffffff2ba8f66d4e51811c5190992176930278';
        supports_erc: ['erc20'];
        logo_url: 'https://logos.covalenthq.com/tokens/1/0xffffffff2ba8f66d4e51811c5190992176930278.png';
        last_transferred_at: '2021-03-17T15:23:27Z';
        native_token: false;
        type: 'cryptocurrency';
        balance: '335763943188213618729';
        balance_24h: '335763943188213618729';
        quote_rate: 0.029930983;
        quote_rate_24h: 0.029430011;
        quote: 10.049745;
        quote_24h: 9.8815365;
        nft_data: null;
      },
      {
        contract_decimals: 18;
        contract_name: '1INCH Token';
        contract_ticker_symbol: '1INCH';
        contract_address: '0x111111111117dc0aa78b770fa6a738034120c302';
        supports_erc: ['erc20'];
        logo_url: 'https://logos.covalenthq.com/tokens/1/0x111111111117dc0aa78b770fa6a738034120c302.png';
        last_transferred_at: '2021-02-21T10:33:13Z';
        native_token: false;
        type: 'cryptocurrency';
        balance: '1800000000000000000';
        balance_24h: '1800000000000000000';
        quote_rate: 0.7012401;
        quote_rate_24h: 0.6758316;
        quote: 1.2622322;
        quote_24h: 1.216497;
        nft_data: null;
      },
      {
        contract_decimals: 18;
        contract_name: 'Alchemy';
        contract_ticker_symbol: 'ALCH';
        contract_address: '0x0000a1c00009a619684135b824ba02f7fbf3a572';
        supports_erc: ['erc20'];
        logo_url: 'https://logos.covalenthq.com/tokens/1/0x0000a1c00009a619684135b824ba02f7fbf3a572.png';
        last_transferred_at: '2021-04-12T18:20:39Z';
        native_token: false;
        type: 'cryptocurrency';
        balance: '20000000000000000000';
        balance_24h: '20000000000000000000';
        quote_rate: 0.059861965;
        quote_rate_24h: 0.059283476;
        quote: 1.1972393;
        quote_24h: 1.1856695;
        nft_data: null;
      },
      {
        contract_decimals: 18;
        contract_name: 'Dai Stablecoin';
        contract_ticker_symbol: 'DAI';
        contract_address: '0x6b175474e89094c44da98b954eedeac495271d0f';
        supports_erc: ['erc20'];
        logo_url: 'https://logos.covalenthq.com/tokens/1/0x6b175474e89094c44da98b954eedeac495271d0f.png';
        last_transferred_at: '2021-09-23T16:47:55Z';
        native_token: false;
        type: 'stablecoin';
        balance: '827457820208257432';
        balance_24h: '827457820208257432';
        quote_rate: 0.9981982;
        quote_rate_24h: 1.0008321;
        quote: 0.8259669;
        quote_24h: 0.82814634;
        nft_data: null;
      },
      {
        contract_decimals: 9;
        contract_name: 'Zoracles';
        contract_ticker_symbol: 'ZORA';
        contract_address: '0xd8e3fb3b08eba982f2754988d70d57edc0055ae6';
        supports_erc: ['erc20'];
        logo_url: 'https://logos.covalenthq.com/tokens/1/0xd8e3fb3b08eba982f2754988d70d57edc0055ae6.png';
        last_transferred_at: '2021-11-12T22:27:47Z';
        native_token: false;
        type: 'cryptocurrency';
        balance: '1048899';
        balance_24h: '1048899';
        quote_rate: 77.69698;
        quote_rate_24h: 61.867176;
        quote: 0.08149629;
        quote_24h: 0.06489242;
        nft_data: null;
      },
      {
        contract_decimals: 0;
        contract_name: 'We Are All Going to Die';
        contract_ticker_symbol: 'WAGDIE';
        contract_address: '0x659a4bdaaacc62d2bd9cb18225d9c89b5b697a5a';
        supports_erc: ['erc20', 'erc721'];
        logo_url: 'https://logos.covalenthq.com/tokens/1/0x659a4bdaaacc62d2bd9cb18225d9c89b5b697a5a.png';
        last_transferred_at: '2022-06-07T19:12:02Z';
        native_token: false;
        type: 'nft';
        balance: '2';
        balance_24h: null;
        quote_rate: 0.0;
        quote_rate_24h: null;
        quote: 0.0;
        quote_24h: null;
        nft_data: [
          {
            token_id: '5064';
            token_balance: '1';
            token_url: null;
            supports_erc: ['erc20', 'erc721'];
            token_price_wei: null;
            token_quote_rate_eth: null;
            original_owner: '0x2f1308d54056c398a5ce402e4f0792537c987262';
            external_data: null;
            owner: '0xc0deaf6bd3f0c6574a6a625ef2f22f62a5150eab';
            owner_address: null;
            burned: null;
          },
          {
            token_id: '822';
            token_balance: '1';
            token_url: null;
            supports_erc: ['erc20', 'erc721'];
            token_price_wei: null;
            token_quote_rate_eth: null;
            original_owner: '0xf0f3eafc589a2de2910b11e621efb4bf84d733d3';
            external_data: null;
            owner: '0xc0deaf6bd3f0c6574a6a625ef2f22f62a5150eab';
            owner_address: null;
            burned: null;
          },
        ];
      },
      {
        contract_decimals: 18;
        contract_name: 'Curve 3pool yVault';
        contract_ticker_symbol: 'yvCurve-3pool';
        contract_address: '0x84e13785b5a27879921d6f685f041421c7f482da';
        supports_erc: ['erc20'];
        logo_url: 'https://logos.covalenthq.com/tokens/1/0x84e13785b5a27879921d6f685f041421c7f482da.png';
        last_transferred_at: '2022-01-29T22:48:35Z';
        native_token: false;
        type: 'dust';
        balance: '0';
        balance_24h: '0';
        quote_rate: null;
        quote_rate_24h: null;
        quote: 0.0;
        quote_24h: null;
        nft_data: null;
      },
      {
        contract_decimals: 0;
        contract_name: 'Pooly - Lawyer';
        contract_ticker_symbol: 'POOLY2';
        contract_address: '0x3545192b340f50d77403dc0a64cf2b32f03d00a9';
        supports_erc: ['erc20', 'erc721'];
        logo_url: 'https://logos.covalenthq.com/tokens/1/0x3545192b340f50d77403dc0a64cf2b32f03d00a9.png';
        last_transferred_at: '2022-06-03T01:23:53Z';
        native_token: false;
        type: 'nft';
        balance: '1';
        balance_24h: null;
        quote_rate: 0.0;
        quote_rate_24h: null;
        quote: 0.0;
        quote_24h: null;
        nft_data: [
          {
            token_id: '201';
            token_balance: '1';
            token_url: null;
            supports_erc: ['erc20', 'erc721'];
            token_price_wei: null;
            token_quote_rate_eth: null;
            original_owner: '0x8650254afc1def38badc55f56005be2581c6aeb2';
            external_data: null;
            owner: '0xc0deaf6bd3f0c6574a6a625ef2f22f62a5150eab';
            owner_address: null;
            burned: null;
          },
        ];
      },
      {
        contract_decimals: 0;
        contract_name: 'Bufficorn Buidl Brigade';
        contract_ticker_symbol: 'BBB';
        contract_address: '0x1e988ba4692e52bc50b375bcc8585b95c48aad77';
        supports_erc: ['erc20', 'erc721'];
        logo_url: 'https://logos.covalenthq.com/tokens/1/0x1e988ba4692e52bc50b375bcc8585b95c48aad77.png';
        last_transferred_at: '2021-11-30T02:03:03Z';
        native_token: false;
        type: 'nft';
        balance: '1';
        balance_24h: null;
        quote_rate: 0.0;
    
