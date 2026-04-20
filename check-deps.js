const fs = require('fs');
const p = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const deps = p.dependencies;

const toCheck = [
  'react-native-gesture-handler',
  'react-native-reanimated',
  '@bam.tech/react-native-image-resizer',
  'react-native-image-resizer',
  'react-native-image-picker',
  'react-native-image-crop-picker',
  'react-native-svg',
];

for (const name of toCheck) {
  console.log(name, ':', deps[name] || 'NAO INSTALADO');
}
