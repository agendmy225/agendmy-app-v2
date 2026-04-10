// Following React Native Firebase v22 modular API patterns  
// https://rnfirebase.io/migrating-to-v22
import { 
  firebaseDb, 
  Timestamp, 
  serverTimestamp, 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  where, 
  query, 
  addDoc, 
  orderBy, 
  limit as limitTo, 
  deleteDoc 
} from '../config/firebase';
import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { isRevenueStatus, isCanceledStatus, toValidPrice } from '../constants/reportConfig';

// Tipos
export interface FinancialReport {
  id?: string;
  businessId: string;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  startDate: Timestamp; // Timestamp
  endDate: Timestamp; // Timestamp
  totalRevenue: number;
  totalAppointments: number;
  completedAppointments: number;
  canceledAppointments: number;
  professionalCommissions: {
    [professionalId: string]: {
      name: string;
      totalRevenue: number;
      appointmentsCount: number;
      commission: number;
    };
  };
  serviceRevenue: {
    [serviceId: string]: {
      name: string;
      totalRevenue: number;
      appointmentsCount: number;
    };
  };
  createdAt?: Timestamp;
}

// Tipos para parÃ¢metros de geraÃ§Ã£o de relatÃ³rio
export interface ReportParams {
  businessId: string;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  startDate: Date;
  endDate: Date;
}

