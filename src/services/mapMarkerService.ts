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
      console.log('ðŸ” Testando conectividade com Firebase Storage...');

      // Tenta listar arquivos na pasta businesses para testar conectividade
      const businessesRef = ref(storage, 'businesses');
      const listResult = await listAll(businessesRef);

      this.isStorageConnected = true;
      console.log('âœ… Firebase Storage conectado com sucesso!');
      console.log(`ðŸ“ Encontradas ${listResult.prefixes.length} pastas de businesses`);

      return true;
    } catch (error) {
      this.isStorageConnected = false;
      console.error('âŒ Falha na conexão com Firebase Storage:', error);
      console.error('ðŸ”§ Verifique as storage.rules e configuração do Firebase');

      return false;
    }
  }

  // Busca URL do logo de um business específico
  async getBusinessLogoUrl(businessId: string): Promise<string | null> {
    try {
      if (!this.isStorageConnected) {
        console.warn('âš ï¸ Storage não conectado. Tentando reconectar...');
        const connected = await this.testStorageConnection();
        if (!connected) {
          return null;
        }
      }

      // Verifica cache primeiro
      const cacheKey = `business_${businessId}`;
      if (this.imageCache[cacheKey]) {
        console.log(`ðŸ’¾ Logo encontrado no cache para business: ${businessId}`);
        return this.imageCache[cacheKey];
      }

      console.log(`ðŸ” Buscando logo do business: ${businessId}`);

      // Lista arquivos na pasta do business
      const businessRef = ref(storage, `businesses/${businessId}`);
      const listResult = await listAll(businessRef);

      // Procura pelo arquivo de logo (padrão: logo_[timestamp].jpg)
      const logoFile = listResult.items.find(item =>
        item.name.startsWith('logo_') &&
        (item.name.endsWith('.jpg') || item.name.endsWith('.jpeg') || item.name.endsWith('.png'))
      );

      if (!logoFile) {
        console.log(`âš ï¸ Logo não encontrado para business: ${businessId}`);
        return null;
      }

      // Obtém URL de download
      const logoUrl = await getDownloadURL(logoFile);

      // Armazena no cache
      this.imageCache[cacheKey] = logoUrl;

      console.log(`âœ… Logo encontrado para business ${businessId}: ${logoFile.name}`);
      console.log(`ðŸ”— URL: ${logoUrl}`);
      return logoUrl;

    } catch (error) {
      console.error(`âŒ Erro ao buscar logo do business ${businessId}:`, error);
      return null;
    }
  }

  // Busca logos para múltiplos businesses
  async getMultipleBusinessLogos(businessIds: string[]): Promise<Map<string, string>> {
    const logoMap = new Map<string, string>();

    console.log(`ðŸ”„ Buscando logos para ${businessIds.length} businesses...`);

    const promises = businessIds.map(async (businessId) => {
      const logoUrl = await this.getBusinessLogoUrl(businessId);
      if (logoUrl) {
        logoMap.set(businessId, logoUrl);
      }
    });

    await Promise.all(promises);

    console.log(`âœ… Encontrados ${logoMap.size} logos de ${businessIds.length} businesses`);
    return logoMap;
  }

  // Prepara marcadores com logos para o mapa
  async prepareMarkersWithLogos(businesses: Omit<BusinessMarker, 'logoUrl'>[]): Promise<BusinessMarker[]> {
    console.log(`ðŸ—ºï¸ Preparando ${businesses.length} marcadores com logos...`);

    // Testa conexão primeiro
    const isConnected = await this.testStorageConnection();
    if (!isConnected) {
      console.warn('âš ï¸ Retornando marcadores sem logos devido Ã  falha de conexão');
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
    console.log(`ðŸŽ¯ ${markersWithLogosCount} de ${businesses.length} marcadores preparados com logos`);

    return markersWithLogos;
  }

  // Obtém ImageSource para marcador do mapa (usando URL direta - recomendado)
  getMarkerImageSource(logoUrl?: string): ImageURISource {
    if (logoUrl) {
      console.log('ðŸŽ¯ Usando logo customizado para marcador');
      return { uri: logoUrl };
    }

    // Fallback para ícone padrão se não tiver logo
    console.log('ðŸŽ¯ Usando ícone padrão para marcador');
    // Nota: VocÃª pode criar um ícone padrão ou usar um ícone do sistema
    return { uri: 'https://via.placeholder.com/50x50/FF0000/FFFFFF?text=B' };
  }

  // Pré-carrega imagens de múltiplos estabelecimentos
  async preloadBusinessLogos(businessIds: string[]): Promise<void> {
    console.log('ðŸš€ Pré-carregando logos de', businessIds.length, 'estabelecimentos...');

    const promises = businessIds.map(businessId => {
      return this.getBusinessLogoUrl(businessId);
    });

    try {
      await Promise.allSettled(promises);
      console.log('âœ… Pré-carregamento de logos concluído');
    } catch (error) {
      console.error('âŒ Erro no pré-carregamento:', error);
    }
  }

  // Limpa cache de imagens
  clearCache(): void {
    this.imageCache = {};
    console.log('ðŸ—‘ï¸ Cache de logos limpo');
  }

  // Obtém estatísticas do cache
  getCacheStats(): { totalImages: number; cacheKeys: string[] } {
    const totalImages = Object.keys(this.imageCache).length;
    const cacheKeys = Object.keys(this.imageCache);

    console.log(`ðŸ“Š Cache Stats: ${totalImages} logos em cache`);
    return { totalImages, cacheKeys };
  }
}

// Exporta instÃ¢ncia singleton
export const mapMarkerService = new MapMarkerService();
export default mapMarkerService;
