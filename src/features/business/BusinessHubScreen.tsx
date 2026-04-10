import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../constants/colors';
import { AppStackParamList } from '../../types/types';
import { useAuth } from '../auth/context/AuthContext';
import CreateBusinessCard from './components/CreateBusinessCard';

type BusinessHubNavigationProp = StackNavigationProp<AppStackParamList>;

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', screen: 'DashboardScreen' },
  { id: 'services', label: 'Gerenciar ServiÃƒÆ’Ã‚Â§os', icon: 'content-cut', screen: 'ServiceManagement' },
  { id: 'professionals', label: 'Gerenciar Profissionais', icon: 'group', screen: 'ProfessionalManagementScreen' },
  { id: 'promotions', label: 'Gerenciar PromoÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes', icon: 'local-offer', screen: 'PromotionManagement' },
  { id: 'chats', label: 'Mensagens', icon: 'chat', screen: 'ChatManagementScreen' },
  { id: 'reports', label: 'RelatÃƒÆ’Ã‚Â³rios Financeiros', icon: 'assessment', screen: 'FinancialReportsScreen' },
  { id: 'reviews', label: 'Gerenciar AvaliaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes', icon: 'star-rate', screen: 'ReviewsManagementScreen' },
  { id: 'settings', label: 'ConfiguraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes do NegÃƒÆ’Ã‚Â³cio', icon: 'settings', screen: 'BusinessSettingsScreen' },
] as const;

const BusinessHubScreen: React.FC = () => {
  const navigation = useNavigation<BusinessHubNavigationProp>();
  const { user, refreshUser, signOut } = useAuth();
  const handleBusinessCreated = () => {
    if (refreshUser) {
      refreshUser();
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch {
      // Erro ao sair pode ser tratado aqui futuramente
    }
  };

  if (!user?.businessId) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.centerContainer}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Meu NegÃƒÆ’Ã‚Â³cio</Text>
        </View>
        <CreateBusinessCard onBusinessCreated={handleBusinessCreated} />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Meu NegÃƒÆ’Ã‚Â³cio</Text>
      </View>
      <View style={styles.menuContainer}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.menuItem}
            onPress={() => navigation.navigate(item.screen)}
          >
            <Icon name={item.icon} size={24} color={colors.primary} style={styles.menuIcon} />
            <Text style={styles.menuText}>{item.label}</Text>
            <Icon name="chevron-right" size={24} color={colors.lightText} />
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.menuItem, styles.logoutButton]}
          onPress={handleLogout}
        >
          <Icon name="exit-to-app" size={24} color={colors.error} style={styles.menuIcon} />
          <Text style={[styles.menuText, styles.logoutText]}>Sair</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
  },
  centerContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  menuContainer: {
    padding: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 10,
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  menuIcon: {
    marginRight: 15,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  logoutButton: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.lightGray,
    paddingTop: 20,
  },
  logoutText: {
    color: colors.error,
    fontWeight: '500',
  },
});

export default BusinessHubScreen;
