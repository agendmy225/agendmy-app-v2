const fs = require('fs');

const filePath = 'src/features/reviews/ReviewsManagementScreen.tsx';
let c = fs.readFileSync(filePath, 'utf8');
const original = c;

// 1. Adicionar import de approveReview e rejectReview do service
const importLine = `import { Review } from '../../services/reviews';`;
const newImportLine = `import { Review, approveReview as approveReviewService, rejectReview as rejectReviewService } from '../../services/reviews';`;

if (c.includes(importLine)) {
  c = c.replace(importLine, newImportLine);
  console.log('1. Imports do service adicionados');
} else {
  console.log('Import line nao bateu - tentando regex');
  // Tentar regex mais flexivel
  const flexImport = /import \{\s*Review\s*\} from '\.\.\/\.\.\/services\/reviews';/;
  if (flexImport.test(c)) {
    c = c.replace(flexImport, newImportLine);
    console.log('1. Imports adicionados via regex');
  }
}

// 2. Substituir approveReview local para chamar o service
const oldApprove = `const approveReview = async (reviewId: string) => {
    if (!businessId) return;
    try {
      const reviewRef = doc(firestore, 'businesses', businessId, 'reviews', reviewId);
      await updateDoc(reviewRef, { status: 'approved' });`;

const newApprove = `const approveReview = async (reviewId: string) => {
    if (!businessId) return;
    try {
      // Usar funcao do service que ja atualiza ratings do business e profissional
      await approveReviewService(businessId, reviewId);`;

if (c.includes(oldApprove)) {
  c = c.replace(oldApprove, newApprove);
  console.log('2. approveReview local agora usa service (atualiza ratings)');
}

// 3. Substituir rejectReview local para chamar o service
const oldReject = `const rejectReview = async (reviewId: string) => {
    if (!businessId) return;
    try {
      const reviewRef = doc(firestore, 'businesses', businessId, 'reviews', reviewId);
      await updateDoc(reviewRef, { status: 'rejected' });`;

const newReject = `const rejectReview = async (reviewId: string) => {
    if (!businessId) return;
    try {
      // Usar funcao do service que ja atualiza ratings (recalcula sem essa review)
      await rejectReviewService(businessId, reviewId);`;

if (c.includes(oldReject)) {
  c = c.replace(oldReject, newReject);
  console.log('3. rejectReview local agora usa service');
}

if (c !== original) {
  fs.writeFileSync(filePath, c, 'utf8');
  console.log('Arquivo salvo!');
}

// Verificacao
const c2 = fs.readFileSync(filePath, 'utf8');
console.log('\n=== Verificacao ===');
console.log('Importa approveReviewService:', c2.includes('approveReviewService') ? 'OK' : 'FALTA');
console.log('Importa rejectReviewService:', c2.includes('rejectReviewService') ? 'OK' : 'FALTA');
console.log('approveReview chama service:', c2.includes('await approveReviewService(businessId, reviewId)') ? 'OK' : 'FALTA');
console.log('rejectReview chama service:', c2.includes('await rejectReviewService(businessId, reviewId)') ? 'OK' : 'FALTA');
