import { checkTimeSlotAvailability } from '../services/appointments';
import { Business } from '../services/businesses';
import { Professional } from '../services/professionals';

/**
 * Verifica se um profissional tem horÃ¡rios disponÃ­veis nos prÃ³ximos dias
 * @param professional - O profissional a verificar
 * @param business - O estabelecimento do profissional
 * @param daysToCheck - NÃºmero de dias para verificar (padrÃ£o: 7)
 * @returns true se hÃ¡ horÃ¡rios disponÃ­veis, false caso contrÃ¡rio
 */
export const hasProfessionalAvailableSlots = async (
    professional: Professional,
    business: Business,
    daysToCheck: number = 7,
): Promise<boolean> => {
    try {
        const today = new Date();

        // Gerar prÃ³ximos dias para verificaÃ§Ã£o
        for (let i = 0; i < daysToCheck; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);

            const dateString = date.toISOString().split('T')[0]; // 'YYYY-MM-DD'
            const dayName = date.toLocaleDateString('pt-BR', { weekday: 'long' });
            const dayKey = getDayKey(dayName);

            // Verificar se o negÃ³cio estÃ¡ aberto neste dia
            const workingHours = business.workingHours?.[dayKey];
            if (!workingHours?.open) {
                continue; // Pular este dia se o negÃ³cio estiver fechado
            }

            // Verificar se hÃ¡ horÃ¡rios disponÃ­veis neste dia
            const hasAvailableSlots = await checkDayAvailability(
                professional.id,
                dateString,
                workingHours.start,
                workingHours.end,
            );

            if (hasAvailableSlots) {
                return true; // Encontrou pelo menos um horÃ¡rio disponÃ­vel
            }
        }

        return false; // NÃ£o encontrou horÃ¡rios disponÃ­veis em nenhum dos dias
    } catch (error) {
        return false; // Em caso de erro, considerar como nÃ£o disponÃ­vel
    }
};

/**
 * Verifica se hÃ¡ horÃ¡rios disponÃ­veis para um profissional em um dia especÃ­fico
 * @param professionalId - ID do profissional
 * @param date - Data no formato 'YYYY-MM-DD'
 * @param startTime - HorÃ¡rio de inÃ­cio do expediente (ex: '09:00')
 * @param endTime - HorÃ¡rio de fim do expediente (ex: '18:00')
 * @returns true se hÃ¡ pelo menos um horÃ¡rio disponÃ­vel, false caso contrÃ¡rio
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
        const serviceDuration = 60; // DuraÃ§Ã£o tÃ­pica de serviÃ§o (60 min)

        // Verificar slots de 30 em 30 minutos
        for (let minutes = startMinutes; minutes + serviceDuration <= endMinutes; minutes += slotDuration) {
            const timeString = minutesToTime(minutes);

            // Verificar se este horÃ¡rio estÃ¡ disponÃ­vel
            const isAvailable = await checkTimeSlotAvailability(
                professionalId,
                date,
                timeString,
                serviceDuration,
            );

            if (isAvailable) {
                return true; // Encontrou pelo menos um horÃ¡rio disponÃ­vel
            }
        }

        return false; // NÃ£o encontrou horÃ¡rios disponÃ­veis
    } catch (error) {
        return false;
    }
};

/**
 * Converte string de horÃ¡rio para minutos desde meia-noite
 * @param time - HorÃ¡rio no formato 'HH:MM'
 * @returns NÃºmero de minutos desde meia-noite
 */
const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

/**
 * Converte minutos desde meia-noite para string de horÃ¡rio
 * @param minutes - NÃºmero de minutos desde meia-noite
 * @returns HorÃ¡rio no formato 'HH:MM'
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
        'terÃ§a-feira': 'tuesday',
        'quarta-feira': 'wednesday',
        'quinta-feira': 'thursday',
        'sexta-feira': 'friday',
        'sÃ¡bado': 'saturday',
        'domingo': 'sunday',
    };
    return dayMap[dayName.toLowerCase()] || 'monday';
};

/**
 * Verifica disponibilidade de mÃºltiplos profissionais em lote
 * @param professionals - Lista de profissionais
 * @param business - Estabelecimento
 * @param daysToCheck - NÃºmero de dias para verificar
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
