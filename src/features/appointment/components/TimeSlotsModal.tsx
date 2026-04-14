import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../../../constants/colors';
import { Business } from '../../../services/businesses';
import { Service } from '../../../services/services';
import { Professional } from '../../../services/professionals';
import { checkTimeSlotAvailability } from '../../../services/appointments';

// Function to parse duration from various formats
const parseDurationInMinutes = (duration: string): number => {
  const durationLower = duration.toLowerCase().trim();

  // Extract numbers from the string
  const numbers = durationLower.match(/\d+/g);
  if (!numbers || numbers.length === 0) {
    return 60; // Default fallback
  }

  const value = parseInt(numbers[0], 10);

  // Check for hour indicators
  if (durationLower.includes('hora') || durationLower.includes('hour') || durationLower.includes('h')) {
    return value * 60; // Convert hours to minutes
  }

  // Check for minute indicators or assume minutes by default
  if (durationLower.includes('min') || durationLower.includes('minute') || durationLower.includes('m')) {
    return value;
  }

  // If no unit specified, assume the value is in minutes
  return value;
};

interface TimeSlotsModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectTimeSlot: (date: string, time: string, professionalId: string) => void;
  business: Business;
  service: Service;
  professionals: Professional[];
}

interface TimeSlot {
  time: string;
  available: boolean;
  professionalId: string;
  professionalName: string;
}

