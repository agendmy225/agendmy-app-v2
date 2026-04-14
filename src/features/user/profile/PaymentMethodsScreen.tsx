import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { AppStackParamList } from '../../../types/types';
import { getSavedPaymentMethods, setDefaultPaymentMethod, deletePaymentMethod, PaymentMethod as MPPaymentMethod } from '../../../services/mercadopago';
import { colors } from '../../../constants/colors';

type PaymentMethodsScreenNavigationProp = StackNavigationProp<AppStackParamList, 'PaymentMethods'>;

interface PaymentMethod {
  id: string;
  type: 'credit' | 'debit';
  brand: string;
  lastFourDigits: string;
  expiryMonth: string;
  expiryYear: string;
  holderName: string;
  isDefault: boolean;
}

const PaymentMethodsScreen: React.FC = () => {
  const navigation = useNavigation<PaymentMethodsScreenNavigationProp>();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      setLoading(true);
      // TODO: Implementar chamada real para Firebase/API para carregar métodos de pagamento
      // Por enquanto, sem dados mockados - aguardando implementação
      setPaymentMethods([]);
    } catch (error) {
      console.error('Erro ao carregar métodos de pagamento:', error);
      Alert.alert('Erro', 'Não foi possível carregar os métodos de pagamento.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPaymentMethod = () => {
    navigation.navigate('AddPaymentMethod');
  };

  const handleEditPaymentMethod = (paymentMethod: PaymentMethod) => {
    navigation.navigate('EditPaymentMethod', { paymentMethodId: paymentMethod.id });
  };

  const handleDeletePaymentMethod = (paymentMethod: PaymentMethod) => {
    Alert.alert(
      'Remover Cartão',
      `Deseja remover o cartão ${paymentMethod.brand} final ${paymentMethod.lastFourDigits}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => deletePaymentMethod(paymentMethod.id),
        },
      ],
    );
  };

  const deletePaymentMethod = async (paymentMethodId: string) => {
    try {
      // Aqui vocÃª faria a chamada para remover do Firebase/API
      setPaymentMethods(prev => prev.filter(pm => pm.id !== paymentMethodId));
      Alert.alert('Sucesso', 'Cartão removido com sucesso!');
    } catch (error) {
      console.error('Erro ao remover cartão:', error);
      Alert.alert('Erro', 'Não foi possível remover o cartão.');
    }
  };

  const handleSetDefault = async (paymentMethodId: string) => {
    try {
      await setDefaultPaymentMethod(paymentMethodId);
      setPaymentMethods(prev => prev.map(pm => ({ ...pm, isDefault: pm.id === paymentMethodId })));
      Alert.alert('Sucesso', 'Cartão padrão atualizado!');
    } catch (error) {
      console.error('Erro ao definir cartão padrão:', error);
      Alert.alert('Erro', 'Não foi possível definir o cartão como padrão.');
    }
  };

  const getCardIcon = (brand: string) => {
    switch (brand.toLowerCase()) {
      case 'visa':
        return 'credit-card';
      case 'mastercard':
        return 'credit-card';
      case 'amex':
        return 'credit-card';
      default:
        return 'credit-card';
    }
  };

  const renderPaymentMethod = (paymentMethod: PaymentMethod) => (
    <View key={paymentMethod.id} style={styles.paymentMethodCard}>
      <View style={styles.cardHeader}>
        <View style={styles.cardInfo}>
          <Icon
            name={getCardIcon(paymentMethod.brand)}
            size={24}
            color={colors.primary}
            style={styles.cardIcon}
          />
          <View style={styles.cardDetails}>
            <Text style={styles.cardBrand}>{paymentMethod.brand}</Text>
            <Text style={styles.cardNumber}>**** **** **** {paymentMethod.lastFourDigits}</Text>
            <Text style={styles.cardExpiry}>
              Válido até {paymentMethod.expiryMonth}/{paymentMethod.expiryYear}
            </Text>
          </View>
        </View>
        {paymentMethod.isDefault && (
          <View style={styles.defaultBadge}>
            <Text style={styles.defaultText}>Padrão</Text>
          </View>
        )}
      </View>

      <View style={styles.cardActions}>
        {!paymentMethod.isDefault && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleSetDefault(paymentMethod.id)}
          >
            <Text style={styles.actionButtonText}>Definir como padrão</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleEditPaymentMethod(paymentMethod)}
        >
          <Text style={styles.actionButtonText}>Editar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeletePaymentMethod(paymentMethod)}
        >
          <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Remover</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Carregando métodos de pagamento...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Métodos de Pagamento</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {paymentMethods.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="credit-card" size={64} color={colors.lightText} />
            <Text style={styles.emptyStateTitle}>Nenhum cartão cadastrado</Text>
            <Text style={styles.emptyStateText}>
              Adicione um cartão de crédito ou débito para facilitar seus pagamentos.
            </Text>
          </View>
        ) : (
          <View style={styles.paymentMethodsList}>
            {paymentMethods.map(renderPaymentMethod)}
          </View>
        )}

        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddPaymentMethod}
        >
          <Icon name="add" size={24} color={colors.white} />
          <Text style={styles.addButtonText}>Adicionar Cartão</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.text,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 20,
    marginBottom: 10,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.lightText,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 40,
  },
  paymentMethodsList: {
    marginBottom: 20,
  },
  paymentMethodCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  cardInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  cardIcon: {
    marginRight: 15,
  },
  cardDetails: {
    flex: 1,
  },
  cardBrand: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 5,
  },
  cardNumber: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 5,
  },
  cardExpiry: {
    fontSize: 12,
    color: colors.lightText,
  },
  defaultBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  defaultText: {
    fontSize: 12,
    color: colors.white,
    fontWeight: 'bold',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: colors.lightGray,
    paddingTop: 15,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  actionButtonText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  deleteButton: {},
  deleteButtonText: {
    color: colors.error,
  },
  addButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 8,
    marginTop: 20,
  },
  addButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default PaymentMethodsScreen;
