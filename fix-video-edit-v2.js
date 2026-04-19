const fs = require('fs');

const filePath = 'src/features/professional/ProfessionalManagementScreen.tsx';
let c = fs.readFileSync(filePath, 'utf8');
const original = c;

// FIX 1: Adicionar setPortfolioVideo no openEditModal
// O padrao atual tem setPortfolioImages seguido direto por setModalVisible
if (!c.match(/setPortfolioImages\(professional\.portfolioImages[^;]*\);\s*setPortfolioVideo/)) {
  c = c.replace(
    /(setPortfolioImages\(professional\.portfolioImages \|\| \[\]\);)(\s*setModalVisible\(true\);)/,
    "$1\n    setPortfolioVideo(professional.portfolioVideo || '');$2"
  );
  console.log('Fix 1: setPortfolioVideo adicionado em openEditModal');
}

// FIX 2: Adicionar setPortfolioVideo no openAddModal
if (!c.match(/setPortfolioImages\(\[\]\);\s*setPortfolioVideo/)) {
  c = c.replace(
    /(setPortfolioImages\(\[\]\);)(\s*setModalVisible\(true\);)/,
    "$1\n    setPortfolioVideo('');$2"
  );
  console.log('Fix 2: setPortfolioVideo adicionado em openAddModal');
}

// FIX 3: Garantir que saveProfessional salva portfolioVideo
if (!c.includes('portfolioVideo: portfolioVideo')) {
  c = c.replace(
    /(portfolioImages: portfolioImages \|\| \[\],)/,
    "$1\n        portfolioVideo: portfolioVideo || null,"
  );
  console.log('Fix 3: saveProfessional agora salva portfolioVideo');
}

if (c !== original) {
  fs.writeFileSync(filePath, c, 'utf8');
  console.log('Arquivo salvo!');
} else {
  console.log('Nenhuma alteracao feita');
}
