const fs = require('fs');

const modalPath = 'src/features/professional/ProfessionalPortfolioModal.tsx';
let c = fs.readFileSync(modalPath, 'utf8');
const original = c;

// FIX 1: Bug do vídeo compartilhado
// O problema é que useEffect com [visible, professional?.id] não limpa os urls antigos.
// Precisa resetar URLs quando mudar o profissional
const oldEffect = `  useEffect(() => {
    if (!visible) return;
    const loadUrls = async () => {
      const newUrls: { [key: string]: string } = {};
      for (const item of allItems) {
        if (!item.storagePath) continue;
        try {
          if (item.storagePath.startsWith('http')) {
            newUrls[item.storagePath] = item.storagePath;
          } else {
            const itemRef = ref(storage, item.storagePath);
            const url = await getDownloadURL(itemRef);
            newUrls[item.storagePath] = url;
          }
        } catch (err) {
          console.error('[Portfolio] Erro ao carregar URL:', err);
        }
      }
      setUrls(newUrls);
    };
    loadUrls();
  }, [visible, professional?.id]);`;

const newEffect = `  useEffect(() => {
    // Resetar urls quando profissional muda (fix do bug de video compartilhado)
    setUrls({});
    setCurrentIndex(0);
    if (!visible || !professional) return;
    
    const currentPhotos = professional?.portfolioImages || [];
    const currentVideo = professional?.portfolioVideo || '';
    const itemsToLoad = [
      ...currentPhotos.map((p: string) => ({ type: 'photo' as const, storagePath: p })),
      ...(currentVideo ? [{ type: 'video' as const, storagePath: currentVideo }] : []),
    ];
    
    const loadUrls = async () => {
      const newUrls: { [key: string]: string } = {};
      for (const item of itemsToLoad) {
        if (!item.storagePath) continue;
        try {
          if (item.storagePath.startsWith('http')) {
            newUrls[item.storagePath] = item.storagePath;
          } else {
            const itemRef = ref(storage, item.storagePath);
            const url = await getDownloadURL(itemRef);
            newUrls[item.storagePath] = url;
          }
        } catch (err) {
          console.error('[Portfolio] Erro ao carregar URL:', err);
        }
      }
      setUrls(newUrls);
    };
    loadUrls();
  }, [visible, professional?.id, professional?.portfolioVideo, professional?.portfolioImages]);`;

if (c.includes(oldEffect)) {
  c = c.replace(oldEffect, newEffect);
  console.log('Fix 1: useEffect corrigido para resetar urls');
} else {
  console.log('Fix 1: useEffect pattern nao encontrado');
}

// FIX 2: Instagram abre com tela branca
// O problema é que a URL web do Instagram pode não carregar bem no WebView interno.
// Vamos tentar primeiro o deep link do app, depois fallback para web
const oldInstagram = `  const handleOpenInstagram = async () => {
    if (!professional.instagram) return;
    const handle = professional.instagram.replace('@', '');
    const instagramUrl = \`https://instagram.com/\${handle}\`;
    try {
      await Linking.openURL(instagramUrl);
    } catch {
      Alert.alert('Erro', 'Nao foi possivel abrir o Instagram.');
    }
  };`;

const newInstagram = `  const handleOpenInstagram = async () => {
    if (!professional.instagram) return;
    const handle = professional.instagram.replace('@', '').trim();
    if (!handle) return;
    
    // Tenta abrir no app do Instagram primeiro (deep link)
    const appUrl = \`instagram://user?username=\${handle}\`;
    const webUrl = \`https://www.instagram.com/\${handle}/\`;
    
    try {
      const canOpenApp = await Linking.canOpenURL(appUrl);
      if (canOpenApp) {
        await Linking.openURL(appUrl);
        return;
      }
    } catch (err) {
      console.log('[Instagram] App nao disponivel, tentando web:', err);
    }
    
    // Fallback: abrir no navegador
    try {
      await Linking.openURL(webUrl);
    } catch (err) {
      console.log('[Instagram] Erro:', err);
      Alert.alert('Erro', 'Não foi possível abrir o Instagram.');
    }
  };`;

if (c.includes(oldInstagram)) {
  c = c.replace(oldInstagram, newInstagram);
  console.log('Fix 2: Instagram handler corrigido (deep link)');
} else {
  console.log('Fix 2: Instagram pattern nao encontrado');
}

if (c !== original) {
  fs.writeFileSync(modalPath, c, 'utf8');
  console.log('Arquivo atualizado!');
} else {
  console.log('Nada mudou');
}
