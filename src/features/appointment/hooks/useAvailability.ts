import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
} from '@react-native-firebase/firestore';
import { firebaseDb } from '../../../config/firebase';
import { getServiceById } from '../../../services/services';
import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

type DaySchedule = { start: string; end: string } | null;
type WorkingHours = { [day: string]: DaySchedule };
type ExistingAppointment = { time: string; duration: string | number; status: string };

export type AvailabilityDay = {
  date: string; day: number; month: string; weekday: string; available: boolean;
};
export type TimeSlot = { time: string; available: boolean };

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'SÃƒÆ’Ã‚Â¡b'];
const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const timeToMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};
const minutesToTime = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const DEFAULT_WH: WorkingHours = {
  sunday: null,
  monday: { start: '09:00', end: '18:00' },
  tuesday: { start: '09:00', end: '18:00' },
  wednesday: { start: '09:00', end: '18:00' },
  thursday: { start: '09:00', end: '18:00' },
  friday: { start: '09:00', end: '18:00' },
  saturday: { start: '09:00', end: '14:00' },
};

const getBusinessWorkingHours = async (businessId: string): Promise<WorkingHours> => {
  try {
    const snap = await getDoc(doc(firebaseDb, 'businesses', businessId));
    if (!snap.exists()) return DEFAULT_WH;
    return (snap.data()?.workingHours as WorkingHours) ?? DEFAULT_WH;
  } catch {
    return DEFAULT_WH;
  }
};

const getProfessionalWorkingHours = async (
  professionalId: string,
  fallback: WorkingHours,
): Promise<WorkingHours> => {
  try {
    const snap = await getDoc(doc(firebaseDb, 'professionals', professionalId));
    if (!snap.exists()) return fallback;
    const schedule = snap.data()?.schedule as Record<string, { start: string; end: string } | null> | undefined;
    if (!schedule || Object.keys(schedule).length === 0) return fallback;

    const normalized: WorkingHours = {};
    DAY_KEYS.forEach((key, idx) => {
      const entry = schedule[key] ?? schedule[String(idx)] ?? null;
      normalized[key] = entry ? { start: entry.start, end: entry.end } : null;
    });
    return normalized;
  } catch {
    return fallback;
  }
};

const getExistingAppointments = async (
  professionalId: string,
  date: string,
): Promise<ExistingAppointment[]> => {
  try {
    const q = query(
      collection(firebaseDb, 'appointments'),
      where('professionalId', '==', professionalId),
      where('date', '==', date),
      where('status', 'in', ['scheduled', 'confirmed']),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d: FirebaseFirestoreTypes.QueryDocumentSnapshot) => ({
      time: d.data().time as string,
      duration: d.data().duration as string | number,
      status: d.data().status as string,
    }));
  } catch {
    return [];
  }
};

export const getAvailableDays = async (
  businessId: string,
  professionalId: string,
  daysToShow = 14,
): Promise<AvailabilityDay[]> => {
  try {
    const businessWH = await getBusinessWorkingHours(businessId);
    const profWH = await getProfessionalWorkingHours(professionalId, businessWH);
    const today = new Date();

    return Array.from({ length: daysToShow }, (_, i) => {
      const date = new Date();
      date.setDate(today.getDate() + i);
      const dayKey = DAY_KEYS[date.getDay()];
      return {
        date: date.toISOString().split('T')[0],
        day: date.getDate(),
        month: MONTHS[date.getMonth()],
        weekday: WEEKDAYS[date.getDay()],
        available: !!profWH[dayKey],
      };
    });
  } catch {
    Alert.alert('Erro', 'NÃƒÆ’Ã‚Â£o foi possÃƒÆ’Ã‚Â­vel carregar os dias disponÃƒÆ’Ã‚Â­veis.');
    return [];
  }
};

export const getAvailableTimeSlots = async (
  businessId: string,
  professionalId: string,
  serviceId: string,
  date: string,
): Promise<TimeSlot[]> => {
  try {
    const dateObj = new Date(date + 'T12:00:00');
    const dayKey = DAY_KEYS[dateObj.getDay()];

    const businessWH = await getBusinessWorkingHours(businessId);
    const profWH = await getProfessionalWorkingHours(professionalId, businessWH);
    const daySchedule = profWH[dayKey];
    if (!daySchedule) return [];

    const service = await getServiceById(businessId, serviceId);
    if (!service) { Alert.alert('Erro', 'ServiÃƒÆ’Ã‚Â§o nÃƒÆ’Ã‚Â£o encontrado.'); return []; }

    const serviceDuration =
      typeof service.duration === 'string' ? parseInt(service.duration, 10) : service.duration as number;
    if (!serviceDuration || serviceDuration <= 0) return [];

    const existing = await getExistingAppointments(professionalId, date);
    const startMin = timeToMinutes(daySchedule.start);
    const endMin = timeToMinutes(daySchedule.end);
    const now = new Date();
    const isToday = date === now.toISOString().split('T')[0];
    const slots: TimeSlot[] = [];

    for (let min = startMin; min <= endMin - serviceDuration; min += 30) {
      const slotTime = minutesToTime(min);
      const slotEnd = min + serviceDuration;

      if (isToday) {
        const slotDate = new Date();
        const [sh, sm] = slotTime.split(':').map(Number);
        slotDate.setHours(sh, sm, 0, 0);
        if (slotDate < new Date(now.getTime() + 30 * 60000)) {
          slots.push({ time: slotTime, available: false });
          continue;
        }
      }

      const hasConflict = existing.some(appt => {
        const aStart = timeToMinutes(appt.time);
        const aDur = typeof appt.duration === 'string' ? parseInt(appt.duration, 10) : appt.duration as number;
        const aEnd = aStart + (aDur || 60);
        return min < aEnd && slotEnd > aStart;
      });

      slots.push({ time: slotTime, available: !hasConflict });
    }

    return slots;
  } catch {
    Alert.alert('Erro', 'NÃƒÆ’Ã‚Â£o foi possÃƒÆ’Ã‚Â­vel carregar os horÃƒÆ’Ã‚Â¡rios disponÃƒÆ’Ã‚Â­veis.');
    return [];
  }
};

export const useAvailability = (businessId: string, professionalId: string, serviceId: string) => {
  const [availableDays, setAvailableDays] = useState<AvailabilityDay[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!businessId || !professionalId) return;
    let cancelled = false;
    setIsLoading(true);
    getAvailableDays(businessId, professionalId)
      .then(days => {
        if (cancelled) return;
        setAvailableDays(days);
        const first = days.find(d => d.available);
        if (first) setSelectedDate(first.date);
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [businessId, professionalId]);

  useEffect(() => {
    if (!selectedDate || !businessId || !professionalId || !serviceId) return;
    let cancelled = false;
    setIsLoading(true);
    getAvailableTimeSlots(businessId, professionalId, serviceId, selectedDate)
      .then(slots => { if (!cancelled) setTimeSlots(slots); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [selectedDate, businessId, professionalId, serviceId]);

  return { availableDays, timeSlots, selectedDate, setSelectedDate, isLoading };
};

export default useAvailability;
