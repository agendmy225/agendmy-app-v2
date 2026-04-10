import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../constants/colors';
import { useAuth } from '../auth/context/AuthContext';
import {
  Business,
  getBusinessByOwnerId,
  updateBusiness,
} from '../../services/businesses';
import {
  getServicesByBusiness,
  Service,
} from '../../services/services';
import { doc, firestore, updateDoc } from '../../config/firebase';

interface Promotion {
  serviceId: string;
  serviceName: string;
  originalPrice: number;
  discountPercentage: number;
  promotionalPrice: number;
  isActive: boolean;
}

const PromotionManagementScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);
  const [discountInput, setDiscountInput] = useState('');

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    if (!user?.uid) { return; }

    try {
      setLoading(true);

      // Buscar negÃ³cio do proprietÃ¡rio
      const businessData = await getBusinessByOwnerId(user.uid);
      if (!businessData) {
        Alert.alert('Erro', 'NegÃ³cio nÃ£o encontrado');
        navigation.goBack();
        return;
      }
      setBusiness(businessData);

      // Buscar serviÃ§os do negÃ³cio
      const servicesData = await getServicesByBusiness(businessData.id);
      setServices(servicesData);

      // Mapear serviÃ§os para promoÃ§Ãµes, carregando dados existentes
      const promotionsList: Promotion[] = servicesData.map(service => {
        const discountPercentage = service.discountPercentage ?? 0;
        const isActive = service.isPromotionActive ?? false;
        const originalPrice = service.price;

        // Recalcula o preÃ§o promocional com base nos dados do serviÃ§o
        const promotionalPrice = isActive
          ? calculatePromotionalPrice(originalPrice, discountPercentage)
          : originalPrice;

        return {
          serviceId: service.id,
          serviceName: service.name,
          originalPrice: originalPrice,
          discountPercentage: discountPercentage,
          promotionalPrice: promotionalPrice,
          isActive: isActive,
        };
      });

      setPromotions(promotionsList);
    } catch (error: any) {
      console.error('Error loading promotion data:', error);
      Alert.alert('Erro', 'NÃ£o foi possÃ­vel carregar os dados');
    } finally {
      setLoading(false);
    }
  };

  const calculatePromotionalPrice = (originalPrice: number, discountPercentage: number): number => {
    const discount = (originalPrice * discountPercentage) / 100;
    return Math.round((originalPrice - discount) * 100) / 100;
  };

  const handleOpenModal = (promotion: Promotion) => {
    setSelectedPromotion(promotion);
    setDiscountInput(promotion.discountPercentage.toString());
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setSelectedPromotion(null);
    setDiscountInput('');
  };

  const handleUpdateDiscount = () => {
    if (!selectedPromotion) { return; }

    const discount = parseInt(discountInput, 10);
    if (isNaN(discount) || discount < 0 || discount > 100) {
      Alert.alert('Erro', 'Por favor, insira um desconto vÃ¡lido entre 0 e 100');
      return;
    }

    const updatedPromotions = promotions.map(promo => {
      if (promo.serviceId === selectedPromotion.serviceId) {
        const newPromotionalPrice = calculatePromotionalPrice(promo.originalPrice, discount);
        return {
          ...promo,
          discountPercentage: discount,
          promotionalPrice: newPromotionalPrice,
        };
      }
      return promo;
    });

    setPromotions(updatedPromotions);
    handleCloseModal();
  };

  const togglePromotion = (serviceId: string) => {
    const updatedPromotions = promotions.map(promo => {
      if (promo.serviceId === serviceId) {
        const isActive = !promo.isActive;
        // Se a promoÃ§Ã£o for desativada, o preÃ§o promocional volta a ser o original
        const promotionalPrice = isActive
          ? calculatePromotionalPrice(promo.originalPrice, promo.discountPercentage)
          : promo.originalPrice;

        return {
          ...promo,
          isActive,
          promotionalPrice,
        };
      }
      return promo;
    });
    setPromotions(updatedPromotions);
  };

  const savePromotions = async () => {
    if (!business) { return; }

    try {
      setSaving(true);

      const promotionPromises = promotions.map(promo => {
        const serviceRef = doc(firestore, 'services', promo.serviceId);
        return updateDoc(serviceRef, {
          promotionalPrice: promo.promotionalPrice,
          isPromotionActive: promo.isActive,
          discountPercentage: promo.discountPercentage,
        });
      });

      await Promise.all(promotionPromises);

      const hasActivePromotions = promotions.some(p => p.isActive);

      await updateBusiness(business.id, {
        hasActivePromotions,
      });

      Alert.alert('Sucesso', 'PromoÃ§Ãµes salvas com sucesso!');
      navigation.goBack();
    } catch (error: any) {
      console.error('Error saving promotions:', error);
      Alert.alert('Erro', 'NÃ£o foi possÃ­vel salvar as promoÃ§Ãµes');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Carregando serviÃ§os...</Text>
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
        <Text style={styles.headerTitle}>Gerenciar PromoÃ§Ãµes</Text>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={savePromotions}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={styles.saveButtonText}>Salvar</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.infoCard}>
          <Icon name="info" size={24} color={colors.primary} />
          <Text style={styles.infoText}>
            Ative promoÃ§Ãµes para seus serviÃ§os e atraia mais clientes!
            Os serviÃ§os em promoÃ§Ã£o aparecerÃ£o em destaque no app.
          </Text>
        </View>

        {services.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="inventory-2" size={64} color={colors.lightText} />
            <Text style={styles.emptyText}>
              Nenhum serviÃ§o cadastrado ainda.
            </Text>
            <TouchableOpacity
              style={styles.addServiceButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.addServiceButtonText}>Adicionar ServiÃ§os</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.promotionsList}>
            {promotions.map((promotion) => (
              <View key={promotion.serviceId} style={styles.promotionCard}>
                <View style={styles.promotionHeader}>
                  <Text style={styles.serviceName}>{promotion.serviceName}</Text>
                  <Switch
                    value={promotion.isActive}
                    onValueChange={() => togglePromotion(promotion.serviceId)}
                    trackColor={{ false: colors.lightGray, true: colors.primary }}
                    thumbColor={promotion.isActive ? colors.white : colors.gray}
                  />
                </View>

                <View style={styles.priceContainer}>
                  <View style={styles.priceInfo}>
                    <Text style={styles.priceLabel}>PreÃ§o Original:</Text>
                    <Text style={styles.originalPrice}>
                      R$ {promotion.originalPrice.toFixed(2)}
                    </Text>
                  </View>

                  {promotion.isActive && promotion.discountPercentage > 0 && (
                    <View style={styles.priceInfo}>
                      <Text style={styles.priceLabel}>PreÃ§o Promocional:</Text>
                      <Text style={styles.promotionalPrice}>
                        R$ {promotion.promotionalPrice.toFixed(2)}
                      </Text>
                    </View>
                  )}
                </View>

                {promotion.isActive && (
                  <TouchableOpacity
                    style={styles.discountButton}
                    onPress={() => handleOpenModal(promotion)}
                  >
                    <Icon name="local-offer" size={20} color={colors.primary} />
                    <Text style={styles.discountButtonText}>
                      {promotion.discountPercentage > 0
                        ? `${promotion.discountPercentage}% de desconto`
                        : 'Definir desconto'
                      }
                    </Text>
                    <Icon name="chevron-right" size={20} color={colors.primary} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modal para definir desconto */}
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Definir Desconto</Text>
            <Text style={styles.modalSubtitle}>
              {selectedPromotion?.serviceName}
            </Text>

            <View style={styles.discountInputContainer}>
              <TextInput
                style={styles.discountInput}
                value={discountInput}
                onChangeText={setDiscountInput}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors.lightText}
                maxLength={3}
              />
              <Text style={styles.percentageSymbol}>%</Text>
            </View>

            {discountInput && !isNaN(parseInt(discountInput, 10)) && (
              <View style={styles.previewContainer}>
                <Text style={styles.previewLabel}>PreÃ§o com desconto:</Text>
                <Text style={styles.previewPrice}>
                  R$ {calculatePromotionalPrice(
                    selectedPromotion?.originalPrice || 0,
                    parseInt(discountInput, 10) || 0,
                  ).toFixed(2)}
                </Text>
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={handleCloseModal}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleUpdateDiscount}
              >
                <Text style={styles.confirmButtonText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  saveButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: colors.primary,
    borderRadius: 20,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.text,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 16,
    color: colors.lightText,
    marginTop: 20,
    marginBottom: 30,
  },
  addServiceButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 25,
  },
  addServiceButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  promotionsList: {
    paddingBottom: 20,
  },
  promotionCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  promotionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  priceContainer: {
    marginBottom: 15,
  },
  priceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  priceLabel: {
    fontSize: 14,
    color: colors.lightText,
  },
  originalPrice: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  promotionalPrice: {
    fontSize: 16,
    color: colors.success,
    fontWeight: 'bold',
  },
  discountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: colors.lightGray,
    borderRadius: 8,
  },
  discountButtonText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 30,
    width: '85%',
    maxWidth: 350,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 5,
  },
  modalSubtitle: {
    fontSize: 16,
    color: colors.lightText,
    textAlign: 'center',
    marginBottom: 30,
  },
  discountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  discountInput: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'center',
    minWidth: 100,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    paddingBottom: 5,
  },
  percentageSymbol: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.primary,
    marginLeft: 5,
  },
  previewContainer: {
    backgroundColor: colors.lightGray,
    padding: 15,
    borderRadius: 10,
    marginBottom: 30,
  },
  previewLabel: {
    fontSize: 14,
    color: colors.lightText,
    marginBottom: 5,
  },
  previewPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.success,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.lightGray,
    marginRight: 10,
  },
  confirmButton: {
    backgroundColor: colors.primary,
    marginLeft: 10,
  },
  cancelButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PromotionManagementScreen;
