const fs = require('fs');

const modalPath = 'src/features/professional/ProfessionalPortfolioModal.tsx';
let c = fs.readFileSync(modalPath, 'utf8');

const startIdx = c.indexOf('const handleOpenInstagram');
if (startIdx !== -1) {
  let depth = 0;
  let i = c.indexOf('=> {', startIdx) + 4;
  let endIdx = -1;
  while (i < c.length) {
    if (c[i] === '{') depth++;
    else if (c[i] === '}') {
      if (depth === 0) {
        if (c.substr(i, 2) === '};') {
          endIdx = i + 2;
          break;
        }
      }
      depth--;
    }
    i++;
  }
  
  if (endIdx !== -1) {
    const newHandler = `const handleOpenInstagram = async () => {
    if (!professional.instagram) return;
    // Limpar o handle: remover @, espacos, e barras
    let handle = professional.instagram.replace(/[@\\s\\/]/g, '').trim();
    if (!handle) return;
    
    console.log('[Instagram] Handle limpo:', handle);
    
    // Usar a URL web direta - e mais confiavel que deep links
    // A URL abre no app do Instagram se instalado, ou no navegador
    const url = \`https://www.instagram.com/\${handle}/\`;
    
    try {
      await Linking.openURL(url);
      console.log('[Instagram] Aberto com sucesso');
    } catch (err) {
      console.log('[Instagram] Erro ao abrir:', err);
      Alert.alert('Erro', 'Não foi possível abrir o Instagram de @' + handle);
    }
  };`;
    
    c = c.substring(0, startIdx) + newHandler + c.substring(endIdx);
    fs.writeFileSync(modalPath, c, 'utf8');
    console.log('Instagram handler simplificado!');
  }
}
