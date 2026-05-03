const fs = require('fs');

const filePath = 'src/features/reviews/ReviewScreen.tsx';
let c = fs.readFileSync(filePath, 'utf8');
const original = c;

// Procurar o bloco de salvamento que tem 2 reviews (business + profissional)
// Substituir por 1 review unica com ambos os ratings

const oldSave = `      // Avaliacao do estabelecimento (com comentario)
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

const newSave = `      // Avaliacao UNIFICADA: 1 review com nota do estabelecimento + nota do profissional + comentario
      const reviewData: any = {
        businessId,
        userId: user?.uid || 'anonymous',
        userName: user?.displayName || user?.email?.split('@')[0] || 'Usuario Anonimo',
        rating, // Nota do estabelecimento
        comment: comment.trim(),
      };
      if (serviceId) { reviewData.serviceId = serviceId; }
      if (appointmentId) { reviewData.appointmentId = appointmentId; }
      // Adicionar dados do profissional se houver
      if (professionalId) {
        reviewData.professionalId = professionalId;
        reviewData.professionalName = professionalName;
        if (professionalRating > 0) {
          reviewData.professionalRating = professionalRating;
        }
      }
      
      await addReview(reviewData);`;

if (c.includes(oldSave)) {
  c = c.replace(oldSave, newSave);
  console.log('Salvamento unificado em 1 review');
} else {
  console.log('Padrao exato nao bateu - tentando regex flexivel');
  // Regex que pega do "// Avaliacao do estabelecimento" ate o fechamento do try/catch do profissional
  const flexRegex = /\/\/ Avaliacao do estabelecimento[\s\S]*?await addReview\(businessReview\);[\s\S]*?if \(professionalId && professionalRating > 0\) \{[\s\S]*?\}\s*\}/;
  if (flexRegex.test(c)) {
    c = c.replace(flexRegex, newSave);
    console.log('Substituido via regex flexivel');
  } else {
    console.log('Regex tambem nao bateu - precisa investigar');
  }
}

if (c !== original) {
  fs.writeFileSync(filePath, c, 'utf8');
  console.log('Arquivo salvo!');
}

// Verificacao
const c2 = fs.readFileSync(filePath, 'utf8');
console.log('\n=== Verificacao ===');
console.log('reviewData unificado:', c2.includes('// Avaliacao UNIFICADA') ? 'OK' : 'FALTA');
console.log('Tem reviewData.professionalRating:', c2.includes('reviewData.professionalRating = professionalRating') ? 'OK' : 'FALTA');
console.log('Sem businessReview separado:', !c2.includes('const businessReview') ? 'OK' : 'AINDA TEM');
console.log('Sem professionalReview separado:', !c2.includes('const professionalReview') ? 'OK' : 'AINDA TEM');
console.log('Apenas 1 await addReview:', (c2.match(/await addReview\(/g) || []).length === 1 ? 'OK' : (c2.match(/await addReview\(/g) || []).length + ' chamadas');
