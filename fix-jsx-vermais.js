const fs = require('fs');

const filePath = 'src/features/business/BusinessDetailsScreen.tsx';
let c = fs.readFileSync(filePath, 'utf8');
const original = c;

// O JSX quebrado eh:
// {reviews.length > 0 ? (
//   <FlatList ... />
// {!showAllReviews && ... (... )}     <-- BOTOES SOLTOS NO MEIO DO TERNARIO
// {showAllReviews && ... (... )}
// ) : (
//   <Text>...</Text>
// )}

// Solucao: envolver FlatList + botoes em um Fragment <></>

// Detectar EOL
const hasCRLF = c.includes('\r\n');
const EOL = hasCRLF ? '\r\n' : '\n';

// Procurar a estrutura quebrada com regex flexivel
const brokenRegex = /\{reviews\.length > 0 \? \(\s*<FlatList[\s\S]*?\/>\s*\{!showAllReviews && reviews\.length > 4 && \([\s\S]*?<\/TouchableOpacity>\s*\)\}\s*\{showAllReviews && reviews\.length > 4 && \([\s\S]*?<\/TouchableOpacity>\s*\)\}\s*\) : \(/;

const m = c.match(brokenRegex);
if (m) {
  console.log('Padrao quebrado encontrado!');
  
  const replacement = `{reviews.length > 0 ? (
                <>
                  <FlatList
                    data={showAllReviews ? reviews : reviews.slice(0, 4)}
                    renderItem={renderReviewItem}
                    keyExtractor={(item) => item.id || item.comment}
                    horizontal={false}
                    showsHorizontalScrollIndicator={false}
                  />
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
                  )}
                </>
              ) : (`;
  
  c = c.replace(brokenRegex, replacement);
  console.log('JSX corrigido com Fragment <>!');
}

if (c !== original) {
  fs.writeFileSync(filePath, c, 'utf8');
  console.log('Arquivo salvo!');
} else {
  console.log('Nada mudou - regex nao bateu');
}
