import { useState, useEffect } from 'react';
import { imageCacheService } from '../services/imageCacheService';

export const useCachedFirebaseImage = (storagePath: string | null | undefined) => {
  const [imageSource, setImageSource] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadImage = async () => {
      if (!storagePath || storagePath.includes('placeholder')) {
        console.warn('ÃƒÂ¢Ã‚Å¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â StoragePath invÃƒÆ’Ã‚Â¡lido ou placeholder:', storagePath);
        if (isMounted) {
          setImageSource(null);
          setLoading(false);
          setError('Caminho de storage invÃƒÆ’Ã‚Â¡lido');
        }
        return;
      }

      try {
        if (isMounted) {
          setLoading(true);
          setError(null);
        }
        
        console.log('ÃƒÂ°Ã‚Å¸Ã‚â€Ã‚â€ž HOOK - Carregando imagem REDIMENSIONADA:', storagePath);
        
        // Usar o serviÃƒÆ’Ã‚Â§o de cache NOVO com redimensionamento real
        const cachedImageBase64 = await imageCacheService.getImage(storagePath);
        
        if (isMounted) {
          if (cachedImageBase64) {
            console.log('ÃƒÂ¢Ã‚Å“Ã‚â€¦ Imagem 50x50px carregada:', storagePath);
            setImageSource(cachedImageBase64);
            setError(null);
          } else {
            console.error('ÃƒÂ¢Ã‚ÂÃ‚Å’ Falha ao carregar/redimensionar imagem:', storagePath);
            setImageSource(null);
            setError('Erro ao carregar imagem');
          }
          setLoading(false);
        }
      } catch (err) {
        console.error('ÃƒÂ¢Ã‚ÂÃ‚Å’ Erro no useCachedFirebaseImage:', err);
        if (isMounted) {
          setImageSource(null);
          setError(`Erro ao carregar imagem: ${err}`);
          setLoading(false);
        }
      }
    };

    // Reset apenas quando storagePath muda
    setError(null);
    setImageSource(null);
    
    loadImage();

    return () => {
      isMounted = false;
    };
  }, [storagePath]);

  return {
    imageSource, // Retorna base64 string redimensionada para 50x50px
    loading,
    error,
  };
};
