const fs = require('fs');

const modalPath = 'src/features/professional/ProfessionalPortfolioModal.tsx';
let c = fs.readFileSync(modalPath, 'utf8');
const original = c;

// Substituir o corpo da função handleOpenInstagram
const oldBody = `handleOpenInstagram = async () => {
    if (!professional.instagram) return;
    const handle = professional.instagram.replace('@', '');
    const instagramUrl = \`https://instagram.com/\${handle}\`;
    try {
      await Linking.openURL(instagramUrl);
    } catch {
      Alert.alert('Erro', 'Não foi possível abrir o Instagram.');
    }
  };`;

const newBody = `handleOpenInstagram = async () => {
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

if (c.includes(oldBody)) {
  c = c.replace(oldBody, newBody);
  fs.writeFileSync(modalPath, c, 'utf8');
  console.log('Instagram handler atualizado!');
} else {
  console.log('Padrao nao encontrado - verificando...');
  const idx = c.indexOf('handleOpenInstagram');
  if (idx > -1) {
    console.log('Conteudo atual:');
    console.log(c.substring(idx, idx + 400));
  }
}
