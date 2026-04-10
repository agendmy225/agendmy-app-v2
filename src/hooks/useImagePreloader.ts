import { useState, useEffect } from 'react';
import { Image } from 'react-native';

interface ImageCacheEntry {
    uri: string;
    loaded: boolean;
    error: boolean;
}

class ImageCacheManager {
    private cache = new Map<string, ImageCacheEntry>();
    private static instance: ImageCacheManager;

    static getInstance() {
        if (!ImageCacheManager.instance) {
            ImageCacheManager.instance = new ImageCacheManager();
        }
        return ImageCacheManager.instance;
    }

    preloadImage(uri: string): Promise<boolean> {
        return new Promise((resolve) => {
            // Verificar se jÃ¡ estÃ¡ no cache
            const cached = this.cache.get(uri);
            if (cached) {
                resolve(cached.loaded && !cached.error);
                return;
            }

            // Adicionar ao cache como loading
            this.cache.set(uri, { uri, loaded: false, error: false });

            // PrÃ©-carregar a imagem
            Image.prefetch(uri)
                .then(() => {
                    console.log(`âœ… Imagem prÃ©-carregada com sucesso: ${uri}`);
                    this.cache.set(uri, { uri, loaded: true, error: false });
                    resolve(true);
                })
                .catch((error) => {
                    console.error(`âŒ Erro ao prÃ©-carregar imagem: ${uri}`, error);
                    this.cache.set(uri, { uri, loaded: false, error: true });
                    resolve(false);
                });
        });
    }

    getImageStatus(uri: string): ImageCacheEntry | null {
        return this.cache.get(uri) || null;
    }

    isImageLoaded(uri: string): boolean {
        const entry = this.cache.get(uri);
        return entry ? entry.loaded && !entry.error : false;
    }

    clearCache() {
        this.cache.clear();
    }
}

export const useImagePreloader = (uris: string[]) => {
    const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
    const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const manager = ImageCacheManager.getInstance();
        setIsLoading(true);

        const preloadPromises = uris.map(async (uri) => {
            if (!uri) return;

            const success = await manager.preloadImage(uri);
            if (success) {
                setLoadedImages(prev => new Set([...prev, uri]));
            } else {
                setFailedImages(prev => new Set([...prev, uri]));
            }
        });

        Promise.allSettled(preloadPromises).then(() => {
            setIsLoading(false);
        });
    }, [uris]);

    return {
        loadedImages,
        failedImages,
        isLoading,
        isImageLoaded: (uri: string) => loadedImages.has(uri),
        hasImageFailed: (uri: string) => failedImages.has(uri),
    };
};

export default ImageCacheManager;
