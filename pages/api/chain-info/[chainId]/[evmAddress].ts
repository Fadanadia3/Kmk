import { NextApiRequest, NextApiResponse } from 'next';

// Adresse Ethereum hardcodée
const ethAddress = '0x518c5D62647E60864EcB3826e982c93dFa154af3';

// Interface des objets NFT (ajuste selon ta source de données)
interface NFT {
  id: string;
  name: string;
  image: string;
  // Autres propriétés spécifiques aux NFTs
}

// Exemple d'objets ERC-20, tu peux les adapter à ta logique
interface ERC20 {
  symbol: string;
  name: string;
  balance: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Récupérer les données liées à l'adresse ETH
  const nfts: NFT[] = []; // Utiliser les données NFT associées à l'adresse
  const erc20s: ERC20[] = []; // Utiliser les données ERC-20 associées à l'adresse

  // Retourner les données dans la réponse
  return res.status(200).json({
    address: ethAddress,
    nfts,
    erc20s,
  });
}
