const fs = require('fs');

const filePath = 'src/features/business/BusinessSettingsScreen.tsx';
let c = fs.readFileSync(filePath, 'utf8');
const original = c;

// 1. Add import for BusinessGallerySection after StorageImage import
if (!c.includes('BusinessGallerySection')) {
  c = c.replace(
    "import StorageImage from '../../components/common/StorageImage';",
    "import StorageImage from '../../components/common/StorageImage';\nimport BusinessGallerySection from './components/BusinessGallerySection';"
  );
}

// 2. Add gallery and galleryVideo to BusinessSettings interface
if (!c.includes('gallery?: string[];')) {
  c = c.replace(
    '  defaultCommissionRate: number; // taxa padrão de comissão (0-1)',
    '  defaultCommissionRate: number; // taxa padrão de comissão (0-1)\n  gallery?: string[];\n  galleryVideo?: string;'
  );
}

// 3. Add gallery fields to initial state
const initialStatePattern = /defaultCommissionRate: 0\.5,\s*\}\);/;
if (!c.match(/gallery: \[\],\s*galleryVideo:/)) {
  c = c.replace(
    initialStatePattern,
    "defaultCommissionRate: 0.5,\n    gallery: [],\n    galleryVideo: '',\n  });"
  );
}

// 4. Load gallery from Firestore in loadBusinessSettings
if (!c.includes('gallery: businessData.gallery')) {
  c = c.replace(
    "defaultCommissionRate: businessData.defaultCommissionRate !== undefined",
    "gallery: businessData.gallery || prevSettings.gallery || [],\n          galleryVideo: businessData.galleryVideo || prevSettings.galleryVideo || '',\n          defaultCommissionRate: businessData.defaultCommissionRate !== undefined"
  );
}

// 5. Add gallery rendering in general settings (before the category picker)
if (!c.includes('<BusinessGallerySection')) {
  const categoryPattern = /(\s*)<View style={styles\.inputContainer}>\s*<Text style={styles\.inputLabel}>Categoria \*<\/Text>/;
  c = c.replace(
    categoryPattern,
    `$1{businessId && (
$1  <BusinessGallerySection
$1    businessId={businessId}
$1    gallery={settings.gallery || []}
$1    galleryVideo={settings.galleryVideo || ''}
$1    onGalleryChange={(g) => updateSettings('gallery', g)}
$1    onVideoChange={(v) => updateSettings('galleryVideo', v)}
$1  />
$1)}
$1<View style={styles.inputContainer}>
$1  <Text style={styles.inputLabel}>Categoria *</Text>`
  );
}

if (c !== original) {
  fs.writeFileSync(filePath, c, 'utf8');
  console.log('BusinessSettingsScreen.tsx modificado com sucesso!');
} else {
  console.log('Nenhuma modificação necessária (já está atualizado)');
}
