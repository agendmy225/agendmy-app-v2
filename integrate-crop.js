const fs = require('fs');

const filePath = 'src/features/business/BusinessSettingsScreen.tsx';
let c = fs.readFileSync(filePath, 'utf8');
const original = c;

// 1. Adicionar selectCropAndUploadImage no import
if (!c.includes('selectCropAndUploadImage')) {
  c = c.replace(
    "import {\n  deleteImageFromFirebase,\n  selectAndUploadImage,\n} from '../../services/imageUpload';",
    "import {\n  deleteImageFromFirebase,\n  selectAndUploadImage,\n  selectCropAndUploadImage,\n} from '../../services/imageUpload';"
  );
  console.log('Import adicionado');
}

// 2. Substituir chamada da LOGO (crop quadrado 512x512)
const oldLogo = `setIsUploadingLogo(true);
      const result = await selectAndUploadImage(
        {
          storageKey: \`businesses/\${businessId}/logo_\${Date.now()}.jpg\`,
        },
        (progress) => {
          setLogoUploadProgress(progress);
        },
      );`;

const newLogo = `setIsUploadingLogo(true);
      const result = await selectCropAndUploadImage(
        \`businesses/\${businessId}/logo_\${Date.now()}.jpg\`,
        {
          width: 512,
          height: 512,
        },
      );`;

if (c.includes(oldLogo)) {
  c = c.replace(oldLogo, newLogo);
  console.log('Logo upload substituido por crop 1:1 (512x512)');
} else {
  console.log('Padrao da logo nao encontrado');
}

// 3. Substituir chamada da CAPA (crop banner 1200x675 = 16:9)
const oldCover = `setIsUploadingCover(true);
      const result = await selectAndUploadImage(
        {
          storageKey: \`businesses/\${businessId}/cover_\${Date.now()}.jpg\`,
        },
        (progress) => {
          setCoverUploadProgress(progress);
        },
      );`;

const newCover = `setIsUploadingCover(true);
      const result = await selectCropAndUploadImage(
        \`businesses/\${businessId}/cover_\${Date.now()}.jpg\`,
        {
          width: 1200,
          height: 675,
        },
      );`;

if (c.includes(oldCover)) {
  c = c.replace(oldCover, newCover);
  console.log('Capa upload substituido por crop 16:9 (1200x675)');
} else {
  console.log('Padrao da capa nao encontrado');
}

if (c !== original) {
  fs.writeFileSync(filePath, c, 'utf8');
  console.log('Arquivo salvo!');
} else {
  console.log('Nenhuma alteracao');
}
