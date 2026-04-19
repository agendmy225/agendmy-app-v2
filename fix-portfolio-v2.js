const fs = require('fs');

// ===== FIX 1: Instagram usando intent Android =====
const modalPath = 'src/features/professional/ProfessionalPortfolioModal.tsx';
let modal = fs.readFileSync(modalPath, 'utf8');
const origModal = modal;

// Substituir o handleOpenInstagram atual pelo que usa intent Android
const startIdx = modal.indexOf('const handleOpenInstagram');
if (startIdx !== -1) {
  // Encontrar o fim da função
  let depth = 0;
  let i = modal.indexOf('=> {', startIdx) + 4;
  let endIdx = -1;
  while (i < modal.length) {
    if (modal[i] === '{') depth++;
    else if (modal[i] === '}') {
      if (depth === 0) {
        if (modal.substr(i, 2) === '};') {
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
    const handle = professional.instagram.replace('@', '').trim();
    if (!handle) return;
    
    console.log('[Instagram] Abrindo perfil:', handle);
    
    // No Android, usar intent para forcar abrir no app do Instagram
    if (Platform.OS === 'android') {
      const intentUrl = \`intent://instagram.com/_u/\${handle}#Intent;package=com.instagram.android;scheme=https;end\`;
      try {
        await Linking.openURL(intentUrl);
        console.log('[Instagram] Aberto via intent Android');
        return;
      } catch (err) {
        console.log('[Instagram] Intent falhou:', err);
      }
    }
    
    // Fallback: tentar deep link simples
    try {
      await Linking.openURL(\`instagram://user?username=\${handle}\`);
      console.log('[Instagram] Aberto via deep link');
      return;
    } catch (err) {
      console.log('[Instagram] Deep link falhou:', err);
    }
    
    // Ultimo recurso: navegador web
    try {
      await Linking.openURL(\`https://www.instagram.com/\${handle}\`);
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível abrir o Instagram. Usuário: @' + handle);
    }
  };`;
    
    modal = modal.substring(0, startIdx) + newHandler + modal.substring(endIdx);
    console.log('Fix 1: Instagram com intent Android aplicado');
  }
}

if (modal !== origModal) {
  fs.writeFileSync(modalPath, modal, 'utf8');
  console.log('Modal salvo');
}

// ===== FIX 2: Limite de 7 fotos no Management =====
const mgmtPath = 'src/features/professional/ProfessionalManagementScreen.tsx';
let mgmt = fs.readFileSync(mgmtPath, 'utf8');
const origMgmt = mgmt;

// Verificar o conteudo atual do handleImageSelection
const hsIdx = mgmt.indexOf('handleImageSelection = async');
if (hsIdx !== -1) {
  // Pegar os proximos 100 caracteres para ver como começa
  const afterArrow = mgmt.indexOf('=> {', hsIdx) + 4;
  const snippet = mgmt.substring(afterArrow, afterArrow + 100).trim();
  console.log('Funcao atual comeca com:', snippet.substring(0, 80));
  
  // Inserir limite logo apos o '=> {'
  const checkCode = `
    if (type === 'portfolio' && portfolioImages.length >= 7) {
      Alert.alert('Limite atingido', 'Você já tem 7 fotos no portfólio. Remova alguma antes de adicionar mais.');
      return;
    }
`;
  
  // Verificar se o check já existe
  if (!mgmt.includes("portfolioImages.length >= 7")) {
    mgmt = mgmt.substring(0, afterArrow) + checkCode + mgmt.substring(afterArrow);
    console.log('Fix 2: Limite de 7 fotos adicionado');
  }
}

if (mgmt !== origMgmt) {
  fs.writeFileSync(mgmtPath, mgmt, 'utf8');
  console.log('Management salvo');
}

// ===== FIX 3: Rolagem no modal - garantir scrollEnabled=true =====
// Vamos verificar a ScrollView principal do portfolio modal
let modal2 = fs.readFileSync(modalPath, 'utf8');
const orig2 = modal2;

// Procurar a ScrollView principal (nao a horizontal)
// O padrao que queremos e ScrollView contentContainerStyle={styles.scrollContent}
if (modal2.includes('<ScrollView contentContainerStyle={styles.scrollContent}>')) {
  // Trocar por versao com altura controlada
  modal2 = modal2.replace(
    '<ScrollView contentContainerStyle={styles.scrollContent}>',
    '<ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={true} bounces={true}>'
  );
  console.log('Fix 3: ScrollView com indicador visivel');
}

if (modal2 !== orig2) {
  fs.writeFileSync(modalPath, modal2, 'utf8');
  console.log('Modal scroll salvo');
}

console.log('Done!');
