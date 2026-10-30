// Cloud Functions do AgendMy - agendamentos (codebase "agendamentos").
//   - horariosLivres: calcula os horarios livres de um profissional num dia,
//     sem o app precisar ler os agendamentos de outras pessoas
//   - criarAgendamento: grava o agendamento do cliente com trava contra horario
//     duplo; preco, duracao e nomes vem do banco, nao do aparelho
// Ficam separadas das outras funcoes (Python e comunicados), sem afeta-las.
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

const REGION = 'southamerica-east1';
const TZ = 'America/Sao_Paulo';
const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const OPEN = ['scheduled', 'confirmed'];
const MAX_DAYS_AHEAD = 180;

// ---------- utilitarios ----------
const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const isTime = (s) => typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
const isId = (s) => typeof s === 'string' && s.length > 0 && s.length < 200 && !s.includes('/');

const toMinutes = (t) => {
  const [h, m] = String(t || '0:0').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};
const toTime = (min) =>
  String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0');

// mesma regra do app: 60, "60", "60 min", "1h", "1 hora", "1h30", "1:30"
const parseDurationMin = (d, fallback = 60) => {
  if (typeof d === 'number') {
    return d > 0 ? Math.round(d) : fallback;
  }
  const s = String(d || '').toLowerCase().trim();
  if (!s) {
    return fallback;
  }
  const hm = s.match(/^(\d+):(\d{2})$/);
  if (hm) {
    return parseInt(hm[1], 10) * 60 + parseInt(hm[2], 10) || fallback;
  }
  const h = s.match(/^(\d+(?:[.,]\d+)?)\s*h(?:ora)?s?\s*(\d+)?/);
  if (h) {
    const total = Math.round(parseFloat(h[1].replace(',', '.')) * 60) + (h[2] ? parseInt(h[2], 10) : 0);
    return total > 0 ? total : fallback;
  }
  const n = s.match(/(\d+)/);
  return n && parseInt(n[1], 10) > 0 ? parseInt(n[1], 10) : fallback;
};

// data e hora atuais no horario de Brasilia (o servidor roda em UTC)
const nowInBrazil = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date());
  const get = (t) => (parts.find((p) => p.type === t) || {}).value;
  return {
    date: get('year') + '-' + get('month') + '-' + get('day'),
    minutes: parseInt(get('hour'), 10) * 60 + parseInt(get('minute'), 10),
  };
};

const weekdayKey = (date) => {
  const [y, m, d] = date.split('-').map(Number);
  return DAY_KEYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
};

const daysBetween = (a, b) => {
  const [y1, m1, d1] = a.split('-').map(Number);
  const [y2, m2, d2] = b.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
};

const formatBr = (date) => {
  const [, m, d] = date.split('-');
  return d + '/' + m;
};

// horario do estabelecimento num dia ({ open, start, end })
const businessDayWindow = (wh, dayKey) => {
  const d = wh && wh[dayKey];
  if (!d || d.open === false || !d.start || !d.end) {
    return null;
  }
  return { start: d.start, end: d.end };
};

// janela de trabalho do profissional numa data (null = nao atende) - igual ao app
const resolveDayWindow = (prof, wh, date) => {
  if (Array.isArray(prof && prof.blockedDates) && prof.blockedDates.includes(date)) {
    return null;
  }
  const dayKey = weekdayKey(date);
  const schedule = prof && prof.schedule;
  if (schedule && Object.prototype.hasOwnProperty.call(schedule, dayKey)) {
    const s = schedule[dayKey];
    if (!s || !s.start || !s.end) {
      return null;
    }
    return { start: s.start, end: s.end, breakStart: s.breakStart, breakEnd: s.breakEnd };
  }
  return businessDayWindow(wh, dayKey);
};

// horarios livres: duracao, intervalo, ocupados e horarios que ja passaram
const computeFreeSlots = ({ prof, wh, date, durationMin, busy, stepMin }) => {
  const now = nowInBrazil();
  if (date < now.date || daysBetween(now.date, date) > MAX_DAYS_AHEAD) {
    return [];
  }
  const w = resolveDayWindow(prof, wh, date);
  if (!w) {
    return [];
  }
  const step = stepMin > 0 ? stepMin : 30;
  const duration = durationMin > 0 ? durationMin : 60;
  const isToday = date === now.date;
  const out = [];
  for (let m = toMinutes(w.start); m + duration <= toMinutes(w.end); m += step) {
    if (isToday && m <= now.minutes) {
      continue;
    }
    const e = m + duration;
    if (w.breakStart && w.breakEnd && m < toMinutes(w.breakEnd) && e > toMinutes(w.breakStart)) {
      continue;
    }
    if (busy.some(([s, f]) => m < f && e > s)) {
      continue;
    }
    out.push(toTime(m));
  }
  return out;
};

