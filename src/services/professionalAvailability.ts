import { checkTimeSlotAvailability } from '../services/appointments';
import { Business } from '../services/businesses';
import { Professional } from '../services/professionals';

/**
 * Verifica se um profissional tem horários disponíveis nos próximos dias
 * @param professional - O profissional a verificar
 * @param business - O estabelecimento do profissional
 * @param daysToCheck - Número de dias para verificar (padrão: 7)
 * @returns true se há horários disponíveis, false caso contrário
 */
export const hasProfessionalAvailableSlots = async (
    professional: Professional,
    business: Business,
    daysToCheck: number = 7,
): Promise<boolean> => {
    try {
        const today = new Date();

        // Gerar próximos dias para verificação
        for (let i = 0; i < daysToCheck; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);

            const dateString = date.toISOString().split('T')[0]; // 'YYYY-MM-DD'
            const dayName = date.toLocaleDateString('pt-BR', { weekday: 'long' });
            const dayKey = getDayKey(dayName);

            // Verificar se o negócio está aberto neste dia
            const workingHours = business.workingHours?.[dayKey];
            if (!workingHours?.open) {
                continue; // Pular este dia se o negócio estiver fechado
            }

            // Verificar se há horários disponíveis neste dia
            const hasAvailableSlots = await checkDayAvailability(
                professional.id,
                dateString,
                workingHours.start,
                workingHours.end,
            );

            if (hasAvailableSlots) {
                return true; // Encontrou pelo menos um horário disponível
            }
        }

        return false; // Não encontrou horários disponíveis em nenhum dos dias
    } catch (error) {
        return false; // Em caso de erro, considerar como não disponível
    }
};

/**
 * Verifica se há horários disponíveis para um profissional em um dia específico
 * @param professionalId - ID do profissional
 * @param date - Data no formato 'YYYY-MM-DD'
 * @param startTime - Horário de início do expediente (ex: '09:00')
 * @param endTime - Horário de fim do expediente (ex: '18:00')
 * @returns true se há pelo menos um horário disponível, false caso contrário
 */
const checkDayAvailability = async (
    professionalId: string,
    date: string,
    startTime: string,
    endTime: string,
): Promise<boolean> => {
    try {
        const startMinutes = timeToMinutes(startTime);
        const endMinutes = timeToMinutes(endTime);
        const slotDuration = 30; // Slots de 30 minutos
        const serviceDuration = 60; // Duração típica de serviço (60 min)

        // Verificar slots de 30 em 30 minutos
        for (let minutes = startMinutes; minutes + serviceDuration <= endMinutes; minutes += slotDuration) {
            const timeString = minutesToTime(minutes);

            // Verificar se este horário está disponível
            const isAvailable = await checkTimeSlotAvailability(
                professionalId,
                date,
                timeString,
                serviceDuration,
            );

            if (isAvailable) {
                return true; // Encontrou pelo menos um horário disponível
            }
        }

        return false; // Não encontrou horários disponíveis
    } catch (error) {
        return false;
    }
};

/**
 * Converte string de horário para minutos desde meia-noite
 * @param time - Horário no formato 'HH:MM'
 * @returns Número de minutos desde meia-noite
 */
const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

/**
 * Converte minutos desde meia-noite para string de horário
 * @param minutes - Número de minutos desde meia-noite
 * @returns Horário no formato 'HH:MM'
 */
const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

/**
 * Converte nome do dia em portuguÃªs para chave em inglÃªs
 * @param dayName - Nome do dia em portuguÃªs
 * @returns Chave em inglÃªs do dia
 */
const getDayKey = (dayName: string): string => {
    const dayMap: { [key: string]: string } = {
        'segunda-feira': 'monday',
        'terça-feira': 'tuesday',
        'quarta-feira': 'wednesday',
        'quinta-feira': 'thursday',
        'sexta-feira': 'friday',
        'sábado': 'saturday',
        'domingo': 'sunday',
    };
    return dayMap[dayName.toLowerCase()] || 'monday';
};

/**
 * Verifica disponibilidade de múltiplos profissionais em lote
 * @param professionals - Lista de profissionais
 * @param business - Estabelecimento
 * @param daysToCheck - Número de dias para verificar
 * @returns Map com ID do profissional e sua disponibilidade
 */
export const checkMultipleProfessionalsAvailability = async (
    professionals: Professional[],
    business: Business,
    daysToCheck: number = 7,
): Promise<Map<string, boolean>> => {
    const availabilityMap = new Map<string, boolean>();

    // Verificar disponibilidade de todos os profissionais em paralelo
    const availabilityPromises = professionals.map(async (professional) => {
        const hasAvailability = await hasProfessionalAvailableSlots(professional, business, daysToCheck);
        return { id: professional.id, available: hasAvailability };
    });

    const results = await Promise.all(availabilityPromises);

    // Preencher o mapa com os resultados
    results.forEach(({ id, available }) => {
        availabilityMap.set(id, available);
    });

    return availabilityMap;
};
