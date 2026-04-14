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
      Alert.alert('Erro', 'Usuário não encontrado');
      return;
    }

    try {
      setCreating(true);
      const businessName = `Negócio de ${user.displayName || 'Usuário'}`;
      const defaultAddress = 'Avenida Paulista, 1578, São Paulo, SP'; // Endereço padrão para geocodificação
      await createQuickBusiness(user.uid, businessName, defaultAddress); // Passa o endereço

      if (refreshUser) {
        await refreshUser();
      }

      Alert.alert(
        'Sucesso!',
        `Seu negócio "${businessName}" foi criado com sucesso. VocÃª pode editá-lo nas configuraçÃµes.`,
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
        'Não foi possível criar o negócio. Tente novamente.',
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
        <Text style={styles.title}>Criar Novo Negócio</Text>
        <Text style={styles.description}>
          VocÃª ainda não possui um negócio associado Ã  sua conta. Crie um agora para começar a gerenciar seus serviços e agendamentos.
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
              <Text style={styles.buttonText}>Criar Negócio</Text>
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
