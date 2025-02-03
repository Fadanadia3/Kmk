import { useEffect, useState, useCallback } from 'react';
import { useAccount, useContractWrite } from 'wagmi'; // Assurez-vous d'importer les hooks nécessaires
import { walletClient } from './walletClient'; // Importez votre client de portefeuille
import { calculateGasWithMargin } from './gasUtils'; // Si vous avez une fonction utilitaire pour calculer les frais

const SendTokens = () => {
  const { address } = useAccount();
  const [gasWithMargin, setGasWithMargin] = useState(0);
  const [request, setRequest] = useState({});
  const [tokens, setTokens] = useState([]);
  const [checkedRecords, setCheckedRecords] = useState([]);

  // Fonction pour calculer les frais de gaz
  const fetchGasEstimate = useCallback(async () => {
    try {
      const estimatedGas = await walletClient.estimateGas({
        ...request, // Assurez-vous que request contient les bonnes informations
      });
      const gasWithMargin = calculateGasWithMargin(estimatedGas); // Appliquez votre marge sur les frais de gaz
      setGasWithMargin(gasWithMargin);
    } catch (error) {
      console.error('Erreur lors de l\'estimation des frais de gaz :', error);
    }
  }, [request]);

  // Utilisation de useEffect pour récupérer les tokens et les informations nécessaires
  useEffect(() => {
    fetchData();
  }, [fetchData, setCheckedRecords]);

  const sendTokens = async () => {
    try {
      const response = await walletClient.writeContract({
        ...request,
        gasLimit: gasWithMargin.toString(), // Utilisez les frais de gaz estimés avec la marge
      } as WriteContractParameters); // Assertion de type

      // Logique pour mettre à jour l'état après l'envoi
      setTokens((prevTokens) => prevTokens.filter((token) => !checkedRecords.includes(token.id)));
      console.log('Transaction réussie :', response);
    } catch (error) {
      console.error('Erreur lors de l\'envoi des tokens :', error);
    }
  };

  return (
    <div>
      <button onClick={sendTokens}>Envoyer les Tokens</button>
    </div>
  );
};

export default SendTokens;
