import { db } from '../config/firebase';
import { doc, getDoc, setDoc } from "firebase/firestore";

export const getProductData = async (barcode) => {
  try {
    // 1. Tenta buscar no seu Banco Global Unificado
    const globalRef = doc(db, "catalogo_global", barcode);
    const globalSnap = await getDoc(globalRef);

    if (globalSnap.exists()) {
      return globalSnap.data();
    } else {
      // 2. Se não existir, busca na API Externa (Ex: BrasilAPI)
      const response = await fetch(`https://brasilapi.com.br/api/ean/v1/${barcode}`);
      const data = await response.json();

      if (data.description) {
        const novoProduto = { nome: data.description, ncm: data.ncm || "" };
        // 3. Salva no Banco Global para a próxima casa que escanear
        await setDoc(globalRef, novoProduto);
        return novoProduto;
      }
    }
  } catch (error) {
    console.error("Erro na busca:", error);
    return null;
  }
};