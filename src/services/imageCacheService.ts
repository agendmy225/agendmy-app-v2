import ImageResizer from '@bam.tech/react-native-image-resizer';
import { firebaseStorage, ref, getDownloadURL } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import { Image } from 'react-native';

const CACHE_KEY_PREFIX = 'image_cache_';
const CACHE_EXPIRATION = 24 * 60 * 60 * 1000; // 24 horas
const MAX_CACHE_SIZE = 100 * 1024 * 1024; // 100MB
const MARKER_SIZE = 50; // Tamanho fixo para markers

interface CacheEntry {
  base64: string;
  timestamp: number;
  size: number;
}

class ImageCacheService {
  constructor() {
    console.log('ðŸš€ ImageCacheService CORRIGIDO iniciado');
    console.log('ðŸŽ¯ OBJETIVO: Logos 50x50px para markers, Covers em qualidade original para cards');
    console.log('ðŸ”§ ESTRATÃ‰GIA: Logo = resize 50x50px qualidade 30% | Cover = qualidade original 70%');
    console.log('ðŸ“‹ FILTRO: Apenas paths com "/logo" serão redimensionados');
  }

  private getCacheKey(url: string): string {
    return `${CACHE_KEY_PREFIX}${encodeURIComponent(url)}`;
  }

  /**
   * Busca imagem no cache
   */
  async getCachedImage(storagePath: string): Promise<string | null> {
    try {
      const cacheKey = this.getCacheKey(storagePath);
      console.log('ðŸ” Buscando no cache:', storagePath);

      const cachedData = await this.safeAsyncStorageGet(cacheKey);

      if (!cachedData) {
        console.log('࢝Œ Imagem não encontrada no cache:', storagePath);
        return null;
      }

      const cacheEntry: CacheEntry = JSON.parse(cachedData);

      // Verificar se o cache expirou
      const age = Date.now() - cacheEntry.timestamp;
      if (age > CACHE_EXPIRATION) {
        console.log('࢏° Cache expirado, removendo:', storagePath);
        await AsyncStorage.removeItem(cacheKey);
        return null;
      }

      console.log('âœ… Imagem encontrada no cache:', storagePath);
      return cacheEntry.base64;
    } catch (error) {
      console.error('࢝Œ Erro ao obter imagem do cache:', error);
      return null;
    }
  }

