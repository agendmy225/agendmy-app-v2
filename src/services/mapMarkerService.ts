import { storage, ref, getDownloadURL, listAll } from '../config/firebase';
import { ImageURISource } from 'react-native';

interface MarkerImageCache {
  [key: string]: string; // URL string
}

export interface BusinessMarker {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  description?: string;
  logoUrl?: string;
}

class MapMarkerService {
  private imageCache: MarkerImageCache = {};
  private isStorageConnected = false;

  // Testa conectividade com Firebase Storage
  async testStorageConnection(): Promise<boolean> {
    try {
      console.log('ÃƒÂ°Ã‚Å¸Ã‚â€Ã‚Â Testando conectividade com Firebase Storage...');

      // Tenta listar arquivos na pasta businesses para testar conectividade
      const businessesRef = ref(storage, 'businesses');
      const listResult = await listAll(businessesRef);

      this.isStorageConnected = true;
      console.log('ÃƒÂ¢Ã‚Å“Ã‚â€¦ Firebase Storage conectado com sucesso!');
      console.log(`ÃƒÂ°Ã‚Å¸Ã‚â€œÃ‚Â Encontradas ${listResult.prefixes.length} pastas de businesses`);

      return true;
    } catch (error) {
      this.isStorageConnected = false;
      console.error('ÃƒÂ¢Ã‚ÂÃ‚Å’ Falha na conexÃƒÆ’Ã‚Â£o com Firebase Storage:', error);
      console.error('ÃƒÂ°Ã‚Å¸Ã‚â€Ã‚Â§ Verifique as storage.rules e configuraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do Firebase');

      return false;
    }
  }

  // Busca URL do logo de um business especÃƒÆ’Ã‚Â­fico
  async getBusinessLogoUrl(businessId: string): Promise<string | null> {
    try {
      if (!this.isStorageConnected) {
        console.warn('ÃƒÂ¢Ã‚Å¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â Storage nÃƒÆ’Ã‚Â£o conectado. Tentando reconectar...');
        const connected = await this.testStorageConnection();
        if (!connected) {
          return null;
        }
      }

      // Verifica cache primeiro
      const cacheKey = `business_${businessId}`;
      if (this.imageCache[cacheKey]) {
        console.log(`ÃƒÂ°Ã‚Å¸Ã‚â€™Ã‚Â¾ Logo encontrado no cache para business: ${businessId}`);
        return this.imageCache[cacheKey];
      }

      console.log(`ÃƒÂ°Ã‚Å¸Ã‚â€Ã‚Â Buscando logo do business: ${businessId}`);

      // Lista arquivos na pasta do business
      const businessRef = ref(storage, `businesses/${businessId}`);
      const listResult = await listAll(businessRef);

      // Procura pelo arquivo de logo (padrÃƒÆ’Ã‚Â£o: logo_[timestamp].jpg)
      const logoFile = listResult.items.find(item =>
        item.name.startsWith('logo_') &&
        (item.name.endsWith('.jpg') || item.name.endsWith('.jpeg') || item.name.endsWith('.png'))
      );

      if (!logoFile) {
        console.log(`ÃƒÂ¢Ã‚Å¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â Logo nÃƒÆ’Ã‚Â£o encontrado para business: ${businessId}`);
        return null;
      }

      // ObtÃƒÆ’Ã‚Â©m URL de download
      const logoUrl = await getDownloadURL(logoFile);

      // Armazena no cache
      this.imageCache[cacheKey] = logoUrl;

      console.log(`ÃƒÂ¢Ã‚Å“Ã‚â€¦ Logo encontrado para business ${businessId}: ${logoFile.name}`);
      console.log(`ÃƒÂ°Ã‚Å¸Ã‚â€Ã‚â€” URL: ${logoUrl}`);
      return logoUrl;

    } catch (error) {
      console.error(`ÃƒÂ¢Ã‚ÂÃ‚Å’ Erro ao buscar logo do business ${businessId}:`, error);
      return null;
    }
  }

  // Busca logos para mÃƒÆ’Ã‚Âºltiplos businesses
  async getMultipleBusinessLogos(businessIds: string[]): Promise<Map<string, string>> {
    const logoMap = new Map<string, string>();

    console.log(`ÃƒÂ°Ã‚Å¸Ã‚â€Ã‚â€ž Buscando logos para ${businessIds.length} businesses...`);

    const promises = businessIds.map(async (businessId) => {
      const logoUrl = await this.getBusinessLogoUrl(businessId);
      if (logoUrl) {
        logoMap.set(businessId, logoUrl);
      }
    });

    await Promise.all(promises);

    console.log(`ÃƒÂ¢Ã‚Å“Ã‚â€¦ Encontrados ${logoMap.size} logos de ${businessIds.length} businesses`);
    return logoMap;
  }

