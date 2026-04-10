import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons'; // Importar Icon
import { colors } from '../constants/colors';
import { OwnerTabParamList } from '../types/types';

// Telas do proprietÃ¡rio
// import DashboardScreen from '../screens/owner/DashboardScreen'; // SerÃ¡ acessado via BusinessHubScreen
import AppointmentManagementScreen from '../features/appointment/AppointmentManagementScreen';
import OwnerHomeScreen from '../screens/OwnerHomeScreen'; // Tela inicial igual ao CLIENT
// import ServiceManagementScreen from '../screens/owner/ServiceManagementScreen'; // SerÃ¡ acessado via BusinessHubScreen
// import ProfessionalManagementScreen from '../screens/owner/ProfessionalManagementScreen'; // SerÃ¡ acessado via BusinessHubScreen
// import FinancialReportsScreen from '../screens/owner/FinancialReportsScreen'; // SerÃ¡ acessado via BusinessHubScreen
// import BusinessSettingsScreen from '../screens/owner/BusinessSettingsScreen'; // SerÃ¡ acessado via BusinessHubScreen
// import ReviewsManagementScreen from '../screens/owner/ReviewsManagementScreen'; // SerÃ¡ acessado via BusinessHubScreen
import BusinessHubScreen from '../features/business/BusinessHubScreen'; // Nova tela Hub

const Tab = createBottomTabNavigator<OwnerTabParamList>(); // OwnerTabParamList precisarÃ¡ ser atualizado

// Helper functions para Ã­cones da TabBar
const renderHomeIcon = ({ color, size }: { color: string; size: number }) => (
  <Icon name="home" size={size} color={color} />
);

const renderAppointmentsIcon = ({ color, size }: { color: string; size: number }) => (
  <Icon name="event" size={size} color={color} />
);

const renderBusinessHubIcon = ({ color, size }: { color: string; size: number }) => (
  <Icon name="business" size={size} color={color} /> // Ãcone para o Hub de NegÃ³cios
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
          name="OwnerHome" // Nova aba inicial idÃªntica ao CLIENT
          component={OwnerHomeScreen}
          options={{
            tabBarLabel: 'InÃ­cio',
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
          name="AppointmentManagement" // MantÃ©m Agendamentos como uma aba principal
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
          name="BusinessHub" // Nova aba para o Hub de NegÃ³cios
          component={BusinessHubScreen}
          options={{
            tabBarLabel: 'Meu NegÃ³cio',
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

// iconStyles nÃ£o Ã© mais necessÃ¡rio se os Ã­cones sÃ£o de react-native-vector-icons
// const iconStyles = StyleSheet.create({
//   tabIcon: {
//     fontSize: 24, // O size Ã© passado diretamente para o Icon component
//   },
// });
