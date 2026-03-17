import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppStackParamList, ClientTabParamList, HomeStackParamList } from '../types/types';
import { useAuth } from '../features/auth/context/AuthContext';
import { MaterialIcons } from '@react-native-vector-icons/material-icons';
import { colors } from '../constants/colors';

// Telas de autenticação
import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../features/auth/LoginScreen';
import RegisterScreen from '../features/auth/RegisterScreen';
import ForgotPasswordScreen from '../features/auth/ForgotPasswordScreen';
import EmailVerificationScreen from '../features/auth/EmailVerificationScreen';

// Telas principais
import HomeScreen from '../screens/HomeScreen';
import BusinessDetailsScreen from '../features/business/BusinessDetailsScreen';
import AllBusinessesScreen from '../features/business/AllBusinessesScreen';
import AppointmentsScreen from '../features/appointment/AppointmentsScreen';
import AppointmentDateTimeScreen from '../features/appointment/AppointmentDateTimeScreen';
import BookingConfirmationScreen from '../features/appointment/BookingConfirmationScreen';
import ProfileScreen from '../features/user/profile/ProfileScreen';
import EditProfileScreen from '../features/user/profile/EditProfileScreen';
import PaymentMethodsScreen from '../features/user/profile/PaymentMethodsScreen';
import SupportScreen from '../features/support/SupportScreen';
import ChatScreen from '../features/chat/ChatScreen';
import ChatListScreen from '../features/chat/ChatListScreen';
import FavoritesScreen from '../features/favorites/FavoritesScreen';
import AddPaymentMethodScreen from '../features/user/profile/AddPaymentMethodScreen';
import EditPaymentMethodScreen from '../features/user/profile/EditPaymentMethodScreen';
import PaymentScreen from '../features/payment/PaymentScreen';
import OwnerTabNavigator from './OwnerTabNavigator';
import ReviewScreen from '../features/reviews/ReviewScreen';

// Telas do proprietário
import DashboardScreen from '../features/dashboard/DashboardScreen';
import FinancialReportsScreen from '../features/reports/FinancialReportsScreen';
import ChatManagementScreen from '../features/chat/ChatManagementScreen';
import PromotionManagementScreen from '../features/promotion/PromotionManagementScreen';
import ProfessionalManagementScreen from '../features/professional/ProfessionalManagementScreen';
import ProfessionalAppointmentsScreen from '../features/appointment/ProfessionalAppointmentsScreen';
import ServiceManagementScreen from '../features/service/ServiceManagementScreen';
import ReviewsManagementScreen from '../features/reviews/ReviewsManagementScreen';
import BusinessSettingsScreen from '../features/business/BusinessSettingsScreen';

// Loading Screen — exibida enquanto o estado de auth é verificado
const LoadingScreen: React.FC = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
    <ActivityIndicator size="large" color={colors.primary} />
  </View>
);

const Stack = createStackNavigator<AppStackParamList>();
const ClientTab = createBottomTabNavigator<ClientTabParamList>();
const HomeStack = createStackNavigator<HomeStackParamList>();

// Icon components for tabs
const HomeIcon = ({ color, size }: { color: string; size: number }) => (
  <MaterialIcons name="home" size={size} color={color} />
);

const ScheduleIcon = ({ color, size }: { color: string; size: number }) => (
  <MaterialIcons name="schedule" size={size} color={color} />
);

const PersonIcon = ({ color, size }: { color: string; size: number }) => (
  <MaterialIcons name="person" size={size} color={color} />
);

