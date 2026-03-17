import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Alert,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Clipboard from '@react-native-clipboard/clipboard';
import { colors } from '../../constants/colors';
import { Professional } from '../../services/professionals';
import { DeepLinkService } from '../../services/deepLinking';

interface ProfessionalPortfolioModalProps {
  visible: boolean;
  onClose: () => void;
  professional: Professional | null;
}

const { width: screenWidth } = Dimensions.get('window');

const ProfessionalPortfolioModal: React.FC<ProfessionalPortfolioModalProps> = ({
  visible,
  onClose,
  professional,
}) => {
  if (!professional) { return null; }

  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleInstagramPress = async () => {
    if (!professional.instagram) {
      Alert.alert('Erro', 'Instagram não disponível');
      return;
    }

    try {
      // Remover @ se estiver presente
      const username = professional.instagram.replace('@', '');

      // Usar o serviço robusto de deep linking
      const success = await DeepLinkService.openInstagram(username, {
        fallbackUrl: `https://www.instagram.com/${username}`,
        showErrorAlert: true,
        errorTitle: 'Instagram não encontrado',
        errorMessage: 'O Instagram não está instalado ou não pode ser aberto. Deseja abrir no navegador?'
      });

      // Se o serviço não conseguiu abrir e não mostrou alert, 
      // oferece opção de copiar link
      if (!success) {
        Alert.alert(
          'Opcões adicionais',
          `Não foi possível abrir o Instagram. Escolha uma opção:`,
          [
            {
              text: 'Copiar Link',
              onPress: async () => {
                const webUrl = `https://www.instagram.com/${username}`;
                Clipboard.setString(webUrl);
                Alert.alert('Link copiado!', 'O link do Instagram foi copiado para a área de transferência.');
              }
            },
            { text: 'Cancelar', style: 'cancel' }
          ]
        );
      }

    } catch (error) {
      console.error('Erro geral ao abrir Instagram:', error);
      Alert.alert(
        'Erro',
        'Ocorreu um erro inesperado. Tente novamente mais tarde.'
      );
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Perfil do Profissional</Text>
            <View style={styles.headerPlaceholder} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Professional Info */}
            <View style={styles.professionalInfo}>
              <Image
                source={{ uri: professional.image || 'https://via.placeholder.com/150' }}
                style={styles.professionalImage}
              />
              <Text style={styles.professionalName}>{professional.name}</Text>
              <Text style={styles.professionalSpecialty}>{professional.specialty}</Text>

              {/* Rating */}
              <View style={styles.ratingContainer}>
                <Icon name="star" size={20} color="#FFD700" />
                <Text style={styles.ratingText}>
                  {professional.rating?.toFixed(1) || 'N/A'}
                </Text>
              </View>

              {/* Instagram Button */}
              {professional.instagram && (
                <TouchableOpacity
                  style={styles.instagramButton}
                  onPress={handleInstagramPress}
                >
                  <Icon name="camera-alt" size={20} color={colors.white} />
                  <Text style={styles.instagramButtonText}>
                    @{professional.instagram}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Bio */}
            {professional.bio && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Sobre</Text>
                <Text style={styles.bioText}>{professional.bio}</Text>
              </View>
            )}

            {/* Portfolio */}
            {professional.portfolioImages && professional.portfolioImages.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Portfólio</Text>
                <View style={styles.portfolioGrid}>
                  {professional.portfolioImages.map((imageUrl, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.portfolioImageContainer}
                      onPress={() => {
                        setSelectedImage(imageUrl);
                      }}
                    >
                      <Image
                        source={{ uri: imageUrl }}
                        style={styles.portfolioImage}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  </>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  headerPlaceholder: {
    width: 40,
  },
  professionalInfo: {
    alignItems: 'center',
    padding: 20,
  },
  professionalImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  professionalName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  professionalSpecialty: {
    fontSize: 16,
    color: colors.lightText,
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  ratingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginLeft: 4,
  },
  instagramButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  instagramButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  section: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.lightGray,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  bioText: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
  },
  portfolioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  portfolioImageContainer: {
    width: (screenWidth - 50) / 3,
    height: (screenWidth - 50) / 3,
    margin: 5,
    borderRadius: 8,
    overflow: 'hidden',
  },
  portfolioImage: {
    width: '100%',
    height: '100%',
  },
});

export default ProfessionalPortfolioModal;
