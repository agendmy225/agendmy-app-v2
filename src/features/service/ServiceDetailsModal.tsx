import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { colors } from '../../constants/colors';

type ProfessionalType = {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  image: string;
  services?: string[]; // IDs dos serviços que o profissional realiza
};

type ServiceDetailsModalProps = {
  visible: boolean;
  onClose: () => void;
  onSchedule: (professionalId: string) => void;
  service: {
    id: string;
    name: string;
    description: string;
    duration: string;
    price: number;
    category: string;
    image?: string;
  };
  professionals: ProfessionalType[];
};

const ServiceDetailsModal: React.FC<ServiceDetailsModalProps> = ({
  visible,
  onClose,
  onSchedule,
  service,
  professionals,
}) => {
  const [selectedProfessional, setSelectedProfessional] = useState<string | null>(null);
  const [filteredProfessionals, setFilteredProfessionals] = useState<ProfessionalType[]>([]);

  useEffect(() => {
    // Filtrar profissionais que podem realizar este serviço
    const filtered = professionals.filter(professional => {
      // Se o profissional não tem serviços definidos, ele pode realizar todos os serviços
      if (!professional.services || professional.services.length === 0) {
        return true;
      }
      // Caso contrário, verificar se o serviço está na lista de serviços do profissional
      return professional.services.includes(service.id);
    });
    setFilteredProfessionals(filtered);

    // Resetar seleção quando o modal abre ou o serviço muda
    setSelectedProfessional(null);
  }, [service.id, professionals]);

  const handleSchedule = () => {
    if (selectedProfessional) {
      onSchedule(selectedProfessional);
    }
  };

  const renderProfessionalItem = (professional: ProfessionalType) => {
    const isSelected = selectedProfessional === professional.id;

    return (
      <TouchableOpacity
        key={professional.id}
        style={[
          styles.professionalCard,
          isSelected && styles.selectedProfessionalCard,
        ]}
        onPress={() => setSelectedProfessional(professional.id)}
      >
        <Image source={{ uri: professional.image }} style={styles.professionalImage} />
        <View style={styles.professionalInfo}>
          <Text style={styles.professionalName}>{professional.name}</Text>
          <Text style={styles.professionalSpecialty}>{professional.specialty}</Text>
          <View style={styles.ratingContainer}>
            <Text style={styles.ratingIcon}>{'â­'}</Text>
            <Text style={styles.ratingText}>{professional.rating.toFixed(1)}</Text>
          </View>
        </View>
        <View style={styles.selectionIndicator}>
          {isSelected && <View style={styles.selectedDot} />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Detalhes do Serviço</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>âœ•</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {service.image && (
              <Image
                source={{ uri: service.image }}
                style={styles.serviceImage}
                resizeMode="cover"
              />
            )}

            <View style={styles.serviceDetails}>
              <Text style={styles.serviceName}>{service.name}</Text>
              <Text style={styles.serviceDescription}>{service.description}</Text>

              <View style={styles.serviceInfo}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoIcon}>{'â±ï¸'}</Text>
                  <Text style={styles.infoText}>{service.duration}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoIcon}>{'ðŸ’°'}</Text>
                  <Text style={styles.infoText}>{'R$ '}{service.price.toFixed(2)}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoIcon}>{'ðŸ·ï¸'}</Text>
                  <Text style={styles.infoText}>{service.category}</Text>
                </View>
              </View>
            </View>

            <View style={styles.professionalsSection}>
              <Text style={styles.sectionTitle}>Escolha um profissional</Text>
              {filteredProfessionals.length > 0 ? (
                filteredProfessionals.map(renderProfessionalItem)
              ) : (
                <Text style={styles.noProfessionalsText}>
                  Nenhum profissional disponível para este serviço
                </Text>
              )}
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[
                styles.scheduleButton,
                !selectedProfessional && styles.disabledButton,
              ]}
              onPress={handleSchedule}
              disabled={!selectedProfessional}
            >
              <Text style={styles.scheduleButtonText}>Agendar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: colors.text,
  },
  modalContent: {
    flex: 1,
  },
  serviceImage: {
    width: '100%',
    height: 200,
  },
  serviceDetails: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  serviceName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  serviceDescription: {
    fontSize: 16,
    color: colors.text,
    marginBottom: 16,
    lineHeight: 24,
  },
  serviceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  infoText: {
    fontSize: 14,
    color: colors.text,
  },
  professionalsSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  professionalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedProfessionalCard: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  professionalImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  professionalInfo: {
    flex: 1,
  },
  professionalName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  professionalSpecialty: {
    fontSize: 14,
    color: colors.lightText,
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  ratingText: {
    fontSize: 14,
    color: colors.text,
  },
  selectionIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.lightGray,
  },
  scheduleButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: colors.lightGray,
  },
  scheduleButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  noProfessionalsText: {
    fontSize: 14,
    color: colors.lightText,
    textAlign: 'center',
    paddingVertical: 20,
  },
});

export default ServiceDetailsModal;
