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

// Tipos para parâmetros de geração de relatório
export interface ReportParams {
  businessId: string;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  startDate: Date;
  endDate: Date;
}

// Gerar relatório financeiro
export const generateFinancialReport = async (params: ReportParams): Promise<FinancialReport> => {
  try {
    console.log('ðŸ”µ Iniciando geração de relatório financeiro:', params);
    const { businessId, period, startDate, endDate } = params;

    // Validar parâmetros
    if (!businessId || !period || !startDate || !endDate) {
      throw new Error('Parâmetros obrigatórios não fornecidos para gerar o relatório.');
    }

    // Converter datas para Timestamp do firebaseDb
    const startTimestamp = Timestamp.fromDate(startDate);
    const endTimestamp = Timestamp.fromDate(endDate);
    console.log('ðŸ“… Período do relatório:', { start: startDate, end: endDate });

    // Buscar agendamentos no período - CORRIGIDO: usar coleção raiz 'appointments'
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
      throw new Error('Não foi possível acessar os dados de agendamentos.');
    }

    // Inicializar dados do relatório
    let totalRevenue = 0;
    const totalAppointments = appointmentsSnapshot.size;
    let completedAppointments = 0;
    let canceledAppointments = 0;

    const professionalCommissions: FinancialReport['professionalCommissions'] = {};
    const serviceRevenue: FinancialReport['serviceRevenue'] = {};

    // Cache para taxas de comissão dos profissionais para evitar buscas repetidas
    const professionalRatesCache = new Map<string, number>();

    // Buscar configurações de comissão do estabelecimento
    const businessDocRef = doc(firebaseDb, 'businesses', businessId);
    const businessDoc = await getDoc(businessDocRef);

    if (!businessDoc.exists()) {
      throw new Error('Estabelecimento não encontrado.');
    }

    const businessData = businessDoc.data() || {};
    // IMPORTANTE: Sempre usar configuração do estabelecimento - nunca usar valor mockado
    const defaultCommissionRate = businessData.defaultCommissionRate;

    if (!defaultCommissionRate || defaultCommissionRate <= 0) {
      throw new Error('Taxa de comissão não configurada para este estabelecimento. Configure nas configurações do negócio.');
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

        // CORRIGIDO: usar função de validação de preço
        const price = toValidPrice(appointment.price);
        if (price > 0) {
          totalRevenue += price;
          console.log('ðŸ’° Receita adicionada:', price, 'Total:', totalRevenue);
        }

        // Processar receita por serviço
        if (appointment.serviceId && price > 0) {
          if (!serviceRevenue[appointment.serviceId]) {
            try {
              // Buscar nome do serviço na subcoleção do business
              const serviceDocRef = doc(firebaseDb, 'businesses', businessId, 'services', appointment.serviceId);
              const serviceDoc = await getDoc(serviceDocRef);

              let serviceName = 'Serviço Desconhecido';
              if (serviceDoc.exists()) {
                const serviceData = serviceDoc.data();
                serviceName = serviceData?.name || 'Serviço Desconhecido';
              } else {
                // Tentar buscar na coleção raiz de services como fallback
                try {
                  const rootServiceRef = doc(firebaseDb, 'services', appointment.serviceId);
                  const rootServiceDoc = await getDoc(rootServiceRef);
                  if (rootServiceDoc.exists()) {
                    const rootServiceData = rootServiceDoc.data();
                    serviceName = rootServiceData?.name || 'Serviço Desconhecido';
                  }
                } catch {
                  console.log('âš ௸ Serviço não encontrado em nenhuma coleção:', appointment.serviceId);
                }
              }

              serviceRevenue[appointment.serviceId] = {
                name: serviceName,
                totalRevenue: 0,
                appointmentsCount: 0,
              };
            } catch (serviceError) {
              console.error('࢝Œ Erro ao buscar dados do serviço:', serviceError);
              serviceRevenue[appointment.serviceId] = {
                name: 'Serviço Desconhecido',
                totalRevenue: 0,
                appointmentsCount: 0,
              };
            }
          }

          serviceRevenue[appointment.serviceId].totalRevenue += price;
          serviceRevenue[appointment.serviceId].appointmentsCount += 1;
          console.log('ðŸ”§ Receita do serviço atualizada:', appointment.serviceId, serviceRevenue[appointment.serviceId]);
        }

        // Processar comissão por profissional
        if (appointment.professionalId && price > 0) {
          const profId = appointment.professionalId;
          let rateForCalculation: number;

          if (professionalRatesCache.has(profId)) {
            rateForCalculation = professionalRatesCache.get(profId)!;
          } else {
            try {
              // CORRIGIDO: Buscar profissional na subcoleção do business primeiro
              let professionalDocRef = doc(firebaseDb, 'businesses', businessId, 'professionals', profId);
              let professionalDoc = await getDoc(professionalDocRef);
              let professionalData: any = null;

              if (professionalDoc.exists()) {
                professionalData = professionalDoc.data();
              } else {
                // Fallback: tentar buscar na coleção raiz professionals
                professionalDocRef = doc(firebaseDb, 'professionals', profId);
                professionalDoc = await getDoc(professionalDocRef);
                if (professionalDoc.exists()) {
                  professionalData = professionalDoc.data();
                }
              }

              // IMPORTANTE: Usar taxa do profissional específico ou padrão do business
              // NUNCA usar valor mockado - se não tiver configuração, alertar usuário
              rateForCalculation = professionalData?.commissionRate || defaultCommissionRate;

              if (!rateForCalculation || rateForCalculation <= 0) {
                console.warn('âš ௸ Taxa de comissão não configurada para profissional:', profId);
                // Pular este profissional se não tiver configuração válida
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
              console.error('࢝Œ Erro ao buscar dados do profissional:', profError);
              // IMPORTANTE: Se não conseguir buscar dados do profissional, pular
              // NÃƒO usar taxa mockada/padrão
              console.warn('âš ௸ Pulando profissional sem dados válidos:', profId);
              continue;
            }
          }

          professionalCommissions[profId].totalRevenue += price;
          professionalCommissions[profId].appointmentsCount += 1;
          const commissionAmount = price * rateForCalculation;
          professionalCommissions[profId].commission += commissionAmount;
          console.log('ðŸ’¼ Comissão calculada para', professionalCommissions[profId].name, ':', commissionAmount, 'Taxa:', rateForCalculation);
        }
      } else if (isCanceledStatus(appointment.status)) {
        canceledAppointments++;
        console.log('࢝Œ Agendamento cancelado contabilizado');
      }
    }

    console.log('ðŸ“Š Resumo do relatório:', {
      totalRevenue,
      totalAppointments,
      completedAppointments,
      canceledAppointments,
      professionalCommissionsCount: Object.keys(professionalCommissions).length,
      serviceRevenueCount: Object.keys(serviceRevenue).length
    });

    // Criar o relatório
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

    // Salvar o relatório no firebaseDb
    const reportsCollectionRef = collection(firebaseDb, 'businesses', businessId, 'financialReports');
    const reportRef = await addDoc(reportsCollectionRef, report);
    console.log('âœ… Relatório salvo com ID:', reportRef.id);

    return {
      ...report,
      id: reportRef.id,
    };
  } catch (error) {
    console.error('࢝Œ Erro ao gerar relatório financeiro:', error);
    if (error instanceof Error) {
      throw error; // Re-throw se já é um Error com mensagem específica
    }
    throw new Error('Erro desconhecido ao gerar relatório financeiro. Tente novamente.');
  }
};

