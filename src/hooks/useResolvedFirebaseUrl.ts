import { useState, useEffect } from 'react';
import { firebaseStorage } from '../config/firebase';

/**
 * Recebe um path do Firebase Storage (ex: "logos/abc.png") OU uma URL completa.
 * Retorna a URL HTTPS publica resolvida (ou null enquanto resolve / em caso de erro).
 *
 * Util quando voce precisa da URL como string (ex: passar pra dentro de uma WebView,
 * concatenar em HTML, usar em libraries que nao aceitam o componente <Image />).
 */
export function useResolvedFirebaseUrl(pathOrUrl?: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    if (!pathOrUrl) {
      setUrl(null);
      return;
    }

    // Ja eh URL pronta?
    if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
      setUrl(pathOrUrl);
      return;
    }

    // Path do Firebase Storage -> precisa resolver
    firebaseStorage.ref(pathOrUrl).getDownloadURL()
      .then((u: string) => { if (mounted) setUrl(u); })
      .catch((err: any) => {
        console.warn('[useResolvedFirebaseUrl] falha:', pathOrUrl, err?.message);
        if (mounted) setUrl(null);
      });

    return () => { mounted = false; };
  }, [pathOrUrl]);

  return url;
}

export default useResolvedFirebaseUrl;
