import { checkTimeSlotAvailability } from '../services/appointments';
import { Business } from '../services/businesses';
import { Professional } from '../services/professionals';

/**
 * Verifica se um profissional tem horÃƒÆ’Ã‚Â¡rios disponÃƒÆ’Ã‚Â­veis nos prÃƒÆ’Ã‚Â³ximos dias
 * @param professional - O profissional a verificar
 * @param business - O estabelecimento do profissional
 * @param daysToCheck - NÃƒÆ’Ã‚Âºmero de dias para verificar (padrÃƒÆ’Ã‚Â£o: 7)
 * @returns true se hÃƒÆ’Ã‚Â¡ horÃƒÆ’Ã‚Â¡rios disponÃƒÆ’Ã‚Â­veis, false caso contrÃƒÆ’Ã‚Â¡rio
 */
export const hasProfessionalAvailableSlots = async (
    professional: Professional,
    business: Business,
    daysToCheck: number = 7,
): Promise<boolean> => {
    try {
        const today = new Date();

        // Gerar prÃƒÆ’Ã‚Â³ximos dias para verificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o
        for (let i = 0; i < daysToCheck; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);

            const dateString = date.toISOString().split('T')[0]; // 'YYYY-MM-DD'
            const dayName = date.toLocaleDateString('pt-BR', { weekday: 'long' });
            const dayKey = getDayKey(dayName);

            // Verificar se o negÃƒÆ’Ã‚Â³cio estÃƒÆ’Ã‚Â¡ aberto neste dia
            const workingHours = business.workingHours?.[dayKey];
            if (!workingHours?.open) {
                continue; // Pular este dia se o negÃƒÆ’Ã‚Â³cio estiver fechado
            }

            // Verificar se hÃƒÆ’Ã‚Â¡ horÃƒÆ’Ã‚Â¡rios disponÃƒÆ’Ã‚Â­veis neste dia
            const hasAvailableSlots = await checkDayAvailability(
                professional.id,
                dateString,
                workingHours.start,
                workingHours.end,
            );

            if (hasAvailableSlots) {
                return true; // Encontrou pelo menos um horÃƒÆ’Ã‚Â¡rio disponÃƒÆ’Ã‚Â­vel
            }
        }

        return false; // NÃƒÆ’Ã‚Â£o encontrou horÃƒÆ’Ã‚Â¡rios disponÃƒÆ’Ã‚Â­veis em nenhum dos dias
    } catch (error) {
        return false; // Em caso de erro, considerar como nÃƒÆ’Ã‚Â£o disponÃƒÆ’Ã‚Â­vel
    }
};

/**
 * Verifica se hÃƒÆ’Ã‚Â¡ horÃƒÆ’Ã‚Â¡rios disponÃƒÆ’Ã‚Â­veis para um profissional em um dia especÃƒÆ’Ã‚Â­fico
 * @param professionalId - ID do profissional
 * @param date - Data no formato 'YYYY-MM-DD'
 * @param startTime - HorÃƒÆ’Ã‚Â¡rio de inÃƒÆ’Ã‚Â­cio do expediente (ex: '09:00')
 * @param endTime - HorÃƒÆ’Ã‚Â¡rio de fim do expediente (ex: '18:00')
 * @returns true se hÃƒÆ’Ã‚Â¡ pelo menos um horÃƒÆ’Ã‚Â¡rio disponÃƒÆ’Ã‚Â­vel, false caso contrÃƒÆ’Ã‚Â¡rio
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
        const serviceDuration = 60; // DuraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o tÃƒÆ’Ã‚Â­pica de serviÃƒÆ’Ã‚Â§o (60 min)

        // Verificar slots de 30 em 30 minutos
        for (let minutes = startMinutes; minutes + serviceDuration <= endMinutes; minutes += slotDuration) {
            const timeString = minutesToTime(minutes);

            // Verificar se este horÃƒÆ’Ã‚Â¡rio estÃƒÆ’Ã‚Â¡ disponÃƒÆ’Ã‚Â­vel
            const isAvailable = await checkTimeSlotAvailability(
                professionalId,
                date,
                timeString,
                serviceDuration,
            );

            if (isAvailable) {
                return true; // Encontrou pelo menos um horÃƒÆ’Ã‚Â¡rio disponÃƒÆ’Ã‚Â­vel
            }
        }

        return false; // NÃƒÆ’Ã‚Â£o encontrou horÃƒÆ’Ã‚Â¡rios disponÃƒÆ’Ã‚Â­veis
    } catch (error) {
        return false;
    }
};

/**
 * Converte string de horÃƒÆ’Ã‚Â¡rio para minutos desde meia-noite
 * @param time - HorÃƒÆ’Ã‚Â¡rio no formato 'HH:MM'
 * @returns NÃƒÆ’Ã‚Âºmero de minutos desde meia-noite
 */
const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

/**
 * Converte minutos desde meia-noite para string de horÃƒÆ’Ã‚Â¡rio
 * @param minutes - NÃƒÆ’Ã‚Âºmero de minutos desde meia-noite
 * @returns HorÃƒÆ’Ã‚Â¡rio no formato 'HH:MM'
 */
const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

/**
 * Converte nome do dia em portuguÃƒÆ’Ã‚Âªs para chave em inglÃƒÆ’Ã‚Âªs
 * @param dayName - Nome do dia em portuguÃƒÆ’Ã‚Âªs
 * @returns Chave em inglÃƒÆ’Ã‚Âªs do dia
 */
const getDayKey = (dayName: string): string => {
    const dayMap: { [key: string]: string } = {
        'segunda-feira': 'monday',
        'terÃƒÆ’Ã‚Â§a-feira': 'tuesday',
        'quarta-feira': 'wednesday',
        'quinta-feira': 'thursday',
        'sexta-feira': 'friday',
        'sÃƒÆ’Ã‚Â¡bado': 'saturday',
        'domingo': 'sunday',
    };
    return dayMap[dayName.toLowerCase()] || 'monday';
};

/**
 * Verifica disponibilidade de mÃƒÆ’Ã‚Âºltiplos profissionais em lote
 * @param professionals - Lista de profissionais
 * @param business - Estabelecimento
 * @param daysToCheck - NÃƒÆ’Ã‚Âºmero de dias para verificar
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