// Buscar relatórios financeiros de um estabelecimento
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

// Buscar um relatório financeiro específico
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

// Excluir um relatório financeiro
export const deleteFinancialReport = async (businessId: string, reportId: string): Promise<void> => {
  try {
    const reportDocRef = doc(firebaseDb, 'businesses', businessId, 'financialReports', reportId);
    await deleteDoc(reportDocRef);
  } catch (error) {
    throw error;
  }
};

// Calcular comissões por período
export const calculateCommissions = async (
  businessId: string,
  startDate: Date,
  endDate: Date,
): Promise<{ [professionalId: string]: { name: string; commission: number } }> => {
  try {
    console.log('ðŸ”µ Calculando comissões para período:', { businessId, startDate, endDate });

    // Converter datas para Timestamp do firebaseDb
    const startTimestamp = Timestamp.fromDate(startDate);
    const endTimestamp = Timestamp.fromDate(endDate);

    // CORRIGIDO: Buscar agendamentos na coleção raiz
    const appointmentsQuery = query(
      collection(firebaseDb, 'appointments'),
      where('businessId', '==', businessId),
      where('date', '>=', startTimestamp),
      where('date', '<=', endTimestamp),
      where('status', '==', 'completed')
    );
    const appointmentsSnapshot = await getDocs(appointmentsQuery);
    console.log('ðŸ“Š Agendamentos concluídos encontrados:', appointmentsSnapshot.size);

    // Buscar configurações de comissão do estabelecimento
    const businessDocRef = doc(firebaseDb, 'businesses', businessId);
    const businessDoc = await getDoc(businessDocRef);

    const businessData = businessDoc.data() || {};
    // IMPORTANTE: Sempre usar configuração do estabelecimento - nunca usar valor mockado
    const defaultCommissionRate = businessData.defaultCommissionRate;

    if (!defaultCommissionRate || defaultCommissionRate <= 0) {
      throw new Error('Taxa de comissão não configurada para este estabelecimento. Configure nas configurações do negócio.');
    }

    // Calcular comissões por profissional
    const commissions: { [professionalId: string]: { name: string; commission: number } } = {};
    const professionalRatesCache = new Map<string, number>(); // Cache para taxas

    for (const appointmentDoc of appointmentsSnapshot.docs) {
      const appointment = appointmentDoc.data();

      if (appointment.professionalId && appointment.price) {
        const profId = appointment.professionalId;
        // CORRIGIDO: usar função de validação de preço
        const price = toValidPrice(appointment.price);

        if (price <= 0) continue;

        let rateForCalculation: number;

        if (professionalRatesCache.has(profId)) {
          rateForCalculation = professionalRatesCache.get(profId)!;
        } else {
          try {
            // CORRIGIDO: Buscar profissional na subcoleção do business primeiro
            let professionalDocRef = doc(firebaseDb, 'businesses', businessId, 'professionals', profId);
            let professionalDoc = await getDoc(professionalDocRef);
            let professionalData: any = null;

            if (professionalDoc.exists()) {
              professionalData = professionalDoc.data();
            } else {
              // Fallback: tentar buscar na coleção raiz professionals
              professionalDocRef = doc(firebaseDb, 'professionals', profId);
              professionalDoc = await getDoc(professionalDocRef);
              if (professionalDoc.exists()) {
                professionalData = professionalDoc.data();
              }
            }

            rateForCalculation = professionalData?.commissionRate || defaultCommissionRate;

            if (!rateForCalculation || rateForCalculation <= 0) {
              console.warn('âš ௸ Taxa de comissão não configurada para profissional:', profId);
              // Pular este profissional se não tiver configuração válida
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
            console.error('࢝Œ Erro ao buscar profissional:', profError);
            // IMPORTANTE: Se não conseguir buscar dados do profissional, pular
            // NÃƒO usar taxa mockada/padrão
            console.warn('âš ௸ Pulando profissional sem dados válidos:', profId);
            continue;
          }
        }

        const commissionAmount = price * rateForCalculation;
        commissions[profId].commission += commissionAmount;
        console.log('ðŸ’¼ Comissão calculada:', commissions[profId].name, commissionAmount);
      }
    }

    console.log('âœ… Cálculo de comissões concluído:', Object.keys(commissions).length, 'profissionais');
    return commissions;
  } catch (error) {
    console.error('࢝Œ Erro ao calcular comissões:', error);
    throw error;
  }
};
