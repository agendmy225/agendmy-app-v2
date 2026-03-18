import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, Alert, SafeAreaView, Image,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../constants/colors';
import { AppStackParamList } from '../../types/types';
import { useAuth } from '../auth/context/AuthContext';
import {
  createPixPayment, createCardPayment,
  formatAmount, getPaymentStatusLabel, getPaymentStatusColor,
  validateCardNumber, detectCardBrand, maskCardNumber,
  PaymentResult, CardData,
} from '../../services/mercadopago';

type PaymentRouteProp = RouteProp<AppStackParamList, 'Payment'>;
type PaymentNavProp = StackNavigationProp<AppStackParamList, 'Payment'>;

type Tab = 'pix' | 'credit' | 'debit';

const PaymentScreen: React.FC = () => {
  const navigation = useNavigation<PaymentNavProp>();
  const route = useRoute<PaymentRouteProp>();
  const { user } = useAuth();
  const { appointmentId, amount, description, businessName } = route.params;

  const [activeTab, setActiveTab] = useState<Tab>('pix');
  const [isLoading, setIsLoading] = useState(false);
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const [pixPollingActive, setPixPollingActive] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Campos do cartão
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [cpf, setCpf] = useState('');
  const [installments, setInstallments] = useState(1);
  const [cardBrand, setCardBrand] = useState('');

  const amountInCents = Math.round(amount * 100);

  // Parar polling ao desmontar
  useEffect(() => {
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []);

  // Iniciar polling quando Pix estiver pendente
  useEffect(() => {
    if (paymentResult?.status === 'pending' && pixPollingActive) {
      pollingRef.current = setInterval(async () => {
        try {
          const { getPaymentStatus } = await import('../../services/mercadopago');
          const updated = await getPaymentStatus(paymentResult.id);
          if (updated.status !== 'pending') {
            setPaymentResult(updated);
            setPixPollingActive(false);
            if (pollingRef.current) clearInterval(pollingRef.current);
          }
        } catch { /* silencioso */ }
      }, 5000); // verificar a cada 5 segundos
    }
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [paymentResult, pixPollingActive]);

  const handleCardNumberChange = (text: string) => {
    const masked = maskCardNumber(text.replace(/\D/g, '').slice(0, 16));
    setCardNumber(masked);
    setCardBrand(detectCardBrand(masked));
  };

  const handleExpiryChange = (text: string) => {
    const clean = text.replace(/\D/g, '').slice(0, 4);
    setExpiry(clean.length > 2 ? `${clean.slice(0, 2)}/${clean.slice(2)}` : clean);
  };

  const handleCpfChange = (text: string) => {
    const clean = text.replace(/\D/g, '').slice(0, 11);
    setCpf(clean.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4').replace(/-$/, ''));
  };

  const handlePayPix = async () => {
    if (!user?.email) { Alert.alert('Erro', 'E-mail não encontrado.'); return; }
    setIsLoading(true);
    try {
      const result = await createPixPayment(appointmentId, amountInCents, description, user.email);
      setPaymentResult(result);
      if (result.status === 'pending') setPixPollingActive(true);
    } catch (e) {
      Alert.alert('Erro no pagamento', e instanceof Error ? e.message : 'Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayCard = async () => {
    if (!validateCardNumber(cardNumber)) { Alert.alert('Erro', 'Número do cartão inválido.'); return; }
    if (!cardHolder.trim()) { Alert.alert('Erro', 'Nome no cartão obrigatório.'); return; }
    if (expiry.length < 5) { Alert.alert('Erro', 'Validade inválida.'); return; }
    if (cvv.length < 3) { Alert.alert('Erro', 'CVV inválido.'); return; }
    if (cpf.replace(/\D/g, '').length < 11) { Alert.alert('Erro', 'CPF inválido.'); return; }
    if (!user?.email) { Alert.alert('Erro', 'E-mail não encontrado.'); return; }

    const [expMonth, expYear] = expiry.split('/');
    const cardData: CardData = {
      cardNumber: cardNumber.replace(/\s/g, ''),
      cardholderName: cardHolder,
      expirationMonth: expMonth,
      expirationYear: `20${expYear}`,
      securityCode: cvv,
      docType: 'CPF',
      docNumber: cpf.replace(/\D/g, ''),
      email: user.email,
      installments: activeTab === 'credit' ? installments : 1,
    };

    setIsLoading(true);
    try {
      const result = await createCardPayment(
        appointmentId, amountInCents, description,
        cardData, activeTab === 'credit' ? 'credit_card' : 'debit_card',
      );
      setPaymentResult(result);
    } catch (e) {
      Alert.alert('Erro no pagamento', e instanceof Error ? e.message : 'Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Tela de resultado ──
  if (paymentResult) {
    const statusColor = getPaymentStatusColor(paymentResult.status);
    const statusLabel = getPaymentStatusLabel(paymentResult.status);
    const isApproved = paymentResult.status === 'approved';
    const isPending = paymentResult.status === 'pending';

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.resultContainer}>
          <View style={[styles.statusIconCircle, { backgroundColor: statusColor + '20' }]}>
            <Icon
              name={isApproved ? 'check-circle' : isPending ? 'access-time' : 'cancel'}
              size={64} color={statusColor}
            />
          </View>
          <Text style={[styles.statusTitle, { color: statusColor }]}>{statusLabel}</Text>
          <Text style={styles.statusAmount}>{formatAmount(amountInCents)}</Text>

          {isPending && paymentResult.pixQrCode && (
            <View style={styles.pixContainer}>
              <Text style={styles.pixInstruction}>Escaneie o QR Code ou copie o código Pix</Text>
              {paymentResult.pixQrCodeBase64 && (
                <Image
                  source={{ uri: `data:image/png;base64,${paymentResult.pixQrCodeBase64}` }}
                  style={styles.pixQrImage}
                  resizeMode="contain"
                />
              )}
              <TouchableOpacity
                style={styles.pixCopyButton}
                onPress={() => {
                  const Clipboard = require('@react-native-clipboard/clipboard').default;
                  Clipboard.setString(paymentResult.pixQrCode!);
                  Alert.alert('Copiado!', 'Código Pix copiado para a área de transferência.');
                }}
              >
                <Icon name="content-copy" size={18} color={colors.white} />
                <Text style={styles.pixCopyText}>Copiar código Pix</Text>
              </TouchableOpacity>
              {paymentResult.pixExpirationDate && (
                <Text style={styles.pixExpiry}>
                  Válido até: {new Date(paymentResult.pixExpirationDate).toLocaleString('pt-BR')}
                </Text>
              )}
              <View style={styles.pollingIndicator}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.pollingText}>Aguardando confirmação do pagamento...</Text>
              </View>
            </View>
          )}

          {isApproved && (
            <Text style={styles.approvedMsg}>
              Seu agendamento está confirmado! Você receberá uma notificação de lembrete.
            </Text>
          )}

          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => navigation.navigate('ClientTabs', { screen: 'Appointments' } as never)}
          >
            <Text style={styles.doneButtonText}>
              {isApproved ? 'Ver meus agendamentos' : 'Voltar para agendamentos'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Formulário de pagamento ──
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pagamento</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Resumo */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryBusiness}>{businessName}</Text>
          <Text style={styles.summaryDesc}>{description}</Text>
          <Text style={styles.summaryAmount}>{formatAmount(amountInCents)}</Text>
        </View>

        {/* Abas de método */}
        <View style={styles.tabRow}>
          {([['pix', 'Pix', 'qr-code-2'], ['credit', 'Crédito', 'credit-card'], ['debit', 'Débito', 'payment']] as const).map(
            ([key, label, icon]) => (
              <TouchableOpacity
                key={key}
                style={[styles.tab, activeTab === key && styles.tabActive]}
                onPress={() => setActiveTab(key)}
              >
                <Icon name={icon} size={20} color={activeTab === key ? colors.white : colors.lightText} />
                <Text style={[styles.tabText, activeTab === key && styles.tabTextActive]}>{label}</Text>
              </TouchableOpacity>
            )
          )}
        </View>

        <View style={styles.formContainer}>
          {activeTab === 'pix' ? (
            <View style={styles.pixInfo}>
              <Icon name="qr-code-2" size={48} color={colors.primary} />
              <Text style={styles.pixInfoTitle}>Pagar com Pix</Text>
              <Text style={styles.pixInfoText}>
                Ao confirmar, um QR Code Pix será gerado. Escaneie com o app do seu banco para pagar instantaneamente.
              </Text>
              <View style={styles.pixBenefits}>
                {['Aprovação instantânea', 'Sem taxas adicionais', 'Disponível 24h'].map(t => (
                  <View key={t} style={styles.pixBenefit}>
                    <Icon name="check" size={16} color={colors.success} />
                    <Text style={styles.pixBenefitText}>{t}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <>
              <View style={styles.cardPreview}>
                <Icon name="credit-card" size={24} color={colors.lightText} />
                <Text style={styles.cardBrandText}>{cardBrand || 'Cartão'}</Text>
              </View>

              <Text style={styles.fieldLabel}>Número do cartão</Text>
              <TextInput
                style={styles.input}
                value={cardNumber}
                onChangeText={handleCardNumberChange}
                placeholder="0000 0000 0000 0000"
                placeholderTextColor={colors.placeholderText}
                keyboardType="numeric"
                maxLength={19}
              />

              <Text style={styles.fieldLabel}>Nome no cartão</Text>
              <TextInput
                style={styles.input}
                value={cardHolder}
                onChangeText={setCardHolder}
                placeholder="Como está no cartão"
                placeholderTextColor={colors.placeholderText}
                autoCapitalize="characters"
              />

              <View style={styles.row}>
                <View style={styles.halfField}>
                  <Text style={styles.fieldLabel}>Validade</Text>
                  <TextInput
                    style={styles.input}
                    value={expiry}
                    onChangeText={handleExpiryChange}
                    placeholder="MM/AA"
                    placeholderTextColor={colors.placeholderText}
                    keyboardType="numeric"
                    maxLength={5}
                  />
                </View>
                <View style={styles.halfField}>
                  <Text style={styles.fieldLabel}>CVV</Text>
                  <TextInput
                    style={styles.input}
                    value={cvv}
                    onChangeText={setCvv}
                    placeholder="000"
                    placeholderTextColor={colors.placeholderText}
                    keyboardType="numeric"
                    maxLength={4}
                    secureTextEntry
                  />
                </View>
              </View>

              <Text style={styles.fieldLabel}>CPF do titular</Text>
              <TextInput
                style={styles.input}
                value={cpf}
                onChangeText={handleCpfChange}
                placeholder="000.000.000-00"
                placeholderTextColor={colors.placeholderText}
                keyboardType="numeric"
                maxLength={14}
              />

              {activeTab === 'credit' && (
                <>
                  <Text style={styles.fieldLabel}>Parcelas</Text>
                  <View style={styles.installmentRow}>
                    {[1, 2, 3, 6, 12].map(n => (
                      <TouchableOpacity
                        key={n}
                        style={[styles.installmentBtn, installments === n && styles.installmentBtnActive]}
                        onPress={() => setInstallments(n)}
                      >
                        <Text style={[styles.installmentText, installments === n && styles.installmentTextActive]}>
                          {n === 1 ? '1x' : `${n}x`}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
            </>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.payButton, isLoading && styles.payButtonDisabled]}
          onPress={activeTab === 'pix' ? handlePayPix : handlePayCard}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Icon name={activeTab === 'pix' ? 'qr-code-2' : 'lock'} size={20} color={colors.white} />
              <Text style={styles.payButtonText}>
                Pagar {formatAmount(amountInCents)}
              </Text>
            </>
          )}
        </TouchableOpacity>
        <View style={styles.secureRow}>
          <Icon name="lock" size={14} color={colors.lightText} />
          <Text style={styles.secureText}>Pagamento seguro via Mercado Pago</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: colors.white,
    borderBottomWidth: 1, borderBottomColor: colors.lightGray,
  },
  backButton: { marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text },
  summaryCard: {
    margin: 16, padding: 16, backgroundColor: colors.white,
    borderRadius: 12, elevation: 2,
  },
  summaryBusiness: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
  summaryDesc: { fontSize: 13, color: colors.lightText, marginBottom: 8 },
  summaryAmount: { fontSize: 24, fontWeight: 'bold', color: colors.primary },
  tabRow: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 16,
    backgroundColor: colors.lightGray, borderRadius: 10, padding: 4,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: 8, gap: 6,
  },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 13, color: colors.lightText, fontWeight: '500' },
  tabTextActive: { color: colors.white },
  formContainer: { paddingHorizontal: 16, paddingBottom: 24 },
  pixInfo: { alignItems: 'center', paddingVertical: 24 },
  pixInfoTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginTop: 12 },
  pixInfoText: {
    fontSize: 14, color: colors.lightText, textAlign: 'center',
    marginTop: 8, lineHeight: 22,
  },
  pixBenefits: { marginTop: 20, alignSelf: 'stretch' },
  pixBenefit: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  pixBenefitText: { fontSize: 14, color: colors.text },
  cardPreview: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginBottom: 16, padding: 12,
    backgroundColor: colors.lightGray, borderRadius: 8,
  },
  cardBrandText: { fontSize: 15, fontWeight: '500', color: colors.text },
  fieldLabel: { fontSize: 13, fontWeight: '500', color: colors.text, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.lightGray,
    borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: colors.text,
  },
  row: { flexDirection: 'row', gap: 12 },
  halfField: { flex: 1 },
  installmentRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 6 },
  installmentBtn: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8,
    borderWidth: 1, borderColor: colors.lightGray, backgroundColor: colors.white,
  },
  installmentBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  installmentText: { fontSize: 13, color: colors.text },
  installmentTextActive: { color: colors.white, fontWeight: '600' },
  footer: {
    padding: 16, backgroundColor: colors.white,
    borderTopWidth: 1, borderTopColor: colors.lightGray,
  },
  payButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primary, borderRadius: 12,
    paddingVertical: 16, gap: 8,
  },
  payButtonDisabled: { opacity: 0.6 },
  payButtonText: { color: colors.white, fontSize: 16, fontWeight: 'bold' },
  secureRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 8 },
  secureText: { fontSize: 12, color: colors.lightText },
  // Resultado
  resultContainer: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  statusIconCircle: {
    width: 120, height: 120, borderRadius: 60,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  statusTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  statusAmount: { fontSize: 32, fontWeight: 'bold', color: colors.text, marginBottom: 24 },
  pixContainer: { width: '100%', alignItems: 'center', marginBottom: 24 },
  pixInstruction: { fontSize: 14, color: colors.lightText, textAlign: 'center', marginBottom: 16 },
  pixQrImage: { width: 200, height: 200, marginBottom: 16 },
  pixCopyButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 12,
    marginBottom: 12,
  },
  pixCopyText: { color: colors.white, fontWeight: '600', fontSize: 14 },
  pixExpiry: { fontSize: 12, color: colors.lightText, marginBottom: 16 },
  pollingIndicator: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pollingText: { fontSize: 13, color: colors.lightText },
  approvedMsg: {
    fontSize: 14, color: colors.lightText, textAlign: 'center',
    marginBottom: 24, lineHeight: 22,
  },
  doneButton: {
    backgroundColor: colors.primary, borderRadius: 12,
    paddingHorizontal: 32, paddingVertical: 16, marginTop: 8,
  },
  doneButtonText: { color: colors.white, fontSize: 16, fontWeight: 'bold' },
});

export default PaymentScreen;
