const fs = require('fs');

const filePath = 'src/features/professional/ProfessionalManagementScreen.tsx';
let c = fs.readFileSync(filePath, 'utf8');
const original = c;

// 1. Adicionar handleVideoSelection logo após handleRemovePortfolioImage
const marker1 = 'const handleRemovePortfolioImage = (index: number) => {\n    setPortfolioImages(prev => prev.filter((_, i) => i !== index));\n  };';

const videoHandlers = `const handleRemovePortfolioImage = (index: number) => {
    setPortfolioImages(prev => prev.filter((_, i) => i !== index));
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
  };`;

if (c.includes(marker1) && !c.includes('handleVideoSelection')) {
  c = c.replace(marker1, videoHandlers);
  console.log('handleVideoSelection adicionado');
} else {
  console.log('Marker1 nao encontrado ou ja existe');
}

// 2. Adicionar UI do vídeo após o ScrollView do portfolio
const marker2 = `<ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.portfolioScrollView}>
                {portfolioImages.map((uri, index) => (
                  <View key={index} style={styles.portfolioImageContainer}>
                    <Image source={{ uri }} style={styles.portfolioImage} />
                    <TouchableOpacity style={styles.removeImageButton} onPress={() => handleRemovePortfolioImage(index)}>
                      <Text style={styles.removeImageButtonText}>X</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>`;

const videoUI = `<ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.portfolioScrollView}>
                {portfolioImages.map((uri, index) => (
                  <View key={index} style={styles.portfolioImageContainer}>
                    <Image source={{ uri }} style={styles.portfolioImage} />
                    <TouchableOpacity style={styles.removeImageButton} onPress={() => handleRemovePortfolioImage(index)}>
                      <Text style={styles.removeImageButtonText}>X</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>

              <Text style={styles.videoLabel}>Vídeo do Portfólio (máx. 20s)</Text>
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
              )}`;

if (c.includes(marker2) && !c.includes('Vídeo do Portfólio')) {
  c = c.replace(marker2, videoUI);
  console.log('UI do video adicionada');
} else {
  console.log('Marker2 nao encontrado ou ja existe');
}

// 3. Adicionar estilos de vídeo se ainda não existirem
if (!c.includes('videoLabel:')) {
  c = c.replace(
    '  disabledButton: {\n    backgroundColor: colors.lightGray,\n  },\n});',
    `  disabledButton: {
    backgroundColor: colors.lightGray,
  },
  videoLabel: {
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
  console.log('Estilos de video adicionados');
}

if (c !== original) {
  fs.writeFileSync(filePath, c, 'utf8');
  console.log('Arquivo atualizado!');
} else {
  console.log('Nenhuma alteracao');
}
