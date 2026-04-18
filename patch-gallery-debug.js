const fs = require('fs');

const filePath = 'src/features/business/components/BusinessGallerySection.tsx';
let c = fs.readFileSync(filePath, 'utf8');

// Add detailed logging to handleAddPhoto
c = c.replace(
  `  const handleAddPhoto = async () => {
    if (gallery.length >= MAX_PHOTOS) {
      Alert.alert('Limite atingido', \`Você já tem \${MAX_PHOTOS} fotos na galeria.\`);
      return;
    }

    try {
      setIsUploadingPhoto(true);
      const result = await selectAndUploadImage({
        storageKey: \`businesses/\${businessId}/gallery/photo_\${Date.now()}.jpg\`,
      });
      onGalleryChange([...gallery, result.storagePath]);
      Alert.alert('Sucesso', 'Foto adicionada à galeria!');
    } catch (error) {
      if (error instanceof Error && !error.message.includes('cancelada')) {
        Alert.alert('Erro', 'Não foi possível fazer upload da foto.');
      }
    } finally {
      setIsUploadingPhoto(false);
    }
  };`,
  `  const handleAddPhoto = async () => {
    console.log('[Gallery] handleAddPhoto called, businessId:', businessId);
    if (gallery.length >= MAX_PHOTOS) {
      Alert.alert('Limite atingido', \`Você já tem \${MAX_PHOTOS} fotos na galeria.\`);
      return;
    }

    try {
      setIsUploadingPhoto(true);
      const storageKey = \`businesses/\${businessId}/gallery/photo_\${Date.now()}.jpg\`;
      console.log('[Gallery] uploading to:', storageKey);
      const result = await selectAndUploadImage({ storageKey });
      console.log('[Gallery] upload success:', result.storagePath);
      onGalleryChange([...gallery, result.storagePath]);
      Alert.alert('Sucesso', 'Foto adicionada à galeria!');
    } catch (error) {
      console.log('[Gallery] upload error:', error);
      if (error instanceof Error && !error.message.includes('cancelada')) {
        Alert.alert('Erro no upload', error.message || 'Erro desconhecido');
      }
    } finally {
      setIsUploadingPhoto(false);
    }
  };`
);

fs.writeFileSync(filePath, c, 'utf8');
console.log('Debug logs adicionados!');
