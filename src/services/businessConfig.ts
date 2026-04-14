// Following React Native Firebase v22 modular API patterns
import { doc, getDoc, updateDoc, firebaseDb } from '../config/firebase';

/**
 * Atualiza a taxa de comissão padrão do estabelecimento
 * Esta função deve ser chamada quando o proprietário configurar a taxa nas configurações
 */
export const updateDefaultCommissionRate = async (
  businessId: string,
  commissionRate: number
): Promise<void> => {
  try {
    if (!businessId) {
      throw new Error('ID do estabelecimento é obrigatório');
    }

    if (!commissionRate || commissionRate <= 0 || commissionRate > 1) {
      throw new Error('Taxa de comissão deve estar entre 0.01 (1%) e 1.0 (100%)');
    }

    const businessDocRef = doc(firebaseDb, 'businesses', businessId);

    await updateDoc(businessDocRef, {
      defaultCommissionRate: commissionRate,
      updatedAt: new Date(),
    });

    console.log('âœ… Taxa de comissão padrão atualizada:', commissionRate);
  } catch (error) {
    console.error('࢝Œ Erro ao atualizar taxa de comissão:', error);
    throw error;
  }
};

/**
 * Atualiza a taxa de comissão específica de um profissional
 */
export const updateProfessionalCommissionRate = async (
  businessId: string,
  professionalId: string,
  commissionRate: number
): Promise<void> => {
  try {
    if (!businessId || !professionalId) {
      throw new Error('IDs do estabelecimento e profissional são obrigatórios');
    }

    if (!commissionRate || commissionRate <= 0 || commissionRate > 1) {
      throw new Error('Taxa de comissão deve estar entre 0.01 (1%) e 1.0 (100%)');
    }

    // Atualizar na subcoleção de profissionais do business
    const professionalDocRef = doc(firebaseDb, 'businesses', businessId, 'professionals', professionalId);

    await updateDoc(professionalDocRef, {
      commissionRate: commissionRate,
      updatedAt: new Date(),
    });

    console.log('âœ… Taxa de comissão do profissional atualizada:', professionalId, commissionRate);
  } catch (error) {
    console.error('࢝Œ Erro ao atualizar taxa de comissão do profissional:', error);
    throw error;
  }
};

/**
 * Verifica se o estabelecimento tem configuração de comissão válida
 */
export const validateCommissionConfig = async (businessId: string): Promise<{
  hasValidConfig: boolean;
  defaultRate?: number;
  message: string;
}> => {
  try {
    const businessDocRef = doc(firebaseDb, 'businesses', businessId);
    const businessDoc = await getDoc(businessDocRef);

    if (!businessDoc.exists()) {
      return {
        hasValidConfig: false,
        message: 'Estabelecimento não encontrado',
      };
    }

    const businessData = businessDoc.data();
    const defaultRate = businessData?.defaultCommissionRate;

    if (!defaultRate || defaultRate <= 0) {
      return {
        hasValidConfig: false,
        message: 'Taxa de comissão não configurada. Configure nas configurações do negócio.',
      };
    }

    return {
      hasValidConfig: true,
      defaultRate,
      message: `Taxa de comissão configurada: ${(defaultRate * 100).toFixed(1)}%`,
    };
  } catch (error) {
    console.error('࢝Œ Erro ao validar configuração de comissão:', error);
    return {
      hasValidConfig: false,
      message: 'Erro ao verificar configuração de comissão',
    };
  }
};
