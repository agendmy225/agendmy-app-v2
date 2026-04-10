// Following React Native Firebase v22 modular API patterns
import { doc, getDoc, updateDoc, firebaseDb } from '../config/firebase';

/**
 * Atualiza a taxa de comissÃ£o padrÃ£o do estabelecimento
 * Esta funÃ§Ã£o deve ser chamada quando o proprietÃ¡rio configurar a taxa nas configuraÃ§Ãµes
 */
export const updateDefaultCommissionRate = async (
  businessId: string,
  commissionRate: number
): Promise<void> => {
  try {
    if (!businessId) {
      throw new Error('ID do estabelecimento Ã© obrigatÃ³rio');
    }

    if (!commissionRate || commissionRate <= 0 || commissionRate > 1) {
      throw new Error('Taxa de comissÃ£o deve estar entre 0.01 (1%) e 1.0 (100%)');
    }

    const businessDocRef = doc(firebaseDb, 'businesses', businessId);

    await updateDoc(businessDocRef, {
      defaultCommissionRate: commissionRate,
      updatedAt: new Date(),
    });

    console.log('âœ… Taxa de comissÃ£o padrÃ£o atualizada:', commissionRate);
  } catch (error) {
    console.error('âŒ Erro ao atualizar taxa de comissÃ£o:', error);
    throw error;
  }
};

/**
 * Atualiza a taxa de comissÃ£o especÃ­fica de um profissional
 */
export const updateProfessionalCommissionRate = async (
  businessId: string,
  professionalId: string,
  commissionRate: number
): Promise<void> => {
  try {
    if (!businessId || !professionalId) {
      throw new Error('IDs do estabelecimento e profissional sÃ£o obrigatÃ³rios');
    }

    if (!commissionRate || commissionRate <= 0 || commissionRate > 1) {
      throw new Error('Taxa de comissÃ£o deve estar entre 0.01 (1%) e 1.0 (100%)');
    }

    // Atualizar na subcoleÃ§Ã£o de profissionais do business
    const professionalDocRef = doc(firebaseDb, 'businesses', businessId, 'professionals', professionalId);

    await updateDoc(professionalDocRef, {
      commissionRate: commissionRate,
      updatedAt: new Date(),
    });

    console.log('âœ… Taxa de comissÃ£o do profissional atualizada:', professionalId, commissionRate);
  } catch (error) {
    console.error('âŒ Erro ao atualizar taxa de comissÃ£o do profissional:', error);
    throw error;
  }
};

/**
 * Verifica se o estabelecimento tem configuraÃ§Ã£o de comissÃ£o vÃ¡lida
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
        message: 'Estabelecimento nÃ£o encontrado',
      };
    }

    const businessData = businessDoc.data();
    const defaultRate = businessData?.defaultCommissionRate;

    if (!defaultRate || defaultRate <= 0) {
      return {
        hasValidConfig: false,
        message: 'Taxa de comissÃ£o nÃ£o configurada. Configure nas configuraÃ§Ãµes do negÃ³cio.',
      };
    }

    return {
      hasValidConfig: true,
      defaultRate,
      message: `Taxa de comissÃ£o configurada: ${(defaultRate * 100).toFixed(1)}%`,
    };
  } catch (error) {
    console.error('âŒ Erro ao validar configuraÃ§Ã£o de comissÃ£o:', error);
    return {
      hasValidConfig: false,
      message: 'Erro ao verificar configuraÃ§Ã£o de comissÃ£o',
    };
  }
};
