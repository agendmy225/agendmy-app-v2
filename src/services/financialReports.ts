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

// Tipos para parÃƒÆ’Ã‚Â¢metros de geraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de relatÃƒÆ’Ã‚Â³rio
export interface ReportParams {
  businessId: string;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  startDate: Date;
  endDate: Date;
}

// Gerar relatÃƒÆ’Ã‚Â³rio financeiro
export const generateFinancialReport = async (params: ReportParams): Promise<FinancialReport> => {
  try {
    console.log('ÃƒÂ°Ã‚Å¸Ã‚â€Ã‚Âµ Iniciando geraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de relatÃƒÆ’Ã‚Â³rio financeiro:', params);
    const { businessId, period, startDate, endDate } = params;

    // Validar parÃƒÆ’Ã‚Â¢metros
    if (!businessId || !period || !startDate || !endDate) {
      throw new Error('ParÃƒÆ’Ã‚Â¢metros obrigatÃƒÆ’Ã‚Â³rios nÃƒÆ’Ã‚Â£o fornecidos para gerar o relatÃƒÆ’Ã‚Â³rio.');
    }

    // Converter datas para Timestamp do firebaseDb
    const startTimestamp = Timestamp.fromDate(startDate);
    const endTimestamp = Timestamp.fromDate(endDate);
    console.log('ÃƒÂ°Ã‚Å¸Ã‚â€œÃ‚â€¦ PerÃƒÆ’Ã‚Â­odo do relatÃƒÆ’Ã‚Â³rio:', { start: startDate, end: endDate });

    // Buscar agendamentos no perÃƒÆ’Ã‚Â­odo - CORRIGIDO: usar coleÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o raiz 'appointments'
    const appointmentsQuery = query(
      collection(firebaseDb, 'appointments'),
      where('businessId', '==', businessId),
      where('date', '>=', startTimestamp),
      where('date', '<=', endTimestamp)
    );
    const appointmentsSnapshot = await getDocs(appointmentsQuery);
    console.log('ÃƒÂ°Ã‚Å¸Ã‚â€œÃ‚Å  Agendamentos encontrados:', appointmentsSnapshot.size);

    // Verificar se existe ao menos uma collection de appointments
    if (!appointmentsSnapshot) {
      throw new Error('NÃƒÆ’Ã‚Â£o foi possÃƒÆ’Ã‚Â­vel acessar os dados de agendamentos.');
    }

    // Inicializar dados do relatÃƒÆ’Ã‚Â³rio
    let totalRevenue = 0;
    const totalAppointments = appointmentsSnapshot.size;
    let completedAppointments = 0;
    let canceledAppointments = 0;

    const professionalCommissions: FinancialReport['professionalCommissions'] = {};
    const serviceRevenue: FinancialReport['serviceRevenue'] = {};

    // Cache para taxas de comissÃƒÆ’Ã‚Â£o dos profissionais para evitar buscas repetidas
    const professionalRatesCache = new Map<string, number>();

    // Buscar configuraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes de comissÃƒÆ’Ã‚Â£o do estabelecimento
    const businessDocRef = doc(firebaseDb, 'businesses', businessId);
    const businessDoc = await getDoc(businessDocRef);

    if (!businessDoc.exists()) {
      throw new Error('Estabelecimento nÃƒÆ’Ã‚Â£o encontrado.');
    }

    const businessData = businessDoc.data() || {};
    // IMPORTANTE: Sempre usar configuraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do estabelecimento - nunca usar valor mockado
    const defaultCommissionRate = businessData.defaultCommissionRate;

    if (!defaultCommissionRate || defaultCommissionRate <= 0) {
      throw new Error('Taxa de comissÃƒÆ’Ã‚Â£o nÃƒÆ’Ã‚Â£o configurada para este estabelecimento. Configure nas configuraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes do negÃƒÆ’Ã‚Â³cio.');
    }

    // Processar cada agendamento
    for (const appointmentDoc of appointmentsSnapshot.docs) {
      const appointment = appointmentDoc.data();
      console.log('ÃƒÂ°Ã‚Å¸Ã‚â€œÃ‚â€¹ Processando agendamento:', {
        id: appointmentDoc.id,
        status: appointment.status,
        price: appointment.price,
        serviceId: appointment.serviceId,
        professionalId: appointment.professionalId
      });

      if (isRevenueStatus(appointment.status)) {
        completedAppointments++;

        // CORRIGIDO: usar funÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de validaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de preÃƒÆ’Ã‚Â§o
        const price = toValidPrice(appointment.price);
        if (price > 0) {
          totalRevenue += price;
          console.log('ÃƒÂ°Ã‚Å¸Ã‚â€™Ã‚Â° Receita adicionada:', price, 'Total:', totalRevenue);
        }

        // Processar receita por serviÃƒÆ’Ã‚Â§o
        if (appointment.serviceId && price > 0) {
          if (!serviceRevenue[appointment.serviceId]) {
            try {
              // Buscar nome do serviÃƒÆ’Ã‚Â§o na subcoleÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do business
              const serviceDocRef = doc(firebaseDb, 'businesses', businessId, 'services', appointment.serviceId);
              const serviceDoc = await getDoc(serviceDocRef);

              let serviceName = 'ServiÃƒÆ’Ã‚Â§o Desconhecido';
              if (serviceDoc.exists()) {
                const serviceData = serviceDoc.data();
                serviceName = serviceData?.name || 'ServiÃƒÆ’Ã‚Â§o Desconhecido';
              } else {
                // Tentar buscar na coleÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o raiz de services como fallback
                try {
                  const rootServiceRef = doc(firebaseDb, 'services', appointment.serviceId);
                  const rootServiceDoc = await getDoc(rootServiceRef);
                  if (rootServiceDoc.exists()) {
                    const rootServiceData = rootServiceDoc.data();
                    serviceName = rootServiceData?.name || 'ServiÃƒÆ’Ã‚Â§o Desconhecido';
                  }
                } catch {
                  console.log('ÃƒÂ¢Ã‚Å¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â ServiÃƒÆ’Ã‚Â§o nÃƒÆ’Ã‚Â£o encontrado em nenhuma coleÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:', appointment.serviceId);
                }
              }

              serviceRevenue[appointment.serviceId] = {
                name: serviceName,
                totalRevenue: 0,
                appointmentsCount: 0,
              };
            } catch (serviceError) {
              console.error('ÃƒÂ¢Ã‚ÂÃ‚Å’ Erro ao buscar dados do serviÃƒÆ’Ã‚Â§o:', serviceError);
              serviceRevenue[appointment.serviceId] = {
                name: 'ServiÃƒÆ’Ã‚Â§o Desconhecido',
                totalRevenue: 0,
                appointmentsCount: 0,
              };
            }
          }

          serviceRevenue[appointment.serviceId].totalRevenue += price;
          serviceRevenue[appointment.serviceId].appointmentsCount += 1;
          console.log('ÃƒÂ°Ã‚Å¸Ã‚â€Ã‚Â§ Receita do serviÃƒÆ’Ã‚Â§o atualizada:', appointment.serviceId, serviceRevenue[appointment.serviceId]);
        }

        // Processar comissÃƒÆ’Ã‚Â£o por profissional
        if (appointment.professionalId && price > 0) {
          const profId = appointment.professionalId;
          let rateForCalculation: number;

          if (professionalRatesCache.has(profId)) {
            rateForCalculation = professionalRatesCache.get(profId)!;
          } else {
            try {
              // CORRIGIDO: Buscar profissional na subcoleÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do business primeiro
              let professionalDocRef = doc(firebaseDb, 'businesses', businessId, 'professionals', profId);
              let professionalDoc = await getDoc(professionalDocRef);
              let professionalData: any = null;

              if (professionalDoc.exists()) {
                professionalData = professionalDoc.data();
              } else {
                // Fallback: tentar buscar na coleÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o raiz professionals
                professionalDocRef = doc(firebaseDb, 'professionals', profId);
                professionalDoc = await getDoc(professionalDocRef);
                if (professionalDoc.exists()) {
                  professionalData = professionalDoc.data();
                }
              }

              // IMPORTANTE: Usar taxa do profissional especÃƒÆ’Ã‚Â­fico ou padrÃƒÆ’Ã‚Â£o do business
              // NUNCA usar valor mockado - se nÃƒÆ’Ã‚Â£o tiver configuraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o, alertar usuÃƒÆ’Ã‚Â¡rio
              rateForCalculation = professionalData?.commissionRate || defaultCommissionRate;

              if (!rateForCalculation || rateForCalculation <= 0) {
                console.warn('ÃƒÂ¢Ã‚Å¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â Taxa de comissÃƒÆ’Ã‚Â£o nÃƒÆ’Ã‚Â£o configurada para profissional:', profId);
                // Pular este profissional se nÃƒÆ’Ã‚Â£o tiver configuraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o vÃƒÆ’Ã‚Â¡lida
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
                console.log('ÃƒÂ°Ã‚Å¸Ã‚â€˜Ã‚Â¤ Profissional adicionado:', professionalName, 'Taxa:', rateForCalculation);
              }
            } catch (profError) {
              console.error('ÃƒÂ¢Ã‚ÂÃ‚Å’ Erro ao buscar dados do profissional:', profError);
              // IMPORTANTE: Se nÃƒÆ’Ã‚Â£o conseguir buscar dados do profissional, pular
              // NÃƒÆ’Ã‚Æ’O usar taxa mockada/padrÃƒÆ’Ã‚Â£o
              console.warn('ÃƒÂ¢Ã‚Å¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â Pulando profissional sem dados vÃƒÆ’Ã‚Â¡lidos:', profId);
              continue;
            }
          }

          professionalCommissions[profId].totalRevenue += price;
          professionalCommissions[profId].appointmentsCount += 1;
          const commissionAmount = price * rateForCalculation;
          professionalCommissions[profId].commission += commissionAmount;
          console.log('ÃƒÂ°Ã‚Å¸Ã‚â€™Ã‚Â¼ ComissÃƒÆ’Ã‚Â£o calculada para', professionalCommissions[profId].name, ':', commissionAmount, 'Taxa:', rateForCalculation);
        }
      } else if (isCanceledStatus(appointment.status)) {
        canceledAppointments++;
        console.log('ÃƒÂ¢Ã‚ÂÃ‚Å’ Agendamento cancelado contabilizado');
      }
    }

    console.log('ÃƒÂ°Ã‚Å¸Ã‚â€œÃ‚Å  Resumo do relatÃƒÆ’Ã‚Â³rio:', {
      totalRevenue,
      totalAppointments,
      completedAppointments,
      canceledAppointments,
      professionalCommissionsCount: Object.keys(professionalCommissions).length,
      serviceRevenueCount: Object.keys(serviceRevenue).length
    });

    // Criar o relatÃƒÆ’Ã‚Â³rio
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

    // Salvar o relatÃƒÆ’Ã‚Â³rio no firebaseDb
    const reportsCollectionRef = collection(firebaseDb, 'businesses', businessId, 'financialReports');
    const reportRef = await addDoc(reportsCollectionRef, report);
    console.log('ÃƒÂ¢Ã‚Å“Ã‚â€¦ RelatÃƒÆ’Ã‚Â³rio salvo com ID:', reportRef.id);

    return {
      ...report,
      id: reportRef.id,
    };
  } catch (error) {
    console.error('ÃƒÂ¢Ã‚ÂÃ‚Å’ Erro ao gerar relatÃƒÆ’Ã‚Â³rio financeiro:', error);
    if (error instanceof Error) {
      throw error; // Re-throw se jÃƒÆ’Ã‚Â¡ ÃƒÆ’Ã‚Â© um Error com mensagem especÃƒÆ’Ã‚Â­fica
    }
    throw new Error('Erro desconhecido ao gerar relatÃƒÆ’Ã‚Â³rio financeiro. Tente novamente.');
  }
};

