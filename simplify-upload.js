const fs = require('fs');

const filePath = 'src/services/imageUpload.ts';
let c = fs.readFileSync(filePath, 'utf8');
const original = c;

// Substituir a funcao uploadFileNative inteira
const oldFn = /const uploadFileNative = async \([\s\S]*?^};/m;

const newFn = `const uploadFileNative = async (
  uri: string,
  storageKey: string,
  contentType: string = 'image/jpeg',
): Promise<string> => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Usuario nao autenticado');
  }

  console.log('[uploadFileNative] Iniciando upload:', { uri, storageKey, contentType });
  const storageRef = ref(storage, storageKey);
  console.log('[uploadFileNative] storageRef criado, tem putFile:', typeof (storageRef as any).putFile);

  // Firebase RN usa putFile para enviar arquivos locais
  try {
    // @ts-ignore - putFile is native Firebase RN method
    await storageRef.putFile(uri, { contentType });
    console.log('[uploadFileNative] putFile concluido');
    const downloadURL = await getDownloadURL(storageRef);
    console.log('[uploadFileNative] downloadURL:', downloadURL);
    return downloadURL;
  } catch (err: any) {
    console.error('[uploadFileNative] Erro no putFile:', err);
    throw new Error(\`Upload falhou: \${err.message || 'erro desconhecido'}\`);
  }
};`;

if (oldFn.test(c)) {
  c = c.replace(oldFn, newFn);
  console.log('uploadFileNative simplificado');
} else {
  console.log('Padrao nao bateu');
}

if (c !== original) {
  fs.writeFileSync(filePath, c, 'utf8');
  console.log('Arquivo salvo!');
}