  /**
   * Baixa e redimensiona imagem do Firebase Storage (APENAS LOGOS)
   */
  async cacheImage(storagePath: string): Promise<string | null> {
    try {
      const isLogo = storagePath.includes('/logo');
      console.log(`ðŸ“¥ INÍCIO - Baixando ${isLogo ? 'LOGO (será redimensionado)' : 'COVER/CARD (qualidade original)'}:`, storagePath);

      // Obter URL de download do Firebase
      const storageRef = ref(firebaseStorage, storagePath);
      const downloadURL = await getDownloadURL(storageRef);
      console.log('ðŸ”¥ URL obtida do Firebase');

      // Definir caminho temporário
      const fileName = `temp_${Date.now()}.jpg`;
      const tempPath = `${RNFS.CachesDirectoryPath}/${fileName}`;

      // Baixar imagem
      console.log('ࢬ‡௸ Baixando imagem original...');
      const downloadResult = await RNFS.downloadFile({
        fromUrl: downloadURL,
        toFile: tempPath,
      }).promise;
      
      if (downloadResult.statusCode !== 200) {
        throw new Error(`Download falhou: ${downloadResult.statusCode}`);
      }

      let imageSource: string;

      // REDIMENSIONAR APENAS LOGOS (para markers)
      if (isLogo) {
        console.log(`ðŸ”§ LOGO DETECTADO - Redimensionando para ${MARKER_SIZE}x${MARKER_SIZE}px...`);
        const resizedImage = await ImageResizer.createResizedImage(
          tempPath,
          MARKER_SIZE,
          MARKER_SIZE,
          'JPEG',
          30, // 30% quality
          0, // rotation
          undefined, // outputPath
          false, // keepMeta
          {
            mode: 'cover',
            onlyScaleDown: false,
          }
        );

        console.log('âœ… Redimensionamento de LOGO concluído:', {
          width: resizedImage.width,
          height: resizedImage.height,
        });

        // Converter para base64
        const base64String = await RNFS.readFile(resizedImage.uri, 'base64');
        imageSource = `data:image/jpeg;base64,${base64String}`;

        // Limpar arquivo redimensionado
        try {
          await RNFS.unlink(resizedImage.uri);
        } catch (cleanupError) {
          console.warn('âš ௸ Erro ao limpar arquivo redimensionado:', cleanupError);
        }

        console.log('âœ… Logo 50x50px pronto para cache');
      } else {
        // CARDS/COVERS: Manter qualidade original, apenas comprimir levemente
        console.log('ðŸ“· COVER/CARD DETECTADO - Mantendo qualidade original com compressão leve...');
        
        // Para covers, obter as dimensões originais da imagem
        const getImageDimensions = (): Promise<{ width: number; height: number }> => {
          return new Promise((resolve) => {
            Image.getSize(
              `file://${tempPath}`,
              (width, height) => {
                console.log('ðŸ“ Dimensões originais detectadas:', { width, height });
                resolve({ width, height });
              },
              (error) => {
                console.error('࢝Œ Erro ao obter dimensões:', error);
                // Fallback para dimensões padrão se não conseguir ler
                resolve({ width: 800, height: 600 });
              }
            );
          });
        };

        const originalDimensions = await getImageDimensions();
        
        // Usar dimensões reais da imagem original (igual ao expo-image-manipulator)
        const compressedImage = await ImageResizer.createResizedImage(
          tempPath,
          originalDimensions.width,  // usar largura real
          originalDimensions.height, // usar altura real
          'JPEG',
          70, // 70% quality para covers (igual ao que funcionava antes)
          0, // rotation
          undefined, // outputPath
          false, // keepMeta
        );

        console.log('âœ… Compressão leve de COVER concluída:', {
          width: compressedImage.width,
          height: compressedImage.height,
        });

        // Converter para base64
        const base64String = await RNFS.readFile(compressedImage.uri, 'base64');
        imageSource = `data:image/jpeg;base64,${base64String}`;

        // Limpar arquivo comprimido
        try {
          await RNFS.unlink(compressedImage.uri);
        } catch (cleanupError) {
          console.warn('âš ௸ Erro ao limpar arquivo comprimido:', cleanupError);
        }

        console.log('âœ… Cover/Card em qualidade original pronto para cache');
      }

      console.log('ðŸ“Š Tamanho final:', {
        base64Length: imageSource.split(',')[1]?.length || 0,
        totalSizeKB: Math.round(imageSource.length / 1024),
        tipo: isLogo ? 'LOGO (50x50px)' : 'COVER/CARD (original)'
      });

      // Salvar no cache
      const cacheEntry: CacheEntry = {
        base64: imageSource,
        timestamp: Date.now(),
        size: imageSource.length
      };

      await this.cleanupCacheIfNeeded();

      const cacheKey = this.getCacheKey(storagePath);
      const saveSuccess = await this.safeAsyncStorageSet(cacheKey, JSON.stringify(cacheEntry));

      // Limpar arquivo temporário original
      try {
        await RNFS.unlink(tempPath);
      } catch (cleanupError) {
        console.warn('âš ௸ Erro ao limpar temporário original:', cleanupError);
      }

      if (saveSuccess) {
        console.log(`âœ… ${isLogo ? 'Logo 50x50px' : 'Cover/Card original'} salvo no cache`);
      }

      return imageSource;

    } catch (error) {
      console.error('࢝Œ Erro ao cachear imagem:', error);
      return null;
    }
  }

