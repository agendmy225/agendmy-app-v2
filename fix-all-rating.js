const fs = require('fs');

// ===== FIX 1: Corrigir rejectReview no service (bug do path + adicionar ratings) =====
const servicePath = 'src/services/reviews.ts';
let s = fs.readFileSync(servicePath, 'utf8');
const sOrig = s;

const oldReject = `export const rejectReview = async (
  businessId: string,
  reviewId: string,
): Promise<void> => {
  try {
    const reviewRef = doc(
      firebaseDb,
      'businesses',
      businessId,
      reviewId,
    );
    await updateDoc(reviewRef, {
      status: 'rejected',
    });
  } catch (error) {
    throw error;
  }
};`;

const newReject = `export const rejectReview = async (
  businessId: string,
  reviewId: string,
): Promise<void> => {
  try {
    const reviewRef = doc(
      firebaseDb,
      'businesses',
      businessId,
      'reviews',
      reviewId,
    );
    // Buscar dados antes de rejeitar para saber o professionalId
    const reviewDoc = await getDoc(reviewRef);
    const reviewData = reviewDoc.exists() ? reviewDoc.data() as Review : null;
    
    await updateDoc(reviewRef, {
      status: 'rejected',
    });
    
    // Atualizar medias removendo essa review do calculo
    if (reviewData) {
      await updateBusinessRating(reviewData.businessId);
      if (reviewData.professionalId) {
        await updateProfessionalRating(reviewData.professionalId);
      }
    }
  } catch (error) {
    throw error;
  }
};`;

if (s.includes(oldReject)) {
  s = s.replace(oldReject, newReject);
  console.log('1. rejectReview do service corrigido (path + ratings)');
} else {
  console.log('Padrao do rejectReview nao bateu - tentando regex flexivel');
  const flexReject = /export const rejectReview = async \([\s\S]*?reviewId: string,\s*\): Promise<void> => \{[\s\S]*?status: 'rejected',\s*\}\);\s*\} catch[\s\S]*?\};/;
  if (flexReject.test(s)) {
    s = s.replace(flexReject, newReject);
    console.log('1. rejectReview substituido via regex');
  }
}

if (s !== sOrig) {
  fs.writeFileSync(servicePath, s, 'utf8');
  console.log('Service salvo!');
}

// ===== FIX 2: Painel agora chama service =====
const panelPath = 'src/features/reviews/ReviewsManagementScreen.tsx';
let p = fs.readFileSync(panelPath, 'utf8');
const pOrig = p;

// Substituir approveReview local para chamar service
const oldApproveLocal = `const approveReview = async (reviewId: string) => {
    if (!businessId) return;
    try {
      const reviewRef = doc(firestore, 'businesses', businessId, 'reviews', reviewId);
      await updateDoc(reviewRef, { status: 'approved' });`;

const newApproveLocal = `const approveReview = async (reviewId: string) => {
    if (!businessId) return;
    try {
      // Usa funcao do service que ja atualiza ratings do business e profissional
      await approveReviewService(businessId, reviewId);`;

if (p.includes(oldApproveLocal)) {
  p = p.replace(oldApproveLocal, newApproveLocal);
  console.log('2. approveReview do painel agora usa service');
} else {
  console.log('Padrao approve nao bateu - tentando regex');
  const flexApprove = /const approveReview = async \(reviewId: string\) => \{\s*if \(!businessId\) return;\s*try \{\s*const reviewRef = doc\(firestore, 'businesses', businessId, 'reviews', reviewId\);\s*await updateDoc\(reviewRef, \{ status: 'approved' \}\);/;
  if (flexApprove.test(p)) {
    p = p.replace(flexApprove, newApproveLocal);
    console.log('2. approveReview substituido via regex');
  }
}

// Substituir rejectReview local para chamar service
const oldRejectLocal = `const rejectReview = async (reviewId: string) => {
    if (!businessId) return;
    try {
      const reviewRef = doc(firestore, 'businesses', businessId, 'reviews', reviewId);
      await updateDoc(reviewRef, { status: 'rejected' });`;

const newRejectLocal = `const rejectReview = async (reviewId: string) => {
    if (!businessId) return;
    try {
      // Usa funcao do service que ja atualiza ratings
      await rejectReviewService(businessId, reviewId);`;

if (p.includes(oldRejectLocal)) {
  p = p.replace(oldRejectLocal, newRejectLocal);
  console.log('3. rejectReview do painel agora usa service');
} else {
  console.log('Padrao reject nao bateu - tentando regex');
  const flexReject2 = /const rejectReview = async \(reviewId: string\) => \{\s*if \(!businessId\) return;\s*try \{\s*const reviewRef = doc\(firestore, 'businesses', businessId, 'reviews', reviewId\);\s*await updateDoc\(reviewRef, \{ status: 'rejected' \}\);/;
  if (flexReject2.test(p)) {
    p = p.replace(flexReject2, newRejectLocal);
    console.log('3. rejectReview substituido via regex');
  }
}

if (p !== pOrig) {
  fs.writeFileSync(panelPath, p, 'utf8');
  console.log('Painel salvo!');
}

// Verificacao final
const sFinal = fs.readFileSync(servicePath, 'utf8');
const pFinal = fs.readFileSync(panelPath, 'utf8');
console.log('\n=== Verificacao final ===');
console.log('Service: rejectReview com path correto:', sFinal.includes("'businesses',\n      businessId,\n      'reviews',\n      reviewId") ? 'OK' : 'FALTA');
console.log('Service: rejectReview chama updateBusinessRating:', sFinal.match(/rejectReview[\s\S]*?updateBusinessRating/) ? 'OK' : 'FALTA');
console.log('Painel: usa approveReviewService:', pFinal.includes('await approveReviewService(businessId, reviewId)') ? 'OK' : 'FALTA');
console.log('Painel: usa rejectReviewService:', pFinal.includes('await rejectReviewService(businessId, reviewId)') ? 'OK' : 'FALTA');
