const fs = require('fs');

const filePath = 'src/services/reviews.ts';
let c = fs.readFileSync(filePath, 'utf8');
const original = c;

// 1. Adicionar campo professionalRating no type Review
const oldType = `  rating: number;
  comment: string;`;

const newType = `  rating: number;
  professionalRating?: number;
  comment: string;`;

if (c.includes(oldType) && !c.includes('professionalRating?:')) {
  c = c.replace(oldType, newType);
  console.log('1. Campo professionalRating adicionado ao type Review');
}

// 2. Modificar updateProfessionalRating para usar professionalRating em vez de rating
const oldUpdate = `reviewsSnapshot.forEach((docSnapshot: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
      const review = docSnapshot.data() as Review;
      totalRating += review.rating;
      count++;
    });`;

const newUpdate = `reviewsSnapshot.forEach((docSnapshot: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
      const review = docSnapshot.data() as Review;
      // Usar professionalRating (nota especifica do profissional) - se nao tiver, ignora
      if (review.professionalRating && review.professionalRating > 0) {
        totalRating += review.professionalRating;
        count++;
      }
    });`;

// Procurar o updateProfessionalRating especificamente
const idxUpdProf = c.indexOf('export const updateProfessionalRating');
if (idxUpdProf > -1) {
  // Encontrar o forEach DENTRO desta funcao
  const idxForEach = c.indexOf('reviewsSnapshot.forEach', idxUpdProf);
  if (idxForEach > -1) {
    // Pegar do forEach ate o `});` correspondente
    const blockStart = idxForEach;
    const blockEnd = c.indexOf('});', blockStart) + 3;
    const oldBlock = c.substring(blockStart, blockEnd);
    
    if (oldBlock.includes('totalRating += review.rating')) {
      const newBlock = `reviewsSnapshot.forEach((docSnapshot: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
      const review = docSnapshot.data() as Review;
      // Usar professionalRating (nota especifica do profissional) - se nao tiver, ignora
      if (review.professionalRating && review.professionalRating > 0) {
        totalRating += review.professionalRating;
        count++;
      }
    });`;
      c = c.substring(0, blockStart) + newBlock + c.substring(blockEnd);
      console.log('2. updateProfessionalRating agora usa campo professionalRating');
    }
  }
}

if (c !== original) {
  fs.writeFileSync(filePath, c, 'utf8');
  console.log('Arquivo salvo!');
}

// Verificacao
const c2 = fs.readFileSync(filePath, 'utf8');
console.log('\n=== Verificacao ===');
console.log('Type Review tem professionalRating:', c2.includes('professionalRating?: number') ? 'OK' : 'FALTA');
console.log('updateProfessionalRating usa professionalRating:', c2.match(/updateProfessionalRating[\s\S]{0,800}review\.professionalRating/) ? 'OK' : 'FALTA');
