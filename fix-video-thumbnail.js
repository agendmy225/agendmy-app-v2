const fs = require('fs');

const modalPath = 'src/features/professional/ProfessionalPortfolioModal.tsx';
let c = fs.readFileSync(modalPath, 'utf8');
const original = c;

// Primeiro: encontrar o bloco do video atual (qualquer variação)
// Vamos usar regex flexivel
const videoBlockRegex = /\{\/\* Video[^*]*\*\/\}\s*\{video \?\s*\(\s*<View style=\{styles\.videoSection\}>[\s\S]*?<\/View>\s*\) : null\}/;

const newVideoBlock = `{/* Video - thumbnail quadrado */}
            {video ? (
              <View style={styles.videoSection}>
                <Text style={styles.sectionTitle}>Vídeo</Text>
                <TouchableOpacity
                  style={styles.videoThumbnailBox}
                  onPress={() => {
                    setCurrentIndex(photos.length);
                    setViewMode('fullscreen');
                  }}
                >
                  <View style={styles.videoThumbnailInner}>
                    <View style={styles.playIconCircle}>
                      <Text style={styles.playIconText}>▶</Text>
                    </View>
                  </View>
                  <Text style={styles.videoThumbnailLabel}>Vídeo de apresentação</Text>
                </TouchableOpacity>
              </View>
            ) : null}`;

if (videoBlockRegex.test(c)) {
  c = c.replace(videoBlockRegex, newVideoBlock);
  console.log('Bloco do video substituido!');
} else {
  console.log('Regex nao bateu. Conteudo atual:');
  const idx = c.indexOf('{/* Video');
  if (idx > -1) {
    console.log(c.substring(idx, idx + 500));
  } else {
    console.log('Nem comentario encontrado');
  }
}

// Adicionar estilos se nao existirem
if (!c.includes('videoThumbnailBox:')) {
  // Procurar o estilo videoCard e adicionar depois
  const stylesAddition = `
  videoThumbnailBox: {
    alignItems: 'center',
    marginTop: 8,
  },
  videoThumbnailInner: {
    width: 140,
    height: 140,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  playIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIconText: {
    fontSize: 24,
    color: colors.primary,
    marginLeft: 4,
  },
  videoThumbnailLabel: {
    fontSize: 13,
    color: colors.lightText,
    textAlign: 'center',
  },`;

  // Inserir antes do fechamento do StyleSheet principal
  c = c.replace(
    /(  videoCardText: \{[\s\S]*?\},)\n\}\);\n\nconst stylesFullscreen/,
    `$1${stylesAddition}\n});\n\nconst stylesFullscreen`
  );
  console.log('Estilos adicionados');
}

if (c !== original) {
  fs.writeFileSync(modalPath, c, 'utf8');
  console.log('Arquivo salvo!');
} else {
  console.log('Nada mudou');
}
