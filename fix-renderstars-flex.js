const fs = require('fs');

const filePath = 'src/features/reviews/ReviewScreen.tsx';
let c = fs.readFileSync(filePath, 'utf8');
const original = c;

// ===== 1. Substituir renderStars usando regex flexivel =====
const renderStarsRegex = /const renderStars = \(\) => \{[\s\S]*?return stars;\s*\};/;
const newRenderStars = `const renderStars = (currentRating: number, setCurrentRating: (n: number) => void) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => setCurrentRating(i)}
          style={styles.starButton}
        >
          <Icon
            name={i <= currentRating ? 'star' : 'star-border'}
            size={40}
            color={i <= currentRating ? '#FFD700' : colors.lightText}
          />
        </TouchableOpacity>,
      );
    }
    return stars;
  };`;

if (renderStarsRegex.test(c)) {
  c = c.replace(renderStarsRegex, newRenderStars);
  console.log('1. renderStars substituido (regex flexivel)');
}

// ===== 2. Substituir getRatingText usando regex flexivel =====
const getRatingTextRegex = /const getRatingText = \(\) => \{\s*switch \(rating\) \{/;
if (getRatingTextRegex.test(c)) {
  c = c.replace(getRatingTextRegex, `const getRatingText = (r: number) => {
    switch (r) {`);
  console.log('2. getRatingText substituido');
}

// ===== 3. Substituir secao da avaliacao no JSX =====
const jsxRegex = /\{\/\* Avaliação por estrelas \*\/\}\s*<View style=\{styles\.ratingSection\}>[\s\S]*?<Text style=\{styles\.ratingText\}>\{getRatingText\(\)\}<\/Text>\s*<\/View>/;
const newJsx = `{/* Avaliacao por estrelas - Estabelecimento */}
        <View style={styles.ratingSection}>
          <Text style={styles.sectionTitle}>Como foi sua experiencia no estabelecimento?</Text>
          <View style={styles.starsContainer}>
            {renderStars(rating, setRating)}
          </View>
          <Text style={styles.ratingText}>{getRatingText(rating)}</Text>
        </View>
        {/* Avaliacao do profissional */}
        {professionalId && professionalName ? (
          <View style={styles.ratingSection}>
            <Text style={styles.sectionTitle}>Como foi o atendimento de {professionalName}?</Text>
            <View style={styles.starsContainer}>
              {renderStars(professionalRating, setProfessionalRating)}
            </View>
            <Text style={styles.ratingText}>{getRatingText(professionalRating)}</Text>
          </View>
        ) : null}`;

if (jsxRegex.test(c)) {
  c = c.replace(jsxRegex, newJsx);
  console.log('3. JSX da avaliacao substituido');
} else {
  console.log('JSX nao bateu - tentando padrao alternativo');
  // Tentar sem o comentario
  const jsxRegex2 = /<View style=\{styles\.ratingSection\}>\s*<Text style=\{styles\.sectionTitle\}>Como foi sua [^<]+<\/Text>[\s\S]*?\{getRatingText\(\)\}<\/Text>\s*<\/View>/;
  if (jsxRegex2.test(c)) {
    c = c.replace(jsxRegex2, newJsx.replace('{/* Avaliacao por estrelas - Estabelecimento */}\n        ', ''));
    console.log('3. JSX substituido (regex alternativo)');
  }
}

if (c !== original) {
  fs.writeFileSync(filePath, c, 'utf8');
  console.log('Arquivo salvo!');
}

// Verificacao
const c2 = fs.readFileSync(filePath, 'utf8');
console.log('\n=== Verificacao final ===');
console.log('renderStars com parametros:', c2.includes('renderStars = (currentRating') ? 'OK' : 'FALTA');
console.log('getRatingText com parametro:', c2.includes('getRatingText = (r: number)') ? 'OK' : 'FALTA');
console.log('Chamada renderStars(rating, setRating):', c2.includes('renderStars(rating, setRating)') ? 'OK' : 'FALTA');
console.log('Secao do profissional:', c2.includes('Como foi o atendimento de') ? 'OK' : 'FALTA');
console.log('Chamada renderStars(professionalRating):', c2.includes('renderStars(professionalRating') ? 'OK' : 'FALTA');
