const fs = require('fs');

const filePath = 'src/features/reviews/ReviewScreen.tsx';
let c = fs.readFileSync(filePath, 'utf8');
const original = c;

// ===== 1. Adicionar state professionalRating =====
const oldStates = `const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);`;

const newStates = `const [rating, setRating] = useState(0);
  const [professionalRating, setProfessionalRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);`;

if (c.includes(oldStates)) {
  c = c.replace(oldStates, newStates);
  console.log('1. State professionalRating adicionado');
}

// ===== 2. Atualizar renderStars para aceitar parametro (qual rating) =====
const oldRenderStars = `const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => setRating(i)}
          style={styles.starButton}
        >
          <Icon
            name={i <= rating ? 'star' : 'star-border'}
            size={40}
            color={i <= rating ? '#FFD700' : colors.lightText}
          />
        </TouchableOpacity>,
      );
    }
    return stars;
  };`;

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

if (c.includes(oldRenderStars)) {
  c = c.replace(oldRenderStars, newRenderStars);
  console.log('2. renderStars agora aceita parametros');
}

// ===== 3. Atualizar getRatingText para aceitar parametro =====
const oldGetRatingText = `const getRatingText = () => {
    switch (rating) {`;

const newGetRatingText = `const getRatingText = (r: number) => {
    switch (r) {`;

if (c.includes(oldGetRatingText)) {
  c = c.replace(oldGetRatingText, newGetRatingText);
  console.log('3. getRatingText agora aceita parametro');
}

// ===== 4. Atualizar handleSubmitReview para validar e salvar 2 reviews =====
const oldValidation = `if (rating === 0) {
      Alert.alert('Avaliação obrigatória', 'Por favor, selecione uma classificação de 1 a 5 estrelas.');
      return;
    }`;

const newValidation = `if (rating === 0) {
      Alert.alert('Avaliacao obrigatoria', 'Por favor, avalie o estabelecimento com 1 a 5 estrelas.');
      return;
    }
    if (professionalId && professionalRating === 0) {
      Alert.alert('Avaliacao obrigatoria', 'Por favor, avalie o profissional com 1 a 5 estrelas.');
      return;
    }`;

if (c.includes(oldValidation)) {
  c = c.replace(oldValidation, newValidation);
  console.log('4. Validacao do profissional adicionada');
}

// ===== 5. Atualizar reviewData e adicionar segunda review do profissional =====
const oldSave = `      const reviewData: any = {
        businessId,
        userId: user?.uid || 'anonymous',
        userName: user?.displayName || user?.email?.split('@')[0] || 'Usuário Anônimo',
        rating,
        comment: comment.trim(),
      };
      if (serviceId) { reviewData.serviceId = serviceId; }
      if (professionalId) { reviewData.professionalId = professionalId; }
      if (professionalName) { reviewData.professionalName = professionalName; }
      if (appointmentId) { reviewData.appointmentId = appointmentId; }
      
      await addReview(reviewData);`;

const newSave = `      // Avaliacao do estabelecimento (com comentario)
      const businessReview: any = {
        businessId,
        userId: user?.uid || 'anonymous',
        userName: user?.displayName || user?.email?.split('@')[0] || 'Usuario Anonimo',
        rating,
        comment: comment.trim(),
      };
      if (serviceId) { businessReview.serviceId = serviceId; }
      if (appointmentId) { businessReview.appointmentId = appointmentId; }
      
      await addReview(businessReview);
      
      // Avaliacao do profissional (apenas estrelas, comentario opcional vazio)
      if (professionalId && professionalRating > 0) {
        const professionalReview: any = {
          businessId,
          userId: user?.uid || 'anonymous',
          userName: user?.displayName || user?.email?.split('@')[0] || 'Usuario Anonimo',
          rating: professionalRating,
          comment: '', // Avaliacao do profissional nao tem comentario separado
          professionalId,
          professionalName,
        };
        if (appointmentId) { professionalReview.appointmentId = appointmentId; }
        
        try {
          await addReview(professionalReview);
        } catch (profErr) {
          console.warn('Erro ao salvar avaliacao do profissional:', profErr);
          // Nao falhar tudo se o profissional der erro
        }
      }`;

if (c.includes(oldSave)) {
  c = c.replace(oldSave, newSave);
  console.log('5. Salvamento de 2 reviews implementado');
}

// ===== 6. Atualizar JSX da secao do estabelecimento + adicionar secao do profissional =====
const oldRatingSection = `<View style={styles.ratingSection}>
          <Text style={styles.sectionTitle}>Como foi sua experiência?</Text>
          <View style={styles.starsContainer}>
            {renderStars()}
          </View>
          <Text style={styles.ratingText}>{getRatingText()}</Text>
        </View>`;

const newRatingSection = `<View style={styles.ratingSection}>
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

if (c.includes(oldRatingSection)) {
  c = c.replace(oldRatingSection, newRatingSection);
  console.log('6. JSX do profissional adicionado');
}

// ===== 7. Atualizar disabled do botao de envio =====
const oldDisabled = `disabled={isSubmitting || rating === 0}`;
const newDisabled = `disabled={isSubmitting || rating === 0 || (!!professionalId && professionalRating === 0)}`;

if (c.includes(oldDisabled)) {
  c = c.replace(oldDisabled, newDisabled);
  console.log('7. Botao envio considera professional rating');
}

if (c !== original) {
  fs.writeFileSync(filePath, c, 'utf8');
  console.log('\nArquivo salvo!');
}

// Verificacao
const c2 = fs.readFileSync(filePath, 'utf8');
console.log('\n=== Verificacao ===');
console.log('professionalRating state:', c2.includes('professionalRating') ? 'OK' : 'FALTA');
console.log('renderStars com parametros:', c2.includes('renderStars(rating, setRating)') ? 'OK' : 'FALTA');
console.log('Validacao profissional:', c2.includes('professionalRating === 0') ? 'OK' : 'FALTA');
console.log('businessReview separado:', c2.includes('businessReview') ? 'OK' : 'FALTA');
console.log('professionalReview separado:', c2.includes('professionalReview') ? 'OK' : 'FALTA');
console.log('Secao do profissional no JSX:', c2.includes('Como foi o atendimento de') ? 'OK' : 'FALTA');
