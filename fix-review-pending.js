const fs = require('fs');

const filePath = 'src/services/reviews.ts';
let c = fs.readFileSync(filePath, 'utf8');
const original = c;

// Mudar addReview de 'approved' para 'pending'
const oldStatus = `status: 'approved', // Auto-approve reviews to avoid confusion`;
const newStatus = `status: 'pending', // Avaliacoes vem como pendentes - precisam ser aprovadas pelo dono`;

if (c.includes(oldStatus)) {
  c = c.replace(oldStatus, newStatus);
  console.log('Status mudado para pending');
} else {
  // Tentar regex flexivel
  const flexRegex = /status:\s*['"]approved['"],?\s*(\/\/[^\r\n]*)?/;
  const m = c.match(flexRegex);
  if (m) {
    // Verificar se eh dentro do addReview
    const idx = c.indexOf(m[0]);
    const before = c.substring(Math.max(0, idx - 500), idx);
    if (before.includes('addReview') || before.includes('addDoc')) {
      c = c.replace(m[0], `status: 'pending', // Avaliacoes vem como pendentes`);
      console.log('Status mudado para pending (regex)');
    }
  }
}

if (c !== original) {
  fs.writeFileSync(filePath, c, 'utf8');
  console.log('Arquivo salvo!');
}

// Verificacao
const c2 = fs.readFileSync(filePath, 'utf8');
const addReviewIdx = c2.indexOf('export const addReview');
const nextStatusIdx = c2.indexOf('status:', addReviewIdx);
console.log('\n=== Verificacao ===');
console.log('Em addReview, status atual:', c2.substring(nextStatusIdx, nextStatusIdx + 60));
