const admin = require('firebase-admin');
const sa = require('./serviceAccountKey.json');
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
db.collection('businesses').get().then(snap => {
  snap.docs.forEach(doc => {
    const d = doc.data();
    console.log('=== ' + doc.id + ' ===');
    console.log('location:', JSON.stringify(d.location));
    console.log('logo:', d.logo);
    console.log('logotipo:', d.logotipo);
    console.log('imagem de capa:', d['imagem de capa']);
    console.log('coverImage:', d.coverImage);
    console.log('---');
  });
  process.exit(0);
});
