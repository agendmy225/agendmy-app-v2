const fs = require('fs');

// FIX 1 e 2: Corrigir acentos e verificar bug do vídeo compartilhado no modal
const modalPath = 'src/features/professional/ProfessionalPortfolioModal.tsx';
let modal = fs.readFileSync(modalPath, 'utf8');

// Corrigir acentos
modal = modal.replace(/Video do profissional/g, 'Vídeo do profissional');
modal = modal.replace(/Video do portf/g, 'Vídeo do portf');
modal = modal.replace(/Video de apresentacao/g, 'Vídeo de apresentação');
modal = modal.replace(/Video ainda nao carregado/g, 'Vídeo ainda não carregado');
modal = modal.replace(/Erro ao abrir video/g, 'Erro ao abrir vídeo');
modal = modal.replace(/Nao foi possivel abrir o Instagram/g, 'Não foi possível abrir o Instagram');

fs.writeFileSync(modalPath, modal, 'utf8');
console.log('Modal - acentos corrigidos');

// FIX 3: Adicionar ícone de Instagram no card do profissional em BusinessDetailsScreen
// Primeiro vamos ver se o BusinessDetailsScreen renderiza os profissionais com instagram
const detailsPath = 'src/features/business/BusinessDetailsScreen.tsx';
if (fs.existsSync(detailsPath)) {
  let details = fs.readFileSync(detailsPath, 'utf8');
  const origDetails = details;
  
  // Ver se já tem ícone na renderização do profissional
  const hasInstagramIcon = details.includes('instagram') && details.includes('camera-alt');
  console.log('BusinessDetailsScreen tem instagram ícone:', hasInstagramIcon);
  
  if (!hasInstagramIcon) {
    console.log('Será necessário adicionar ícone manualmente');
  }
}

console.log('Done!');
