// Following React Native Firebase v22 modular API patterns
import { doc, getDoc, updateDoc, firebaseDb } from '../config/firebase';

/**
 * Atualiza a taxa de comissÃƒÆ’Ã‚Â£o padrÃƒÆ’Ã‚Â£o do estabelecimento
 * Esta funÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o deve ser chamada quando o proprietÃƒÆ’Ã‚Â¡rio configurar a taxa nas configuraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes
 */
export const updateDefaultCommissionRate = async (
  businessId: string,
  commissionRate: number
): Promise<void> => {
  try {
    if (!businessId) {
      throw new Error('ID do estabelecimento ÃƒÆ’Ã‚Â© obrigatÃƒÆ’Ã‚Â³rio');
    }

    if (!commissionRate || commissionRate <= 0 || commissionRate > 1) {
      throw new Error('Taxa de comissÃƒÆ’Ã‚Â£o deve estar entre 0.01 (1%) e 1.0 (100%)');
    }

    const businessDocRef = doc(firebaseDb, 'businesses', businessId);

    await updateDoc(businessDocRef, {
      defaultCommissionRate: commissionRate,
      updatedAt: new Date(),
    });

    console.log('ÃƒÂ¢Ã‚Å“Ã‚â€¦ Taxa de comissÃƒÆ’Ã‚Â£o padrÃƒÆ’Ã‚Â£o atualizada:', commissionRate);
  } catch (error) {
    console.error('ÃƒÂ¢Ã‚ÂÃ‚Å’ Erro ao atualizar taxa de comissÃƒÆ’Ã‚Â£o:', error);
    throw error;
  }
};

/**
 * Atualiza a taxa de comissÃƒÆ’Ã‚Â£o especÃƒÆ’Ã‚Â­fica de um profissional
 */
export const updateProfessionalCommissionRate = async (
  businessId: string,
  professionalId: string,
  commissionRate: number
): Promise<void> => {
  try {
    if (!businessId || !professionalId) {
      throw new Error('IDs do estabelecimento e profissional sÃƒÆ’Ã‚Â£o obrigatÃƒÆ’Ã‚Â³rios');
    }

    if (!commissionRate || commissionRate <= 0 || commissionRate > 1) {
      throw new Error('Taxa de comissÃƒÆ’Ã‚Â£o deve estar entre 0.01 (1%) e 1.0 (100%)');
    }

    // Atualizar na subcoleÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de profissionais do business
    const professionalDocRef = doc(firebaseDb, 'businesses', businessId, 'professionals', professionalId);

    await updateDoc(professionalDocRef, {
      commissionRate: commissionRate,
      updatedAt: new Date(),
    });

    console.log('ÃƒÂ¢Ã‚Å“Ã‚â€¦ Taxa de comissÃƒÆ’Ã‚Â£o do profissional atualizada:', professionalId, commissionRate);
  } catch (error) {
    console.error('ÃƒÂ¢Ã‚ÂÃ‚Å’ Erro ao atualizar taxa de comissÃƒÆ’Ã‚Â£o do profissional:', error);
    throw error;
  }
};

/**
 * Verifica se o estabelecimento tem configuraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de comissÃƒÆ’Ã‚Â£o vÃƒÆ’Ã‚Â¡lida
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
        message: 'Estabelecimento nÃƒÆ’Ã‚Â£o encontrado',
      };
    }

    const businessData = businessDoc.data();
    const defaultRate = businessData?.defaultCommissionRate;

    if (!defaultRate || defaultRate <= 0) {
      return {
        hasValidConfig: false,
        message: 'Taxa de comissÃƒÆ’Ã‚Â£o nÃƒÆ’Ã‚Â£o configurada. Configure nas configuraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes do negÃƒÆ’Ã‚Â³cio.',
      };
    }

    return {
      hasValidConfig: true,
      defaultRate,
      message: `Taxa de comissÃƒÆ’Ã‚Â£o configurada: ${(defaultRate * 100).toFixed(1)}%`,
    };
  } catch (error) {
    console.error('ÃƒÂ¢Ã‚ÂÃ‚Å’ Erro ao validar configuraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de comissÃƒÆ’Ã‚Â£o:', error);
    return {
      hasValidConfig: false,
      message: 'Erro ao verificar configuraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de comissÃƒÆ’Ã‚Â£o',
    };
  }
};
