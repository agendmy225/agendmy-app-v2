import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../constants/colors';
import { AppStackParamList } from '../../types/types';
import { useAuth } from '../auth/context/AuthContext';

type AdminPanelNavigationProp = StackNavigationProp<AppStackParamList>;

// Secoes do painel admin. "ready: false" => mostra "Em breve" e nao navega.
// Conforme cada etapa for implementada, trocamos ready para true e ligamos a screen.
const adminSections = [
  { id: 'establishments', label: 'Estabelecimentos', description: 'Listar, ativar e desativar', icon: 'store', screen: 'AdminEstablishments', ready: false },
  { id: 'overdue', label: 'Inadimplentes', description: 'Donos com pagamento pendente', icon: 'money-off', screen: 'AdminOverdue', ready: false },
  { id: 'users', label: 'Usuarios', description: 'Clientes e proprietarios', icon: 'people', screen: 'AdminUsers', ready: false },
  { id: 'analytics', label: 'Analytics', description: 'Por cidade e estado', icon: 'insights', screen: 'AdminAnalytics', ready: false },
  { id: 'reviews', label: 'Avaliacoes', description: 'Moderacao global', icon: 'star-rate', screen: 'AdminReviews', ready: false },
  { id: 'categories', label: 'Categorias', description: 'Gerenciar categorias de servico', icon: 'category', screen: 'AdminCategories', ready: false },
  { id: 'notifications', label: 'Comunicados', description: 'Enviar notificacoes', icon: 'campaign', screen: 'AdminNotifications', ready: false },
] as const;

const AdminPanelScreen: React.FC = () => {
  const navigation = useNavigation<AdminPanelNavigationProp>();
  const { isAdmin } = useAuth();

  // Guarda de seguranca: se nao for admin, bloqueia o acesso.
  if (!isAdmin) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.centerContainer}>
        <Icon name="lock" size={64} color={colors.lightText} />
        <Text style={styles.deniedTitle}>Acesso restrito</Text>
        <Text style={styles.deniedText}>Esta area e exclusiva para administradores.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  const handlePress = (section: typeof adminSections[number]) => {
    if (!section.ready) {
      return;
    }
    // @ts-expect-error rotas de admin sao registradas conforme implementadas
    navigation.navigate(section.screen);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Icon name="admin-panel-settings" size={32} color={colors.white} />
        <Text style={styles.headerTitle}>Painel Admin</Text>
        <Text style={styles.headerSubtitle}>Controle geral do AgendMy</Text>
      </View>

      <View style={styles.menuContainer}>
        {adminSections.map((section) => (
          <TouchableOpacity
            key={section.id}
            style={[styles.menuItem, !section.ready && styles.menuItemDisabled]}
            onPress={() => handlePress(section)}
            activeOpacity={section.ready ? 0.6 : 1}
          >
            <View style={styles.iconCircle}>
              <Icon name={section.icon} size={22} color={colors.primary} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>{section.label}</Text>
              <Text style={styles.menuDescription}>{section.description}</Text>
            </View>
            {section.ready ? (
              <Icon name="chevron-right" size={24} color={colors.lightText} />
            ) : (
              <View style={styles.soonBadge}>
                <Text style={styles.soonText}>Em breve</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.footerNote}>
        As secoes serao habilitadas conforme forem implementadas.
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    padding: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  headerTitle: {
    color: colors.white,
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 8,
  },
  headerSubtitle: {
    color: colors.offWhite,
    fontSize: 13,
    marginTop: 2,
  },
  menuContainer: {
    padding: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  menuItemDisabled: {
    opacity: 0.7,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  menuDescription: {
    fontSize: 12,
    color: colors.lightText,
    marginTop: 2,
  },
  soonBadge: {
    backgroundColor: colors.lightGray,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  soonText: {
    fontSize: 11,
    color: colors.lightText,
    fontWeight: '600',
  },
  footerNote: {
    fontSize: 12,
    color: colors.lightText,
    textAlign: 'center',
    paddingHorizontal: 24,
    paddingBottom: 28,
  },
  deniedTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
  },
  deniedText: {
    fontSize: 14,
    color: colors.lightText,
    textAlign: 'center',
    marginTop: 8,
  },
  backButton: {
    marginTop: 24,
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 10,
  },
  backButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 15,
  },
});

export default AdminPanelScreen;
