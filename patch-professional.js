const fs = require('fs');

const filePath = 'src/features/professional/ProfessionalManagementScreen.tsx';
let c = fs.readFileSync(filePath, 'utf8');
const original = c;

// 1. Adicionar import de selectAndUploadVideo
c = c.replace(
  "import { selectAndUploadImage, showImagePickerDialog } from '../../services/imageUpload';",
  "import { selectAndUploadImage, selectAndUploadVideo, showImagePickerDialog } from '../../services/imageUpload';"
);

// 2. Adicionar portfolioVideo na interface Professional
c = c.replace(
  "  portfolioImages?: string[];\n}",
  "  portfolioImages?: string[];\n  portfolioVideo?: string;\n}"
);

// 3. Adicionar estado portfolioVideo
c = c.replace(
  "  const [portfolioImages, setPortfolioImages] = useState<string[]>([]);",
  "  const [portfolioImages, setPortfolioImages] = useState<string[]>([]);\n  const [portfolioVideo, setPortfolioVideo] = useState<string>('');"
);

// 4. Modificar handleImageSelection para guardar storagePath em vez de downloadURL
c = c.replace(
  `  const handleImageSelection = async (type: 'profile' | 'portfolio') => {
    const storagePath = \`professional_images/\${user?.uid}/\${Date.now()}.jpg\`;

    showImagePickerDialog(\`Selecionar Imagem \${type === 'profile' ? 'de Perfil' : 'do Portfólio'}\`, async () => {
      try {
        setIsUploading(true);
        const result = await selectAndUploadImage({ storageKey: storagePath });
        if (type === 'profile') {
          setProfessionalImage(result.downloadURL);
        } else {
          setPortfolioImages(prev => [...prev, result.downloadURL]);
        }
      } catch (error) {
        if (error instanceof Error && !error.message.includes('cancelada')) {
          Alert.alert('Erro', 'Falha no upload da imagem.');
        }
      } finally {
        setIsUploading(false);
      }
    });
  };`,
  `  const handleImageSelection = async (type: 'profile' | 'portfolio') => {
    if (type === 'portfolio' && portfolioImages.length >= 7) {
      Alert.alert('Limite atingido', 'Você já tem 7 fotos no portfólio. Remova alguma antes de adicionar mais.');
      return;
    }
    const storagePath = \`professional_images/\${user?.uid}/\${Date.now()}.jpg\`;

    try {
      setIsUploading(true);
      console.log('[Professional] Iniciando upload de', type);
      const result = await selectAndUploadImage({ storageKey: storagePath });
      console.log('[Professional] Upload sucesso:', result.storagePath);
      if (type === 'profile') {
        setProfessionalImage(result.downloadURL);
      } else {
        setPortfolioImages(prev => [...prev, result.downloadURL]);
      }
    } catch (error) {
      console.log('[Professional] Erro no upload:', error);
      if (error instanceof Error && !error.message.includes('cancelada')) {
        Alert.alert('Erro no upload', error.message || 'Falha desconhecida no upload da imagem.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleVideoSelection = async () => {
    const storagePath = \`professional_images/\${user?.uid}/video_\${Date.now()}.mp4\`;
    try {
      setIsUploading(true);
      const result = await selectAndUploadVideo(storagePath);
      setPortfolioVideo(result.downloadURL);
      Alert.alert('Sucesso', 'Vídeo adicionado ao portfólio!');
    } catch (error) {
      if (error instanceof Error && !error.message.includes('cancelada') && !error.message.includes('longo')) {
        Alert.alert('Erro', 'Não foi possível fazer upload do vídeo.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveVideo = () => {
    Alert.alert(
      'Remover vídeo',
      'Tem certeza que deseja remover o vídeo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Remover', style: 'destructive', onPress: () => setPortfolioVideo('') },
      ],
    );
  };`
);

// 5. Modificar openAddModal para resetar portfolioVideo
c = c.replace(
  `  const openAddModal = () => {
    setEditingProfessional(null);
    setProfessionalName('');
    setProfessionalSpecialty('');
    setProfessionalBio('');
    setProfessionalImage('');
    setProfessionalInstagram('');
    setPortfolioImages([]);
    setModalVisible(true);
  };`,
  `  const openAddModal = () => {
    setEditingProfessional(null);
    setProfessionalName('');
    setProfessionalSpecialty('');
    setProfessionalBio('');
    setProfessionalImage('');
    setProfessionalInstagram('');
    setPortfolioImages([]);
    setPortfolioVideo('');
    setModalVisible(true);
  };`
);

