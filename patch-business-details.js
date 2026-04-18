const fs = require('fs');

const filePath = 'src/features/business/BusinessDetailsScreen.tsx';
let c = fs.readFileSync(filePath, 'utf8');
const original = c;

// 1. Add import for GalleryViewerModal
if (!c.includes('GalleryViewerModal')) {
  c = c.replace(
    "import { BusinessMarker } from './components/BusinessMarker';",
    "import { BusinessMarker } from './components/BusinessMarker';\nimport GalleryViewerModal, { GalleryItem } from './components/GalleryViewerModal';"
  );
}

// 2. Add state for gallery modal visibility
if (!c.includes('isGalleryVisible')) {
  c = c.replace(
    "const [isPortfolioModalVisible, setIsPortfolioModalVisible] = useState(false);",
    "const [isPortfolioModalVisible, setIsPortfolioModalVisible] = useState(false);\n  const [isGalleryVisible, setIsGalleryVisible] = useState(false);"
  );
}

// 3. Make the "Ver todas as fotos" button work
if (!c.includes('setIsGalleryVisible(true)')) {
  c = c.replace(
    /<TouchableOpacity style={styles\.seeAllPhotosButton}>\s*<Text style={styles\.seeAllPhotosText}>Ver todas as fotos<\/Text>\s*<\/TouchableOpacity>/,
    `<TouchableOpacity style={styles.seeAllPhotosButton} onPress={() => setIsGalleryVisible(true)}>
                <Text style={styles.seeAllPhotosText}>Ver todas as fotos</Text>
              </TouchableOpacity>`
  );
}

// 4. Add GalleryViewerModal component before the closing of the main View
if (!c.includes('<GalleryViewerModal')) {
  c = c.replace(
    '{/* Modal de portf',
    `{/* Modal de galeria de fotos/video */}
          {business && (
            <GalleryViewerModal
              visible={isGalleryVisible}
              onClose={() => setIsGalleryVisible(false)}
              businessName={business.name || ''}
              items={[
                ...(((business as any).gallery || []) as string[]).map(
                  (path: string) => ({ type: 'photo', storagePath: path } as GalleryItem),
                ),
                ...((business as any).galleryVideo
                  ? [{ type: 'video', storagePath: (business as any).galleryVideo } as GalleryItem]
                  : []),
              ]}
            />
          )}

          {/* Modal de portf`
  );
}

if (c !== original) {
  fs.writeFileSync(filePath, c, 'utf8');
  console.log('BusinessDetailsScreen.tsx modificado com sucesso!');
} else {
  console.log('Nenhuma modificacao necessaria (ja esta atualizado)');
}
