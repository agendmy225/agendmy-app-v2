const fs = require('fs');

// ===== FIX 1: Limite de 7 fotos no ProfessionalManagementScreen =====
const mgmtPath = 'src/features/professional/ProfessionalManagementScreen.tsx';
let mgmt = fs.readFileSync(mgmtPath, 'utf8');
const origMgmt = mgmt;

// Verificar se já tem limite de 7
if (!mgmt.includes('portfolioImages.length >= 7')) {
  // Adicionar validação no início de handleImageSelection
  const oldSel = `handleImageSelection = async (type: 'profile' | 'portfolio') => {
    const storagePath = \`professional_images/\${user?.uid}/\${Date.now()}.jpg\`;
    showImagePickerDialog(\`Selecionar Imagem \${type === 'profile' ? 'de Perfil' : 'do Portfólio'}\`, async () => {`;
  
  const newSel = `handleImageSelection = async (type: 'profile' | 'portfolio') => {
    if (type === 'portfolio' && portfolioImages.length >= 7) {
      Alert.alert('Limite atingido', 'Você já tem 7 fotos no portfólio. Remova alguma antes de adicionar mais.');
      return;
    }
    const storagePath = \`professional_images/\${user?.uid}/\${Date.now()}.jpg\`;
    showImagePickerDialog(\`Selecionar Imagem \${type === 'profile' ? 'de Perfil' : 'do Portfólio'}\`, async () => {`;
  
  if (mgmt.includes(oldSel)) {
    mgmt = mgmt.replace(oldSel, newSel);
    console.log('Fix 1a: Limite de 7 fotos adicionado em handleImageSelection');
  }
}

// Adicionar contador no botão de adicionar portfolio (substituir o Button simples)
if (!mgmt.includes('Portfólio (')) {
  const oldBtn = `<Button title="Adicionar Imagem ao Portfólio" onPress={() => handleImageSelection('portfolio')} disabled={isUploading} />`;
  const newBtn = `<Text style={styles.portfolioCountLabel}>Portfólio ({portfolioImages.length}/7)</Text>
              <Button 
                title="Adicionar Foto ao Portfólio" 
                onPress={() => handleImageSelection('portfolio')} 
                disabled={isUploading || portfolioImages.length >= 7} 
              />`;
  
  if (mgmt.includes(oldBtn)) {
    mgmt = mgmt.replace(oldBtn, newBtn);
    console.log('Fix 1b: Contador de fotos adicionado');
    
    // Adicionar estilo se não existir
    if (!mgmt.includes('portfolioCountLabel:')) {
      mgmt = mgmt.replace(
        'videoLabel: {',
        `portfolioCountLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 12,
    marginBottom: 6,
  },
  videoLabel: {`
      );
      console.log('Fix 1c: Estilo portfolioCountLabel adicionado');
    }
  }
}

if (mgmt !== origMgmt) {
  fs.writeFileSync(mgmtPath, mgmt, 'utf8');
  console.log('ManagementScreen salvo');
}

// ===== FIX 2 e 3: Portfolio Modal - rolagem + Instagram =====
const modalPath = 'src/features/professional/ProfessionalPortfolioModal.tsx';
let modal = fs.readFileSync(modalPath, 'utf8');
const origModal = modal;

// FIX INSTAGRAM: Usar abordagem simples e confiável
const oldInst = `handleOpenInstagram = async () => {
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

const newInst = `handleOpenInstagram = async () => {
    if (!professional.instagram) return;
    const handle = professional.instagram.replace('@', '').trim();
    if (!handle) return;
    
    // Usar URL web direta que abre no Chrome/navegador nativo
    // Sem usar canOpenURL pois ele pode retornar false negativo
    const webUrl = \`https://www.instagram.com/\${handle}\`;
    
    try {
      await Linking.openURL(webUrl);
      console.log('[Instagram] Aberto:', webUrl);
    } catch (err) {
      console.log('[Instagram] Erro:', err);
      Alert.alert('Erro', 'Não foi possível abrir o Instagram. Usuário: @' + handle);
    }
  };`;

if (modal.includes(oldInst)) {
  modal = modal.replace(oldInst, newInst);
  console.log('Fix 2: Instagram simplificado');
}

// FIX ROLAGEM: Verificar se o ScrollView do modal principal está com flex correto
// Na tela principal (não fullscreen), o ScrollView precisa permitir rolagem até o final
// Vamos verificar o style do scrollContent
if (modal.includes('scrollContent: {\n    paddingBottom: 32,\n  },')) {
  modal = modal.replace(
    'scrollContent: {\n    paddingBottom: 32,\n  },',
    'scrollContent: {\n    paddingBottom: 80,\n    flexGrow: 1,\n  },'
  );
  console.log('Fix 3: paddingBottom aumentado para permitir rolagem até o video');
}

if (modal !== origModal) {
  fs.writeFileSync(modalPath, modal, 'utf8');
  console.log('Modal salvo');
}

console.log('Done!');