// Gerar relatÃ³rio financeiro
export const generateFinancialReport = async (params: ReportParams): Promise<FinancialReport> => {
  try {
    console.log('ðŸ”µ Iniciando geraÃ§Ã£o de relatÃ³rio financeiro:', params);
    const { businessId, period, startDate, endDate } = params;

    // Validar parÃ¢metros
    if (!businessId || !period || !startDate || !endDate) {
      throw new Error('ParÃ¢metros obrigatÃ³rios nÃ£o fornecidos para gerar o relatÃ³rio.');
    }

    // Converter datas para Timestamp do firebaseDb
    const startTimestamp = Timestamp.fromDate(startDate);
    const endTimestamp = Timestamp.fromDate(endDate);
    console.log('ðŸ“… PerÃ­odo do relatÃ³rio:', { start: startDate, end: endDate });

    // Buscar agendamentos no perÃ­odo - CORRIGIDO: usar coleÃ§Ã£o raiz 'appointments'
    const appointmentsQuery = query(
      collection(firebaseDb, 'appointments'),
      where('businessId', '==', businessId),
      where('date', '>=', startTimestamp),
      where('date', '<=', endTimestamp)
    );
    const appointmentsSnapshot = await getDocs(appointmentsQuery);
    console.log('ðŸ“Š Agendamentos encontrados:', appointmentsSnapshot.size);

    // Verificar se existe ao menos uma collection de appointments
    if (!appointmentsSnapshot) {
      throw new Error('NÃ£o foi possÃ­vel acessar os dados de agendamentos.');
    }

    // Inicializar dados do relatÃ³rio
    let totalRevenue = 0;
    const totalAppointments = appointmentsSnapshot.size;
    let completedAppointments = 0;
    let canceledAppointments = 0;

    const professionalCommissions: FinancialReport['professionalCommissions'] = {};
    const serviceRevenue: FinancialReport['serviceRevenue'] = {};

    // Cache para taxas de comissÃ£o dos profissionais para evitar buscas repetidas
    const professionalRatesCache = new Map<string, number>();

    // Buscar configuraÃ§Ãµes de comissÃ£o do estabelecimento
    const businessDocRef = doc(firebaseDb, 'businesses', businessId);
    const businessDoc = await getDoc(businessDocRef);

    if (!businessDoc.exists()) {
      throw new Error('Estabelecimento nÃ£o encontrado.');
    }

    const businessData = businessDoc.data() || {};
    // IMPORTANTE: Sempre usar configuraÃ§Ã£o do estabelecimento - nunca usar valor mockado
    const defaultCommissionRate = businessData.defaultCommissionRate;

    if (!defaultCommissionRate || defaultCommissionRate <= 0) {
      throw new Error('Taxa de comissÃ£o nÃ£o configurada para este estabelecimento. Configure nas configuraÃ§Ãµes do negÃ³cio.');
    }

    // Processar cada agendamento
    for (const appointmentDoc of appointmentsSnapshot.docs) {
      const appointment = appointmentDoc.data();
      console.log('ðŸ“‹ Processando agendamento:', {
        id: appointmentDoc.id,
        status: appointment.status,
        price: appointment.price,
        serviceId: appointment.serviceId,
        professionalId: appointment.professionalId
      });

      if (isRevenueStatus(appointment.status)) {
        completedAppointments++;

        // CORRIGIDO: usar funÃ§Ã£o de validaÃ§Ã£o de preÃ§o
        const price = toValidPrice(appointment.price);
        if (price > 0) {
          totalRevenue += price;
          console.log('ðŸ’° Receita adicionada:', price, 'Total:', totalRevenue);
        }

        // Processar receita por serviÃ§o
        if (appointment.serviceId && price > 0) {
          if (!serviceRevenue[appointment.serviceId]) {
            try {
              // Buscar nome do serviÃ§o na subcoleÃ§Ã£o do business
              const serviceDocRef = doc(firebaseDb, 'businesses', businessId, 'services', appointment.serviceId);
              const serviceDoc = await getDoc(serviceDocRef);

              let serviceName = 'ServiÃ§o Desconhecido';
              if (serviceDoc.exists()) {
                const serviceData = serviceDoc.data();
                serviceName = serviceData?.name || 'ServiÃ§o Desconhecido';
              } else {
                // Tentar buscar na coleÃ§Ã£o raiz de services como fallback
                try {
                  const rootServiceRef = doc(firebaseDb, 'services', appointment.serviceId);
                  const rootServiceDoc = await getDoc(rootServiceRef);
                  if (rootServiceDoc.exists()) {
                    const rootServiceData = rootServiceDoc.data();
                    serviceName = rootServiceData?.name || 'ServiÃ§o Desconhecido';
                  }
                } catch {
                  console.log('âš ï¸ ServiÃ§o nÃ£o encontrado em nenhuma coleÃ§Ã£o:', appointment.serviceId);
                }
              }

              serviceRevenue[appointment.serviceId] = {
                name: serviceName,
                totalRevenue: 0,
                appointmentsCount: 0,
              };
            } catch (serviceError) {
              console.error('âŒ Erro ao buscar dados do serviÃ§o:', serviceError);
              serviceRevenue[appointment.serviceId] = {
                name: 'ServiÃ§o Desconhecido',
                totalRevenue: 0,
                appointmentsCount: 0,
              };
            }
          }

          serviceRevenue[appointment.serviceId].totalRevenue += price;
          serviceRevenue[appointment.serviceId].appointmentsCount += 1;
          console.log('ðŸ”§ Receita do serviÃ§o atualizada:', appointment.serviceId, serviceRevenue[appointment.serviceId]);
        }

        // Processar comissÃ£o por profissional
        if (appointment.professionalId && price > 0) {
          const profId = appointment.professionalId;
          let rateForCalculation: number;

          if (professionalRatesCache.has(profId)) {
            rateForCalculation = professionalRatesCache.get(profId)!;
          } else {
            try {
              // CORRIGIDO: Buscar profissional na subcoleÃ§Ã£o do business primeiro
              let professionalDocRef = doc(firebaseDb, 'businesses', businessId, 'professionals', profId);
              let professionalDoc = await getDoc(professionalDocRef);
              let professionalData: any = null;

              if (professionalDoc.exists()) {
                professionalData = professionalDoc.data();
              } else {
                // Fallback: tentar buscar na coleÃ§Ã£o raiz professionals
                professionalDocRef = doc(firebaseDb, 'professionals', profId);
                professionalDoc = await getDoc(professionalDocRef);
                if (professionalDoc.exists()) {
                  professionalData = professionalDoc.data();
                }
              }

              // IMPORTANTE: Usar taxa do profissional especÃ­fico ou padrÃ£o do business
              // NUNCA usar valor mockado - se nÃ£o tiver configuraÃ§Ã£o, alertar usuÃ¡rio
              rateForCalculation = professionalData?.commissionRate || defaultCommissionRate;

              if (!rateForCalculation || rateForCalculation <= 0) {
                console.warn('âš ï¸ Taxa de comissÃ£o nÃ£o configurada para profissional:', profId);
                // Pular este profissional se nÃ£o tiver configuraÃ§Ã£o vÃ¡lida
                continue;
              }
              professionalRatesCache.set(profId, rateForCalculation);

              // Inicializar a entrada em professionalCommissions se for a primeira vez
              if (!professionalCommissions[profId]) {
                const professionalName = professionalData?.name || `Profissional ${profId.substring(0, 8)}`;
                professionalCommissions[profId] = {
                  name: professionalName,
                  totalRevenue: 0,
                  appointmentsCount: 0,
                  commission: 0,
                };
                console.log('ðŸ‘¤ Profissional adicionado:', professionalName, 'Taxa:', rateForCalculation);
              }
            } catch (profError) {
              console.error('âŒ Erro ao buscar dados do profissional:', profError);
              // IMPORTANTE: Se nÃ£o conseguir buscar dados do profissional, pular
              // NÃƒO usar taxa mockada/padrÃ£o
              console.warn('âš ï¸ Pulando profissional sem dados vÃ¡lidos:', profId);
              continue;
            }
          }

          professionalCommissions[profId].totalRevenue += price;
          professionalCommissions[profId].appointmentsCount += 1;
          const commissionAmount = price * rateForCalculation;
          professionalCommissions[profId].commission += commissionAmount;
          console.log('ðŸ’¼ ComissÃ£o calculada para', professionalCommissions[profId].name, ':', commissionAmount, 'Taxa:', rateForCalculation);
        }
      } else if (isCanceledStatus(appointment.status)) {
        canceledAppointments++;
        console.log('âŒ Agendamento cancelado contabilizado');
      }
    }

    console.log('ðŸ“Š Resumo do relatÃ³rio:', {
      totalRevenue,
      totalAppointments,
      completedAppointments,
      canceledAppointments,
      professionalCommissionsCount: Object.keys(professionalCommissions).length,
      serviceRevenueCount: Object.keys(serviceRevenue).length
    });

    // Criar o relatÃ³rio
    const report: FinancialReport = {
      businessId,
      period,
      startDate: startTimestamp,
      endDate: endTimestamp,
      totalRevenue,
      totalAppointments,
      completedAppointments,
      canceledAppointments,
      professionalCommissions,
      serviceRevenue,
      createdAt: serverTimestamp() as Timestamp,
    };

    // Salvar o relatÃ³rio no firebaseDb
    const reportsCollectionRef = collection(firebaseDb, 'businesses', businessId, 'financialReports');
    const reportRef = await addDoc(reportsCollectionRef, report);
    console.log('âœ… RelatÃ³rio salvo com ID:', reportRef.id);

    return {
      ...report,
      id: reportRef.id,
    };
  } catch (error) {
    console.error('âŒ Erro ao gerar relatÃ³rio financeiro:', error);
    if (error instanceof Error) {
      throw error; // Re-throw se jÃ¡ Ã© um Error com mensagem especÃ­fica
    }
    throw new Error('Erro desconhecido ao gerar relatÃ³rio financeiro. Tente novamente.');
  }
};

