const fs = require('fs');

const filePath = 'src/features/business/BusinessSettingsScreen.tsx';
let c = fs.readFileSync(filePath, 'utf8');
const original = c;

// Adicionar o instruction da capa
const oldCall = `startImageCrop(
      3,
      1200,
      400,
      storageKey,
      'Ajustar Capa',
      async (_url, path) => {`;

const newCall = `startImageCrop(
      3,
      1200,
      400,
      storageKey,
      'Ajustar Capa',
      '📸 Tire a foto com o celular na horizontal para enquadrar melhor a capa',
      async (_url, path) => {`;

if (c.includes(oldCall)) {
  c = c.replace(oldCall, newCall);
  console.log('Adicionado o parametro instruction na chamada da capa');
}

if (c !== original) {
  fs.writeFileSync(filePath, c, 'utf8');
  console.log('Arquivo salvo!');
}