const busyFromDocs = (docs, ignoreId) =>
  docs
    .filter((d) => d.id !== ignoreId && OPEN.includes((d.data() || {}).status))
    .map((d) => {
      const a = d.data() || {};
      const s = toMinutes(a.time);
      return [s, s + parseDurationMin(a.duration)];
    });

const appointmentsOfDay = (professionalId, date) =>
  db.collection('appointments')
    .where('professionalId', '==', professionalId)
    .where('date', '==', date);

const loadProfessionalAndHours = async (professionalId) => {
  const profSnap = await db.collection('professionals').doc(professionalId).get();
  if (!profSnap.exists) {
    throw new HttpsError('not-found', 'Profissional não encontrado.');
  }
  const prof = profSnap.data() || {};
  let wh = {};
  if (prof.businessId) {
    const bizSnap = await db.collection('businesses').doc(prof.businessId).get();
    wh = (bizSnap.exists && (bizSnap.data() || {}).workingHours) || {};
  }
  return { prof, wh };
};

// ---------- horarios livres ----------
exports.horariosLivres = onCall({ region: REGION }, async (req) => {
  console.log('horariosLivres chamada', JSON.stringify({ logado: !!req.auth, dados: req.data || null }));
  if (!req.auth) {
    throw new HttpsError('unauthenticated', 'Faça login para ver os horários.');
  }
  const data = req.data || {};
  const professionalId = data.professionalId;
  const date = data.date;
  if (!isId(professionalId) || !isDate(date)) {
    throw new HttpsError('invalid-argument', 'Profissional ou data inválidos.');
  }
  const durationMin = Math.min(Math.max(parseDurationMin(data.durationMin), 5), 720);
  const stepMin = [15, 30, 60].includes(Number(data.stepMin)) ? Number(data.stepMin) : 30;
  const ignoreId = isId(data.ignoreAppointmentId) ? data.ignoreAppointmentId : null;

  const { prof, wh } = await loadProfessionalAndHours(professionalId);
  const snap = await appointmentsOfDay(professionalId, date).get();
  const slots = computeFreeSlots({
    prof, wh, date, durationMin, stepMin,
    busy: busyFromDocs(snap.docs, ignoreId),
  });
  console.log('horariosLivres', JSON.stringify({
    uid: req.auth.uid, professionalId: professionalId, date: date,
    durationMin: durationMin, livres: slots.length,
  }));
  return { slots };
});

