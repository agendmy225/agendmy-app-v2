const fs = require('fs');
const c = fs.readFileSync('src/features/professional/ProfessionalManagementScreen.tsx', 'utf8');
console.log('Edit carrega video:', c.includes('setPortfolioVideo(professional.portfolioVideo') ? 'OK' : 'FALTA');
console.log('Add reseta video:', /setPortfolioImages\(\[\]\);\s*setPortfolioVideo/.test(c) ? 'OK' : 'FALTA');
console.log('Save com video:', c.includes('portfolioVideo: portfolioVideo') ? 'OK' : 'FALTA');
