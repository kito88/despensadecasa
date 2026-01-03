export const getProductData = async (barcode) => {
  try {
    // Usando uma API pública e gratuita para teste (OpenFoodFacts)
    const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
    const data = await response.json();

    if (data.status === 1) {
      return {
        nome: data.product.product_name || "Produto Desconhecido",
        marca: data.product.brands || "Sem Marca"
      };
    }
    
    // Se não encontrar na API, retorna um padrão para não dar erro de 'null'
    return { nome: "Novo Item", marca: "Scanner" };
    
  } catch (error) {
    console.error("Erro na API de produtos:", error);
    return { nome: "Item Manual", marca: "Scanner" };
  }
};