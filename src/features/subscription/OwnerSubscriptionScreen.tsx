// src/features/subscription/OwnerSubscriptionScreen.tsx
// "Minha Assinatura": situacao do dono, precos e como funciona a cobranca.
import React from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../constants/colors';
import { useMyBusiness } from '../../hooks/useMyBusiness';
import { PLAN, formatDate, formatMoney, getSubscriptionView } from '../../services/subscription';

const OwnerSubscriptionScreen: React.FC = () => {
  const navigation = useNavigation();
  const { business, loaded } = useMyBusiness();
  const view = getSubscriptionView(business);

  const handleSubscribe = () => {
    // Fase B: aqui abre o pagamento do Mercado Pago
    Alert.alert(
      'Quase pronto',
      'O pagamento da assinatura esta sendo finalizado. Enquanto isso, seu acesso continua normal.',
    );
  };

  const timeline = [
    { icon: 'card-giftcard', title: `${PLAN.trialDays} dias grátis`, text: 'Use todas as funcoes sem pagar nada.' },
    {
      icon: 'local-offer',
      title: `${formatMoney(PLAN.introPrice)} por mês`,
      text: `Preço promocional nos ${PLAN.introMonths} primeiros meses.`,
    },
    {
      icon: 'autorenew',
      title: `${formatMoney(PLAN.fullPrice)} por mês`,
      text: `A partir do ${PLAN.introMonths + 1}o mês. Você será avisado antes da mudança.`,
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backIcon}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Icon name="arrow-back" size={26} color={colors.white} />
        </TouchableOpacity>
        <Icon name="card-membership" size={30} color={colors.white} />
        <Text style={styles.headerTitle}>Minha Assinatura</Text>
        <Text style={styles.headerSubtitle}>Plano AgendMy para estabelecimentos</Text>
      </View>

      {!loaded ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {/* SITUACAO */}
          <View style={[styles.statusCard, { borderColor: view.color }]}>
            <View style={styles.statusTop}>
              <Icon name={view.icon} size={28} color={view.color} />
              <Text style={[styles.statusLabel, { color: view.color }]}>{view.label}</Text>
            </View>
            <Text style={styles.statusText}>{view.description}</Text>
            {view.status === 'trial' && view.trialEndsAt && (
              <Text style={styles.statusMeta}>Teste até {formatDate(view.trialEndsAt)}</Text>
            )}
            {view.paidCount > 0 && (
              <Text style={styles.statusMeta}>{view.paidCount} mensalidade(s) paga(s)</Text>
            )}
          </View>

          {!view.exempt && view.status !== 'active' && (
            <TouchableOpacity style={styles.subscribeButton} onPress={handleSubscribe}>
              <Icon name="credit-card" size={20} color={colors.white} />
              <Text style={styles.subscribeText}>Assinar agora</Text>
            </TouchableOpacity>
          )}

          {/* COMO FUNCIONA */}
          <Text style={styles.sectionTitle}>Como funciona</Text>
          <View style={styles.box}>
            {timeline.map((step, i) => (
              <View key={step.title} style={styles.step}>
                <View style={styles.stepIconBox}>
                  <Icon name={step.icon} size={20} color={colors.primary} />
                  {i < timeline.length - 1 && <View style={styles.stepLine} />}
                </View>
                <View style={styles.stepTextBox}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepText}>{step.text}</Text>
                </View>
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Formas de pagamento</Text>
          <View style={styles.box}>
            <View style={styles.payRow}>
              <Icon name="credit-card" size={20} color={colors.success} />
              <Text style={styles.payText}>
                <Text style={styles.bold}>Cartão de crédito:</Text> cobrado automaticamente todo mês.
              </Text>
            </View>
            <View style={styles.payRow}>
              <Icon name="account-balance" size={20} color={colors.primary} />
              <Text style={styles.payText}>
                <Text style={styles.bold}>PIX:</Text> a cobrança chega todo mês e você paga pelo app do banco.
              </Text>
            </View>
          </View>

          <Text style={styles.footerNote}>
            Se o pagamento atrasar, você tem {PLAN.graceDays} dias de tolerância. Depois disso, seu negócio
            deixa de aparecer para os clientes até a assinatura ser regularizada.
          </Text>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: 24, backgroundColor: colors.primary, alignItems: 'center' },
  backIcon: { position: 'absolute', top: 24, left: 16, zIndex: 2 },
  headerTitle: { color: colors.white, fontSize: 20, fontWeight: 'bold', marginTop: 6 },
  headerSubtitle: { color: colors.offWhite, fontSize: 12, marginTop: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 32 },
  statusCard: { backgroundColor: colors.white, borderWidth: 1.5, borderRadius: 12, padding: 16 },
  statusTop: { flexDirection: 'row', alignItems: 'center' },
  statusLabel: { fontSize: 20, fontWeight: 'bold', marginLeft: 8 },
  statusText: { fontSize: 14, color: colors.text, marginTop: 8, lineHeight: 20 },
  statusMeta: { fontSize: 12, color: colors.lightText, marginTop: 6 },
  subscribeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    marginTop: 14,
  },
  subscribeText: { color: colors.white, fontWeight: 'bold', fontSize: 16, marginLeft: 8 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: colors.text, marginTop: 20, marginBottom: 8 },
  box: { backgroundColor: colors.card, borderRadius: 12, padding: 14 },
  step: { flexDirection: 'row' },
  stepIconBox: { alignItems: 'center', width: 28 },
  stepLine: { width: 2, flex: 1, backgroundColor: colors.lightGray, marginVertical: 4 },
  stepTextBox: { flex: 1, marginLeft: 10, paddingBottom: 14 },
  stepTitle: { fontSize: 15, fontWeight: 'bold', color: colors.text },
  stepText: { fontSize: 13, color: colors.lightText, marginTop: 2 },
  payRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  payText: { flex: 1, fontSize: 13, color: colors.text, marginLeft: 8 },
  bold: { fontWeight: 'bold' },
  footerNote: { fontSize: 12, color: colors.lightText, textAlign: 'center', marginTop: 16 },
});

export default OwnerSubscriptionScreen;