// Styles
const styles = StyleSheet.create({
  safeAreaContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

// Stack Navigator para a Home Tab
const HomeStackNavigator: React.FC = () => {
  return (
    <HomeStack.Navigator
      id={undefined}
      screenOptions={{
        headerShown: false,
      }}
    >
      <HomeStack.Screen name="Home" component={HomeScreen} />
      <HomeStack.Screen name="BusinessDetails" component={BusinessDetailsScreen} />
      <HomeStack.Screen name="AllBusinesses" component={AllBusinessesScreen} />
    </HomeStack.Navigator>
  );
};

// Navigator para clientes
const ClientTabNavigator: React.FC = () => {
  return (
    <SafeAreaView style={styles.safeAreaContainer} edges={['top', 'bottom']}>
      <ClientTab.Navigator
        id={undefined}
        screenOptions={{
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.lightText,
          headerShown: false,
          tabBarStyle: {
            paddingBottom: 5,
            height: 60,
            paddingTop: 5,
          },
        }}
      >
        <ClientTab.Screen
          name="HomeStack"
          component={HomeStackNavigator}
          options={{
            tabBarLabel: 'Início',
            tabBarIcon: HomeIcon,
          }}
        />
        <ClientTab.Screen
          name="Appointments"
          component={AppointmentsScreen}
          options={{
            tabBarLabel: 'Agendamentos',
            tabBarIcon: ScheduleIcon,
          }}
        />
        <ClientTab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            tabBarLabel: 'Perfil',
            tabBarIcon: PersonIcon,
          }}
        />
        {/* Adicione mais abas do cliente aqui quando necessário */}
      </ClientTab.Navigator>
    </SafeAreaView>
  );
};

const AppNavigator: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator
      id={undefined}
      initialRouteName={user ? (user.userType === 'owner' ? 'OwnerTabs' : 'ClientTabs') : 'Welcome'}
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
      }}
    >
      {user ? (
        // Usuário logado
        <>
          {user.userType === 'owner' ? (
            <>
              <Stack.Screen name="OwnerTabs" component={OwnerTabNavigator} />
              {/* Telas específicas do proprietário */}
              <Stack.Screen name="BusinessDetails" component={BusinessDetailsScreen} />
              <Stack.Screen name="AppointmentDateTime" component={AppointmentDateTimeScreen} />
              <Stack.Screen name="BookingConfirmation" component={BookingConfirmationScreen} />
              <Stack.Screen name="DashboardScreen" component={DashboardScreen} />
              <Stack.Screen name="ProfessionalAppointmentsScreen" component={ProfessionalAppointmentsScreen} />
              <Stack.Screen name="FinancialReportsScreen" component={FinancialReportsScreen} />
              <Stack.Screen name="ChatManagementScreen" component={ChatManagementScreen} />
              <Stack.Screen name="PromotionManagement" component={PromotionManagementScreen} />
              <Stack.Screen name="ProfessionalManagementScreen" component={ProfessionalManagementScreen} />
              <Stack.Screen name="ServiceManagement" component={ServiceManagementScreen} />
              <Stack.Screen name="ReviewsManagementScreen" component={ReviewsManagementScreen} />
              <Stack.Screen name="BusinessSettingsScreen" component={BusinessSettingsScreen} />
              {/* Telas compartilhadas */}
              <Stack.Screen name="Review" component={ReviewScreen} />
              <Stack.Screen name="EditProfile" component={EditProfileScreen} />
              <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} />
              <Stack.Screen name="Support" component={SupportScreen} />
              <Stack.Screen name="Chat" component={ChatScreen} />
              <Stack.Screen name="ChatList" component={ChatListScreen} />
              <Stack.Screen name="AddPaymentMethod" component={AddPaymentMethodScreen} />
              <Stack.Screen name="EditPaymentMethod" component={EditPaymentMethodScreen} />
              <Stack.Screen name="Payment" component={PaymentScreen} />
            </>
          ) : (
            <>
              <Stack.Screen name="ClientTabs" component={ClientTabNavigator} />
              <Stack.Screen name="AppointmentDateTime" component={AppointmentDateTimeScreen} />
              <Stack.Screen name="BookingConfirmation" component={BookingConfirmationScreen} />
              <Stack.Screen name="Review" component={ReviewScreen} />
              <Stack.Screen name="EditProfile" component={EditProfileScreen} />
              <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} />
              <Stack.Screen name="Support" component={SupportScreen} />
              <Stack.Screen name="Chat" component={ChatScreen} />
              <Stack.Screen name="ChatList" component={ChatListScreen} />
              <Stack.Screen name="Favorites" component={FavoritesScreen} />
              <Stack.Screen name="AddPaymentMethod" component={AddPaymentMethodScreen} />
              <Stack.Screen name="EditPaymentMethod" component={EditPaymentMethodScreen} />
              <Stack.Screen name="Payment" component={PaymentScreen} />
            </>
          )}
        </>
      ) : (
        // Usuário não logado
        <>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;