// Buscar relatÃ³rios financeiros de um estabelecimento
export const getFinancialReports = async (businessId: string, limit = 10): Promise<FinancialReport[]> => {
  try {
    const reportsCollectionRef = collection(firebaseDb, 'businesses', businessId, 'financialReports');
    const reportsQuery = query(
      reportsCollectionRef,
      orderBy('createdAt', 'desc'),
      limitTo(limit)
    );
    const reportsSnapshot = await getDocs(reportsQuery);

    const reports: FinancialReport[] = [];

    reportsSnapshot.forEach((docSnapshot: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
      reports.push({
        id: docSnapshot.id,
        ...docSnapshot.data() as FinancialReport,
      });
    });

    return reports;
  } catch (error) {
    throw error;
  }
};

// Buscar um relatÃ³rio financeiro especÃ­fico
export const getFinancialReportById = async (businessId: string, reportId: string): Promise<FinancialReport | null> => {
  try {
    const reportDocRef = doc(firebaseDb, 'businesses', businessId, 'financialReports', reportId);
    const reportDoc = await getDoc(reportDocRef);

    if (!reportDoc.exists()) {
      return null;
    }

    return {
      id: reportDoc.id,
      ...reportDoc.data() as FinancialReport,
    };
  } catch (error) {
    throw error;
  }
};

// Excluir um relatÃ³rio financeiro
export const deleteFinancialReport = async (businessId: string, reportId: string): Promise<void> => {
  try {
    const reportDocRef = doc(firebaseDb, 'businesses', businessId, 'financialReports', reportId);
    await deleteDoc(reportDocRef);
  } catch (error) {
    throw error;
  }
};

