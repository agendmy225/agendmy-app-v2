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
    console.log('ÃƒÂ°Ã‚Å¸Ã‚Å¡Ã‚â‚¬ ImageCacheService CORRIGIDO iniciado');
    console.log('ÃƒÂ°Ã‚Å¸Ã‚Å½Ã‚Â¯ OBJETIVO: Logos 50x50px para markers, Covers em qualidade original para cards');
    console.log('ÃƒÂ°Ã‚Å¸Ã‚â€Ã‚Â§ ESTRATÃƒÆ’Ã‚â€°GIA: Logo = resize 50x50px qualidade 30% | Cover = qualidade original 70%');
    console.log('ÃƒÂ°Ã‚Å¸Ã‚â€œÃ‚â€¹ FILTRO: Apenas paths com "/logo" serÃƒÆ’Ã‚Â£o redimensionados');
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
      console.log('ÃƒÂ°Ã‚Å¸Ã‚â€Ã‚Â Buscando no cache:', storagePath);

      const cachedData = await this.safeAsyncStorageGet(cacheKey);

      if (!cachedData) {
        console.log('ÃƒÂ¢Ã‚ÂÃ‚Å’ Imagem nÃƒÆ’Ã‚Â£o encontrada no cache:', storagePath);
        return null;
      }

      const cacheEntry: CacheEntry = JSON.parse(cachedData);

      // Verificar se o cache expirou
      const age = Date.now() - cacheEntry.timestamp;
      if (age > CACHE_EXPIRATION) {
        console.log('ÃƒÂ¢Ã‚ÂÃ‚Â° Cache expirado, removendo:', storagePath);
        await AsyncStorage.removeItem(cacheKey);
        return null;
      }

      console.log('ÃƒÂ¢Ã‚Å“Ã‚â€¦ Imagem encontrada no cache:', storagePath);
      return cacheEntry.base64;
    } catch (error) {
      console.error('ÃƒÂ¢Ã‚ÂÃ‚Å’ Erro ao obter imagem do cache:', error);
      return null;
    }
  }

  /**
   * Baixa e redimensiona imagem do Firebase Storage (APENAS LOGOS)
   */
  async cacheImage(storagePath: string): Promise<string | null> {
    try {
      const isLogo = storagePath.includes('/logo');
      console.log(`ÃƒÂ°Ã‚Å¸Ã‚â€œÃ‚Â¥ INÃƒÆ’Ã‚ÂCIO - Baixando ${isLogo ? 'LOGO (serÃƒÆ’Ã‚Â¡ redimensionado)' : 'COVER/CARD (qualidade original)'}:`, storagePath);

      // Obter URL de download do Firebase
      const storageRef = ref(firebaseStorage, storagePath);
      const downloadURL = await getDownloadURL(storageRef);
      console.log('ÃƒÂ°Ã‚Å¸Ã‚â€Ã‚Â¥ URL obtida do Firebase');

      // Definir caminho temporÃƒÆ’Ã‚Â¡rio
      const fileName = `temp_${Date.now()}.jpg`;
      const tempPath = `${RNFS.CachesDirectoryPath}/${fileName}`;

      // Baixar imagem
      console.log('ÃƒÂ¢Ã‚Â¬Ã‚â€¡ÃƒÂ¯Ã‚Â¸Ã‚Â Baixando imagem original...');
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
        console.log(`ÃƒÂ°Ã‚Å¸Ã‚â€Ã‚Â§ LOGO DETECTADO - Redimensionando para ${MARKER_SIZE}x${MARKER_SIZE}px...`);
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

        console.log('ÃƒÂ¢Ã‚Å“Ã‚â€¦ Redimensionamento de LOGO concluÃƒÆ’Ã‚Â­do:', {
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
          console.warn('ÃƒÂ¢Ã‚Å¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â Erro ao limpar arquivo redimensionado:', cleanupError);
        }

        console.log('ÃƒÂ¢Ã‚Å“Ã‚â€¦ Logo 50x50px pronto para cache');
      } else {
        // CARDS/COVERS: Manter qualidade original, apenas comprimir levemente
        console.log('ÃƒÂ°Ã‚Å¸Ã‚â€œÃ‚Â· COVER/CARD DETECTADO - Mantendo qualidade original com compressÃƒÆ’Ã‚Â£o leve...');
        
        // Para covers, obter as dimensÃƒÆ’Ã‚Âµes originais da imagem
        const getImageDimensions = (): Promise<{ width: number; height: number }> => {
          return new Promise((resolve) => {
            Image.getSize(
              `file://${tempPath}`,
              (width, height) => {
                console.log('ÃƒÂ°Ã‚Å¸Ã‚â€œÃ‚Â DimensÃƒÆ’Ã‚Âµes originais detectadas:', { width, height });
                resolve({ width, height });
              },
              (error) => {
                console.error('ÃƒÂ¢Ã‚ÂÃ‚Å’ Erro ao obter dimensÃƒÆ’Ã‚Âµes:', error);
                // Fallback para dimensÃƒÆ’Ã‚Âµes padrÃƒÆ’Ã‚Â£o se nÃƒÆ’Ã‚Â£o conseguir ler
                resolve({ width: 800, height: 600 });
              }
            );
          });
        };

        const originalDimensions = await getImageDimensions();
        
        // Usar dimensÃƒÆ’Ã‚Âµes reais da imagem original (igual ao expo-image-manipulator)
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

        console.log('ÃƒÂ¢Ã‚Å“Ã‚â€¦ CompressÃƒÆ’Ã‚Â£o leve de COVER concluÃƒÆ’Ã‚Â­da:', {
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
          console.warn('ÃƒÂ¢Ã‚Å¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â Erro ao limpar arquivo comprimido:', cleanupError);
        }

        console.log('ÃƒÂ¢Ã‚Å“Ã‚â€¦ Cover/Card em qualidade original pronto para cache');
      }

      console.log('ÃƒÂ°Ã‚Å¸Ã‚â€œÃ‚Å  Tamanho final:', {
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

      // Limpar arquivo temporÃƒÆ’Ã‚Â¡rio original
      try {
        await RNFS.unlink(tempPath);
      } catch (cleanupError) {
        console.warn('ÃƒÂ¢Ã‚Å¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â Erro ao limpar temporÃƒÆ’Ã‚Â¡rio original:', cleanupError);
      }

      if (saveSuccess) {
        console.log(`ÃƒÂ¢Ã‚Å“Ã‚â€¦ ${isLogo ? 'Logo 50x50px' : 'Cover/Card original'} salvo no cache`);
      }

      return imageSource;

    } catch (error) {
      console.error('ÃƒÂ¢Ã‚ÂÃ‚Å’ Erro ao cachear imagem:', error);
      return null;
    }
  }

  /**
   * ObtÃƒÆ’Ã‚Â©m imagem (cache primeiro, depois baixa se necessÃƒÆ’Ã‚Â¡rio)
   */
  async getImage(storagePath: string): Promise<string | null> {
    if (!storagePath || storagePath.includes('placeholder')) {
      console.warn('ÃƒÂ¢Ã‚Å¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â StoragePath invÃƒÆ’Ã‚Â¡lido:', storagePath);
      return null;
    }

    try {
      // Tenta buscar no cache primeiro
      let cachedImage = await this.getCachedImage(storagePath);
      if (cachedImage) {
        return cachedImage;
      }

      // Se nÃƒÆ’Ã‚Â£o tem cache, baixa e redimensiona
      return await this.cacheImage(storagePath);
    } catch (error) {
      console.error('ÃƒÂ¢Ã‚ÂÃ‚Å’ Erro ao obter imagem:', error);
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
      console.error('ÃƒÂ¢Ã‚ÂÃ‚Å’ Erro ao salvar no AsyncStorage:', error?.message || error);

      if (error?.message?.includes('too big') || error?.message?.includes('CursorWindow')) {
        console.warn('ÃƒÂ¢Ã‚Å¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â Dados muito grandes para cache');
        return false;
      }

      throw error;
    }
  }

  /**
   * ObtÃƒÆ’Ã‚Â©m dados do AsyncStorage com tratamento de erro
   */
  private async safeAsyncStorageGet(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error: any) {
      console.error('ÃƒÂ¢Ã‚ÂÃ‚Å’ Erro ao ler do AsyncStorage:', error?.message || error);

      if (error?.message?.includes('CursorWindow')) {
        console.warn('ÃƒÂ¢Ã‚Å¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â Removendo entrada corrompida:', key);
        try {
          await AsyncStorage.removeItem(key);
        } catch (removeError) {
          console.error('ÃƒÂ¢Ã‚ÂÃ‚Å’ Erro ao remover entrada corrompida:', removeError);
        }
      }

      return null;
    }
  }

  /**
   * Limpa cache se necessÃƒÆ’Ã‚Â¡rio
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
            console.warn('ÃƒÂ¢Ã‚Å¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â Removendo entrada corrompida:', key);
            await AsyncStorage.removeItem(key);
          }
        }
      }

      if (totalSize > MAX_CACHE_SIZE) {
        console.log('ÃƒÂ°Ã‚Å¸Ã‚Â§Ã‚Â¹ Limpando cache - tamanho atual:', Math.round(totalSize / 1024 / 1024), 'MB');

        cacheEntries.sort((a, b) => a.entry.timestamp - b.entry.timestamp);

        for (const { key, entry } of cacheEntries) {
          if (totalSize <= MAX_CACHE_SIZE * 0.8) break;

          await AsyncStorage.removeItem(key);
          totalSize -= entry.size;
        }
      }
    } catch (error) {
      console.error('ÃƒÂ¢Ã‚ÂÃ‚Å’ Erro na limpeza do cache:', error);
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
      console.log('ÃƒÂ°Ã‚Å¸Ã‚Â§Ã‚Â¹ Cache limpo completamente');
    } catch (error) {
      console.error('ÃƒÂ¢Ã‚ÂÃ‚Å’ Erro ao limpar cache:', error);
    }
  }

  /**
   * ObtÃƒÆ’Ã‚Â©m informaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes do cache
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
      console.error('ÃƒÂ¢Ã‚ÂÃ‚Å’ Erro ao obter info do cache:', error);
      return { count: 0, totalSize: 0 };
    }
  }
}

export const imageCacheService = new ImageCacheService();
