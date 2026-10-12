// src/services/professionalSchedule.ts
// Horarios do profissional: agenda semanal propria, intervalo, datas bloqueadas
// e calculo de horarios livres. Usado na agenda do profissional e no
// agendamento dos clientes.
// Following React Native Firebase v22 modular API patterns
import { collection, doc, getDoc, getDocs, query, where } from '@react-native-firebase/firestore';
import { firebaseDb } from '../config/firebase';
import { parseLocalDate, toLocalDateString } from '../utils/localDate';

export const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
export const DAY_LABELS: Record<string, string> = {
  monday: 'Segunda', tuesday: 'Terca', wednesday: 'Quarta', thursday: 'Quinta',
  friday: 'Sexta', saturday: 'Sabado', sunday: 'Domingo',
};
export const WEEK_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export interface DayWindow {
  start: string;
  end: string;
  breakStart?: string;
  breakEnd?: string;
}
export type WeekSchedule = Record<string, DayWindow | null>;

export const toMinutes = (t: string): number => {
  const [h, m] = (t || '0:0').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};
export const toTime = (min: number): string =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
export const isValidTime = (t: string): boolean => /^([01]\d|2[0-3]):[0-5]\d$/.test(t || '');

/** Horario do estabelecimento num dia (formato { open, start, end }). */
export const businessDayWindow = (businessWH: any, dayKey: string): DayWindow | null => {
  const d = businessWH && businessWH[dayKey];
  if (!d || d.open === false || !d.start || !d.end) {
    return null;
  }
  return { start: d.start, end: d.end };
};

/** Janela de trabalho do profissional numa data (null = nao atende). */
export const resolveDayWindow = (profData: any, businessWH: any, date: string): DayWindow | null => {
  if (Array.isArray(profData?.blockedDates) && profData.blockedDates.includes(date)) {
    return null;
  }
  const dayKey = DAY_KEYS[parseLocalDate(date).getDay()];
  const schedule = profData?.schedule;
  if (schedule && Object.prototype.hasOwnProperty.call(schedule, dayKey)) {
    const s = schedule[dayKey];
    if (!s || !s.start || !s.end) {
      return null;
    }
    return { start: s.start, end: s.end, breakStart: s.breakStart, breakEnd: s.breakEnd };
  }
  return businessDayWindow(businessWH, dayKey);
};

export const getProfessionalData = async (professionalId: string): Promise<Record<string, any>> => {
  const snap = await getDoc(doc(firebaseDb, 'professionals', professionalId));
  return snap.exists() ? snap.data() || {} : {};
};

export const getProfessionalDayWindow = async (
  professionalId: string,
  date: string,
  businessWH: any,
): Promise<DayWindow | null> => {
  const data = await getProfessionalData(professionalId).catch(() => ({}));
  return resolveDayWindow(data, businessWH, date);
};

/** O horario (com a duracao) cai dentro do intervalo do dia? */
export const isInBreak = (time: string, durationMin: number, w: DayWindow): boolean => {
  if (!w.breakStart || !w.breakEnd) {
    return false;
  }
  const s = toMinutes(time);
  const e = s + durationMin;
  return s < toMinutes(w.breakEnd) && e > toMinutes(w.breakStart);
};

type RawDoc = { id: string; data: () => Record<string, any> | undefined };

const openAppointmentsOn = async (professionalId: string, date: string): Promise<RawDoc[]> => {
  const snap = await getDocs(query(collection(firebaseDb, 'appointments'),
    where('professionalId', '==', professionalId), where('date', '==', date)));
  return snap.docs.filter((d: RawDoc) => {
    const s = (d.data() || {}).status;
    return s === 'scheduled' || s === 'confirmed';
  });
};

/** Quantos agendamentos abertos o profissional tem nessa data. */
export const countOpenAppointments = async (professionalId: string, date: string): Promise<number> =>
  (await openAppointmentsOn(professionalId, date)).length;

/** Horarios livres do profissional numa data para um servico com essa duracao. */
export const getFreeSlots = async (params: {
  professionalId: string;
  date: string;
  durationMin: number;
  businessWorkingHours: any;
  ignoreAppointmentId?: string;
  stepMin?: number;
}): Promise<string[]> => {
  const step = params.stepMin || 30;
  const duration = params.durationMin > 0 ? params.durationMin : 60;
  const profData = await getProfessionalData(params.professionalId).catch(() => ({}));
  const w = resolveDayWindow(profData, params.businessWorkingHours, params.date);
  if (!w) {
    return [];
  }
  const busy = (await openAppointmentsOn(params.professionalId, params.date))
    .filter((d) => d.id !== params.ignoreAppointmentId)
    .map((d) => {
      const a = d.data() || {};
      const s = toMinutes(a.time);
      return [s, s + (parseInt(String(a.duration), 10) || 60)];
    });
  const now = new Date();
  const isToday = params.date === toLocalDateString(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const out: string[] = [];
  for (let m = toMinutes(w.start); m + duration <= toMinutes(w.end); m += step) {
    if (isToday && m <= nowMin) {
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

/** Proximos N dias como 'YYYY-MM-DD'. */
export const nextDays = (count: number): string[] => {
  const days: string[] = [];
  const base = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
    days.push(toLocalDateString(d));
  }
  return days;
};
