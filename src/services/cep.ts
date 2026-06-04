// src/services/cep.ts
// Servico de consulta de CEP via ViaCEP (gratuito, sem chave de API).
// Documentacao: https://viacep.com.br/
//
// Dado um CEP, retorna rua (logradouro), bairro, cidade e estado (UF),
// que sao usados para preencher automaticamente o endereco do
// estabelecimento e melhorar a precisao do geocoding (Nominatim).

export interface CepResult {
  cep: string;
  street: string; // logradouro
  neighborhood: string; // bairro
  city: string; // localidade
  state: string; // uf
}

/**
 * Consulta o ViaCEP e retorna os dados do endereco.
 * Retorna null se o CEP for invalido ou nao encontrado.
 */
export const getAddressFromCep = async (cep: string): Promise<CepResult | null> => {
  const cleaned = (cep || '').replace(/\D/g, '');
  if (cleaned.length !== 8) {
    console.warn('[ViaCEP] CEP invalido (precisa de 8 digitos):', cep);
    return null;
  }
  try {
    const url = `https://viacep.com.br/ws/${cleaned}/json/`;
    const response = await fetch(url);
    if (!response.ok) {
      console.warn('[ViaCEP] HTTP', response.status);
      return null;
    }
    const data = await response.json();
    // ViaCEP retorna { erro: true } quando o CEP nao existe
    if (data.erro) {
      console.warn('[ViaCEP] CEP nao encontrado:', cleaned);
      return null;
    }
    return {
      cep: data.cep || cleaned,
      street: data.logradouro || '',
      neighborhood: data.bairro || '',
      city: data.localidade || '',
      state: data.uf || '',
    };
  } catch (error) {
    console.warn('[ViaCEP] erro:', error);
    return null;
  }
};

/**
 * Formata um CEP para exibicao: 12345678 -> 12345-678
 */
export const formatCep = (cep: string): string => {
  const cleaned = (cep || '').replace(/\D/g, '').slice(0, 8);
  if (cleaned.length <= 5) {
    return cleaned;
  }
  return cleaned.slice(0, 5) + '-' + cleaned.slice(5);
};