// Buscar relatÃƒÆ’Ã‚Â³rios financeiros de um estabelecimento
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

// Buscar um relatÃƒÆ’Ã‚Â³rio financeiro especÃƒÆ’Ã‚Â­fico
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

// Excluir um relatÃƒÆ’Ã‚Â³rio financeiro
export const deleteFinancialReport = async (businessId: string, reportId: string): Promise<void> => {
  try {
    const reportDocRef = doc(firebaseDb, 'businesses', businessId, 'financialReports', reportId);
    await deleteDoc(reportDocRef);
  } catch (error) {
    throw error;
  }
};

// Calcular comissÃƒÆ’Ã‚Âµes por perÃƒÆ’Ã‚Â­odo
export const calculateCommissions = async (
  businessId: string,
  startDate: Date,
  endDate: Date,
): Promise<{ [professionalId: string]: { name: string; commission: number } }> => {
  try {
    console.log('ÃƒÂ°Ã‚Å¸Ã‚â€Ã‚Âµ Calculando comissÃƒÆ’Ã‚Âµes para perÃƒÆ’Ã‚Â­odo:', { businessId, startDate, endDate });

    // Converter datas para Timestamp do firebaseDb
    const startTimestamp = Timestamp.fromDate(startDate);
    const endTimestamp = Timestamp.fromDate(endDate);

    // CORRIGIDO: Buscar agendamentos na coleÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o raiz
    const appointmentsQuery = query(
      collection(firebaseDb, 'appointments'),
      where('businessId', '==', businessId),
      where('date', '>=', startTimestamp),
      where('date', '<=', endTimestamp),
      where('status', '==', 'completed')
    );
    const appointmentsSnapshot = await getDocs(appointmentsQuery);
    console.log('ÃƒÂ°Ã‚Å¸Ã‚â€œÃ‚Å  Agendamentos concluÃƒÆ’Ã‚Â­dos encontrados:', appointmentsSnapshot.size);

    // Buscar configuraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes de comissÃƒÆ’Ã‚Â£o do estabelecimento
    const businessDocRef = doc(firebaseDb, 'businesses', businessId);
    const businessDoc = await getDoc(businessDocRef);

    const businessData = businessDoc.data() || {};
    // IMPORTANTE: Sempre usar configuraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do estabelecimento - nunca usar valor mockado
    const defaultCommissionRate = businessData.defaultCommissionRate;

    if (!defaultCommissionRate || defaultCommissionRate <= 0) {
      throw new Error('Taxa de comissÃƒÆ’Ã‚Â£o nÃƒÆ’Ã‚Â£o configurada para este estabelecimento. Configure nas configuraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes do negÃƒÆ’Ã‚Â³cio.');
    }

    // Calcular comissÃƒÆ’Ã‚Âµes por profissional
    const commissions: { [professionalId: string]: { name: string; commission: number } } = {};
    const professionalRatesCache = new Map<string, number>(); // Cache para taxas

    for (const appointmentDoc of appointmentsSnapshot.docs) {
      const appointment = appointmentDoc.data();

      if (appointment.professionalId && appointment.price) {
        const profId = appointment.professionalId;
        // CORRIGIDO: usar funÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de validaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de preÃƒÆ’Ã‚Â§o
        const price = toValidPrice(appointment.price);

        if (price <= 0) continue;

        let rateForCalculation: number;

        if (professionalRatesCache.has(profId)) {
          rateForCalculation = professionalRatesCache.get(profId)!;
        } else {
          try {
            // CORRIGIDO: Buscar profissional na subcoleÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do business primeiro
            let professionalDocRef = doc(firebaseDb, 'businesses', businessId, 'professionals', profId);
            let professionalDoc = await getDoc(professionalDocRef);
            let professionalData: any = null;

            if (professionalDoc.exists()) {
              professionalData = professionalDoc.data();
            } else {
              // Fallback: tentar buscar na coleÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o raiz professionals
              professionalDocRef = doc(firebaseDb, 'professionals', profId);
              professionalDoc = await getDoc(professionalDocRef);
              if (professionalDoc.exists()) {
                professionalData = professionalDoc.data();
              }
            }

            rateForCalculation = professionalData?.commissionRate || defaultCommissionRate;

            if (!rateForCalculation || rateForCalculation <= 0) {
              console.warn('ÃƒÂ¢Ã‚Å¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â Taxa de comissÃƒÆ’Ã‚Â£o nÃƒÆ’Ã‚Â£o configurada para profissional:', profId);
              // Pular este profissional se nÃƒÆ’Ã‚Â£o tiver configuraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o vÃƒÆ’Ã‚Â¡lida
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
            console.error('ÃƒÂ¢Ã‚ÂÃ‚Å’ Erro ao buscar profissional:', profError);
            // IMPORTANTE: Se nÃƒÆ’Ã‚Â£o conseguir buscar dados do profissional, pular
            // NÃƒÆ’Ã‚Æ’O usar taxa mockada/padrÃƒÆ’Ã‚Â£o
            console.warn('ÃƒÂ¢Ã‚Å¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â Pulando profissional sem dados vÃƒÆ’Ã‚Â¡lidos:', profId);
            continue;
          }
        }

        const commissionAmount = price * rateForCalculation;
        commissions[profId].commission += commissionAmount;
        console.log('ÃƒÂ°Ã‚Å¸Ã‚â€™Ã‚Â¼ ComissÃƒÆ’Ã‚Â£o calculada:', commissions[profId].name, commissionAmount);
      }
    }

    console.log('ÃƒÂ¢Ã‚Å“Ã‚â€¦ CÃƒÆ’Ã‚Â¡lculo de comissÃƒÆ’Ã‚Âµes concluÃƒÆ’Ã‚Â­do:', Object.keys(commissions).length, 'profissionais');
    return commissions;
  } catch (error) {
    console.error('ÃƒÂ¢Ã‚ÂÃ‚Å’ Erro ao calcular comissÃƒÆ’Ã‚Âµes:', error);
    throw error;
  }
};
