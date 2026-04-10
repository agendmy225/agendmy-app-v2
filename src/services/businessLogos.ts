// Following React Native Firebase v22 modular API patterns
import { firebaseStorage, storageRef, listAll, getDownloadURL } from '../config/firebase';

interface BusinessLogo {
  businessId: string;
  logoUrl: string;
  downloadUrl: string;
  error?: string;
}

class BusinessLogosService {
  private logoCache: Map<string, BusinessLogo> = new Map();
  private downloadingLogos: Set<string> = new Set();

  /**
   * Testa a conexÃƒÆ’Ã‚Â£o com o Firebase Storage
   */
  async testStorageConnection(): Promise<boolean> {
    try {
      console.log('ÃƒÂ°Ã‚Å¸Ã‚â€Ã‚Â¥ Testando conexÃƒÆ’Ã‚Â£o com Firebase Storage...');

      // Tenta listar uma pasta para verificar conectividade
      const businessesRef = storageRef(firebaseStorage, 'businesses');
      const listResult = await listAll(businessesRef);

      console.log('ÃƒÂ¢Ã‚Å“Ã‚â€¦ Firebase Storage conectado com sucesso!');
      console.log(`ÃƒÂ°Ã‚Å¸Ã‚â€œÃ‚Â Encontradas ${listResult.items.length} pastas de businesses`);

      return true;
    } catch (error) {
      console.error('ÃƒÂ¢Ã‚ÂÃ‚Å’ Erro ao conectar com Firebase Storage:', error);
      return false;
    }
  }

  /**
   * Busca o logo de um business especÃƒÆ’Ã‚Â­fico
   */
  async getBusinessLogo(businessId: string): Promise<BusinessLogo | null> {
    try {
      // Verifica cache primeiro
      if (this.logoCache.has(businessId)) {
        const cachedLogo = this.logoCache.get(businessId)!;
        console.log(`ÃƒÂ°Ã‚Å¸Ã‚â€œÃ‚Â¦ Logo do business ${businessId} encontrado no cache`);
        return cachedLogo;
      }

      // Evita mÃƒÆ’Ã‚Âºltiplas requisiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes simultÃƒÆ’Ã‚Â¢neas para o mesmo business
      if (this.downloadingLogos.has(businessId)) {
        console.log(`ÃƒÂ¢Ã‚ÂÃ‚Â³ Aguardando download do logo do business ${businessId}...`);
        return null;
      }

      this.downloadingLogos.add(businessId);
      console.log(`ÃƒÂ°Ã‚Å¸Ã‚â€Ã‚Â Buscando logo do business: ${businessId}`);

      // Lista arquivos na pasta do business
      const businessRef = storageRef(firebaseStorage, `businesses/${businessId}`);
      const listResult = await listAll(businessRef);

      // Procura por arquivos que comeÃƒÆ’Ã‚Â§am com "logo_"
      const logoFiles = listResult.items.filter(item =>
        item.name.startsWith('logo_') &&
        (item.name.endsWith('.jpg') || item.name.endsWith('.jpeg') || item.name.endsWith('.png'))
      );

      if (logoFiles.length === 0) {
        console.warn(`ÃƒÂ¢Ã‚Å¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â Nenhum logo encontrado para o business ${businessId}`);
        this.downloadingLogos.delete(businessId);
        return null;
      }

      // Pega o primeiro logo encontrado (ou o mais recente se houver lÃƒÆ’Ã‚Â³gica de ordenaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o)
      const logoFile = logoFiles[0];
      const downloadUrl = await getDownloadURL(logoFile);

      const businessLogo: BusinessLogo = {
        businessId,
        logoUrl: logoFile.fullPath,
        downloadUrl,
      };

      // Adiciona ao cache
      this.logoCache.set(businessId, businessLogo);
      this.downloadingLogos.delete(businessId);

      console.log(`ÃƒÂ¢Ã‚Å“Ã‚â€¦ Logo encontrado para business ${businessId}: ${logoFile.name}`);
      return businessLogo;

    } catch (error) {
      console.error(`ÃƒÂ¢Ã‚ÂÃ‚Å’ Erro ao buscar logo do business ${businessId}:`, error);
      this.downloadingLogos.delete(businessId);

      const errorLogo: BusinessLogo = {
        businessId,
        logoUrl: '',
        downloadUrl: '',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };

      return errorLogo;
    }
  }

  /**
   * Busca logos de mÃƒÆ’Ã‚Âºltiplos businesses
   */
  async getMultipleBusinessLogos(businessIds: string[]): Promise<Map<string, BusinessLogo>> {
    console.log(`ÃƒÂ°Ã‚Å¸Ã‚â€Ã‚Â Buscando logos para ${businessIds.length} businesses...`);

    const results = new Map<string, BusinessLogo>();

    // Processa em lotes para evitar sobrecarga
    const batchSize = 5;
    for (let i = 0; i < businessIds.length; i += batchSize) {
      const batch = businessIds.slice(i, i + batchSize);

      const promises = batch.map(async (businessId) => {
        const logo = await this.getBusinessLogo(businessId);
        if (logo) {
          results.set(businessId, logo);
        }
      });

      await Promise.all(promises);
    }

    console.log(`ÃƒÂ¢Ã‚Å“Ã‚â€¦ Processados ${results.size} logos de ${businessIds.length} businesses`);
    return results;
  }

  /**
   * Limpa o cache de logos
   */
  clearCache(): void {
    this.logoCache.clear();
    console.log('ÃƒÂ°Ã‚Å¸Ã‚â€”Ã‚â€˜ÃƒÂ¯Ã‚Â¸Ã‚Â Cache de logos limpo');
  }

  /**
   * Retorna estatÃƒÆ’Ã‚Â­sticas do cache
   */
  getCacheStats(): { size: number; businesses: string[] } {
    return {
      size: this.logoCache.size,
      businesses: Array.from(this.logoCache.keys()),
    };
  }
}

// InstÃƒÆ’Ã‚Â¢ncia singleton
export const businessLogosService = new BusinessLogosService();
export default businessLogosService;
export type { BusinessLogo };
