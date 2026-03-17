import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons'; // Importar Icon
import { colors } from '../constants/colors';
import { OwnerTabParamList } from '../types/types';

// Telas do proprietário
// import DashboardScreen from '../screens/owner/DashboardScreen'; // Será acessado via BusinessHubScreen
import AppointmentManagementScreen from '../features/appointment/AppointmentManagementScreen';
import OwnerHomeScreen from '../screens/OwnerHomeScreen'; // Tela inicial igual ao CLIENT
// import ServiceManagementScreen from '../screens/owner/ServiceManagementScreen'; // Será acessado via BusinessHubScreen
// import ProfessionalManagementScreen from '../screens/owner/ProfessionalManagementScreen'; // Será acessado via BusinessHubScreen
// import FinancialReportsScreen from '../screens/owner/FinancialReportsScreen'; // Será acessado via BusinessHubScreen
// import BusinessSettingsScreen from '../screens/owner/BusinessSettingsScreen'; // Será acessado via BusinessHubScreen
// import ReviewsManagementScreen from '../screens/owner/ReviewsManagementScreen'; // Será acessado via BusinessHubScreen
import BusinessHubScreen from '../features/business/BusinessHubScreen'; // Nova tela Hub

const Tab = createBottomTabNavigator<OwnerTabParamList>(); // OwnerTabParamList precisará ser atualizado

// Helper functions para ícones da TabBar
const renderHomeIcon = ({ color, size }: { color: string; size: number }) => (
  <Icon name="home" size={size} color={color} />
);

const renderAppointmentsIcon = ({ color, size }: { color: string; size: number }) => (
  <Icon name="event" size={size} color={color} />
);

const renderBusinessHubIcon = ({ color, size }: { color: string; size: number }) => (
  <Icon name="business" size={size} color={color} /> // Ícone para o Hub de Negócios
);

const OwnerTabNavigator: React.FC = () => {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Tab.Navigator
        id={undefined}
        initialRouteName="OwnerHome"
        backBehavior="initialRoute"
        screenOptions={{
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.lightText,
          headerShown: false,
          tabBarStyle: {
            paddingBottom: 5,
            height: 60,
          },
        }}
      >
        <Tab.Screen
          name="OwnerHome" // Nova aba inicial idêntica ao CLIENT
          component={OwnerHomeScreen}
          options={{
            tabBarLabel: 'Início',
            tabBarIcon: renderHomeIcon,
          }}
          listeners={({ navigation }) => ({
            tabPress: (_e) => {
              // Reset to home screen when tab is pressed
              navigation.navigate('OwnerHome');
            },
          })}
        />
        <Tab.Screen
          name="AppointmentManagement" // Mantém Agendamentos como uma aba principal
          component={AppointmentManagementScreen}
          options={{
            tabBarLabel: 'Agendamentos',
            tabBarIcon: renderAppointmentsIcon,
          }}
          listeners={({ navigation }) => ({
            tabPress: (_e) => {
              // Ensure proper navigation to appointments screen
              navigation.navigate('AppointmentManagement');
            },
          })}
        />
        <Tab.Screen
          name="BusinessHub" // Nova aba para o Hub de Negócios
          component={BusinessHubScreen}
          options={{
            tabBarLabel: 'Meu Negócio',
            tabBarIcon: renderBusinessHubIcon,
          }}
          listeners={({ navigation }) => ({
            tabPress: (_e) => {
              // Ensure proper navigation to business hub screen
              navigation.navigate('BusinessHub');
            },
          })}
        />
        {/* As outras abas foram movidas para dentro do BusinessHubScreen */}
      </Tab.Navigator>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

export default OwnerTabNavigator;

// iconStyles não é mais necessário se os ícones são de react-native-vector-icons
// const iconStyles = StyleSheet.create({
//   tabIcon: {
//     fontSize: 24, // O size é passado diretamente para o Icon component
//   },
// });
