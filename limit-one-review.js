const fs = require('fs');

const filePath = 'src/features/reviews/ReviewScreen.tsx';
let c = fs.readFileSync(filePath, 'utf8');
const original = c;

// 1. Verificar se getUserReviews ja esta importado
const importsIdx = c.indexOf("from '../../services/reviews'");
if (importsIdx > -1) {
  // Pegar o import inteiro
  const importStartIdx = c.lastIndexOf('import', importsIdx);
  const importLine = c.substring(importStartIdx, importsIdx + "from '../../services/reviews'".length);
  console.log('Import atual:', importLine);
  
  if (!importLine.includes('getUserReviews')) {
    // Adicionar getUserReviews no import
    const newImport = importLine.replace(/\{([^}]+)\}/, (_, items) => {
      const trimmed = items.trim();
      return `{ ${trimmed}, getUserReviews }`;
    });
    c = c.replace(importLine, newImport);
    console.log('1. getUserReviews adicionado ao import');
  } else {
    console.log('1. getUserReviews ja estava no import');
  }
}

// 2. Adicionar verificacao no inicio do handleSubmitReview
const oldStart = `try {
      setIsSubmitting(true);
      // Construir objeto removendo campos undefined`;

const newStart = `try {
      setIsSubmitting(true);
      
      // Verificar se o usuario ja avaliou este estabelecimento (limite 1 por cliente)
      if (user?.uid) {
        const userReviews = await getUserReviews(user.uid, 100);
        const alreadyReviewed = userReviews.some(r => r.businessId === businessId);
        if (alreadyReviewed) {
          setIsSubmitting(false);
          Alert.alert(
            'Avaliacao ja realizada',
            'Voce ja avaliou este estabelecimento. Cada cliente pode fazer apenas uma avaliacao.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
          return;
        }
      }
      
      // Construir objeto removendo campos undefined`;

if (c.includes(oldStart)) {
  c = c.replace(oldStart, newStart);
  console.log('2. Verificacao de avaliacao duplicada adicionada');
} else {
  console.log('Padrao do try/setIsSubmitting nao bateu, vou tentar regex');
  const flexRegex = /try \{\s*setIsSubmitting\(true\);\s*(\/\/[^\r\n]*\r?\n)?(\s*\/\/[^\r\n]*\r?\n)?\s*const reviewData/;
  if (flexRegex.test(c)) {
    c = c.replace(flexRegex, `try {
      setIsSubmitting(true);
      
      // Verificar se o usuario ja avaliou este estabelecimento (limite 1 por cliente)
      if (user?.uid) {
        const userReviews = await getUserReviews(user.uid, 100);
        const alreadyReviewed = userReviews.some(r => r.businessId === businessId);
        if (alreadyReviewed) {
          setIsSubmitting(false);
          Alert.alert(
            'Avaliacao ja realizada',
            'Voce ja avaliou este estabelecimento. Cada cliente pode fazer apenas uma avaliacao.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
          return;
        }
      }
      
      // Construir objeto removendo campos undefined (Firestore nao aceita undefined)
      const reviewData`);
    console.log('2. Verificacao adicionada via regex');
  }
}

// 3. Atualizar mensagem de sucesso para indicar que precisa de aprovacao
const oldSuccess = `'Obrigado pelo seu feedback. Sua avaliação foi publicada com sucesso e já aparece na página do estabelecimento.'`;
const newSuccess = `'Avaliacao enviada! Aguardando aprovacao do estabelecimento. Apos aprovada, ela aparecera na pagina.'`;

if (c.includes(oldSuccess)) {
  c = c.replace(oldSuccess, newSuccess);
  console.log('3. Mensagem de sucesso atualizada para informar sobre aprovacao');
}

if (c !== original) {
  fs.writeFileSync(filePath, c, 'utf8');
  console.log('Arquivo salvo!');
}

// Verificacao
const c2 = fs.readFileSync(filePath, 'utf8');
console.log('\n=== Verificacao ===');
console.log('Import getUserReviews:', c2.includes('getUserReviews') ? 'OK' : 'FALTA');
console.log('Verificacao alreadyReviewed:', c2.includes('alreadyReviewed') ? 'OK' : 'FALTA');
console.log('Mensagem aguardando aprovacao:', c2.includes('Aguardando aprovacao') ? 'OK' : 'FALTA');
