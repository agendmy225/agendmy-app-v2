const fs = require('fs');

const filePath = 'src/features/business/BusinessSettingsScreen.tsx';
let c = fs.readFileSync(filePath, 'utf8');
const original = c;

// 1. Corrigir aspectRatio da capa para 3 em vez de 16/9
c = c.replace(
  `startImageCrop(
      16 / 9,
      1200,
      675,`,
  `startImageCrop(
      3,
      1200,
      400,`
);

// 2. Adicionar logs detalhados no onSuccess da capa para rastrear onde exatamente o erro ocorre
const oldCoverCallback = `async (_url, path) => {
        if (settings.coverImage && !settings.coverImage.includes('placeholder')) {
          await deleteImageFromFirebase(settings.coverImage);
        }
        updateSettings('coverImage', path);
        Alert.alert('Sucesso', 'Imagem de capa atualizada com sucesso!');
      },`;

const newCoverCallback = `async (_url, path) => {
        console.log('[Cover] onSuccess callback iniciado, path:', path);
        try {
          console.log('[Cover] settings.coverImage:', settings.coverImage);
          if (settings.coverImage && !settings.coverImage.includes('placeholder')) {
            console.log('[Cover] Chamando deleteImageFromFirebase com:', settings.coverImage);
            console.log('[Cover] Tipo de deleteImageFromFirebase:', typeof deleteImageFromFirebase);
            await deleteImageFromFirebase(settings.coverImage);
            console.log('[Cover] Imagem anterior deletada');
          }
          console.log('[Cover] Tipo de updateSettings:', typeof updateSettings);
          console.log('[Cover] Chamando updateSettings com path:', path);
          updateSettings('coverImage', path);
          console.log('[Cover] updateSettings concluido');
          Alert.alert('Sucesso', 'Imagem de capa atualizada com sucesso!');
        } catch (err) {
          console.error('[Cover] Erro no callback onSuccess:', err);
          throw err;
        }
      },`;

if (c.includes(oldCoverCallback)) {
  c = c.replace(oldCoverCallback, newCoverCallback);
  console.log('Logs adicionados no callback da capa');
}

// 3. Fazer o mesmo para a logo
const oldLogoCallback = `async (_url, path) => {
        if (settings.logo && !settings.logo.includes('placeholder')) {
          await deleteImageFromFirebase(settings.logo);
        }
        updateSettings('logo', path);
        Alert.alert('Sucesso', 'Logo atualizado com sucesso!');
      },`;

const newLogoCallback = `async (_url, path) => {
        console.log('[Logo] onSuccess callback iniciado, path:', path);
        try {
          if (settings.logo && !settings.logo.includes('placeholder')) {
            console.log('[Logo] Tipo de deleteImageFromFirebase:', typeof deleteImageFromFirebase);
            await deleteImageFromFirebase(settings.logo);
          }
          console.log('[Logo] Tipo de updateSettings:', typeof updateSettings);
          updateSettings('logo', path);
          Alert.alert('Sucesso', 'Logo atualizado com sucesso!');
        } catch (err) {
          console.error('[Logo] Erro no callback onSuccess:', err);
          throw err;
        }
      },`;

if (c.includes(oldLogoCallback)) {
  c = c.replace(oldLogoCallback, newLogoCallback);
  console.log('Logs adicionados no callback da logo');
}

if (c !== original) {
  fs.writeFileSync(filePath, c, 'utf8');
  console.log('Arquivo salvo!');
}
