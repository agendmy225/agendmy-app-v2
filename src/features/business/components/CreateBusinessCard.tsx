import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../../constants/colors';
import { useAuth } from '../../auth/context/AuthContext';
import { createQuickBusiness } from '../../../services/businesses';

interface CreateBusinessCardProps {
  onBusinessCreated?: () => void;
}

const CreateBusinessCard: React.FC<CreateBusinessCardProps> = ({ onBusinessCreated }) => {
  const { user, refreshUser } = useAuth();
  const [creating, setCreating] = useState(false);

  const handleCreateBusiness = async () => {
    if (!user) {
      Alert.alert('Erro', 'UsuÃƒÆ’Ã‚Â¡rio nÃƒÆ’Ã‚Â£o encontrado');
      return;
    }

    try {
      setCreating(true);
      const businessName = `NegÃƒÆ’Ã‚Â³cio de ${user.displayName || 'UsuÃƒÆ’Ã‚Â¡rio'}`;
      const defaultAddress = 'Avenida Paulista, 1578, SÃƒÆ’Ã‚Â£o Paulo, SP'; // EndereÃƒÆ’Ã‚Â§o padrÃƒÆ’Ã‚Â£o para geocodificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o
      await createQuickBusiness(user.uid, businessName, defaultAddress); // Passa o endereÃƒÆ’Ã‚Â§o

      if (refreshUser) {
        await refreshUser();
      }

      Alert.alert(
        'Sucesso!',
        `Seu negÃƒÆ’Ã‚Â³cio "${businessName}" foi criado com sucesso. VocÃƒÆ’Ã‚Âª pode editÃƒÆ’Ã‚Â¡-lo nas configuraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes.`,
        [
          {
            text: 'OK',
            onPress: onBusinessCreated,
          },
        ],
      );
    } catch (error) {
      Alert.alert(
        'Erro',
        'NÃƒÆ’Ã‚Â£o foi possÃƒÆ’Ã‚Â­vel criar o negÃƒÆ’Ã‚Â³cio. Tente novamente.',
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <Icon name="add-business" size={48} color={colors.primary} />
        </View>
        <Text style={styles.title}>Criar Novo NegÃƒÆ’Ã‚Â³cio</Text>
        <Text style={styles.description}>
          VocÃƒÆ’Ã‚Âª ainda nÃƒÆ’Ã‚Â£o possui um negÃƒÆ’Ã‚Â³cio associado ÃƒÆ’Ã‚Â  sua conta. Crie um agora para comeÃƒÆ’Ã‚Â§ar a gerenciar seus serviÃƒÆ’Ã‚Â§os e agendamentos.
        </Text>
        <TouchableOpacity
          style={[styles.button, creating && styles.buttonDisabled]}
          onPress={handleCreateBusiness}
          disabled={creating}
        >
          {creating ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <View style={styles.buttonContent}>
              <Icon name="add" size={20} color={colors.white} style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Criar NegÃƒÆ’Ã‚Â³cio</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 15,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(61, 49, 42, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: colors.lightText,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 140,
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CreateBusinessCard;
