const fs = require('fs');

const filePath = 'src/features/business/BusinessSettingsScreen.tsx';
let c = fs.readFileSync(filePath, 'utf8');
const original = c;

// 1. Substituir LOGO - usar regex para pegar o bloco exato
const logoRegex = /setIsUploadingLogo\(true\);\s*const result = await selectAndUploadImage\(\s*\{\s*storageKey: `businesses\/\$\{businessId\}\/logo_\$\{Date\.now\(\)\}\.jpg`,\s*\},\s*\(progress\) => \{\s*setLogoUploadProgress\(progress\);\s*\},\s*\);/;

const newLogo = `setIsUploadingLogo(true);
      const result = await selectCropAndUploadImage(
        \`businesses/\${businessId}/logo_\${Date.now()}.jpg\`,
        {
          width: 512,
          height: 512,
        },
      );`;

if (logoRegex.test(c)) {
  c = c.replace(logoRegex, newLogo);
  console.log('Logo substituida por crop 1:1 (512x512)');
} else {
  console.log('Regex da logo nao bateu');
}

// 2. Substituir CAPA
const coverRegex = /setIsUploadingCover\(true\);\s*const result = await selectAndUploadImage\(\s*\{\s*storageKey: `businesses\/\$\{businessId\}\/cover_\$\{Date\.now\(\)\}\.jpg`,\s*\},\s*\(progress\) => \{\s*setCoverUploadProgress\(progress\);\s*\},\s*\);/;

const newCover = `setIsUploadingCover(true);
      const result = await selectCropAndUploadImage(
        \`businesses/\${businessId}/cover_\${Date.now()}.jpg\`,
        {
          width: 1200,
          height: 675,
        },
      );`;

if (coverRegex.test(c)) {
  c = c.replace(coverRegex, newCover);
  console.log('Capa substituida por crop 16:9 (1200x675)');
} else {
  console.log('Regex da capa nao bateu');
}

if (c !== original) {
  fs.writeFileSync(filePath, c, 'utf8');
  console.log('Arquivo salvo!');
} else {
  console.log('Nenhuma alteracao');
}
