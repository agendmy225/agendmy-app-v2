// migrate-firebase.js
// Rode: node migrate-firebase.js
// Este script renomeia os campos:
//   localização -> location
//   logotipo -> logo
// em todos os documentos da coleção businesses

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function migrateBusinesses() {
  console.log('Iniciando migração...');

  const snapshot = await db.collection('businesses').get();
  console.log(`Total de documentos: ${snapshot.size}`);

  let successCount = 0;
  let errorCount = 0;

  for (const docSnap of snapshot.docs) {
    try {
      const data = docSnap.data();
      const updates = {};
      const deletes = {};

      // Migrar campo localização -> location
      if (data['localização'] && !data['location']) {
        const geoPoint = data['localização'];
        updates['location'] = {
          latitude: geoPoint.latitude || geoPoint._latitude,
          longitude: geoPoint.longitude || geoPoint._longitude,
        };
        deletes['localização'] = admin.firestore.FieldValue.delete();
        console.log(`[${docSnap.id}] Migrando localização -> location`);
      }

      // Migrar campo logotipo -> logo
      if (data['logotipo'] && !data['logo']) {
        updates['logo'] = data['logotipo'];
        deletes['logotipo'] = admin.firestore.FieldValue.delete();
        console.log(`[${docSnap.id}] Migrando logotipo -> logo`);
      }

      // Migrar campo imagem de capa -> coverImage
      if (data['imagem de capa'] && !data['coverImage']) {
        updates['coverImage'] = data['imagem de capa'];
        deletes['imagem de capa'] = admin.firestore.FieldValue.delete();
        console.log(`[${docSnap.id}] Migrando imagem de capa -> coverImage`);
      }

      const allUpdates = { ...updates, ...deletes };

      if (Object.keys(allUpdates).length > 0) {
        await docSnap.ref.update(allUpdates);
        console.log(`[${docSnap.id}] ✅ Atualizado com sucesso`);
        successCount++;
      } else {
        console.log(`[${docSnap.id}] Nenhuma migração necessária`);
      }

    } catch (err) {
      console.error(`[${docSnap.id}] ❌ Erro:`, err.message);
      errorCount++;
    }
  }

  console.log('\n=== Migração concluída ===');
  console.log(`✅ Sucesso: ${successCount}`);
  console.log(`❌ Erros: ${errorCount}`);
  process.exit(0);
}

migrateBusinesses().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
