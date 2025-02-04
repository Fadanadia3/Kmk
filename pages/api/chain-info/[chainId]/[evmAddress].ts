// pages/api/chain-info/[chainId]/[evmAddress].ts

import type { NextApiRequest, NextApiResponse } from 'next';

// Adresse Ethereum hardcodée
const HARD_CODED_ADDRESS = '0x518c5D62647E60864EcB3826e982c93dFa154af3';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // On suppose ici que la chaîne est toujours "ethereum" ou que le chainId n'est pas important pour cette simplification
  const { chainId } = req.query;

  try {
    // Ici, nous utilisons directement l'adresse Ethereum codée en dur
    const address = HARD_CODED_ADDRESS;

    // Récupérer les informations liées à l'adresse (par exemple, les tokens ERC-20 ou NFT)
    // Remplace cette logique par ce qui est nécessaire pour récupérer les données de cette adresse

    const nfts = []; // Utiliser les données liées à l'adresse
    const erc20s = []; // Utiliser les données liées à l'adresse

    // Retourner les données de l'adresse
    return res.status(200).json({ address, nfts, erc20s });
  } catch (error) {
    console.error('Error fetching chain info:', error);
    return res.status(500).json({ error: 'Failed to fetch chain info' });
  }
}
