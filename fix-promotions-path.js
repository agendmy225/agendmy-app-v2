const fs = require('fs');

const filePath = 'src/features/promotion/PromotionManagementScreen.tsx';
let c = fs.readFileSync(filePath, 'utf8');
const original = c;

// 1. Corrigir o caminho do doc para usar a subcolecao correta
const oldDoc = `const serviceRef = doc(firestore, 'services', promo.serviceId);`;
const newDoc = `const serviceRef = doc(firestore, 'businesses', business.id, 'services', promo.serviceId);`;

if (c.includes(oldDoc)) {
  c = c.replace(oldDoc, newDoc);
  console.log('Caminho do doc corrigido para subcolecao correta');
}

// 2. Verificar se updateBusiness esta importado
if (c.includes('updateBusiness(business.id') && !c.match(/import[^;]*updateBusiness[^;]*from/)) {
  console.log('updateBusiness usado mas nao importado - vou corrigir');
  // Adicionar import
  c = c.replace(
    /import \{\s*Business,\s*\} from '\.\.\/\.\.\/services\/businesses';/,
    `import {\n  Business,\n  updateBusiness,\n} from '../../services/businesses';`
  );
  console.log('updateBusiness adicionado ao import');
}

// 3. Verificar se updateBusiness existe no businesses.ts
const businessesContent = fs.readFileSync('src/services/businesses.ts', 'utf8');
const hasUpdateBusiness = businessesContent.includes('export const updateBusiness') || businessesContent.includes('export async function updateBusiness');
console.log('updateBusiness existe em businesses.ts?', hasUpdateBusiness ? 'SIM' : 'NAO');

if (!hasUpdateBusiness) {
  console.log('NOTA: updateBusiness nao existe - vamos remover essa chamada e fazer inline');
  // Substituir a chamada updateBusiness por updateDoc inline
  c = c.replace(
    /await updateBusiness\(business\.id, \{\s*hasActivePromotions,?\s*\}\);/,
    `const businessRef = doc(firestore, 'businesses', business.id);
      await updateDoc(businessRef, { hasActivePromotions });`
  );
  console.log('updateBusiness substituido por updateDoc inline');
  
  // Remover import de updateBusiness se foi adicionado
  c = c.replace(
    /import \{\s*Business,\s*updateBusiness,\s*\} from '\.\.\/\.\.\/services\/businesses';/,
    `import {\n  Business,\n} from '../../services/businesses';`
  );
}

if (c !== original) {
  fs.writeFileSync(filePath, c, 'utf8');
  console.log('Arquivo salvo!');
}
