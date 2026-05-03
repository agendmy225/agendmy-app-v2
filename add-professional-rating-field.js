const fs = require('fs');

const filePath = 'src/services/reviews.ts';
let c = fs.readFileSync(filePath, 'utf8');
const original = c;

// Procurar a linha "rating: number;" e adicionar professionalRating?: number; depois
// Usando regex flexivel que aceita CRLF/LF
const ratingRegex = /(  rating: number;\r?\n)/;
if (ratingRegex.test(c) && !c.includes('professionalRating?:')) {
  c = c.replace(ratingRegex, '$1  professionalRating?: number;\n');
  console.log('Campo professionalRating adicionado ao type Review');
}

if (c !== original) {
  fs.writeFileSync(filePath, c, 'utf8');
  console.log('Arquivo salvo!');
}

// Verificacao
const c2 = fs.readFileSync(filePath, 'utf8');
console.log('\n=== Verificacao ===');
console.log('Type Review tem professionalRating:', c2.includes('professionalRating?: number') ? 'OK' : 'FALTA');

// Mostrar como ficou o type
const idx = c2.indexOf('export interface Review');
const end = c2.indexOf('}', idx);
console.log('\n=== Type atualizado ===');
console.log(c2.substring(idx, end + 1));
