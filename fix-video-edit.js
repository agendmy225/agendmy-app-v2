const fs = require('fs');

const filePath = 'src/features/professional/ProfessionalManagementScreen.tsx';
let c = fs.readFileSync(filePath, 'utf8');
const original = c;

// FIX 1: Adicionar setPortfolioVideo no openEditModal
const oldOpenEdit = `openEditModal = (professional: Professional) => {
    setEditingProfessional(professional);
    setProfessionalName(professional.name);
    setProfessionalSpecialty(professional.specialty);
    setProfessionalBio(professional.bio);
    setProfessionalImage(professional.image);
    setProfessionalInstagram(professional.instagram || '');
    setPortfolioImages(professional.portfolioImages || []);
    setModalVisible(true);
  };`;

const newOpenEdit = `openEditModal = (professional: Professional) => {
    setEditingProfessional(professional);
    setProfessionalName(professional.name);
    setProfessionalSpecialty(professional.specialty);
    setProfessionalBio(professional.bio);
    setProfessionalImage(professional.image);
    setProfessionalInstagram(professional.instagram || '');
    setPortfolioImages(professional.portfolioImages || []);
    setPortfolioVideo(professional.portfolioVideo || '');
    setModalVisible(true);
  };`;

if (c.includes(oldOpenEdit)) {
  c = c.replace(oldOpenEdit, newOpenEdit);
  console.log('Fix 1: openEditModal agora carrega portfolioVideo');
} else {
  console.log('Fix 1: Padrao nao encontrado');
}

// FIX 2: Verificar se openAddModal tambem reseta portfolioVideo
if (!c.includes("setPortfolioVideo('')") && !c.includes('setPortfolioVideo("")')) {
  // Adicionar no openAddModal (resetar ao adicionar novo)
  const oldOpenAdd = `openAddModal = () => {
    setEditingProfessional(null);
    setProfessionalName('');
    setProfessionalSpecialty('');
    setProfessionalBio('');
    setProfessionalImage('');
    setProfessionalInstagram('');
    setPortfolioImages([]);
    setModalVisible(true);
  };`;

  const newOpenAdd = `openAddModal = () => {
    setEditingProfessional(null);
    setProfessionalName('');
    setProfessionalSpecialty('');
    setProfessionalBio('');
    setProfessionalImage('');
    setProfessionalInstagram('');
    setPortfolioImages([]);
    setPortfolioVideo('');
    setModalVisible(true);
  };`;
  
  if (c.includes(oldOpenAdd)) {
    c = c.replace(oldOpenAdd, newOpenAdd);
    console.log('Fix 2: openAddModal reseta portfolioVideo');
  }
}

// FIX 3: Garantir que saveProfessional salva o portfolioVideo no Firestore
if (!c.includes('portfolioVideo: portfolioVideo')) {
  // Procurar o professionalData e adicionar portfolioVideo
  c = c.replace(
    'portfolioImages: portfolioImages || [],',
    'portfolioImages: portfolioImages || [],\n        portfolioVideo: portfolioVideo || null,'
  );
  console.log('Fix 3: saveProfessional agora salva portfolioVideo');
}

if (c !== original) {
  fs.writeFileSync(filePath, c, 'utf8');
  console.log('Arquivo salvo!');
} else {
  console.log('Nenhuma alteracao');
}
