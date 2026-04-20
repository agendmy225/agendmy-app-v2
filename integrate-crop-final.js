const fs = require('fs');

const filePath = 'src/features/business/BusinessSettingsScreen.tsx';
let c = fs.readFileSync(filePath, 'utf8');
const original = c;

// ===== Substituir handleUploadLogo =====
const oldUploadLogo = `const handleUploadLogo = async () => {
    if (!businessId) {
      Alert.alert('Erro', 'ID do negócio não encontrado');
      return;
    }
    if (!user) {
      Alert.alert('Erro', 'Usuário não autenticado. Faça login novamente.');
      return;
    }
    try {
      setIsUploadingLogo(true);
      const result = await selectAndUploadImage(
        {
          storageKey: \`businesses/\${businessId}/logo_\${Date.now()}.jpg\`,
        },
        (progress) => {
          setLogoUploadProgress(progress);
        },
      );
      // Deletar logo anterior se existir e não for placeholder
      if (settings.logo && !settings.logo.includes('placeholder')) {
        await deleteImageFromFirebase(settings.logo);
      }
      // Atualizar configurações com nova URL
      updateSettings('logo', result.storagePath);
      Alert.alert('Sucesso', 'Logo atualizado com sucesso!');
    } catch (error) {
      if (error instanceof Error && !error.message.includes('cancelada')) {
        console.error("Erro ao fazer upload do logo:", error);
        let errorMessage = 'Não foi possível fazer upload do logo.';
        if (error.message.includes('não autorizado')) {
          errorMessage = 'Erro de autorização. Verifique as configurações do Firebase Storage.';
        } else if (error.message.includes('conexão')) {
          errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
        }
        Alert.alert('Erro', errorMessage);
      }
    } finally {
      setIsUploadingLogo(false);
      setLogoUploadProgress(null);
    }
  };`;

const newUploadLogo = `const handleUploadLogo = async () => {
    if (!businessId) {
      Alert.alert('Erro', 'ID do negócio não encontrado');
      return;
    }
    if (!user) {
      Alert.alert('Erro', 'Usuário não autenticado. Faça login novamente.');
      return;
    }
    const storageKey = \`businesses/\${businessId}/logo_\${Date.now()}.jpg\`;
    startImageCrop(
      1, // aspectRatio quadrado (logo)
      512,
      512,
      storageKey,
      'Ajustar Logo',
      async (_url, path) => {
        // Deletar logo anterior se existir e não for placeholder
        if (settings.logo && !settings.logo.includes('placeholder')) {
          await deleteImageFromFirebase(settings.logo);
        }
        updateSettings('logo', path);
        Alert.alert('Sucesso', 'Logo atualizado com sucesso!');
      },
    );
  };`;

if (c.includes(oldUploadLogo)) {
  c = c.replace(oldUploadLogo, newUploadLogo);
  console.log('handleUploadLogo substituido');
} else {
  console.log('handleUploadLogo pattern nao bateu');
}

// ===== Substituir handleUploadCoverImage =====
const oldUploadCover = `const handleUploadCoverImage = async () => {
    if (!businessId) {
      Alert.alert('Erro', 'ID do negócio não encontrado');
      return;
    }
    if (!user) {
      Alert.alert('Erro', 'Usuário não autenticado. Faça login novamente.');
      return;
    }
    try {
      setIsUploadingCover(true);
      const result = await selectAndUploadImage(
        {
          storageKey: \`businesses/\${businessId}/cover_\${Date.now()}.jpg\`,
        },
        (progress) => {
          setCoverUploadProgress(progress);
        },
      );
      // Deletar imagem anterior se existir e não for placeholder
      if (settings.coverImage && !settings.coverImage.includes('placeholder')) {
        await deleteImageFromFirebase(settings.coverImage);
      }
      // Atualizar configurações com nova URL
      updateSettings('coverImage', result.storagePath);
      Alert.alert('Sucesso', 'Imagem de capa atualizada com sucesso!');
    } catch (error) {
      if (error instanceof Error && !error.message.includes('cancelada')) {
        console.error("Erro ao fazer upload da imagem de capa:", error);
        let errorMessage = 'Não foi possível fazer upload da imagem de capa.';
        if (error.message.includes('não autorizado')) {
          errorMessage = 'Erro de autorização. Verifique as configurações do Firebase Storage.';
        } else if (error.message.includes('conexão')) {
          errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
        }
        Alert.alert('Erro', errorMessage);
      }
    } finally {
      setIsUploadingCover(false);
      setCoverUploadProgress(null);
    }
  };`;

const newUploadCover = `const handleUploadCoverImage = async () => {
    if (!businessId) {
      Alert.alert('Erro', 'ID do negócio não encontrado');
      return;
    }
    if (!user) {
      Alert.alert('Erro', 'Usuário não autenticado. Faça login novamente.');
      return;
    }
    const storageKey = \`businesses/\${businessId}/cover_\${Date.now()}.jpg\`;
    startImageCrop(
      16 / 9, // aspectRatio banner (capa)
      1200,
      675,
      storageKey,
      'Ajustar Capa',
      async (_url, path) => {
        if (settings.coverImage && !settings.coverImage.includes('placeholder')) {
          await deleteImageFromFirebase(settings.coverImage);
        }
        updateSettings('coverImage', path);
        Alert.alert('Sucesso', 'Imagem de capa atualizada com sucesso!');
      },
    );
  };`;

if (c.includes(oldUploadCover)) {
  c = c.replace(oldUploadCover, newUploadCover);
  console.log('handleUploadCoverImage substituido');
} else {
  console.log('handleUploadCoverImage pattern nao bateu');
}

if (c !== original) {
  fs.writeFileSync(filePath, c, 'utf8');
  console.log('Arquivo salvo!');
}
