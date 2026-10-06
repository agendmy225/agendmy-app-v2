// Cloud Function "enviarComunicado" (codebase "comunicados", Node.js).
// Disparada quando o Painel Admin cria um documento em announcements/{id}.
// Busca os celulares do publico escolhido e envia a notificacao via FCM.
// Fica separada das funcoes em Python (pasta functions), sem afeta-las.
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');

admin.initializeApp();

const INVALID_TOKEN_CODES = [
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
];

exports.enviarComunicado = onDocumentCreated(
  { document: 'announcements/{id}', region: 'southamerica-east1' },
  async (event) => {
    const snap = event.data;
    if (!snap) {
      return;
    }
    const announcement = snap.data() || {};
    if (announcement.status && announcement.status !== 'pending') {
      return;
    }

    const db = admin.firestore();
    const ref = snap.ref;

    try {
      await ref.update({ status: 'sending' });

      // 1) usuarios do publico escolhido
      const audience = announcement.audience || 'all';
      let usersQuery = db.collection('users');
      if (audience === 'client' || audience === 'owner') {
        usersQuery = usersQuery.where('userType', '==', audience);
      }
      const usersSnap = await usersQuery.select().get();
      const uids = new Set(usersSnap.docs.map((d) => d.id));

      // 2) aparelhos (users/{uid}/tokens/{token}) desses usuarios
      const tokensSnap = await db.collectionGroup('tokens').get();
      const entries = [];
      const seen = new Set();
      tokensSnap.docs.forEach((d) => {
        const userDoc = d.ref.parent.parent;
        if (!userDoc || !userDoc.parent || userDoc.parent.id !== 'users') {
          return;
        }
        if (!uids.has(userDoc.id)) {
          return;
        }
        const token = d.get('token') || d.id;
        if (!token || seen.has(token)) {
          return;
        }
        seen.add(token);
        entries.push({ token: token, ref: d.ref });
      });

      // 3) envio em lotes de 500
      let successCount = 0;
      let failureCount = 0;
      const invalidRefs = [];
      for (let i = 0; i < entries.length; i += 500) {
        const chunk = entries.slice(i, i + 500);
        const result = await admin.messaging().sendEachForMulticast({
          tokens: chunk.map((e) => e.token),
          notification: {
            title: announcement.title || 'AgendMy',
            body: announcement.body || '',
          },
          data: { type: 'announcement', announcementId: event.params.id },
          android: {
            priority: 'high',
            notification: { channelId: 'default', sound: 'default' },
          },
        });
        successCount += result.successCount;
        failureCount += result.failureCount;
        result.responses.forEach((r, idx) => {
          const code = r.error && r.error.code;
          if (!r.success && INVALID_TOKEN_CODES.includes(code)) {
            invalidRefs.push(chunk[idx].ref);
          }
        });
      }

      // 4) limpa aparelhos que desinstalaram o app
      await Promise.all(invalidRefs.map((r) => r.delete().catch(() => null)));

      await ref.update({
        status: 'sent',
        recipients: uids.size,
        tokens: entries.length,
        successCount: successCount,
        failureCount: failureCount,
        removedTokens: invalidRefs.length,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (err) {
      console.error('Erro ao enviar comunicado:', err);
      await ref.update({
        status: 'error',
        errorMessage: String((err && err.message) || err),
      });
    }
  }
);
