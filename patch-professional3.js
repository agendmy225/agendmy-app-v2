const fs = require('fs');

const filePath = 'src/features/professional/ProfessionalManagementScreen.tsx';
let c = fs.readFileSync(filePath, 'utf8');
const original = c;

// 1. Adicionar handleVideoSelection após handleRemovePortfolioImage
if (!c.includes('handleVideoSelection')) {
  c = c.replace(
    'const handleRemovePortfolioImage = (index: number) => {\n    setPortfolioImages(prev => prev.filter((_, i) => i !== index));\n  };',
    `const handleRemovePortfolioImage = (index: number) => {
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
  };`
  );
  console.log('Handlers de video adicionados');
}

// 2. Adicionar UI do video APÓS o </ScrollView> do portfolio mas ANTES do saveButton
if (!c.includes('Vídeo do Portfólio')) {
  c = c.replace(
    '              </ScrollView>\n              <TouchableOpacity style={[styles.saveButton',
    `              </ScrollView>

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
              )}
              <TouchableOpacity style={[styles.saveButton`
  );
  console.log('UI do video adicionada');
}

if (c !== original) {
  fs.writeFileSync(filePath, c, 'utf8');
  console.log('Arquivo salvo!');
} else {
  console.log('Nada mudou');
}
