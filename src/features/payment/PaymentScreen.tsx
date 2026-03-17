import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Linking, Image,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { AppStackParamList } from '../../types/types';
import { colors } from '../../constants/colors';
import {
  createPaymentPreference,
  getPaymentByAppointment,
  getSavedPaymentMethods,
  checkPaymentStatus,
  PaymentMethod,
} from '../../services/mercadopago';

type PaymentRouteProp = RouteProp<AppStackParamList, 'Payment'>;
type PaymentNavigationProp = StackNavigationProp<AppStackParamList, 'Payment'>;
type PaymentMode = 'checkout_pro' | 'pix' | 'saved_card';

const PaymentScreen: React.FC = () => {
  const navigation = useNavigation<PaymentNavigationProp>();
  const route = useRoute<PaymentRouteProp>();
  const { appointmentId, amount, description, businessName } = route.params;

  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [selectedMode, setSelectedMode] = useState<PaymentMode>('checkout_pro');
  const [savedMethods, setSavedMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [pixQrCode, setPixQrCode] = useState<string | null>(null);
  const [pixQrCodeBase64, setPixQrCodeBase64] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const [paymentDone, setPaymentDone] = useState(false);

  const loadInitialData = useCallback(async () => {
    try {
      setInitializing(true);
      const existing = await getPaymentByAppointment(appointmentId);
      if (existing?.status === 'approved') { setPaymentDone(true); return; }
      const methods = await getSavedPaymentMethods();
      setSavedMethods(methods);
      const def = methods.find(m => m.isDefault);
      if (def) setSelectedMethod(def.id);
    } catch (e) {
      console.error('PaymentScreen init error:', e);
    } finally {
      setInitializing(false);
    }
  }, [appointmentId]);

  useEffect(() => { loadInitialData(); }, [loadInitialData]);

  const handlePay = async () => {
    setLoading(true);
    try {
      const result = await createPaymentPreference({
        appointmentId,
        businessId: businessName ?? '',
        amount,
        description: description ?? `Pagamento - ${businessName}`,
        paymentType: selectedMode === 'pix' ? 'pix' : 'checkout_pro',
      });
      setPreferenceId(result.preferenceId);
      if (selectedMode === 'pix') {
        setPixQrCode(result.pixQrCode ?? null);
        setPixQrCodeBase64(result.pixQrCodeBase64 ?? null);
      } else {
        setCheckoutUrl(result.checkoutUrl ?? null);
        if (result.checkoutUrl) await Linking.openURL(result.checkoutUrl);
      }
    } catch (error) {
      Alert.alert('Erro no Pagamento', error instanceof Error ? error.message : 'Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!preferenceId) return;
    setLoading(true);
    try {
      const status = await checkPaymentStatus(preferenceId);
      if (status === 'approved') {
        setPaymentDone(true);
        Alert.alert('✅ Pagamento Aprovado!', 'Seu agendamento está confirmado.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else if (status === 'pending' || status === 'in_process') {
        Alert.alert('⏳ Em Processamento', 'Aguarde a confirmação do pagamento.');
      } else {
        Alert.alert('❌ Não Aprovado', `Status: ${status}. Tente outro método.`);
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível verificar o status.');
    } finally {
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  if (paymentDone) {
    return (
      <View style={styles.center}>
        <Icon name="check-circle" size={80} color="#1D9E75" />
        <Text style={styles.doneTitle}>Pagamento Confirmado!</Text>
        <Text style={styles.doneSubtitle}>Seu agendamento está garantido.</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.primaryBtnText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pagamento</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Resumo */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Estabelecimento</Text>
          <Text style={styles.cardValue}>{businessName}</Text>
          <Text style={styles.cardLabel}>Descrição</Text>
          <Text style={styles.cardValue}>{description}</Text>
          <View style={styles.divider} />
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Total</Text>
            <Text style={styles.amountValue}>R$ {amount.toFixed(2)}</Text>
          </View>
        </View>

        {/* Formas de pagamento */}
        <Text style={styles.sectionTitle}>Forma de pagamento</Text>

        {[
          { mode: 'checkout_pro' as PaymentMode, icon: 'credit-card', label: 'Cartão via Mercado Pago', desc: 'Crédito, débito, parcelamento' },
          { mode: 'pix' as PaymentMode, icon: 'qr-code-2', label: 'Pix', desc: 'Aprovação imediata, sem taxas' },
        ].map(({ mode, icon, label, desc }) => (
          <TouchableOpacity
            key={mode}
            style={[styles.methodCard, selectedMode === mode && styles.methodCardActive]}
            onPress={() => setSelectedMode(mode)}
          >
            <Icon name={icon} size={28} color={selectedMode === mode ? colors.primary : colors.lightText} />
            <View style={styles.methodInfo}>
              <Text style={styles.methodName}>{label}</Text>
              <Text style={styles.methodDesc}>{desc}</Text>
            </View>
            {selectedMode === mode && <Icon name="check-circle" size={20} color={colors.primary} />}
          </TouchableOpacity>
        ))}

        {savedMethods.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Cartões salvos</Text>
            {savedMethods.map(m => (
              <TouchableOpacity
                key={m.id}
                style={[styles.methodCard, selectedMode === 'saved_card' && selectedMethod === m.id && styles.methodCardActive]}
                onPress={() => { setSelectedMode('saved_card'); setSelectedMethod(m.id); }}
              >
                <Icon name="credit-card" size={28} color={colors.primary} />
                <View style={styles.methodInfo}>
                  <Text style={styles.methodName}>{m.brand?.toUpperCase()} •••• {m.lastFourDigits}</Text>
                  <Text style={styles.methodDesc}>{m.holderName} · {m.expirationMonth}/{m.expirationYear}{m.isDefault ? ' · Padrão' : ''}</Text>
                </View>
                {selectedMode === 'saved_card' && selectedMethod === m.id && <Icon name="check-circle" size={20} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* QR Code Pix */}
        {pixQrCodeBase64 && (
          <View style={styles.pixContainer}>
            <Text style={styles.pixTitle}>Escaneie o QR Code Pix</Text>
            <Image source={{ uri: `data:image/png;base64,${pixQrCodeBase64}` }} style={styles.pixQr} resizeMode="contain" />
            {pixQrCode && (
              <TouchableOpacity style={styles.copyBtn} onPress={() => {
                import('@react-native-clipboard/clipboard').then(({ default: Clipboard }) => {
                  Clipboard.setString(pixQrCode);
                  Alert.alert('Copiado!', 'Código Pix copiado.');
                });
              }}>
                <Icon name="content-copy" size={18} color={colors.primary} />
                <Text style={styles.copyBtnText}>Copiar código Pix</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleCheckStatus} disabled={loading}>
              {loading ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.secondaryBtnText}>Já paguei — Verificar</Text>}
            </TouchableOpacity>
          </View>
        )}

        {!pixQrCodeBase64 && (
          <TouchableOpacity style={[styles.primaryBtn, loading && styles.btnDisabled]} onPress={handlePay} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <><Icon name={selectedMode === 'pix' ? 'qr-code-2' : 'lock'} size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.primaryBtnText}>{selectedMode === 'pix' ? 'Gerar QR Code Pix' : `Pagar R$ ${amount.toFixed(2)}`}</Text></>
            }
          </TouchableOpacity>
        )}

        {checkoutUrl && !pixQrCodeBase64 && (
          <>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => Linking.openURL(checkoutUrl)}>
              <Text style={styles.secondaryBtnText}>Abrir link novamente</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleCheckStatus} disabled={loading}>
              {loading ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.secondaryBtnText}>Já paguei — Verificar</Text>}
            </TouchableOpacity>
          </>
        )}

        <Text style={styles.secureNote}>🔒 Pagamento processado com segurança pelo Mercado Pago</Text>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, padding: 24 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 16, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.lightGray },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text },
  scroll: { flex: 1 },
  card: { backgroundColor: colors.white, margin: 16, borderRadius: 12, padding: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  cardLabel: { fontSize: 12, color: colors.lightText, marginTop: 8 },
  cardValue: { fontSize: 15, color: colors.text, fontWeight: '500', marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.lightGray, marginVertical: 12 },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amountLabel: { fontSize: 16, fontWeight: '600', color: colors.text },
  amountValue: { fontSize: 22, fontWeight: 'bold', color: colors.primary },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: colors.text, marginHorizontal: 16, marginTop: 8, marginBottom: 8 },
  methodCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, marginHorizontal: 16, marginBottom: 10, borderRadius: 12, padding: 14, borderWidth: 1.5, borderColor: colors.lightGray },
  methodCardActive: { borderColor: colors.primary, backgroundColor: '#f0faf8' },
  methodInfo: { flex: 1, marginLeft: 12 },
  methodName: { fontSize: 14, fontWeight: '600', color: colors.text },
  methodDesc: { fontSize: 12, color: colors.lightText, marginTop: 2 },
  pixContainer: { margin: 16, backgroundColor: colors.white, borderRadius: 12, padding: 16, alignItems: 'center' },
  pixTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 16 },
  pixQr: { width: 200, height: 200, marginBottom: 16 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10 },
  copyBtnText: { fontSize: 14, color: colors.primary, fontWeight: '500' },
  primaryBtn: { backgroundColor: colors.primary, marginHorizontal: 16, marginTop: 8, borderRadius: 10, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  secondaryBtn: { borderWidth: 1.5, borderColor: colors.primary, marginHorizontal: 16, marginTop: 10, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  secondaryBtnText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  secureNote: { textAlign: 'center', fontSize: 12, color: colors.lightText, marginTop: 20, marginHorizontal: 16 },
  loadingText: { marginTop: 12, fontSize: 15, color: colors.lightText },
  doneTitle: { fontSize: 22, fontWeight: 'bold', color: colors.text, marginTop: 16 },
  doneSubtitle: { fontSize: 14, color: colors.lightText, marginTop: 8, marginBottom: 24 },
});

export default PaymentScreen;
