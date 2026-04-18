const fs = require('fs');

const filePath = 'src/features/business/components/GalleryViewerModal.tsx';
let c = fs.readFileSync(filePath, 'utf8');

// Adicionar import do IntentLauncher se não existir
if (!c.includes('Platform')) {
  c = c.replace(
    "import {\n  Modal,\n  View,",
    "import {\n  Platform,\n  Modal,\n  View,"
  );
}

// Substituir handleOpenVideo para usar intent Android
const newHandler = `  const handleOpenVideo = async () => {
    console.log('[Video] handleOpenVideo chamado');
    if (!currentItem || currentItem.type !== 'video') {
      return;
    }
    const url = urls[currentItem.storagePath];
    console.log('[Video] URL do video:', url);
    if (!url) {
      Alert.alert('Erro', 'Video ainda nao carregado. Aguarde um momento.');
      return;
    }
    try {
      if (Platform.OS === 'android') {
        // Tenta abrir direto no player de video usando intent Android
        const intentUrl = \`intent:\${url}#Intent;action=android.intent.action.VIEW;type=video/mp4;end\`;
        try {
          await Linking.openURL(intentUrl);
          console.log('[Video] Aberto via intent');
          return;
        } catch (intentErr) {
          console.log('[Video] Intent falhou, tentando URL direta:', intentErr);
        }
      }
      // Fallback: abrir URL direta
      await Linking.openURL(url);
      console.log('[Video] URL aberta com sucesso');
    } catch (err) {
      console.log('[Video] Erro ao abrir video:', err);
      const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
      Alert.alert('Erro ao abrir video', errorMsg);
    }
  };`;

const startMarker = '  const handleOpenVideo = async () => {';
const startIdx = c.indexOf(startMarker);
if (startIdx !== -1) {
  let depth = 0;
  let i = startIdx + startMarker.length;
  let foundEnd = -1;
  while (i < c.length) {
    if (c[i] === '{') depth++;
    else if (c[i] === '}') {
      if (depth === 0) {
        if (c.substr(i, 2) === '};') {
          foundEnd = i + 2;
          break;
        }
      }
      depth--;
    }
    i++;
  }
  
  if (foundEnd !== -1) {
    c = c.substring(0, startIdx) + newHandler + c.substring(foundEnd);
    fs.writeFileSync(filePath, c, 'utf8');
    console.log('Handler de video atualizado para usar intent Android!');
  }
} else {
  console.log('Funcao nao encontrada');
}
