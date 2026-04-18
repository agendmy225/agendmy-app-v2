const fs = require('fs');

const files = [
  'src/features/business/components/GalleryViewerModal.tsx',
  'src/features/business/components/BusinessGallerySection.tsx',
];

for (const p of files) {
  if (!fs.existsSync(p)) continue;
  let c = fs.readFileSync(p, 'utf8');
  const original = c;
  c = c.replace(/from '\.\.\/\.\.\/config\/firebase'/g, "from '../../../config/firebase'");
  c = c.replace(/from '\.\.\/\.\.\/constants\/colors'/g, "from '../../../constants/colors'");
  c = c.replace(/from '\.\.\/\.\.\/services\/imageUpload'/g, "from '../../../services/imageUpload'");
  c = c.replace(/from '\.\.\/\.\.\/components\/common\/StorageImage'/g, "from '../../../components/common/StorageImage'");
  if (c !== original) {
    fs.writeFileSync(p, c, 'utf8');
    console.log('Fixed:', p);
  } else {
    console.log('No changes:', p);
  }
}
console.log('Done!');
