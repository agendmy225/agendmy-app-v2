import { useState, useEffect } from 'react';
import { imageCacheService } from '../services/imageCacheService';

export const useFirebaseImage = (storagePath: string | null | undefined) => {
  const [imageSource, setImageSource] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const getImageBase64 = async () => {
      if (!storagePath || storagePath.includes('placeholder')) {
        if (isMounted) {
          setImageSource(null);
          setLoading(false);
          setError('Caminho de storage inválido');
        }
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        console.log('ðŸ”¥ Obtendo imagem base64 do Firebase para:', storagePath);
        
        // Usar o serviço de cache para obter a imagem em base64
        const base64Image = await imageCacheService.getImage(storagePath);
        
        if (isMounted) {
          if (base64Image) {
            console.log('âœ… Imagem base64 obtida com sucesso:', storagePath);
            setImageSource(base64Image);
          } else {
            console.error('âŒ Falha ao obter imagem base64:', storagePath);
            setImageSource(null);
            setError('Erro ao obter imagem do Firebase');
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error('âŒ Erro ao obter imagem base64 do Firebase:', err);
          setError('Erro ao obter imagem do Firebase');
          setImageSource(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    getImageBase64();

    return () => {
      isMounted = false;
    };
  }, [storagePath]);

  // Limpar estado quando storagePath muda
  useEffect(() => {
    setError(null);
    setImageSource(null);
  }, [storagePath]);

  return {
    imageUrl: imageSource, // Agora retorna base64 ao invés de URL
    imageSource, // Para compatibilidade
    loading,
    error,
  };
};