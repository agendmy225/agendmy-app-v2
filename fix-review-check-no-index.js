const fs = require('fs');

const filePath = 'src/features/reviews/ReviewScreen.tsx';
let c = fs.readFileSync(filePath, 'utf8');
const original = c;

// 1. Remover getUserReviews do import (causa erro de indice)
c = c.replace(
  /import \{ ([^}]*?), ?getUserReviews([^}]*?) \} from '\.\.\/\.\.\/services\/reviews';/,
  `import { $1$2 } from '../../services/reviews';`
);
// Limpar virgula sobrando se houver
c = c.replace(/import \{ ,\s*([^}]+) \}/, 'import { $1 }');
c = c.replace(/import \{ ([^,}]+),\s*\}/, 'import { $1 }');

// 2. Substituir verificacao via getUserReviews por verificacao na subcolecao do business
const oldCheck = `      // Verificar se o usuario ja avaliou este estabelecimento (limite 1 por cliente)
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
      }`;

const newCheck = `      // Verificar se o usuario ja avaliou este estabelecimento (limite 1 por cliente)
      // Buscamos direto na subcolecao do business para nao precisar de indice composto
      if (user?.uid) {
        try {
          const reviewsRef = collection(firestore, 'businesses', businessId, 'reviews');
          const q = query(reviewsRef, where('userId', '==', user.uid));
          const snap = await getDocs(q);
          if (!snap.empty) {
            // Verificar se algum nao esta rejeitado (rejeitado pode reavaliar)
            const hasActiveReview = snap.docs.some(d => {
              const data = d.data();
              return data.status !== 'rejected';
            });
            if (hasActiveReview) {
              setIsSubmitting(false);
              Alert.alert(
                'Avaliacao ja realizada',
                'Voce ja avaliou este estabelecimento. Cada cliente pode fazer apenas uma avaliacao.',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
              );
              return;
            }
          }
        } catch (checkErr) {
          console.warn('Erro ao verificar avaliacoes anteriores:', checkErr);
          // Nao bloquear se falhar a verificacao
        }
      }`;

if (c.includes(oldCheck)) {
  c = c.replace(oldCheck, newCheck);
  console.log('Verificacao trocada para usar subcolecao do business (sem indice)');
} else {
  // Tentar regex flexivel
  const flexRegex = /\/\/ Verificar se o usuario ja avaliou[\s\S]*?if \(alreadyReviewed\) \{[\s\S]*?\}\s*\}/;
  if (flexRegex.test(c)) {
    c = c.replace(flexRegex, newCheck);
    console.log('Verificacao trocada via regex');
  } else {
    console.log('Padrao nao bateu - verificar manualmente');
  }
}

// 3. Garantir que firestore, collection, query, where, getDocs estao importados
const fbImportIdx = c.indexOf("from '../../config/firebase'");
if (fbImportIdx > -1) {
  const importStartIdx = c.lastIndexOf('import', fbImportIdx);
  const importLine = c.substring(importStartIdx, fbImportIdx + "from '../../config/firebase'".length);
  console.log('Import firebase atual:', importLine);
  
  const needed = ['firestore', 'collection', 'query', 'where', 'getDocs'];
  const missing = needed.filter(n => !importLine.includes(n));
  
  if (missing.length > 0) {
    // Adicionar os faltantes
    const newImport = importLine.replace(/\{([^}]+)\}/, (_, items) => {
      const trimmed = items.trim().replace(/,$/, '');
      return `{ ${trimmed}, ${missing.join(', ')} }`;
    });
    c = c.replace(importLine, newImport);
    console.log('Adicionados ao import firebase:', missing.join(', '));
  } else {
    console.log('Todos imports de firebase ja estao presentes');
  }
} else {
  // Nao tem import de firebase - adicionar
  console.log('Import firebase nao encontrado - precisa adicionar manualmente');
  // Adicionar apos o import do reviews
  const reviewsImportIdx = c.indexOf("from '../../services/reviews';");
  if (reviewsImportIdx > -1) {
    const eolIdx = c.indexOf('\n', reviewsImportIdx);
    c = c.substring(0, eolIdx + 1) + 
        `import { firestore, collection, query, where, getDocs } from '../../config/firebase';\n` + 
        c.substring(eolIdx + 1);
    console.log('Import firebase adicionado');
  }
}

if (c !== original) {
  fs.writeFileSync(filePath, c, 'utf8');
  console.log('Arquivo salvo!');
}

// Verificacao
const c2 = fs.readFileSync(filePath, 'utf8');
console.log('\n=== Verificacao ===');
console.log('getUserReviews removido:', !c2.includes('getUserReviews') ? 'OK' : 'AINDA PRESENTE');
console.log('Import firebase com getDocs:', c2.includes('getDocs') && c2.includes("from '../../config/firebase'") ? 'OK' : 'FALTA');
console.log('Verificacao subcolecao:', c2.includes('businesses\', businessId, \'reviews') ? 'OK' : 'FALTA');
