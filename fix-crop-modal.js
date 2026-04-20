const fs = require('fs');

const filePath = 'src/components/common/ImageCropModal.tsx';
let c = fs.readFileSync(filePath, 'utf8');
const original = c;

// Corrigir cropArea para ter overflow: hidden
c = c.replace(
  `  cropArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },`,
  `  cropArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },`
);

// Adicionar overflow hidden no imageContainer tambem, para a imagem respeitar o container
c = c.replace(
  `  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },`,
  `  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },`
);

if (c !== original) {
  fs.writeFileSync(filePath, c, 'utf8');
  console.log('ImageCropModal atualizado com overflow: hidden!');
} else {
  console.log('Nenhuma alteracao');
}
