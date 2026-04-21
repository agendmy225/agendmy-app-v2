const fs = require('fs');

const filePath = 'src/services/imageUpload.ts';
let c = fs.readFileSync(filePath, 'utf8');
const original = c;

// Verificar como o firebase storage eh importado
const firebaseConfigPath = 'src/config/firebase.ts';
const fbConfig = fs.readFileSync(firebaseConfigPath, 'utf8');

console.log('=== Verificando firebase.ts ===');
const idxRef = fbConfig.indexOf('export const ref');
const idxStorage = fbConfig.indexOf('export const storage');
if (idxRef > -1) console.log('export ref existe');
if (idxStorage > -1) console.log('export storage existe');

// Ver o import do storage no firebase.ts
const storageImport = fbConfig.match(/import [^;]*from '@react-native-firebase\/storage'/);
const webStorageImport = fbConfig.match(/import [^;]*from 'firebase\/storage'/);

if (storageImport) {
  console.log('Usando: Firebase RN (@react-native-firebase/storage)');
  console.log('Import:', storageImport[0]);
}
if (webStorageImport) {
  console.log('Usando: Firebase Web (firebase/storage)');
  console.log('Import:', webStorageImport[0]);
}

// Ver qual esta sendo usado
const storageDef = fbConfig.match(/export const storage[^;]+;/);
if (storageDef) {
  console.log('Definicao:', storageDef[0]);
}
