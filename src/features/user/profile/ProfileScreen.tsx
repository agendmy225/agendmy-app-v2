import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image, // Importar Image
} from 'react-native';
import { useNavigation, CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { StackNavigationProp } from '@react-navigation/stack';
import { AppStackParamList } from '../../../types/types';
import { useAuth } from '../../auth/context/AuthContext';
import { colors } from '../../../constants/colors';
import Icon from 'react-native-vector-icons/MaterialIcons';

type TabParamList = {
  Home: undefined;
  Appointments: undefined;
  Profile: undefined;
};

type ProfileScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Profile'>,
  StackNavigationProp<AppStackParamList>
>;

const ProfileScreen: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigation = useNavigation<ProfileScreenNavigationProp>();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      // Ignore sign out errors silently
    }
  };

  // Iniciais do nome do usuário para o avatar
  const getInitials = () => {
    if (!user?.displayName) {
      return 'U';
    }
    const names = user.displayName.split(' ');
    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase();
    }
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Meu Perfil</Text>
      </View>

      <View style={styles.profileSection}>
        <View style={styles.avatarContainer}>
          {user?.photoURL ? (
            <Image source={{ uri: user.photoURL }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>{getInitials()}</Text>
          )}
        </View>
        <Text style={styles.userName}>{user?.displayName || 'Usuário'}</Text>
        <Text style={styles.userEmail}>{user?.email || 'email@exemplo.com'}</Text>
      </View>

      <View style={styles.menuSection}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => {
            navigation.navigate('EditProfile');
          }}
        >
          <Icon name="edit" size={22} color={colors.text} style={styles.menuIcon} />
          <Text style={styles.menuText}>Editar Perfil</Text>
          <Text style={styles.menuArrow}>â€º</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Favorites')}
        >
          <Icon name="favorite" size={24} color={colors.primary} style={styles.menuIcon} />
          <Text style={styles.menuText}>Favoritos</Text>
          <Icon name="chevron-right" size={24} color={colors.lightText} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('ChatList')}
        >
          <Icon name="chat" size={24} color={colors.primary} style={styles.menuIcon} />
          <Text style={styles.menuText}>Minhas Conversas</Text>
          <Icon name="chevron-right" size={24} color={colors.lightText} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('PaymentMethods')}
        >
          <Icon name="credit-card" size={24} color={colors.primary} style={styles.menuIcon} />
          <Text style={styles.menuText}>Métodos de Pagamento</Text>
          <Icon name="chevron-right" size={24} color={colors.lightText} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Support')}
        >
          <Icon name="help-outline" size={22} color={colors.text} style={styles.menuIcon} />
          <Text style={styles.menuText}>Suporte</Text>
          <Text style={styles.menuArrow}>â€º</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
        <Text style={styles.logoutButtonText}>Sair da Conta</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>AGENDMY</Text>
        <Text style={styles.versionText}>Versão 1.0.0</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  header: {
    padding: 16,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  profileSection: {
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    overflow: 'hidden', // Garante que a imagem não saia do círculo
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.white,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: colors.lightText,
  },
  menuSection: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  menuIcon: {
    // fontSize: 20, // Size é controlado pelo componente Icon
    marginRight: 16,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  menuArrow: {
    fontSize: 20,
    color: colors.lightText,
  },
  logoutButton: {
    marginTop: 30,
    marginHorizontal: 16,
    backgroundColor: colors.error,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  footerText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  versionText: {
    fontSize: 12,
    color: colors.lightText,
  },
});

export default ProfileScreen;