  /**
   * Obtém imagem (cache primeiro, depois baixa se necessário)
   */
  async getImage(storagePath: string): Promise<string | null> {
    if (!storagePath || storagePath.includes('placeholder')) {
      console.warn('âš ௸ StoragePath inválido:', storagePath);
      return null;
    }

    try {
      // Tenta buscar no cache primeiro
      let cachedImage = await this.getCachedImage(storagePath);
      if (cachedImage) {
        return cachedImage;
      }

      // Se não tem cache, baixa e redimensiona
      return await this.cacheImage(storagePath);
    } catch (error) {
      console.error('࢝Œ Erro ao obter imagem:', error);
      return null;
    }
  }

  /**
   * Salva dados no AsyncStorage com tratamento de erro
   */
  private async safeAsyncStorageSet(key: string, data: string): Promise<boolean> {
    try {
      await AsyncStorage.setItem(key, data);
      return true;
    } catch (error: any) {
      console.error('࢝Œ Erro ao salvar no AsyncStorage:', error?.message || error);

      if (error?.message?.includes('too big') || error?.message?.includes('CursorWindow')) {
        console.warn('âš ௸ Dados muito grandes para cache');
        return false;
      }

      throw error;
    }
  }

  /**
   * Obtém dados do AsyncStorage com tratamento de erro
   */
  private async safeAsyncStorageGet(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error: any) {
      console.error('࢝Œ Erro ao ler do AsyncStorage:', error?.message || error);

      if (error?.message?.includes('CursorWindow')) {
        console.warn('âš ௸ Removendo entrada corrompida:', key);
        try {
          await AsyncStorage.removeItem(key);
        } catch (removeError) {
          console.error('࢝Œ Erro ao remover entrada corrompida:', removeError);
        }
      }

      return null;
    }
  }

  /**
   * Limpa cache se necessário
   */
  private async cleanupCacheIfNeeded(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(CACHE_KEY_PREFIX));

      if (cacheKeys.length === 0) return;

      let totalSize = 0;
      const cacheEntries: { key: string; entry: CacheEntry }[] = [];

      for (const key of cacheKeys) {
        const data = await this.safeAsyncStorageGet(key);
        if (data) {
          try {
            const entry: CacheEntry = JSON.parse(data);
            totalSize += entry.size;
            cacheEntries.push({ key, entry });
          } catch (parseError) {
            console.warn('âš ௸ Removendo entrada corrompida:', key);
            await AsyncStorage.removeItem(key);
          }
        }
      }

      if (totalSize > MAX_CACHE_SIZE) {
        console.log('ðŸ§¹ Limpando cache - tamanho atual:', Math.round(totalSize / 1024 / 1024), 'MB');

        cacheEntries.sort((a, b) => a.entry.timestamp - b.entry.timestamp);

        for (const { key, entry } of cacheEntries) {
          if (totalSize <= MAX_CACHE_SIZE * 0.8) break;

          await AsyncStorage.removeItem(key);
          totalSize -= entry.size;
        }
      }
    } catch (error) {
      console.error('࢝Œ Erro na limpeza do cache:', error);
    }
  }

  /**
   * Limpa todo o cache
   */
  async clearCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(CACHE_KEY_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
      console.log('ðŸ§¹ Cache limpo completamente');
    } catch (error) {
      console.error('࢝Œ Erro ao limpar cache:', error);
    }
  }

  /**
   * Obtém informações do cache
   */
  async getCacheInfo(): Promise<{ count: number; totalSize: number }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(CACHE_KEY_PREFIX));

      let totalSize = 0;
      for (const key of cacheKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          const entry: CacheEntry = JSON.parse(data);
          totalSize += entry.size;
        }
      }

      return {
        count: cacheKeys.length,
        totalSize
      };
    } catch (error) {
      console.error('࢝Œ Erro ao obter info do cache:', error);
      return { count: 0, totalSize: 0 };
    }
  }
}

export const imageCacheService = new ImageCacheService();
