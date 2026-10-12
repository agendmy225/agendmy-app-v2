import { getServicesByBusiness, Service } from '../../services/services';
import { getProfessionalsByBusiness, Professional } from '../../services/professionals';
import { getBusinessById } from '../../services/businesses';
import { firebaseDb, collection, query, where, getDocs } from '../../config/firebase';

/**
 * Valida se é possível agendar para o business/profissional/data/hora
 * Retorna { valid: boolean, reason?: string }
 */
export async function canBookAppointment({
  businessId,
  professionalId,
  serviceId,
  date, // 'YYYY-MM-DD'
  time, // 'HH:MM'
}: {
  businessId: string;
  professionalId: string;
  serviceId: string;
  date: string;
  time: string;
}): Promise<{ valid: boolean; reason?: string }> {
  // 1. Verifica se existe serviço ativo
  const services = await getServicesByBusiness(businessId);
  if (!services.length) {
    return { valid: false, reason: 'Nenhum serviço ativo disponível.' };
  }
  if (!services.find((s: Service) => s.id === serviceId)) {
    return { valid: false, reason: 'Serviço selecionado não encontrado.' };
  }

  // 2. Verifica se existe profissional ativo
  const professionals = await getProfessionalsByBusiness(businessId);
  if (!professionals.length) {
    return { valid: false, reason: 'Nenhum profissional ativo disponível.' };
  }
  if (!professionals.find((p: Professional) => p.id === professionalId)) {
    return { valid: false, reason: 'Profissional selecionado não encontrado.' };
  }

  // 3. Verifica horário de funcionamento do business
  const business = await getBusinessById(businessId);
  if (!business) {
    return { valid: false, reason: 'Estabelecimento não encontrado.' };
  }
  const dayOfWeek = [
    'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
  ][new Date(date).getDay()];
  const wh = business.workingHours?.[dayOfWeek as keyof typeof business.workingHours];
  if (!wh || !wh.open) {
    return { valid: false, reason: 'Estabelecimento fechado neste dia.' };
  }
  if (time < wh.start || time >= wh.end) {
    return { valid: false, reason: 'Horário fora do expediente do estabelecimento.' };
  }

  // 4. Verifica se já existe agendamento para o profissional neste horário
  const snapshot = await getDocs(
    query(
      collection(firebaseDb, 'appointments'),
      where('businessId', '==', businessId),
      where('professionalId', '==', professionalId),
      where('date', '==', date),
      where('time', '==', time),
      where('status', 'in', ['scheduled', 'confirmed'])
    )
  );
  if (!snapshot.empty) {
    return { valid: false, reason: 'Já existe agendamento para este profissional neste horário.' };
  }

  // Se chegou aqui, pode agendar
  return { valid: true };
}
