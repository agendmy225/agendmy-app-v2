import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '../../constants/colors';
import { AppStackParamList } from '../../types/types';
import { checkTimeSlotAvailability } from '../../services/appointments';
import { getServiceById } from '../../services/services';
import { getBusinessById } from '../../services/businesses';

type AppointmentDateTimeScreenRouteProp = RouteProp<AppStackParamList, 'AppointmentDateTime'>;
type AppointmentDateTimeScreenNavigationProp = StackNavigationProp<AppStackParamList, 'AppointmentDateTime'>;

// Função para gerar dias disponíveis (próximos 30 dias)
const generateAvailableDays = () => {
  const days = [];
  const today = new Date();

  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    days.push({
      date: date.toISOString().split('T')[0],
      day: date.getDate(),
      month: date.toLocaleDateString('pt-BR', { month: 'short' }),
      weekday: date.toLocaleDateString('pt-BR', { weekday: 'short' }),
    });
  }

  return days;
};

// Função para gerar horários baseados no horário de funcionamento do estabelecimento
const generateTimeSlots = (startTime: string, endTime: string, intervalMinutes = 60): string[] => {
  const slots: string[] = [];

  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);

  const startTotalMinutes = startHour * 60 + startMinute;
  const endTotalMinutes = endHour * 60 + endMinute;

  for (let minutes = startTotalMinutes; minutes < endTotalMinutes; minutes += intervalMinutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const timeSlot = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    slots.push(timeSlot);
  }

  return slots;
};

