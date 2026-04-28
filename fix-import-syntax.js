const fs = require('fs');

const filePath = 'src/features/business/BusinessDetailsScreen.tsx';
let c = fs.readFileSync(filePath, 'utf8');
const original = c;

// Corrigir o import quebrado
// Era:
//   View,
// , Linking} from 'react-native';
// Vira:
//   View,
//   Linking,
// } from 'react-native';

c = c.replace(
  /  View,\s*\r?\n, Linking\} from 'react-native';/,
  `  View,
  Linking,
} from 'react-native';`
);

if (c !== original) {
  fs.writeFileSync(filePath, c, 'utf8');
  console.log('Import quebrado corrigido!');
} else {
  console.log('Padrao nao bateu, vou tentar outro');
  // Fallback: regex mais flexivel
  c = c.replace(
    /, Linking\} from 'react-native';/,
    `\n  Linking,\n} from 'react-native';`
  );
  if (c !== original) {
    fs.writeFileSync(filePath, c, 'utf8');
    console.log('Fix aplicado via fallback');
  } else {
    console.log('NADA MUDOU - imprimindo linhas 13-20:');
    const lines = original.split('\n');
    for (let i = 12; i < 20; i++) {
      console.log((i+1) + ': [' + lines[i] + ']');
    }
  }
}
