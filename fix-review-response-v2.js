const fs = require('fs');

const filePath = 'src/features/reviews/ReviewsManagementScreen.tsx';
let c = fs.readFileSync(filePath, 'utf8');
const original = c;

// Remover a linha que muda status para 'responded'
const oldUpdate = `await updateDoc(reviewRef, {
        response: {
          text: responseText,
          date: serverTimestamp(),
        },
        status: 'responded', // Opcional: atualizar status para indicar que foi respondido
      });`;

const newUpdate = `await updateDoc(reviewRef, {
        response: {
          text: responseText,
          date: serverTimestamp(),
        },
        // NAO mudar status - manter 'approved' para a avaliacao continuar visivel ao cliente
      });`;

if (c.includes(oldUpdate)) {
  c = c.replace(oldUpdate, newUpdate);
  console.log('Status nao eh mais alterado para responded');
} else {
  console.log('Padrao exato nao bateu, tentando regex flexivel');
  c = c.replace(
    /(await updateDoc\(reviewRef,\s*\{\s*response:\s*\{[^}]+\},\s*)status:\s*'responded'[^,}]*,?\s*(\}\);)/,
    `$1// status mantido como approved$2`
  );
  console.log('Removido via regex flexivel');
}

if (c !== original) {
  fs.writeFileSync(filePath, c, 'utf8');
  console.log('Arquivo salvo!');
}

// Verificacao
const c2 = fs.readFileSync(filePath, 'utf8');
console.log('\n=== Verificacao ===');
console.log('Status responded removido:', !c2.includes("status: 'responded'") ? 'OK' : 'AINDA PRESENTE');
