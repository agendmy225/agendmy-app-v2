const fs = require('fs');

const filePath = 'src/features/reviews/ReviewsManagementScreen.tsx';
let c = fs.readFileSync(filePath, 'utf8');
const original = c;

// Padrao com a atualizacao local apos salvamento
const oldPattern = `status: 'responded' as Review['status'], // Atualizar status localmente`;
const newPattern = `// status mantido como approved para a avaliacao continuar visivel ao cliente`;

if (c.includes(oldPattern)) {
  c = c.replace(oldPattern, newPattern);
  console.log('Atualizacao local removida (padrao exato)');
} else {
  // Regex flexivel
  const flexRegex = /status:\s*['"]responded['"]\s+as\s+Review\['status'\],?\s*(\/\/[^\r\n]*)?/;
  if (flexRegex.test(c)) {
    c = c.replace(flexRegex, '// status mantido como approved');
    console.log('Atualizacao local removida (regex)');
  }
}

if (c !== original) {
  fs.writeFileSync(filePath, c, 'utf8');
  console.log('Arquivo salvo!');
}

// Verificacao final
const c2 = fs.readFileSync(filePath, 'utf8');
console.log('\n=== Verificacao final ===');
console.log("Tem 'status: responded' restante:", c2.includes("status: 'responded'") ? 'SIM (BUG)' : 'NAO (OK)');
