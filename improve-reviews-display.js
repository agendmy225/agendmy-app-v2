const fs = require('fs');

const filePath = 'src/features/business/BusinessDetailsScreen.tsx';
let c = fs.readFileSync(filePath, 'utf8');
const original = c;

// 1. Mudar cor das estrelas no renderReviewItem para amarelo
c = c.replace(
  /(name=\{i < item\.rating \? 'star' : 'star-border'\}\s*\r?\n?\s*size=\{16\}\s*\r?\n?\s*)color=\{colors\.primary\}/,
  `$1color="#FFD700"`
);
console.log('Cor das estrelas dos comentarios alterada para amarelo');

// 2. Adicionar state para controlar "ver mais"
// Procurar um state existente e adicionar showAllReviews depois
const stateAnchor = "const [reviews, setReviews] = useState<Review[]>([]);";
if (c.includes(stateAnchor) && !c.includes('showAllReviews')) {
  c = c.replace(
    stateAnchor,
    `${stateAnchor}\n  const [showAllReviews, setShowAllReviews] = useState(false);`
  );
  console.log('State showAllReviews adicionado');
}

// 3. Encontrar onde reviews sao renderizados (FlatList ou map) e adicionar limite de 4 + botao ver mais
// Precisamos ver primeiro como esta sendo renderizado
const flatListMatch = c.match(/<FlatList[\s\S]*?data=\{reviews[\s\S]*?\/>/);
const mapMatch = c.match(/\{reviews\.map\([\s\S]*?\)\}/);

if (flatListMatch) {
  console.log('Reviews sao renderizadas via FlatList');
  console.log('FlatList encontrada, tamanho:', flatListMatch[0].length, 'chars');
  
  // Substituir o data por slice baseado em showAllReviews + adicionar botao Ver Mais
  const oldFlatList = flatListMatch[0];
  // Identificar se eh data={reviews}
  const newFlatList = oldFlatList.replace(
    /data=\{reviews\}/,
    'data={showAllReviews ? reviews : reviews.slice(0, 4)}'
  );
  
  if (newFlatList !== oldFlatList) {
    c = c.replace(oldFlatList, newFlatList);
    console.log('FlatList agora limita a 4 sem showAllReviews');
    
    // Adicionar botao "Ver mais" depois da FlatList
    const verMaisButton = `
              {!showAllReviews && reviews.length > 4 && (
                <TouchableOpacity
                  style={styles.verMaisButton}
                  onPress={() => setShowAllReviews(true)}
                >
                  <Text style={styles.verMaisButtonText}>
                    Ver mais {reviews.length - 4} avaliações
                  </Text>
                </TouchableOpacity>
              )}
              {showAllReviews && reviews.length > 4 && (
                <TouchableOpacity
                  style={styles.verMaisButton}
                  onPress={() => setShowAllReviews(false)}
                >
                  <Text style={styles.verMaisButtonText}>Ver menos</Text>
                </TouchableOpacity>
              )}`;
    
    c = c.replace(newFlatList, newFlatList + verMaisButton);
    console.log('Botao Ver mais adicionado apos FlatList');
  }
} else if (mapMatch) {
  console.log('Reviews sao renderizadas via .map()');
  // Tratar caso .map
} else {
  console.log('Nao consegui identificar como reviews sao renderizadas');
}

// 4. Adicionar estilos para verMaisButton
if (!c.includes('verMaisButton:')) {
  // Procurar reviewCard ou algum estilo relacionado para colocar perto
  const styleAnchor = /reviewComment:\s*\{[^}]+\},/;
  const m = c.match(styleAnchor);
  if (m) {
    const newStyle = `${m[0]}
  verMaisButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d31027',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 8,
    alignItems: 'center',
  },
  verMaisButtonText: {
    color: '#d31027',
    fontSize: 14,
    fontWeight: 'bold',
  },`;
    c = c.replace(m[0], newStyle);
    console.log('Estilos verMaisButton adicionados');
  }
}

if (c !== original) {
  fs.writeFileSync(filePath, c, 'utf8');
  console.log('\nArquivo salvo!');
}

// Verificacao
const c2 = fs.readFileSync(filePath, 'utf8');
console.log('\n=== Verificacao ===');
console.log('Cor amarela #FFD700:', c2.includes('#FFD700') ? 'OK' : 'FALTA');
console.log('State showAllReviews:', c2.includes('showAllReviews') ? 'OK' : 'FALTA');
console.log('Botao Ver mais:', c2.includes('Ver mais') ? 'OK' : 'FALTA');
console.log('Estilo verMaisButton:', c2.includes('verMaisButton:') ? 'OK' : 'FALTA');
