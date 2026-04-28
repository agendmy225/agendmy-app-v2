const fs = require('fs');

// Verificar BusinessDetailsScreen
const dt = fs.readFileSync('src/features/business/BusinessDetailsScreen.tsx', 'utf8');

// Ver imports da linha 1-30
const dtLines = dt.split('\n');
console.log('=== BusinessDetailsScreen imports (linhas 1-25) ===');
for (let i = 0; i < 25 && i < dtLines.length; i++) {
  console.log((i+1) + ': ' + dtLines[i]);
}

// Verificar BusinessSettingsScreen tambem
const st = fs.readFileSync('src/features/business/BusinessSettingsScreen.tsx', 'utf8');
const stLines = st.split('\n');
console.log('\n=== BusinessSettingsScreen imports (linhas 1-30) ===');
for (let i = 0; i < 30 && i < stLines.length; i++) {
  console.log((i+1) + ': ' + stLines[i]);
}

// Procurar Linking duplicado
const dtLinkingMatches = (dt.match(/Linking/g) || []).length;
const stLinkingMatches = (st.match(/Linking/g) || []).length;
console.log('\nOcorrencias de Linking em BusinessDetailsScreen:', dtLinkingMatches);
console.log('Ocorrencias de Linking em BusinessSettingsScreen:', stLinkingMatches);

// Procurar duplicatas de import react-native
const dtRNImports = dt.match(/from 'react-native';/g);
console.log('Imports de react-native em BusinessDetailsScreen:', dtRNImports?.length || 0);