const TimeSlotsModal: React.FC<TimeSlotsModalProps> = ({
  visible,
  onClose,
  onSelectTimeSlot,
  business,
  service,
  professionals,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  const generateAvailableDates = useCallback(() => {
    const dates: string[] = [];
    const today = new Date();

    // Gerar próximos 7 dias
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      const dayName = date.toLocaleDateString('pt-BR', { weekday: 'long' });
      const dayKey = getDayKey(dayName);

      // Verificar se o negócio está aberto neste dia
      if (business.workingHours[dayKey]?.open) {
        dates.push(date.toISOString().split('T')[0]);
      }
    }

    setAvailableDates(dates);
    if (dates.length > 0) {
      setSelectedDate(dates[0]);
    }
  }, [business]);

  useEffect(() => {
    if (visible) {
      generateAvailableDates();
    }
  }, [visible, business, generateAvailableDates]);
  const generateTimeSlots = useCallback(async (date: string) => {
    const dateObj = new Date(date);
    const dayName = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
    const dayKey = getDayKey(dayName);

    const workingHours = business.workingHours[dayKey];
    if (!workingHours || !workingHours.open) {
      setTimeSlots([]);
      return;
    }

    setIsLoadingSlots(true);

    try {
      const slots: TimeSlot[] = [];
      const startTime = parseTime(workingHours.start);
      const endTime = parseTime(workingHours.end);
      const serviceDuration = parseDurationInMinutes(service.duration);

      let currentTime = startTime;

      while (currentTime + serviceDuration <= endTime) {
        const timeString = formatTime(currentTime);

        // Para cada profissional, verificar disponibilidade real
        for (const professional of professionals) {
          const isAvailable = await checkTimeSlotAvailability(
            professional.id,
            date,
            timeString,
            serviceDuration,
          );

          slots.push({
            time: timeString,
            available: isAvailable,
            professionalId: professional.id,
            professionalName: professional.name,
          });
        }

        currentTime += serviceDuration;
      }

      setTimeSlots(slots);
    } catch (error) {
      setTimeSlots([]);
    } finally {
      setIsLoadingSlots(false);
    }
  }, [business.workingHours, professionals, service.duration]);

  useEffect(() => {
    if (selectedDate) {
      generateTimeSlots(selectedDate);
    }
  }, [selectedDate, generateTimeSlots]);

  const getDayKey = (dayName: string): string => {
    const dayMap: { [key: string]: string } = {
      'segunda-feira': 'monday',
      'terça-feira': 'tuesday',
      'quarta-feira': 'wednesday',
      'quinta-feira': 'thursday',
      'sexta-feira': 'friday',
      'sábado': 'saturday',
      'domingo': 'sunday',
    };
    return dayMap[dayName.toLowerCase()] || 'monday';
  };


  const parseTime = (timeString: string): number => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const handleSelectTimeSlot = (slot: TimeSlot) => {
    if (slot.available) {
      onSelectTimeSlot(selectedDate, slot.time, slot.professionalId);
    } else {
      Alert.alert('Horário indisponível', 'Este horário já está ocupado.');
    }
  };

  const formatDateDisplay = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Horários Disponíveis</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Ã—</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.serviceInfo}>
            {service.name} - <Text>{service.duration} min</Text> - R$ {service.price}
          </Text>

          {availableDates.length === 0 ? (
            <View style={styles.noSlotsContainer}>
              <Text style={styles.noSlotsText}>
                Não há horários disponíveis nos próximos dias.
              </Text>
            </View>
          ) : (
            <>
              {/* Seleção de Data */}
              <View style={styles.dateContainer}>
                <Text style={styles.sectionTitle}>Selecione o dia:</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.dateScroll}
                >
                  {availableDates.map((date) => (
                    <TouchableOpacity
                      key={date}
                      style={[
                        styles.dateButton,
                        selectedDate === date && styles.selectedDateButton,
                      ]}
                      onPress={() => setSelectedDate(date)}
                    >
                      <Text
                        style={[
                          styles.dateButtonText,
                          selectedDate === date && styles.selectedDateButtonText,
                        ]}
                      >
                        {formatDateDisplay(date)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>              {/* Horários Disponíveis */}
              <View style={styles.timeSlotsContainer}>
                <Text style={styles.sectionTitle}>Horários:</Text>
                {isLoadingSlots ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.loadingText}>Verificando disponibilidade...</Text>
                  </View>
                ) : (
                  <ScrollView style={styles.slotsScroll}>
                    {timeSlots.length === 0 ? (
                      <Text style={styles.noSlotsText}>
                        Nenhum horário disponível para este dia.
                      </Text>
                    ) : timeSlots.filter(slot => slot.available).length === 0 ? (
                      <Text style={styles.noSlotsText}>
                        Todos os horários estão ocupados para este dia. Tente outro dia.
                      </Text>
                    ) : (
                      timeSlots.map((slot) => (
                        <TouchableOpacity
                          key={`${slot.time}-${slot.professionalId}`}
                          style={[
                            styles.timeSlotButton,
                            !slot.available && styles.unavailableSlot,
                          ]}
                          onPress={() => handleSelectTimeSlot(slot)}
                          disabled={!slot.available}
                        >
                          <Text
                            style={[
                              styles.timeSlotText,
                              !slot.available && styles.unavailableSlotText,
                            ]}
                          >
                            {slot.time} - {slot.professionalName}
                          </Text>
                        </TouchableOpacity>
                      ))
                    )}
                  </ScrollView>
                )}
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: colors.text,
  },
  serviceInfo: {
    padding: 20,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.lightGray,
    textAlign: 'center',
  },
  noSlotsContainer: {
    padding: 40,
    alignItems: 'center',
  },
  noSlotsText: {
    fontSize: 16,
    color: colors.gray,
    textAlign: 'center',
  },
  dateContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 10,
  },
  dateScroll: {
    flexGrow: 0,
  },
  dateButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
    borderRadius: 8,
    backgroundColor: colors.lightGray,
    minWidth: 80,
    alignItems: 'center',
  },
  selectedDateButton: {
    backgroundColor: colors.primary,
  },
  dateButtonText: {
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
  },
  selectedDateButtonText: {
    color: colors.white,
    fontWeight: 'bold',
  },
  timeSlotsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  slotsScroll: {
    flex: 1,
  },
  timeSlotButton: {
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    backgroundColor: colors.lightGray,
    borderWidth: 1,
    borderColor: colors.gray,
  },
  unavailableSlot: {
    backgroundColor: '#f5f5f5',
    borderColor: '#ddd',
  },
  timeSlotText: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
  }, unavailableSlotText: {
    color: colors.gray,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: colors.text,
  },
});

export default TimeSlotsModal;
