import { useState, useEffect, useCallback } from 'react';
import { Image, Platform } from 'react-native';
import RNFS from 'react-native-fs';
import { storage, ref, getDownloadURL, listAll } from '../config/firebase';

interface MarkerImageState {
  uri?: string;
  localPath?: string;
  isLoading: boolean;
  error?: string;
  isReady: boolean;
}

interface UseMarkerImageOptions {
  width?: number;
  height?: number;
  enableCache?: boolean;
}

/**
 * Hook customizado para carregar imagens do Firebase Storage para usar em marcadores de mapa
 * Resolve o problema das "bolas brancas" fazendo download local das imagens
 */
export const useMarkerImage = (
  businessId: string,
  options: UseMarkerImageOptions = {}
) => {
  const {
    enableCache = true,
  } = options;

  const [state, setState] = useState<MarkerImageState>({
    isLoading: false,
    isReady: false,
  });

  const getCacheFilePath = (id: string): string => {
    return `${RNFS.CachesDirectoryPath}/marker_${id}.jpg`;
  };

  const downloadAndCacheImage = useCallback(async (downloadUrl: string, id: string): Promise<string> => {
    try {
      const cacheFilePath = getCacheFilePath(id);

      // Verifica se jÃƒÆ’Ã‚Â¡ existe no cache
      if (enableCache && await RNFS.exists(cacheFilePath)) {
        console.log(`ÃƒÂ°Ã‚Å¸Ã‚â€œÃ‚Â¦ Imagem do marker ${id} encontrada no cache local`);
        return cacheFilePath;
      }

      console.log(`ÃƒÂ¢Ã‚Â¬Ã‚â€¡ÃƒÂ¯Ã‚Â¸Ã‚Â Baixando imagem do marker ${id}...`);

      // Faz download da imagem
      const downloadResult = await RNFS.downloadFile({
        fromUrl: downloadUrl,
        toFile: cacheFilePath,
      }).promise;

      if (downloadResult.statusCode === 200) {
        console.log(`ÃƒÂ¢Ã‚Å“Ã‚â€¦ Imagem do marker ${id} baixada com sucesso`);
        return cacheFilePath;
      } else {
        throw new Error(`Download falhou com status ${downloadResult.statusCode}`);
      }
    } catch (error) {
      console.error(`ÃƒÂ¢Ã‚ÂÃ‚Å’ Erro ao baixar imagem do marker ${id}:`, error);
      throw error;
    }
  }, [enableCache]);

  const loadMarkerImage = useCallback(async () => {
    if (!businessId) {
      setState(prev => ({ ...prev, error: 'BusinessId nÃƒÆ’Ã‚Â£o fornecido', isReady: false }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: undefined }));

    try {
      console.log(`ÃƒÂ°Ã‚Å¸Ã‚Å½Ã‚Â¯ Carregando imagem do marker para business ${businessId}`);

      // Busca o logo na pasta do business no Firebase Storage
      const businessFolderRef = ref(storage, `businesses/${businessId}`);
      const files = await listAll(businessFolderRef);

      // Procura por arquivos que comeÃƒÆ’Ã‚Â§am com 'logo_'
      const logoFile = files.items.find(item => item.name.startsWith('logo_'));

      if (!logoFile) {
        throw new Error('Logo nÃƒÆ’Ã‚Â£o encontrado');
      }

      // ObtÃƒÆ’Ã‚Â©m a URL de download do logo encontrado
      const downloadUrl = await getDownloadURL(logoFile);

      // Faz download e cache da imagem
      const localPath = await downloadAndCacheImage(downloadUrl, businessId);

      // PrÃƒÆ’Ã‚Â©-carrega a imagem para garantir que estÃƒÆ’Ã‚Â¡ vÃƒÆ’Ã‚Â¡lida
      await new Promise<void>((resolve, reject) => {
        Image.getSize(
          Platform.OS === 'android' ? `file://${localPath}` : localPath,
          (width, height) => {
            console.log(`ÃƒÂ¢Ã‚Å“Ã‚â€¦ Imagem do marker ${businessId} validada: ${width}x${height}`);
            resolve();
          },
          (error) => {
            console.error(`ÃƒÂ¢Ã‚ÂÃ‚Å’ Erro ao validar imagem do marker ${businessId}:`, error);
            reject(error);
          }
        );
      });

      const finalUri = Platform.OS === 'android' ? `file://${localPath}` : localPath;

      setState({
        uri: finalUri,
        localPath,
        isLoading: false,
        error: undefined,
        isReady: true,
      });

      console.log(`ÃƒÂ°Ã‚Å¸Ã‚Å½Ã‚Â¯ Marker image ready para business ${businessId}: ${finalUri}`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error(`ÃƒÂ¢Ã‚ÂÃ‚Å’ Erro ao carregar imagem do marker ${businessId}:`, errorMessage);

      setState({
        isLoading: false,
        error: errorMessage,
        isReady: false,
      });
    }
  }, [businessId, downloadAndCacheImage]);

  const clearCache = async () => {
    try {
      const cacheFilePath = getCacheFilePath(businessId);
      if (await RNFS.exists(cacheFilePath)) {
        await RNFS.unlink(cacheFilePath);
        console.log(`ÃƒÂ°Ã‚Å¸Ã‚â€”Ã‚â€˜ÃƒÂ¯Ã‚Â¸Ã‚Â Cache da imagem do marker ${businessId} removido`);
      }
    } catch (error) {
      console.error(`ÃƒÂ¢Ã‚ÂÃ‚Å’ Erro ao limpar cache do marker ${businessId}:`, error);
    }
  };

  useEffect(() => {
    if (businessId) {
      loadMarkerImage();
    }
  }, [businessId, loadMarkerImage]);

  return {
    ...state,
    reload: loadMarkerImage,
    clearCache,
  };
};

/**
 * Hook para carregar mÃƒÆ’Ã‚Âºltiplas imagens de marcadores
 */
export const useMultipleMarkerImages = (
  businessIds: string[]
) => {
  const [states, setStates] = useState<Map<string, MarkerImageState>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  const businessIdsKey = businessIds.join(',');

  const loadAllImages = useCallback(async () => {
    if (businessIds.length === 0) return;

    setIsLoading(true);
    console.log(`ÃƒÂ°Ã‚Å¸Ã‚Å½Ã‚Â¯ Carregando ${businessIds.length} imagens de marcadores...`);

    const newStates = new Map<string, MarkerImageState>();

    // Inicializa estados
    businessIds.forEach(id => {
      newStates.set(id, { isLoading: true, isReady: false });
    });
    setStates(new Map(newStates));

    // Processa em lotes
    const batchSize = 3;
    for (let i = 0; i < businessIds.length; i += batchSize) {
      const batch = businessIds.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (businessId) => {
          try {
            // Busca o logo na pasta do business no Firebase Storage
            const businessFolderRef = ref(storage, `businesses/${businessId}`);
            const files = await listAll(businessFolderRef);

            // Procura por arquivos que comeÃƒÆ’Ã‚Â§am com 'logo_'
            const logoFile = files.items.find(item => item.name.startsWith('logo_'));

            if (!logoFile) {
              throw new Error('Logo nÃƒÆ’Ã‚Â£o encontrado');
            }

            // ObtÃƒÆ’Ã‚Â©m a URL de download do logo encontrado
            const downloadUrl = await getDownloadURL(logoFile);

            // Atualiza estado individual
            setStates(prev => {
              const updated = new Map(prev);
              updated.set(businessId, {
                uri: downloadUrl,
                isLoading: false,
                isReady: true,
              });
              return updated;
            });

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
            setStates(prev => {
              const updated = new Map(prev);
              updated.set(businessId, {
                isLoading: false,
                error: errorMessage,
                isReady: false,
              });
              return updated;
            });
          }
        })
      );
    }

    setIsLoading(false);
    console.log(`ÃƒÂ¢Ã‚Å“Ã‚â€¦ Carregamento de marcadores concluÃƒÆ’Ã‚Â­do`);
  }, [businessIds]);

  useEffect(() => {
    loadAllImages();
  }, [loadAllImages, businessIdsKey]);

  return {
    states,
    isLoading,
    reload: loadAllImages,
  };
};

export default useMarkerImage;
