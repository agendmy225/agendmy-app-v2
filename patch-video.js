const fs = require('fs');

const filePath = 'src/features/business/components/GalleryViewerModal.tsx';
let c = fs.readFileSync(filePath, 'utf8');

// Substituir a função handleOpenVideo com versão melhorada
const newHandler = `  const handleOpenVideo = async () => {
    console.log('[Video] handleOpenVideo chamado');
    if (!currentItem || currentItem.type !== 'video') {
      console.log('[Video] Nenhum item de video atual');
      return;
    }
    const url = urls[currentItem.storagePath];
    console.log('[Video] URL do video:', url);
    if (!url) {
      Alert.alert('Erro', 'Video ainda nao carregado. Aguarde um momento.');
      return;
    }
    try {
      // Tenta abrir diretamente sem verificar canOpenURL
      console.log('[Video] Tentando abrir URL:', url);
      await Linking.openURL(url);
      console.log('[Video] URL aberta com sucesso');
    } catch (err) {
      console.log('[Video] Erro ao abrir video:', err);
      const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
      Alert.alert('Erro ao abrir video', errorMsg);
    }
  };`;

// Encontrar e substituir a função atual
const startMarker = '  const handleOpenVideo = async () => {';
const endMarker = '  };';

const startIdx = c.indexOf(startMarker);
if (startIdx !== -1) {
  // Encontrar o fim da função
  let depth = 0;
  let i = startIdx + startMarker.length;
  let foundEnd = -1;
  while (i < c.length) {
    if (c[i] === '{') depth++;
    else if (c[i] === '}') {
      if (depth === 0) {
        // Verificar se a próxima linha é ';'
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
    console.log('Handler de video atualizado com sucesso!');
  } else {
    console.log('Nao foi possivel encontrar o fim da funcao');
  }
} else {
  console.log('Funcao handleOpenVideo nao encontrada');
}