const AppointmentDateTimeScreen: React.FC = () => {
  const route = useRoute<AppointmentDateTimeScreenRouteProp>();
  const navigation = useNavigation<AppointmentDateTimeScreenNavigationProp>();
  const { businessId, serviceId, professionalId, serviceName, professionalName } = route.params;

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedSessions, setSelectedSessions] = useState<{ date: string; time: string }[]>([]);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<{ time: string; available: boolean }[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [isPackage, setIsPackage] = useState(false);
  const [requiredSessions, setRequiredSessions] = useState(1);
  const [business, setBusiness] = useState<any>(null);

  // Generate available days (next 30 days)
  const availableDays = generateAvailableDays();

  // Load business data to get working hours
  useEffect(() => {
    const loadBusinessData = async () => {
      try {
        const businessData = await getBusinessById(businessId);
        setBusiness(businessData);
      } catch (error) {
        console.error('Error loading business data:', error);
      }
    };

    loadBusinessData();
  }, [businessId]);

  // Load service data to check if it's a package
  useEffect(() => {
    const loadServiceData = async () => {
      try {
        const serviceData = await getServiceById(businessId, serviceId);
        if (serviceData) {
          const isServicePackage = serviceData.numSessions && serviceData.numSessions > 1;
          setIsPackage(!!isServicePackage);
          setRequiredSessions(serviceData.numSessions || 1);
        }
      } catch (error) {

      }
    };

    loadServiceData();
  }, [businessId, serviceId]);

  // Load available time slots for selected date
  useEffect(() => {
    const loadAvailableTimes = async () => {
      if (selectedDate && professionalId && business) {
        setLoadingTimes(true);
        try {
          // Get day of week
          const dateObj = new Date(selectedDate);
          const dayOfWeek = dateObj.getDay();
          const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          const dayKey = days[dayOfWeek];

          // Get working hours for this day
          const workingHours = business.workingHours[dayKey];
          if (!workingHours || !workingHours.open) {
            setAvailableTimeSlots([]);
            return;
          }

          // Generate time slots based on business hours
          const timeSlots = generateTimeSlots(workingHours.start, workingHours.end, 60);

          const availabilitySlots = await Promise.all(
            timeSlots.map(async (time: string) => {
              const isAvailable = await checkTimeSlotAvailability(
                professionalId,
                selectedDate,
                time,
              );
              return { time, available: isAvailable };
            }),
          );
          setAvailableTimeSlots(availabilitySlots);
        } catch (error) {
          console.error('Error loading time slots:', error);
          // Fallback to empty array if there's an error
          setAvailableTimeSlots([]);
        } finally {
          setLoadingTimes(false);
        }
      } else {
        setAvailableTimeSlots([]);
      }
    };

    loadAvailableTimes();
  }, [selectedDate, professionalId, business]);

  const handleDateSelect = (date: string) => {
    if (isPackage) {
      // Para pacotes, permitir seleção múltipla mas não duplicar datas
      const alreadySelected = selectedSessions.some(session => session.date === date);
      if (alreadySelected) {
        // Se já está selecionada, remover todas as sessões desta data
        setSelectedSessions(prev => prev.filter(session => session.date !== date));
      }
      setSelectedDate(date);
      setSelectedTime(null);
    } else {
      // Para serviços únicos, comportamento normal
      setSelectedDate(date);
      setSelectedTime(null);
    }
  };

  const handleTimeSelect = (time: string) => {
    if (isPackage) {
      if (selectedDate && selectedSessions.length < requiredSessions) {
        // Verificar se essa combinação data/hora já foi selecionada
        const alreadyExists = selectedSessions.some(
          session => session.date === selectedDate && session.time === time,
        );

        if (!alreadyExists) {
          setSelectedSessions(prev => [...prev, { date: selectedDate, time }]);
        }
      }
      setSelectedTime(time);
    } else {
      setSelectedTime(time);
    }
  };

  const removeSession = (sessionIndex: number) => {
    setSelectedSessions(prev => prev.filter((_, index) => index !== sessionIndex));
  };

  const handleContinue = () => {
    if (isPackage) {
      if (selectedSessions.length === requiredSessions) {
        navigation.navigate('BookingConfirmation', {
          businessId,
          serviceId,
          professionalId,
          sessions: selectedSessions, // Múltiplas sessões
        });
      }
    } else {
      if (selectedDate && selectedTime) {
        navigation.navigate('BookingConfirmation', {
          businessId,
          serviceId,
          professionalId,
          date: selectedDate,
          time: selectedTime,
        });
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Escolha data e horário</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.appointmentInfo}>
          <Text style={styles.infoTitle}>Serviço:</Text>
          <Text style={styles.infoValue}>{serviceName}</Text>
          <Text style={styles.infoTitle}>Profissional:</Text>
          <Text style={styles.infoValue}>{professionalName}</Text>
          {isPackage && (
            <>
              <Text style={styles.infoTitle}>Pacote:</Text>
              <Text style={styles.infoValue}>{requiredSessions} sessões</Text>
              <Text style={styles.infoTitle}>Sessões selecionadas:</Text>
              <Text style={styles.infoValue}>{selectedSessions.length} de {requiredSessions}</Text>
            </>
          )}
        </View>

        {isPackage && selectedSessions.length > 0 && (
          <View style={styles.selectedSessionsSection}>
            <Text style={styles.sectionTitle}>Sessões selecionadas</Text>
            {selectedSessions.map((session, index) => (
              <View key={index} style={styles.sessionItem}>
                <View style={styles.sessionInfo}>
                  <Text style={styles.sessionDate}>
                    {new Date(session.date).toLocaleDateString('pt-BR', {
                      weekday: 'short',
                      day: '2-digit',
                      month: 'short',
                    })}
                  </Text>
                  <Text style={styles.sessionTime}>{session.time}</Text>
                </View>
                <TouchableOpacity
                  style={styles.removeSessionButton}
                  onPress={() => removeSession(index)}
                >
                  <Text style={styles.removeSessionText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View style={styles.dateSection}>
          <Text style={styles.sectionTitle}>Selecione uma data</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.daysContainer}
          >
            {availableDays.map((day) => (
              <TouchableOpacity
                key={day.date}
                style={[
                  styles.dayCard,
                  selectedDate === day.date && styles.selectedDayCard,
                ]}
                onPress={() => handleDateSelect(day.date)}
              >
                <Text style={[
                  styles.weekdayText,
                  selectedDate === day.date && styles.selectedText,
                ]}>
                  {day.weekday}
                </Text>
                <Text style={[
                  styles.dayText,
                  selectedDate === day.date && styles.selectedText,
                ]}>
                  {day.day}
                </Text>
                <Text style={[
                  styles.monthText,
                  selectedDate === day.date && styles.selectedText,
                ]}>
                  {day.month}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {selectedDate && (
          <View style={styles.timeSection}>
            <Text style={styles.sectionTitle}>Selecione um horário</Text>
            {loadingTimes ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Carregando horários disponíveis...</Text>
              </View>
            ) : (
              <View style={styles.timeSlotsContainer}>
                {availableTimeSlots.map((slot) => (
                  <TouchableOpacity
                    key={slot.time}
                    style={[
                      styles.timeSlot,
                      !slot.available && styles.unavailableTimeSlot,
                      selectedTime === slot.time && styles.selectedTimeSlot,
                    ]}
                    onPress={() => slot.available && handleTimeSelect(slot.time)}
                    disabled={!slot.available}
                  >
                    <Text style={[
                      styles.timeText,
                      !slot.available && styles.unavailableTimeText,
                      selectedTime === slot.time && styles.selectedTimeText,
                    ]}>
                      {slot.time}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            (isPackage
              ? selectedSessions.length !== requiredSessions
              : (!selectedDate || !selectedTime)
            ) && styles.disabledButton,
          ]}
          onPress={handleContinue}
          disabled={isPackage
            ? selectedSessions.length !== requiredSessions
            : (!selectedDate || !selectedTime)
          }
        >
          <Text style={styles.continueButtonText}>
            {isPackage
              ? `Continuar (${selectedSessions.length}/${requiredSessions})`
              : 'Continuar'
            }
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: colors.text,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  appointmentInfo: {
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 14,
    color: colors.lightText,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  dateSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  daysContainer: {
    paddingRight: 16,
  },
  dayCard: {
    width: 70,
    height: 90,
    borderRadius: 10,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedDayCard: {
    backgroundColor: colors.primary,
  },
  weekdayText: {
    fontSize: 14,
    color: colors.lightText,
    marginBottom: 4,
  },
  dayText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  monthText: {
    fontSize: 14,
    color: colors.lightText,
  },
  selectedText: {
    color: colors.white,
  },
  timeSection: {
    marginBottom: 24,
  },
  timeSlotsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  timeSlot: {
    width: '30%',
    height: 50,
    borderRadius: 10,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  unavailableTimeSlot: {
    backgroundColor: colors.lightGray,
    opacity: 0.6,
  },
  selectedTimeSlot: {
    backgroundColor: colors.primary,
  },
  timeText: {
    fontSize: 16,
    color: colors.text,
  },
  unavailableTimeText: {
    color: colors.lightText,
  },
  selectedTimeText: {
    color: colors.white,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.lightGray,
  },
  continueButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: colors.lightGray,
  },
  continueButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: colors.lightText,
    marginTop: 10,
    textAlign: 'center',
  },
  selectedSessionsSection: {
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sessionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.lightGray,
    borderRadius: 8,
    marginBottom: 8,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionDate: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  sessionTime: {
    fontSize: 14,
    color: colors.lightText,
    marginTop: 2,
  },
  removeSessionButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeSessionText: {
    fontSize: 16,
    color: colors.white,
    fontWeight: 'bold',
  },
});

export default AppointmentDateTimeScreen;
