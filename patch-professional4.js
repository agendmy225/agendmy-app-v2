const fs = require('fs');

const filePath = 'src/features/professional/ProfessionalManagementScreen.tsx';
let c = fs.readFileSync(filePath, 'utf8');
const original = c;

// Adicionar handleVideoSelection - busca um marcador único que sabemos que existe
if (!c.includes('handleVideoSelection')) {
  // Adicionar logo antes da função openAddModal
  const openAddModalIdx = c.indexOf('const openAddModal = () => {');
  if (openAddModalIdx !== -1) {
    const insertion = `const handleVideoSelection = async () => {
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
  };

  `;
    c = c.substring(0, openAddModalIdx) + insertion + c.substring(openAddModalIdx);
    console.log('Handlers de video adicionados');
  }
}

// Adicionar UI do video - procurar pelo botão de salvar único
if (!c.includes('Vídeo do Portfólio')) {
  const saveBtnIdx = c.indexOf('<TouchableOpacity style={[styles.saveButton');
  if (saveBtnIdx !== -1) {
    // Encontrar a última TouchableOpacity antes do save (que é o fechamento do portfolio ScrollView)
    const beforeSave = c.substring(0, saveBtnIdx);
    // Voltar até achar o fechamento do </ScrollView> mais próximo
    const lastScrollIdx = beforeSave.lastIndexOf('</ScrollView>');
    if (lastScrollIdx !== -1) {
      const videoUI = `</ScrollView>

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

              `;
      c = c.substring(0, lastScrollIdx) + videoUI + c.substring(lastScrollIdx + '</ScrollView>'.length);
      console.log('UI do video adicionada');
    }
  }
}

if (c !== original) {
  fs.writeFileSync(filePath, c, 'utf8');
  console.log('Arquivo atualizado com sucesso!');
} else {
  console.log('Nada mudou - verificar estado atual');
}
