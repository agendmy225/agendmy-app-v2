import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  firestore,
  collection,
  query,
  where,
  limit,
  getDocs,
} from '../../config/firebase';
import { colors } from '../../constants/colors';
import { useAuth } from '../auth/context/AuthContext';
import {
  FinancialReport,
  generateFinancialReport,
  getFinancialReports,
  deleteFinancialReport,
  ReportParams,
} from '../../services/financialReports';
import { validateCommissionConfig } from '../../services/businessConfig';
import { formatCurrency as formatCurrencyUtil } from '../../constants/reportConfig';

const FinancialReportsScreen: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [reports, setReports] = useState<FinancialReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<FinancialReport | null>(null);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [generateModalVisible, setGenerateModalVisible] = useState(false);

  const [reportPeriod, setReportPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'>('monthly');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [generatingReport, setGeneratingReport] = useState(false);

  const fetchBusinessId = React.useCallback(async () => {
    if (!user) { return; }

    try {
      const businessQuery = query(
        collection(firestore, 'businesses'),
        where('ownerId', '==', user.uid),
        limit(1)
      );
      const businessSnapshot = await getDocs(businessQuery);

      if (!businessSnapshot.empty) {
        const businessDoc = businessSnapshot.docs[0];
        const foundBusinessId = businessDoc.id;
        setBusinessId(foundBusinessId);
      } else {
        setLoading(false);
      }
    } catch (businessError) {
      console.error('Erro ao buscar businessId:', businessError);
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBusinessId();
  }, [fetchBusinessId]);

  const loadReports = React.useCallback(async () => {
    if (!businessId) { return; }

    try {
      setLoading(true);
      const fetchedReports = await getFinancialReports(businessId);

      if (fetchedReports.length === 0) {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        try {
          const currentMonthReport = await generateFinancialReport({
            businessId,
            period: 'monthly',
            startDate: startOfMonth,
            endDate: endOfMonth,
          });
          setReports([currentMonthReport]);
        } catch (autoReportError) {
          setReports([]);
        }
      } else {
        setReports(fetchedReports);
      }

      setLoading(false);
    } catch (loadError) {
      console.error('Erro ao carregar relatórios:', loadError);
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    if (businessId) {
      loadReports();
    }
  }, [businessId, loadReports]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadReports();
    setRefreshing(false);
  }, [loadReports]);

  const handleGenerateReport = async () => {
    if (!businessId) {
      Alert.alert('Erro', 'ID do estabelecimento não encontrado.');
      return;
    }

    try {
      setGeneratingReport(true);

      const commissionValidation = await validateCommissionConfig(businessId);

      if (!commissionValidation.hasValidConfig) {
        Alert.alert(
          'Configuração Necessária',
          `${commissionValidation.message}\n\nConfigure a taxa de comissão nas configurações do seu negócio para gerar relatórios.`,
          [{ text: 'Entendi', style: 'default' }]
        );
        setGeneratingReport(false);
        return;
      }

      let start: Date;
      let end: Date;

      try {
        start = new Date(startDate);
        end = new Date(endDate);
      } catch (dateError) {
        Alert.alert('Erro', 'Formato de data inválido. Use o formato AAAA-MM-DD.');
        setGeneratingReport(false);
        return;
      }

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        Alert.alert('Erro', 'Formato de data inválido. Use o formato AAAA-MM-DD.');
        setGeneratingReport(false);
        return;
      }

      if (start > end) {
        Alert.alert('Erro', 'A data inicial deve ser anterior à data final.');
        setGeneratingReport(false);
        return;
      }

      const now = new Date();
      if (start > now) {
        Alert.alert('Erro', 'A data inicial não pode ser no futuro.');
        setGeneratingReport(false);
        return;
      }

      const reportParams: ReportParams = {
        businessId,
        period: reportPeriod,
        startDate: start,
        endDate: end,
      };

      const newReport = await generateFinancialReport(reportParams);
      setReports([newReport, ...reports]);
      setGenerateModalVisible(false);
      Alert.alert('Sucesso', 'Relatório financeiro gerado com sucesso!');
      setGeneratingReport(false);
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      const errorMessage = error instanceof Error
        ? error.message
        : 'Ocorreu um erro ao gerar o relatório. Tente novamente.';
      Alert.alert('Erro', errorMessage);
      setGeneratingReport(false);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!businessId) {
      Alert.alert('Erro', 'ID do estabelecimento não encontrado.');
      return;
    }

    Alert.alert(
      'Confirmar Exclusão',
      'Tem certeza de que deseja excluir este relatório? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFinancialReport(businessId, reportId);
              setReports(prevReports => prevReports.filter(report => report.id !== reportId));
              setReportModalVisible(false);
              Alert.alert('Sucesso', 'Relatório excluído com sucesso.');
            } catch (deleteError) {
              console.error('Erro ao excluir relatório:', deleteError);
              Alert.alert('Erro', 'Ocorreu um erro ao excluir o relatório. Tente novamente.');
            }
          },
        },
      ],
    );
  };

  const viewReportDetails = (report: FinancialReport) => {
    setSelectedReport(report);
    setReportModalVisible(true);
  };

  // CORRIGIDO: aceita todos os formatos de timestamp do Firestore
  const formatDate = (timestamp: any): string => {
    if (!timestamp) { return 'N/A'; }
    try {
      let date: Date;
      if (timestamp instanceof Date) {
        date = timestamp;
      } else if (typeof timestamp === 'string') {
        date = new Date(timestamp);
      } else if (typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
      } else if (timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000);
      } else {
        return 'N/A';
      }
      if (isNaN(date.getTime())) { return 'N/A'; }
      return date.toLocaleDateString('pt-BR');
    } catch {
      return 'N/A';
    }
  };

  const formatCurrency = (value: number) => {
    return formatCurrencyUtil(value);
  };

  const getPeriodLabel = (period: string, pStartDate: any, pEndDate: any) => {
    if (!pStartDate || !pEndDate) { return ''; }
    switch (period) {
      case 'daily':
        return `Diário - ${formatDate(pStartDate)}`;
      case 'weekly':
        return `Semanal - ${formatDate(pStartDate)} a ${formatDate(pEndDate)}`;
      case 'monthly':
        return `Mensal - ${formatDate(pStartDate).split('/')[1]}/${formatDate(pStartDate).split('/')[2]}`;
      case 'yearly':
        return `Anual - ${formatDate(pStartDate).split('/')[2]}`;
      case 'custom':
        return `Personalizado - ${formatDate(pStartDate)} a ${formatDate(pEndDate)}`;
      default:
        return `${formatDate(pStartDate)} a ${formatDate(pEndDate)}`;
    }
  };

  const renderReportItem = (report: FinancialReport) => (
    <TouchableOpacity
      key={report.id}
      style={styles.reportCard}
      onPress={() => viewReportDetails(report)}
    >
      <View style={styles.reportHeader}>
        <Text style={styles.reportTitle}>
          {getPeriodLabel(report.period, report.startDate, report.endDate)}
        </Text>
        <TouchableOpacity
          style={styles.deleteIcon}
          onPress={() => report.id && handleDeleteReport(report.id)}
        >
          <Text style={styles.deleteIconText}>ðŸ—‘ï¸</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.reportDate}>
        Gerado em: {formatDate(report.createdAt)}
      </Text>

      <View style={styles.reportSummary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Receita Total</Text>
          <Text style={styles.summaryValue}>{formatCurrency(report.totalRevenue)}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Agendamentos</Text>
          <Text style={styles.summaryValue}>{report.completedAppointments}/{report.totalAppointments}</Text>
        </View>
      </View>

      <Text style={styles.viewDetailsText}>Toque para ver detalhes</Text>
    </TouchableOpacity>
  );

  const renderReportModal = () => {
    if (!selectedReport) { return null; }

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={reportModalVisible}
        onRequestClose={() => setReportModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Relatório Financeiro</Text>
              <TouchableOpacity style={styles.closeButton} onPress={() => setReportModalVisible(false)}>
                <Text style={styles.closeButtonText}>âœ•</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.reportDetailHeader}>
                <Text style={styles.reportDetailTitle}>
                  {getPeriodLabel(selectedReport.period, selectedReport.startDate, selectedReport.endDate)}
                </Text>
                <Text style={styles.reportDetailDate}>
                  Gerado em: {formatDate(selectedReport.createdAt)}
                </Text>
              </View>

              <View style={styles.reportDetailSection}>
                <Text style={styles.sectionTitle}>Resumo</Text>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Receita Total</Text>
                  <Text style={styles.detailValue}>{formatCurrency(selectedReport.totalRevenue)}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Agendamentos Totais</Text>
                  <Text style={styles.detailValue}>{selectedReport.totalAppointments}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Agendamentos Concluídos</Text>
                  <Text style={styles.detailValue}>{selectedReport.completedAppointments}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Agendamentos Cancelados</Text>
                  <Text style={styles.detailValue}>{selectedReport.canceledAppointments}</Text>
                </View>
              </View>

              <View style={styles.reportDetailSection}>
                <Text style={styles.sectionTitle}>Comissões por Profissional</Text>
                {Object.entries(selectedReport.professionalCommissions).length > 0 ? (
                  Object.entries(selectedReport.professionalCommissions).map(([id, data]) => (
                    <View key={id} style={styles.commissionItem}>
                      <Text style={styles.commissionName}>{data.name}</Text>
                      <View style={styles.commissionDetails}>
                        <View style={styles.detailItem}>
                          <Text style={styles.detailLabel}>Receita</Text>
                          <Text style={styles.detailValue}>{formatCurrency(data.totalRevenue)}</Text>
                        </View>
                        <View style={styles.detailItem}>
                          <Text style={styles.detailLabel}>Agendamentos</Text>
                          <Text style={styles.detailValue}>{data.appointmentsCount}</Text>
                        </View>
                        <View style={styles.detailItem}>
                          <Text style={styles.detailLabel}>Comissão</Text>
                          <Text style={[styles.detailValue, styles.commissionValue]}>
                            {formatCurrency(data.commission)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptySubtext}>Nenhuma comissão calculada no período</Text>
                )}
              </View>

              <View style={styles.reportDetailSection}>
                <Text style={styles.sectionTitle}>Receita por Serviço</Text>
                {Object.entries(selectedReport.serviceRevenue).length > 0 ? (
                  Object.entries(selectedReport.serviceRevenue).map(([id, data]) => (
                    <View key={id} style={styles.serviceItem}>
                      <Text style={styles.serviceName}>{data.name}</Text>
                      <View style={styles.serviceDetails}>
                        <View style={styles.detailItem}>
                          <Text style={styles.detailLabel}>Receita</Text>
                          <Text style={styles.detailValue}>{formatCurrency(data.totalRevenue)}</Text>
                        </View>
                        <View style={styles.detailItem}>
                          <Text style={styles.detailLabel}>Agendamentos</Text>
                          <Text style={styles.detailValue}>{data.appointmentsCount}</Text>
                        </View>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptySubtext}>Nenhuma receita por serviço no período</Text>
                )}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => selectedReport?.id && handleDeleteReport(selectedReport.id)}
              >
                <Text style={styles.deleteButtonText}>Excluir Relatório</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeModalButton} onPress={() => setReportModalVisible(false)}>
                <Text style={styles.closeModalButtonText}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderGenerateReportModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={generateModalVisible}
      onRequestClose={() => setGenerateModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Gerar Relatório Financeiro</Text>
            <TouchableOpacity style={styles.closeButton} onPress={() => setGenerateModalVisible(false)}>
              <Text style={styles.closeButtonText}>âœ•</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Período</Text>
              <View style={styles.periodButtonsContainer}>
                {(['daily', 'weekly', 'monthly', 'yearly', 'custom'] as const).map((period) => (
                  <TouchableOpacity
                    key={period}
                    style={[styles.periodButton, reportPeriod === period && styles.activePeriodButton]}
                    onPress={() => setReportPeriod(period)}
                  >
                    <Text style={[styles.periodButtonText, reportPeriod === period && styles.activePeriodButtonText]}>
                      {period === 'daily' ? 'Diário' : period === 'weekly' ? 'Semanal' : period === 'monthly' ? 'Mensal' : period === 'yearly' ? 'Anual' : 'Personalizado'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Data Inicial</Text>
              <TextInput style={styles.input} value={startDate} onChangeText={setStartDate} placeholder="AAAA-MM-DD" />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Data Final</Text>
              <TextInput style={styles.input} value={endDate} onChangeText={setEndDate} placeholder="AAAA-MM-DD" />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setGenerateModalVisible(false)}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.generateButton} onPress={handleGenerateReport} disabled={generatingReport}>
              {generatingReport ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.generateButtonText}>Gerar Relatório</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Carregando relatórios...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Relatórios Financeiros</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {reports.length > 0 ? (
          reports.map(report => renderReportItem(report))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Nenhum relatório encontrado</Text>
            <Text style={styles.emptySubtext}>
              Gere seu primeiro relatório financeiro para visualizar suas receitas e comissões.
            </Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.addButton} onPress={() => setGenerateModalVisible(true)}>
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>

      {renderReportModal()}
      {renderGenerateReportModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  loadingText: { marginTop: 10, fontSize: 16, color: colors.text },
  header: { padding: 20, backgroundColor: colors.primary },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.white },
  content: { flex: 1, padding: 15 },
  reportCard: { backgroundColor: colors.white, borderRadius: 10, padding: 15, marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  reportHeader: { marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reportTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, flex: 1 },
  deleteIcon: { padding: 5 },
  deleteIconText: { fontSize: 20 },
  reportDate: { fontSize: 14, color: colors.lightText, marginBottom: 10 },
  reportSummary: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  summaryItem: { flex: 1 },
  summaryLabel: { fontSize: 14, color: colors.lightText, marginBottom: 5 },
  summaryValue: { fontSize: 16, fontWeight: 'bold', color: colors.primary },
  viewDetailsText: { fontSize: 14, color: colors.primary, textAlign: 'center', marginTop: 10 },
  emptyContainer: { padding: 20, alignItems: 'center', justifyContent: 'center', height: 200 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: colors.lightText, marginBottom: 10 },
  emptySubtext: { fontSize: 14, color: colors.lightText, textAlign: 'center' },
  addButton: { position: 'absolute', bottom: 20, right: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3 },
  addButtonText: { fontSize: 30, color: colors.white, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { width: '90%', maxHeight: '80%', backgroundColor: colors.white, borderRadius: 10, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: colors.lightGray },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text },
  closeButton: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.lightGray, justifyContent: 'center', alignItems: 'center' },
  closeButtonText: { fontSize: 16, color: colors.text },
  modalContent: { padding: 15 },
  reportDetailHeader: { marginBottom: 20 },
  reportDetailTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 5 },
  reportDetailDate: { fontSize: 14, color: colors.lightText },
  reportDetailSection: { marginBottom: 20, padding: 15, backgroundColor: colors.background, borderRadius: 10 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 15 },
  detailItem: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  detailLabel: { fontSize: 14, color: colors.lightText },
  detailValue: { fontSize: 14, fontWeight: 'bold', color: colors.text },
  commissionItem: { marginBottom: 15, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: colors.lightGray },
  commissionName: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 10 },
  commissionDetails: { paddingLeft: 10 },
  commissionValue: { color: colors.success },
  serviceItem: { marginBottom: 15, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: colors.lightGray },
  serviceName: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 10 },
  serviceDetails: { paddingLeft: 10 },
  modalFooter: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, borderTopWidth: 1, borderTopColor: colors.lightGray },
  closeModalButton: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 5, backgroundColor: colors.primary, marginLeft: 5 },
  closeModalButtonText: { fontSize: 16, color: colors.white, fontWeight: 'bold' },
  deleteButton: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 5, backgroundColor: colors.error, marginRight: 5 },
  deleteButtonText: { fontSize: 16, color: colors.white, fontWeight: 'bold' },
  inputContainer: { marginBottom: 15 },
  inputLabel: { fontSize: 14, fontWeight: 'bold', color: colors.text, marginBottom: 5 },
  input: { backgroundColor: colors.background, borderRadius: 8, padding: 10, fontSize: 16, color: colors.text },
  periodButtonsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  periodButton: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, marginRight: 8, marginBottom: 8, backgroundColor: colors.background },
  activePeriodButton: { backgroundColor: colors.primary },
  periodButtonText: { fontSize: 14, color: colors.text },
  activePeriodButtonText: { color: colors.white, fontWeight: 'bold' },
  cancelButton: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 5, marginRight: 10, backgroundColor: colors.lightGray },
  cancelButtonText: { fontSize: 16, color: colors.text, fontWeight: 'bold' },
  generateButton: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 5, backgroundColor: colors.primary },
  generateButtonText: { fontSize: 16, color: colors.white, fontWeight: 'bold' },
});

export default FinancialReportsScreen;