// Calcular comissÃµes por perÃ­odo
export const calculateCommissions = async (
  businessId: string,
  startDate: Date,
  endDate: Date,
): Promise<{ [professionalId: string]: { name: string; commission: number } }> => {
  try {
    console.log('ðŸ”µ Calculando comissÃµes para perÃ­odo:', { businessId, startDate, endDate });

    // Converter datas para Timestamp do firebaseDb
    const startTimestamp = Timestamp.fromDate(startDate);
    const endTimestamp = Timestamp.fromDate(endDate);

    // CORRIGIDO: Buscar agendamentos na coleÃ§Ã£o raiz
    const appointmentsQuery = query(
      collection(firebaseDb, 'appointments'),
      where('businessId', '==', businessId),
      where('date', '>=', startTimestamp),
      where('date', '<=', endTimestamp),
      where('status', '==', 'completed')
    );
    const appointmentsSnapshot = await getDocs(appointmentsQuery);
    console.log('ðŸ“Š Agendamentos concluÃ­dos encontrados:', appointmentsSnapshot.size);

    // Buscar configuraÃ§Ãµes de comissÃ£o do estabelecimento
    const businessDocRef = doc(firebaseDb, 'businesses', businessId);
    const businessDoc = await getDoc(businessDocRef);

    const businessData = businessDoc.data() || {};
    // IMPORTANTE: Sempre usar configuraÃ§Ã£o do estabelecimento - nunca usar valor mockado
    const defaultCommissionRate = businessData.defaultCommissionRate;

    if (!defaultCommissionRate || defaultCommissionRate <= 0) {
      throw new Error('Taxa de comissÃ£o nÃ£o configurada para este estabelecimento. Configure nas configuraÃ§Ãµes do negÃ³cio.');
    }

    // Calcular comissÃµes por profissional
    const commissions: { [professionalId: string]: { name: string; commission: number } } = {};
    const professionalRatesCache = new Map<string, number>(); // Cache para taxas

    for (const appointmentDoc of appointmentsSnapshot.docs) {
      const appointment = appointmentDoc.data();

      if (appointment.professionalId && appointment.price) {
        const profId = appointment.professionalId;
        // CORRIGIDO: usar funÃ§Ã£o de validaÃ§Ã£o de preÃ§o
        const price = toValidPrice(appointment.price);

        if (price <= 0) continue;

        let rateForCalculation: number;

        if (professionalRatesCache.has(profId)) {
          rateForCalculation = professionalRatesCache.get(profId)!;
        } else {
          try {
            // CORRIGIDO: Buscar profissional na subcoleÃ§Ã£o do business primeiro
            let professionalDocRef = doc(firebaseDb, 'businesses', businessId, 'professionals', profId);
            let professionalDoc = await getDoc(professionalDocRef);
            let professionalData: any = null;

            if (professionalDoc.exists()) {
              professionalData = professionalDoc.data();
            } else {
              // Fallback: tentar buscar na coleÃ§Ã£o raiz professionals
              professionalDocRef = doc(firebaseDb, 'professionals', profId);
              professionalDoc = await getDoc(professionalDocRef);
              if (professionalDoc.exists()) {
                professionalData = professionalDoc.data();
              }
            }

            rateForCalculation = professionalData?.commissionRate || defaultCommissionRate;

            if (!rateForCalculation || rateForCalculation <= 0) {
              console.warn('âš ï¸ Taxa de comissÃ£o nÃ£o configurada para profissional:', profId);
              // Pular este profissional se nÃ£o tiver configuraÃ§Ã£o vÃ¡lida
              continue;
            }

            professionalRatesCache.set(profId, rateForCalculation);

            if (!commissions[profId]) {
              const professionalName = professionalData?.name || `Profissional ${profId.substring(0, 8)}`;
              commissions[profId] = {
                name: professionalName,
                commission: 0,
              };
            }
          } catch (profError) {
            console.error('âŒ Erro ao buscar profissional:', profError);
            // IMPORTANTE: Se nÃ£o conseguir buscar dados do profissional, pular
            // NÃƒO usar taxa mockada/padrÃ£o
            console.warn('âš ï¸ Pulando profissional sem dados vÃ¡lidos:', profId);
            continue;
          }
        }

        const commissionAmount = price * rateForCalculation;
        commissions[profId].commission += commissionAmount;
        console.log('ðŸ’¼ ComissÃ£o calculada:', commissions[profId].name, commissionAmount);
      }
    }

    console.log('âœ… CÃ¡lculo de comissÃµes concluÃ­do:', Object.keys(commissions).length, 'profissionais');
    return commissions;
  } catch (error) {
    console.error('âŒ Erro ao calcular comissÃµes:', error);
    throw error;
  }
};
