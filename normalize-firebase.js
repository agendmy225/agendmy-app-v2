const admin = require('firebase-admin');
const sa = require('./serviceAccountKey.json');
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function normalizeBusinesses() {
  console.log('Iniciando normalizacao...');
  const snap = await db.collection('businesses').get();
  console.log('Total documentos:', snap.size);

  for (const doc of snap.docs) {
    const d = doc.data();
    const updates = {};

    // Normalizar location com _latitude/_longitude para latitude/longitude
    if (d.location) {
      const loc = d.location;
      const lat = loc.latitude || loc._latitude;
      const lon = loc.longitude || loc._longitude;

      if (lat && lon) {
        // Substituir por GeoPoint correto do Firebase
        updates.location = new admin.firestore.GeoPoint(lat, lon);
        console.log(`[${doc.id}] location: ${lat}, ${lon}`);
      }
    }

    if (Object.keys(updates).length > 0) {
      await doc.ref.update(updates);
      console.log(`[${doc.id}] ✅ Atualizado`);
    } else {
      console.log(`[${doc.id}] Sem alteracoes necessarias`);
    }
  }

  console.log('\n=== Normalizacao concluida ===');
  process.exit(0);
}

normalizeBusinesses().catch(err => {
  console.error('Erro:', err);
  process.exit(1);
});
