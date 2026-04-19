const fs = require('fs');

const modal = fs.readFileSync('src/features/professional/ProfessionalPortfolioModal.tsx', 'utf8');
const mgmt = fs.readFileSync('src/features/professional/ProfessionalManagementScreen.tsx', 'utf8');

console.log('=== INSTAGRAM ===');
console.log('Handle limpo com regex:', modal.includes("replace(/[@\\s\\/]/g") ? 'OK' : 'FALTA');
console.log('URL web simples:', modal.includes('https://www.instagram.com/${handle}/') ? 'OK' : 'FALTA');

console.log('=== VIDEO THUMBNAIL ===');
console.log('videoThumbnailInner style:', modal.includes('videoThumbnailInner:') ? 'OK' : 'FALTA');
console.log('playIconCircle style:', modal.includes('playIconCircle:') ? 'OK' : 'FALTA');
console.log('UI thumbnail:', modal.includes('<View style={styles.videoThumbnailInner}>') ? 'OK' : 'FALTA');

console.log('=== SCROLL ===');
console.log('flexGrow: 1:', modal.includes('flexGrow: 1') ? 'OK' : 'FALTA');
console.log('paddingBottom: 80:', modal.includes('paddingBottom: 80') ? 'OK' : 'FALTA');

console.log('=== LIMITE 7 FOTOS ===');
console.log('Check >= 7:', mgmt.includes('portfolioImages.length >= 7') ? 'OK' : 'FALTA');

console.log('=== EDIT/SAVE VIDEO ===');
console.log('Edit carrega:', mgmt.includes('setPortfolioVideo(professional.portfolioVideo') ? 'OK' : 'FALTA');
console.log('Save com video:', mgmt.includes('portfolioVideo: portfolioVideo') ? 'OK' : 'FALTA');
