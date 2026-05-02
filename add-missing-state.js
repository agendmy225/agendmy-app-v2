const fs = require('fs');

const filePath = 'src/features/reviews/ReviewScreen.tsx';
let c = fs.readFileSync(filePath, 'utf8');
const original = c;

// Adicionar state professionalRating apos o state rating
const oldStates = `const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');`;

const newStates = `const [rating, setRating] = useState(0);
  const [professionalRating, setProfessionalRating] = useState(0);
  const [comment, setComment] = useState('');`;

if (c.includes(oldStates)) {
  c = c.replace(oldStates, newStates);
  console.log('State professionalRating adicionado!');
} else {
  // Tentar regex flexivel
  const regex = /const \[rating, setRating\] = useState\(0\);(\r?\n)(\s+)const \[comment/;
  if (regex.test(c)) {
    c = c.replace(regex, `const [rating, setRating] = useState(0);$1$2const [professionalRating, setProfessionalRating] = useState(0);$1$2const [comment`);
    console.log('State adicionado via regex flexivel');
  } else {
    console.log('NAO BATEU - precisa adicionar manualmente');
  }
}

if (c !== original) {
  fs.writeFileSync(filePath, c, 'utf8');
  console.log('Arquivo salvo!');
}

// Verificacao
const c2 = fs.readFileSync(filePath, 'utf8');
console.log('\n=== Verificacao ===');
console.log('State professionalRating declarado:', c2.includes('const [professionalRating, setProfessionalRating]') ? 'OK' : 'FALTA');
