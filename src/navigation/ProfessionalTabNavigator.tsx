// src/navigation/ProfessionalTabNavigator.tsx
// Abas da area do profissional.
import React from 'react';
import { StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../constants/colors';
import ProfessionalAgendaScreen from '../features/professionalArea/ProfessionalAgendaScreen';
import ProfessionalProfileScreen from '../features/professionalArea/ProfessionalProfileScreen';
import ProfessionalScheduleScreen from '../features/professionalArea/ProfessionalScheduleScreen';

type ProfessionalTabParamList = {
  ProfessionalAgenda: undefined;
  ProfessionalSchedule: undefined;
  ProfessionalProfile: undefined;
};

const Tab = createBottomTabNavigator<ProfessionalTabParamList>();

const AgendaIcon = ({ color, size }: { color: string; size: number }) => (
  <Icon name="event-note" size={size} color={color} />
);
const ScheduleIcon = ({ color, size }: { color: string; size: number }) => (
  <Icon name="schedule" size={size} color={color} />
);
const ProfileIcon = ({ color, size }: { color: string; size: number }) => (
  <Icon name="person" size={size} color={color} />
);

const ProfessionalTabNavigator: React.FC = () => (
  <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
    <Tab.Navigator
      id={undefined}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.lightText,
        tabBarStyle: { paddingBottom: 5, height: 60 },
      }}
    >
      <Tab.Screen
        name="ProfessionalAgenda"
        component={ProfessionalAgendaScreen}
        options={{ tabBarLabel: 'Minha Agenda', tabBarIcon: AgendaIcon }}
      />
      <Tab.Screen
        name="ProfessionalSchedule"
        component={ProfessionalScheduleScreen}
        options={{ tabBarLabel: 'Meus Horários', tabBarIcon: ScheduleIcon }}
      />
      <Tab.Screen
        name="ProfessionalProfile"
        component={ProfessionalProfileScreen}
        options={{ tabBarLabel: 'Perfil', tabBarIcon: ProfileIcon }}
      />
    </Tab.Navigator>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
});

export default ProfessionalTabNavigator;