// ---------- criar agendamento do cliente ----------
exports.criarAgendamento = onCall({ region: REGION }, async (req) => {
  console.log('criarAgendamento chamada', JSON.stringify({ logado: !!req.auth }));
  if (!req.auth) {
    throw new HttpsError('unauthenticated', 'Faça login para agendar.');
  }
  const uid = req.auth.uid;
  const data = req.data || {};
  const { businessId, serviceId, professionalId } = data;
  const sessions = Array.isArray(data.sessions) ? data.sessions : [];

  if (!isId(businessId) || !isId(serviceId) || !isId(professionalId)) {
    throw new HttpsError('invalid-argument', 'Dados do agendamento inválidos.');
  }
  if (sessions.length < 1 || sessions.length > 30 ||
      sessions.some((s) => !s || !isDate(s.date) || !isTime(s.time))) {
    throw new HttpsError('invalid-argument', 'Escolha a data e o horário do agendamento.');
  }

  const [bizSnap, svcSnap, profSnap, userSnap] = await Promise.all([
    db.collection('businesses').doc(businessId).get(),
    db.collection('businesses').doc(businessId).collection('services').doc(serviceId).get(),
    db.collection('professionals').doc(professionalId).get(),
    db.collection('users').doc(uid).get(),
  ]);

  if (!bizSnap.exists) {
    throw new HttpsError('not-found', 'Estabelecimento não encontrado.');
  }
  const biz = bizSnap.data() || {};
  if (biz.active === false || biz.suspendedForPayment === true) {
    throw new HttpsError('failed-precondition', 'Este estabelecimento não está recebendo agendamentos no momento.');
  }
  if (!svcSnap.exists || (svcSnap.data() || {}).active === false) {
    throw new HttpsError('failed-precondition', 'Este serviço não está mais disponível.');
  }
  const svc = svcSnap.data() || {};
  if (!profSnap.exists) {
    throw new HttpsError('not-found', 'Profissional não encontrado.');
  }
  const prof = profSnap.data() || {};
  if (prof.businessId !== businessId || prof.active === false) {
    throw new HttpsError('failed-precondition', 'Este profissional não está disponível.');
  }
  if (Array.isArray(prof.services) && prof.services.length > 0 && !prof.services.includes(serviceId)) {
    throw new HttpsError('failed-precondition', 'Este profissional não realiza esse serviço.');
  }

  const required = Number(svc.numSessions) > 1 ? Number(svc.numSessions) : 1;
  if (sessions.length !== required) {
    throw new HttpsError('invalid-argument',
      required > 1 ? 'Escolha ' + required + ' horários para este pacote.' : 'Escolha um horário.');
  }

  const duration = parseDurationMin(svc.duration);
  // sessoes do mesmo pacote nao podem se sobrepor
  for (let i = 0; i < sessions.length; i++) {
    for (let j = i + 1; j < sessions.length; j++) {
      const a = sessions[i];
      const b = sessions[j];
      if (a.date === b.date && Math.abs(toMinutes(a.time) - toMinutes(b.time)) < duration) {
        throw new HttpsError('invalid-argument', 'Duas sessões do pacote estão no mesmo horário.');
      }
    }
  }

  const promo = svc.isPromotionActive && Number(svc.promotionalPrice) > 0 ? Number(svc.promotionalPrice) : 0;
  const fullPrice = promo || Number(svc.price) || 0;
  const perSession = Math.round((fullPrice / sessions.length) * 100) / 100;

  const user = userSnap.exists ? userSnap.data() || {} : {};
  const email = (req.auth.token && req.auth.token.email) || user.email || '';
  const clientName = user.name || user.displayName || (req.auth.token && req.auth.token.name) ||
    (email ? email.split('@')[0] : '') || 'Cliente';

  const wh = biz.workingHours || {};
  const dates = Array.from(new Set(sessions.map((s) => s.date)));
  const packageId = sessions.length > 1 ? db.collection('appointments').doc().id : null;

  const ids = await db.runTransaction(async (tx) => {
    // trava por profissional e dia: dois agendamentos no mesmo dia passam um de cada vez
    const lockRefs = dates.map((d) => db.collection('slotLocks').doc(professionalId + '_' + d));
    await tx.getAll(...lockRefs);

    const busyByDate = {};
    for (const d of dates) {
      const snap = await tx.get(appointmentsOfDay(professionalId, d));
      busyByDate[d] = busyFromDocs(snap.docs, null);
    }

    for (const s of sessions) {
      const free = computeFreeSlots({
        prof, wh, date: s.date, durationMin: duration, stepMin: 30, busy: busyByDate[s.date],
      });
      if (!free.includes(s.time)) {
        throw new HttpsError('already-exists',
          'O horário das ' + s.time + ' em ' + formatBr(s.date) + ' não está mais disponível. Escolha outro horário.');
      }
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    lockRefs.forEach((r) => tx.set(r, { professionalId: professionalId, updatedAt: now }, { merge: true }));

    const created = [];
    for (const s of sessions) {
      const ref = db.collection('appointments').doc();
      created.push(ref.id);
      const appt = {
        businessId: businessId,
        businessName: biz.name || 'Estabelecimento',
        serviceId: serviceId,
        serviceName: svc.name || 'Serviço',
        professionalId: professionalId,
        professionalName: prof.name || 'Profissional',
        clientId: uid,
        clientEmail: email,
        clientName: clientName,
        clientPhone: user.phone || '',
        date: s.date,
        time: s.time,
        price: perSession,
        duration: String(duration),
        status: 'scheduled',
        notes: '',
        reminderSent: false,
        createdBy: 'client',
        createdAt: now,
        updatedAt: now,
      };
      if (packageId) {
        appt.packageId = packageId;
      }
      tx.set(ref, appt);
    }
    return created;
  });

  console.log('criarAgendamento', JSON.stringify({ uid: uid, professionalId: professionalId, ids: ids }));
  return { ids: ids };
});

// ---------- avisos ao cliente quando o agendamento muda ----------
const NOTICE_TYPES = ['confirmed', 'cancelled', 'completed', 'no_show'];
const INVALID_TOKEN_CODES = [
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
];

const pushToUser = async (uid, title, body, data) => {
  try {
    const snap = await db.collection('users').doc(uid).collection('tokens').get();
    const entries = snap.docs
      .map((d) => ({ token: d.get('token') || d.id, ref: d.ref }))
      .filter((e) => !!e.token);
    if (!entries.length) {
      console.log('pushToUser', JSON.stringify({ uid: uid, titulo: title, aparelhos: 0 }));
      return;
    }
    const res = await admin.messaging().sendEachForMulticast({
      tokens: entries.map((e) => e.token),
      notification: { title: title, body: body },
      data: data || {},
      android: { priority: 'high', notification: { channelId: 'default', sound: 'default' } },
    });
    console.log('pushToUser', JSON.stringify({
      uid: uid, titulo: title, aparelhos: entries.length,
      entregues: res.successCount, falhas: res.failureCount,
      erros: res.responses.filter((r) => !r.success).map((r) => (r.error && r.error.code) || '?'),
    }));
    await Promise.all(res.responses.map((r, i) =>
      (!r.success && r.error && INVALID_TOKEN_CODES.includes(r.error.code)
        ? entries[i].ref.delete().catch(() => null)
        : null)));
  } catch (err) {
    console.error('pushToUser', uid, err);
  }
};

exports.avisosAgendamento = onDocumentUpdated({ document: 'appointments/{id}', region: REGION }, async (event) => {
  const before = (event.data && event.data.before && event.data.before.data()) || {};
  const after = (event.data && event.data.after && event.data.after.data()) || {};
  const statusChanged = before.status !== after.status;
  const timeChanged = before.date !== after.date || before.time !== after.time;
  // so interessa mudanca de status ou de horario (as gravacoes desta funcao nao mexem nisso)
  if (!statusChanged && !timeChanged) {
    return;
  }
  // encaixe feito pelo profissional: o "cliente" e o proprio profissional
  if (!after.clientId || after.createdBy === 'professional') {
    return;
  }
  // o proprio cliente cancelou: nao precisa avisar ele
  if (statusChanged && after.status === 'cancelled' && after.cancelledBy === 'client' && !timeChanged) {
    return;
  }
  const type = timeChanged ? 'rescheduled' : after.status;
  if (!timeChanged && !NOTICE_TYPES.includes(type)) {
    return;
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const update = { clientUnread: true, clientNotice: { type: type, at: now } };
  if (timeChanged) {
    update.previousDate = before.date || null;
    update.previousTime = before.time || null;
    update.rescheduledAt = now;
  }
  await event.data.after.ref.update(update);
  console.log('avisosAgendamento', JSON.stringify({ id: event.params.id, type: type }));

  if (timeChanged) {
    await pushToUser(
      after.clientId,
      'Horário alterado',
      'Seu agendamento em ' + (after.businessName || 'o estabelecimento') + ' foi remarcado para ' +
        formatBr(after.date) + ' às ' + after.time + '.',
      { appointmentId: event.params.id, screen: 'Appointments', type: 'rescheduled' },
    );
  }
});

// ---------- lembretes do horario (cliente e profissional) ----------
// Roda a cada 15 minutos. Cliente: lembrete antecipado (padrao 24h antes, ou o tempo que o
// estabelecimento configurou) e outro 1h antes. Profissional com acesso ao app: 1h antes.
const BRT_OFFSET_MIN = 180; // Brasilia = UTC-3

const apptEpoch = (date, time) => {
  const [y, m, d] = String(date).split('-').map(Number);
  const [h, mi] = String(time || '00:00').split(':').map(Number);
  if (!y || !m || !d) {
    return NaN;
  }
  return Date.UTC(y, m - 1, d, h || 0, mi || 0) + BRT_OFFSET_MIN * 60000;
};

const addDays = (date, n) => {
  const [y, m, d] = date.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
};

const dayLabel = (date, today) => {
  if (date === today) {
    return 'Hoje';
  }
  if (date === addDays(today, 1)) {
    return 'Amanhã';
  }
  return 'Em ' + formatBr(date);
};

exports.lembretesAgendamento = onSchedule(
  { schedule: 'every 15 minutes', timeZone: TZ, region: REGION },
  async () => {
    const now = Date.now();
    const today = nowInBrazil().date;
    const days = [today, addDays(today, 1), addDays(today, 2)];
    const snap = await db.collection('appointments').where('date', 'in', days).get();
    const bizCache = {};
    const profCache = {};
    let sent = 0;

    for (const docSnap of snap.docs) {
      const a = docSnap.data() || {};
      if (!OPEN.includes(a.status)) {
        continue;
      }
      const minutesUntil = (apptEpoch(a.date, a.time) - now) / 60000;
      if (!(minutesUntil > 0)) {
        continue;
      }
      try {
        if (a.businessId && !(a.businessId in bizCache)) {
          const b = await db.collection('businesses').doc(a.businessId).get();
          bizCache[a.businessId] = b.exists ? b.data() || {} : {};
        }
        const biz = bizCache[a.businessId] || {};
        const notif = biz.notifications || {};
        const remindClient = notif.reminderEnabled !== false && a.createdBy !== 'professional' && !!a.clientId;
        const earlyHours = Number(notif.reminderTime) > 1 ? Number(notif.reminderTime) : 24;
        const where = (a.businessName || biz.name || 'o estabelecimento');
        const what = (a.serviceName || 'seu atendimento');
        const update = {};

        // lembrete antecipado do cliente (janela de 1h depois de cruzar o tempo configurado)
        if (remindClient && !a.reminderSent && minutesUntil <= earlyHours * 60 && minutesUntil > earlyHours * 60 - 60 &&
            minutesUntil > 75) {
          await pushToUser(a.clientId, 'Lembrete de agendamento',
            dayLabel(a.date, today) + ' às ' + a.time + ': ' + what + ' em ' + where +
              (a.professionalName ? ' com ' + a.professionalName : '') + '.',
            { appointmentId: docSnap.id, screen: 'Appointments', type: 'reminder' });
          update.reminderSent = true;
          sent++;
        }

        // 1h antes: cliente
        if (remindClient && !a.reminderSoonSent && minutesUntil <= 60) {
          await pushToUser(a.clientId, 'Seu horário está chegando',
            'Às ' + a.time + ': ' + what + ' em ' + where + '. Não se atrase!',
            { appointmentId: docSnap.id, screen: 'Appointments', type: 'reminder_soon' });
          update.reminderSoonSent = true;
          update.reminderSent = true;
          sent++;
        }

        // 1h antes: profissional (se ele tem acesso ao app)
        if (a.professionalId && !a.professionalReminderSent && minutesUntil <= 60) {
          if (!(a.professionalId in profCache)) {
            const p = await db.collection('professionals').doc(a.professionalId).get();
            profCache[a.professionalId] = p.exists ? p.data() || {} : {};
          }
          const prof = profCache[a.professionalId] || {};
          if (prof.appAccess === true && prof.accessUserId) {
            await pushToUser(prof.accessUserId, 'Próximo atendimento',
              'Às ' + a.time + ': ' + (a.clientName || 'Cliente') + ' - ' + what + '.',
              { appointmentId: docSnap.id, screen: 'ProfessionalAgenda', type: 'reminder_professional' });
            sent++;
          }
          update.professionalReminderSent = true;
        }

        if (Object.keys(update).length) {
          await docSnap.ref.update(update);
        }
      } catch (err) {
        console.error('lembretesAgendamento', docSnap.id, err);
      }
    }
    console.log('lembretesAgendamento', JSON.stringify({ verificados: snap.size, enviados: sent }));
  },
);

// ---------- mensagens nao lidas do chat ----------
// Cada mensagem nova soma 1 em chats/{id}.unread.{quem recebe}. Quem abre a conversa zera o seu.
exports.mensagensNaoLidas = onDocumentCreated(
  { document: 'chats/{chatId}/messages/{messageId}', region: REGION },
  async (event) => {
    const msg = (event.data && event.data.data()) || {};
    const chatRef = db.collection('chats').doc(event.params.chatId);
    const chat = await chatRef.get();
    if (!chat.exists) {
      return;
    }
    const participants = (chat.data() || {}).participants || [];
    const recipients = participants.filter((p) => p && p !== msg.senderId);
    if (!recipients.length) {
      return;
    }
    const update = { lastMessageSenderId: msg.senderId || null };
    recipients.forEach((r) => {
      update['unread.' + r] = admin.firestore.FieldValue.increment(1);
    });
    await chatRef.update(update);
  },
);
