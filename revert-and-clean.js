const fs = require('fs');

// ===== 1. Reverter BusinessSettingsScreen para não usar selectCropAndUploadImage =====
const bsPath = 'src/features/business/BusinessSettingsScreen.tsx';
let bs = fs.readFileSync(bsPath, 'utf8');
const origBs = bs;

// Remover import problematico
bs = bs.replace(
  "import {\n  deleteImageFromFirebase,\n  selectAndUploadImage,\n  selectCropAndUploadImage,\n} from '../../services/imageUpload';",
  "import {\n  deleteImageFromFirebase,\n  selectAndUploadImage,\n} from '../../services/imageUpload';"
);

// Reverter LOGO para selectAndUploadImage
bs = bs.replace(
  `setIsUploadingLogo(true);
      const result = await selectCropAndUploadImage(
        \`businesses/\${businessId}/logo_\${Date.now()}.jpg\`,
        {
          width: 512,
          height: 512,
        },
      );`,
  `setIsUploadingLogo(true);
      const result = await selectAndUploadImage(
        {
          storageKey: \`businesses/\${businessId}/logo_\${Date.now()}.jpg\`,
        },
        (progress) => {
          setLogoUploadProgress(progress);
        },
      );`
);

// Reverter CAPA para selectAndUploadImage
bs = bs.replace(
  `setIsUploadingCover(true);
      const result = await selectCropAndUploadImage(
        \`businesses/\${businessId}/cover_\${Date.now()}.jpg\`,
        {
          width: 1200,
          height: 675,
        },
      );`,
  `setIsUploadingCover(true);
      const result = await selectAndUploadImage(
        {
          storageKey: \`businesses/\${businessId}/cover_\${Date.now()}.jpg\`,
        },
        (progress) => {
          setCoverUploadProgress(progress);
        },
      );`
);

if (bs !== origBs) {
  fs.writeFileSync(bsPath, bs, 'utf8');
  console.log('BusinessSettingsScreen revertido');
}

// ===== 2. Remover selectCropAndUploadImage do imageUpload.ts =====
const iuPath = 'src/services/imageUpload.ts';
let iu = fs.readFileSync(iuPath, 'utf8');
const origIu = iu;

// Remover o import
iu = iu.replace(/import ImageCropPicker from 'react-native-image-crop-picker';\s*\n/g, '');

// Remover a função selectCropAndUploadImage
iu = iu.replace(/\n\/\*\*\s*\n \* Seleciona uma imagem[\s\S]*?^};/m, '');

// Variante de limpeza alternativa
iu = iu.replace(/export const selectCropAndUploadImage[\s\S]*?^};/m, '');

if (iu !== origIu) {
  fs.writeFileSync(iuPath, iu, 'utf8');
  console.log('imageUpload.ts limpo de referencias ao crop picker');
}

// ===== 3. Remover config UCropActivity do AndroidManifest =====
const manifestPath = 'android/app/src/main/AndroidManifest.xml';
let manifest = fs.readFileSync(manifestPath, 'utf8');
const origManifest = manifest;

manifest = manifest.replace(
  /\s*<activity\s+android:name="com\.yalantis\.ucrop\.UCropActivity"\s+android:screenOrientation="portrait"\s+android:theme="@style\/Theme\.AppCompat\.Light\.NoActionBar"\/>/,
  ''
);

if (manifest !== origManifest) {
  fs.writeFileSync(manifestPath, manifest, 'utf8');
  console.log('AndroidManifest limpo');
}

console.log('Done! Agora execute: npm uninstall react-native-image-crop-picker');