// 6. Modificar openEditModal para carregar portfolioVideo
c = c.replace(
  `  const openEditModal = (professional: Professional) => {
    setEditingProfessional(professional);
    setProfessionalName(professional.name);
    setProfessionalSpecialty(professional.specialty);
    setProfessionalBio(professional.bio);
    setProfessionalImage(professional.image);
    setProfessionalInstagram(professional.instagram || '');
    setPortfolioImages(professional.portfolioImages || []);
    setModalVisible(true);
  };`,
  `  const openEditModal = (professional: Professional) => {
    setEditingProfessional(professional);
    setProfessionalName(professional.name);
    setProfessionalSpecialty(professional.specialty);
    setProfessionalBio(professional.bio);
    setProfessionalImage(professional.image);
    setProfessionalInstagram(professional.instagram || '');
    setPortfolioImages(professional.portfolioImages || []);
    setPortfolioVideo(professional.portfolioVideo || '');
    setModalVisible(true);
  };`
);

// 7. Incluir portfolioVideo em professionalData no saveProfessional
c = c.replace(
  "        portfolioImages: portfolioImages || [],",
  "        portfolioImages: portfolioImages || [],\n        portfolioVideo: portfolioVideo || null,"
);

// 8. Adicionar UI do vídeo depois do portfolio
c = c.replace(
  `              <Button title="Adicionar Imagem ao Portfólio" onPress={() => handleImageSelection('portfolio')} disabled={isUploading} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.portfolioScrollView}>
                {portfolioImages.map((uri, index) => (
                  <View key={index} style={styles.portfolioImageContainer}>
                    <Image source={{ uri }} style={styles.portfolioImage} />
                    <TouchableOpacity style={styles.removeImageButton} onPress={() => handleRemovePortfolioImage(index)}>
                      <Text style={styles.removeImageButtonText}>X</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>`,
  `              <View style={styles.portfolioHeader}>
                <Text style={styles.portfolioLabel}>Portfólio ({portfolioImages.length}/7)</Text>
              </View>
              <Button
                title="Adicionar Foto ao Portfólio"
                onPress={() => handleImageSelection('portfolio')}
                disabled={isUploading || portfolioImages.length >= 7}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.portfolioScrollView}>
                {portfolioImages.map((uri, index) => (
                  <View key={index} style={styles.portfolioImageContainer}>
                    <Image source={{ uri }} style={styles.portfolioImage} />
                    <TouchableOpacity style={styles.removeImageButton} onPress={() => handleRemovePortfolioImage(index)}>
                      <Text style={styles.removeImageButtonText}>X</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>

              <Text style={styles.portfolioLabel}>Vídeo do Portfólio (máx. 20s)</Text>
              {portfolioVideo ? (
                <View style={styles.videoPreviewContainer}>
                  <Text style={styles.videoPreviewText}>▶ Vídeo carregado</Text>
                  <TouchableOpacity style={styles.removeVideoButton} onPress={handleRemoveVideo}>
                    <Text style={styles.removeVideoButtonText}>Remover vídeo</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Button
                  title="Adicionar Vídeo (máx. 20s)"
                  onPress={handleVideoSelection}
                  disabled={isUploading}
                />
              )}`
);

// 9. Adicionar estilos para video e portfolio header
c = c.replace(
  "  disabledButton: {\n    backgroundColor: colors.lightGray,\n  },\n});",
  `  disabledButton: {
    backgroundColor: colors.lightGray,
  },
  portfolioHeader: {
    marginTop: 12,
    marginBottom: 6,
  },
  portfolioLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 12,
    marginBottom: 6,
  },
  videoPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  videoPreviewText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  removeVideoButton: {
    backgroundColor: colors.error,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  removeVideoButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
});`
);

if (c !== original) {
  fs.writeFileSync(filePath, c, 'utf8');
  console.log('ProfessionalManagementScreen.tsx atualizado com sucesso!');
} else {
  console.log('Nenhuma alteracao aplicada');
}
