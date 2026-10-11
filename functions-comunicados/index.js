// Cloud Functions do AgendMy em Node.js (codebase "comunicados").
//   - enviarComunicado: envia os comunicados do Painel Admin (push)
//   - rotinaAssinaturas: todo dia as 8h cuida do teste gratis, lembretes,
//     atraso e suspensao dos negocios
// Ficam separadas das funcoes em Python (pasta functions), sem afeta-las.
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');

admin.initializeApp();

const REGION = 'southamerica-east1';
const DAY_MS = 24 * 60 * 60 * 1000;
const PLAN = { trialDays: 30, graceDays: 5 };

const INVALID_TOKEN_CODES = [
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
];

// ---------- envio de push ----------
async function sendToTokens(entries, title, body, data) {
  let successCount = 0;
  let failureCount = 0;
  const invalidRefs = [];
  for (let i = 0; i < entries.length; i += 500) {
    const chunk = entries.slice(i, i + 500);
    const result = await admin.messaging().sendEachForMulticast({
      tokens: chunk.map((e) => e.token),
      notification: { title: title, body: body },
      data: data || {},
      android: { priority: 'high', notification: { channelId: 'default', sound: 'default' } },
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
  await Promise.all(invalidRefs.map((r) => r.delete().catch(() => null)));
  return { successCount: successCount, failureCount: failureCount, removed: invalidRefs.length };
}

async function tokensOfUser(uid) {
  const snap = await admin.firestore().collection('users').doc(uid).collection('tokens').get();
  return snap.docs
    .map((d) => ({ token: d.get('token') || d.id, ref: d.ref }))
    .filter((e) => !!e.token);
}

async function notifyUser(uid, title, body) {
  if (!uid) {
    return;
  }
  try {
    const entries = await tokensOfUser(uid);
    if (entries.length > 0) {
      await sendToTokens(entries, title, body, { type: 'subscription' });
    }
  } catch (err) {
    console.error('Erro ao notificar ' + uid + ':', err);
  }
}

// ---------- comunicados ----------
exports.enviarComunicado = onDocumentCreated(
  { document: 'announcements/{id}', region: REGION },
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

      const audience = announcement.audience || 'all';
      let usersQuery = db.collection('users');
      if (audience === 'client' || audience === 'owner') {
        usersQuery = usersQuery.where('userType', '==', audience);
      }
      const usersSnap = await usersQuery.select().get();
      const uids = new Set(usersSnap.docs.map((d) => d.id));

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

      const result = await sendToTokens(
        entries,
        announcement.title || 'AgendMy',
        announcement.body || '',
        { type: 'announcement', announcementId: event.params.id }
      );

      await ref.update({
        status: 'sent',
        recipients: uids.size,
        tokens: entries.length,
        successCount: result.successCount,
        failureCount: result.failureCount,
        removedTokens: result.removed,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (err) {
      console.error('Erro ao enviar comunicado:', err);
      await ref.update({ status: 'error', errorMessage: String((err && err.message) || err) });
    }
  }
);

// ---------- assinaturas: rotina diaria ----------
const toMillis = (v) => (v && typeof v.toMillis === 'function' ? v.toMillis() : null);

exports.rotinaAssinaturas = onSchedule(
  { schedule: 'every day 08:00', timeZone: 'America/Sao_Paulo', region: REGION },
  async () => {
    const db = admin.firestore();
    const Timestamp = admin.firestore.Timestamp;
    const now = Date.now();
    const snap = await db.collection('businesses').get();
    let changed = 0;

    for (const docSnap of snap.docs) {
      const b = docSnap.data() || {};
      const sub = b.subscription || null;
      const ownerId = b.ownerId;
      const name = b.name || 'seu negocio';

      try {
        // 1) negocio sem assinatura: comeca o teste gratis agora
        if (!sub || !sub.status) {
          await docSnap.ref.update({
            subscription: {
              status: 'trial',
              trialEndsAt: Timestamp.fromMillis(now + PLAN.trialDays * DAY_MS),
              startedAt: Timestamp.fromMillis(now),
              paidCount: 0,
            },
          });
          changed++;
          continue;
        }

        if (sub.exempt === true) {
          continue;
        }

        const lastNotice = sub.lastNotice || '';
        const setNotice = (key) => (key !== lastNotice ? { 'subscription.lastNotice': key } : null);

        // 2) teste gratis
        if (sub.status === 'trial') {
          const end = toMillis(sub.trialEndsAt) || now;
          const daysLeft = Math.ceil((end - now) / DAY_MS);
          if (now >= end) {
            await docSnap.ref.update({
              'subscription.status': 'past_due',
              'subscription.overdueSince': Timestamp.fromMillis(end),
              'subscription.lastNotice': 'trial-ended',
            });
            await notifyUser(ownerId, 'Seu teste gratis terminou',
              'Ative sua assinatura do AgendMy para ' + name + ' continuar aparecendo para os clientes.');
            changed++;
          } else if ([7, 3, 1].includes(daysLeft)) {
            const upd = setNotice('trial-' + daysLeft);
            if (upd) {
              await docSnap.ref.update(upd);
              await notifyUser(ownerId, 'Seu teste gratis termina em ' + daysLeft + ' dia(s)',
                'Ative sua assinatura do AgendMy para nao perder nenhum agendamento.');
            }
          }
          continue;
        }

        // 3) liberacao manual do admin que venceu
        if (sub.status === 'active') {
          const manualUntil = toMillis(sub.manualUntil);
          if (manualUntil && now > manualUntil && !sub.preapprovalId) {
            await docSnap.ref.update({
              'subscription.status': 'past_due',
              'subscription.overdueSince': Timestamp.fromMillis(manualUntil),
              'subscription.manualUntil': null,
            });
            changed++;
          }
          continue;
        }

        // 4) pagamento pendente: lembretes e suspensao
        if (sub.status === 'past_due') {
          const since = toMillis(sub.overdueSince) || now;
          const overdueDays = Math.floor((now - since) / DAY_MS);
          if (overdueDays >= PLAN.graceDays) {
            await docSnap.ref.update({
              'subscription.status': 'suspended',
              'subscription.suspendedAt': Timestamp.fromMillis(now),
              'subscription.lastNotice': 'suspended',
              suspendedForPayment: true,
              active: false,
            });
            await notifyUser(ownerId, name + ' foi suspenso',
              'Seu negocio nao esta mais aparecendo para os clientes. Ative a assinatura para voltar.');
            changed++;
          } else if ([1, 3].includes(overdueDays)) {
            const left = PLAN.graceDays - overdueDays;
            const upd = setNotice('overdue-' + overdueDays);
            if (upd) {
              await docSnap.ref.update(upd);
              await notifyUser(ownerId, 'Pagamento pendente',
                'Faltam ' + left + ' dia(s) para ' + name + ' ser suspenso. Ative sua assinatura no app.');
            }
          }
        }
      } catch (err) {
        console.error('Erro na rotina do negocio ' + docSnap.id + ':', err);
      }
    }

    console.log('rotinaAssinaturas: ' + snap.size + ' negocios verificados, ' + changed + ' atualizados');
  }
);