  // Prepara marcadores com logos para o mapa
  async prepareMarkersWithLogos(businesses: Omit<BusinessMarker, 'logoUrl'>[]): Promise<BusinessMarker[]> {
    console.log(`ÃƒÂ°Ã‚Å¸Ã‚â€”Ã‚ÂºÃƒÂ¯Ã‚Â¸Ã‚Â Preparando ${businesses.length} marcadores com logos...`);

    // Testa conexÃƒÆ’Ã‚Â£o primeiro
    const isConnected = await this.testStorageConnection();
    if (!isConnected) {
      console.warn('ÃƒÂ¢Ã‚Å¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â Retornando marcadores sem logos devido ÃƒÆ’Ã‚Â  falha de conexÃƒÆ’Ã‚Â£o');
      return businesses.map(business => ({ ...business, logoUrl: undefined }));
    }

    // Busca logos para todos os businesses
    const businessIds = businesses.map(b => b.id);
    const logoMap = await this.getMultipleBusinessLogos(businessIds);

    // Combina dados dos businesses com URLs dos logos
    const markersWithLogos = businesses.map(business => ({
      ...business,
      logoUrl: logoMap.get(business.id) || undefined
    }));

    const markersWithLogosCount = markersWithLogos.filter(m => m.logoUrl).length;
    console.log(`ÃƒÂ°Ã‚Å¸Ã‚Å½Ã‚Â¯ ${markersWithLogosCount} de ${businesses.length} marcadores preparados com logos`);

    return markersWithLogos;
  }

  // ObtÃƒÆ’Ã‚Â©m ImageSource para marcador do mapa (usando URL direta - recomendado)
  getMarkerImageSource(logoUrl?: string): ImageURISource {
    if (logoUrl) {
      console.log('ÃƒÂ°Ã‚Å¸Ã‚Å½Ã‚Â¯ Usando logo customizado para marcador');
      return { uri: logoUrl };
    }

    // Fallback para ÃƒÆ’Ã‚Â­cone padrÃƒÆ’Ã‚Â£o se nÃƒÆ’Ã‚Â£o tiver logo
    console.log('ÃƒÂ°Ã‚Å¸Ã‚Å½Ã‚Â¯ Usando ÃƒÆ’Ã‚Â­cone padrÃƒÆ’Ã‚Â£o para marcador');
    // Nota: VocÃƒÆ’Ã‚Âª pode criar um ÃƒÆ’Ã‚Â­cone padrÃƒÆ’Ã‚Â£o ou usar um ÃƒÆ’Ã‚Â­cone do sistema
    return { uri: 'https://via.placeholder.com/50x50/FF0000/FFFFFF?text=B' };
  }

  // PrÃƒÆ’Ã‚Â©-carrega imagens de mÃƒÆ’Ã‚Âºltiplos estabelecimentos
  async preloadBusinessLogos(businessIds: string[]): Promise<void> {
    console.log('ÃƒÂ°Ã‚Å¸Ã‚Å¡Ã‚â‚¬ PrÃƒÆ’Ã‚Â©-carregando logos de', businessIds.length, 'estabelecimentos...');

    const promises = businessIds.map(businessId => {
      return this.getBusinessLogoUrl(businessId);
    });

    try {
      await Promise.allSettled(promises);
      console.log('ÃƒÂ¢Ã‚Å“Ã‚â€¦ PrÃƒÆ’Ã‚Â©-carregamento de logos concluÃƒÆ’Ã‚Â­do');
    } catch (error) {
      console.error('ÃƒÂ¢Ã‚ÂÃ‚Å’ Erro no prÃƒÆ’Ã‚Â©-carregamento:', error);
    }
  }

  // Limpa cache de imagens
  clearCache(): void {
    this.imageCache = {};
    console.log('ÃƒÂ°Ã‚Å¸Ã‚â€”Ã‚â€˜ÃƒÂ¯Ã‚Â¸Ã‚Â Cache de logos limpo');
  }

  // ObtÃƒÆ’Ã‚Â©m estatÃƒÆ’Ã‚Â­sticas do cache
  getCacheStats(): { totalImages: number; cacheKeys: string[] } {
    const totalImages = Object.keys(this.imageCache).length;
    const cacheKeys = Object.keys(this.imageCache);

    console.log(`ÃƒÂ°Ã‚Å¸Ã‚â€œÃ‚Å  Cache Stats: ${totalImages} logos em cache`);
    return { totalImages, cacheKeys };
  }
}

// Exporta instÃƒÆ’Ã‚Â¢ncia singleton
export const mapMarkerService = new MapMarkerService();
export default mapMarkerService;
