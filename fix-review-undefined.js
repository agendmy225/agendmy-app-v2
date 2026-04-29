const fs = require('fs');

const filePath = 'src/features/reviews/ReviewScreen.tsx';
let c = fs.readFileSync(filePath, 'utf8');
const original = c;

// Padrao atual:
const oldCode = `await addReview({
        businessId,
        userId: user?.uid || 'anonymous',
        userName: user?.displayName || user?.email?.split('@')[0] || 'Usuário Anônimo',
        serviceId: serviceId || undefined, // Allow undefined for general business reviews
        professionalId,
        professionalName,
        appointmentId,
        rating,
        comment: comment.trim(),
      });`;

const newCode = `// Construir objeto removendo campos undefined (Firestore nao aceita undefined)
      const reviewData: any = {
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

if (c.includes(oldCode)) {
  c = c.replace(oldCode, newCode);
  console.log('handleSubmitReview corrigido para nao enviar undefined');
} else {
  console.log('Padrao exato nao bateu, tentando regex flexivel');
  // Tentar com regex flexivel
  const flexRegex = /await addReview\(\{[\s\S]*?comment:\s*comment\.trim\(\),?\s*\}\);/;
  if (flexRegex.test(c)) {
    c = c.replace(flexRegex, newCode);
    console.log('Substituido via regex flexivel');
  }
}

if (c !== original) {
  fs.writeFileSync(filePath, c, 'utf8');
  console.log('Arquivo salvo!');
}
