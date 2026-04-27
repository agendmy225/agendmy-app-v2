const fs = require('fs');

const filePath = 'src/features/business/BusinessSettingsScreen.tsx';
let c = fs.readFileSync(filePath, 'utf8');
const original = c;

// Procurar e substituir handleCropConfirm
// O problema: setCropModalVisible(false) pode estar limpando o cropConfig antes do upload terminar
// Solucao: salvar referencias locais antes de qualquer setState

// Achar handleCropConfirm
const startIdx = c.indexOf('const handleCropConfirm');
if (startIdx === -1) {
  console.log('handleCropConfirm nao encontrado');
} else {
  // Achar fim
  let depth = 0;
  let i = c.indexOf('=> {', startIdx) + 4;
  let end = -1;
  while (i < c.length) {
    if (c[i] === '{') depth++;
    else if (c[i] === '}') {
      if (depth === 0) { if (c.substr(i, 2) === '};') { end = i + 2; break; } }
      depth--;
    }
    i++;
  }

  if (end > -1) {
    const newFn = `const handleCropConfirm = async (croppedUri: string) => {
    if (!cropConfig) {
      console.error('[handleCropConfirm] cropConfig esta nulo no inicio');
      return;
    }
    // Salvar referencias antes de limpar state (evita race condition)
    const config = cropConfig;
    const storageKey = config.storageKey;
    const onSuccess = config.onSuccess;
    
    setCropModalVisible(false);
    
    try {
      console.log('[handleCropConfirm] Iniciando upload, storageKey:', storageKey);
      console.log('[handleCropConfirm] Tipo de uploadImageToFirebase:', typeof uploadImageToFirebase);
      const downloadURL = await uploadImageToFirebase(croppedUri, {
        storageKey: storageKey,
      });
      console.log('[handleCropConfirm] Upload concluido, downloadURL:', downloadURL);
      console.log('[handleCropConfirm] Tipo de onSuccess:', typeof onSuccess);
      
      if (typeof onSuccess === 'function') {
        await onSuccess(downloadURL, storageKey);
        console.log('[handleCropConfirm] onSuccess executado com sucesso');
      } else {
        console.error('[handleCropConfirm] onSuccess nao eh function:', onSuccess);
      }
    } catch (err) {
      Alert.alert('Erro', 'Nao foi possivel fazer upload da imagem.');
      console.error('[Crop] Erro no upload:', err);
    } finally {
      setCropImageUri(null);
      setCropConfig(null);
    }
  };`;

    c = c.substring(0, startIdx) + newFn + c.substring(end);
    console.log('handleCropConfirm reescrito com correcao de race condition + logs');
  }
}

if (c !== original) {
  fs.writeFileSync(filePath, c, 'utf8');
  console.log('Arquivo salvo!');
}
