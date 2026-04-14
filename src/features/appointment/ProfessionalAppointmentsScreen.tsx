import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import { firebaseDb, collection, query, where, limit, getDocs, orderBy } from '../../config/firebase';
import { colors } from '../../constants/colors';
import { useAuth } from '../auth/context/AuthContext';
import { AppStackParamList } from '../../types/types';
import {
    Appointment,
    getProfessionalAppointments,
    updateAppointmentStatus,
    rescheduleAppointment,
    saveAppointment,
} from '../../services/appointments';
import { getServicesByBusiness, Service } from '../../services/services';
import Icon from 'react-native-vector-icons/MaterialIcons';

type ProfessionalAppointmentsScreenNavigationProp = StackNavigationProp<AppStackParamList, 'ProfessionalAppointmentsScreen'>;

interface Professional {
    id: string;
    name: string;
    specialty: string;
    active: boolean;
    image?: string;
}

interface ProfessionalWithAppointments extends Professional {
    appointments: Appointment[];
    isExpanded: boolean;
}

const ProfessionalAppointmentsScreen: React.FC = () => {
    const { user } = useAuth();
    const navigation = useNavigation<ProfessionalAppointmentsScreenNavigationProp>();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [businessId, setBusinessId] = useState<string | null>(null);
    const [professionals, setProfessionals] = useState<ProfessionalWithAppointments[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [searchText, setSearchText] = useState('');
    const [filteredProfessionals, setFilteredProfessionals] = useState<ProfessionalWithAppointments[]>([]);

    // Modal states
    const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

    // Form states
    const [clientName, setClientName] = useState('');
    const [clientEmail, setClientEmail] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedTime, setSelectedTime] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [notes, setNotes] = useState('');

    // Fetch business ID
    const fetchBusinessId = useCallback(async () => {
        if (!user) return;

        try {
            const businessSnapshot = await getDocs(
                query(
                    collection(firebaseDb, 'businesses'),
                    where('ownerId', '==', user.uid),
                    limit(1)
                )
            );

            if (!businessSnapshot.empty) {
                setBusinessId(businessSnapshot.docs[0].id);
            } else {
                Alert.alert('Erro', 'Estabelecimento não encontrado.');
            }
        } catch (error) {
            console.error('Error fetching business:', error);
            Alert.alert('Erro', 'Erro ao buscar estabelecimento.');
        }
    }, [user]);

    // Load professionals and their appointments
    const loadProfessionalsWithAppointments = useCallback(async () => {
        if (!businessId) return;

        try {
            setLoading(true);

            // Fetch professionals
            const professionalsSnapshot = await getDocs(
                query(
                    collection(firebaseDb, 'professionals'),
                    where('businessId', '==', businessId),
                    where('active', '==', true),
                    orderBy('name')
                )
            );

            // Fetch services
            const servicesData = await getServicesByBusiness(businessId);
            setServices(servicesData);

            // Process professionals and their appointments
            const professionalsWithAppointments: ProfessionalWithAppointments[] = await Promise.all(
                professionalsSnapshot.docs.map(async (doc: any) => {
                    const professionalData = doc.data();
                    const professional: Professional = {
                        id: doc.id,
                        name: professionalData.name,
                        specialty: professionalData.specialty,
                        active: professionalData.active,
                        image: professionalData.image,
                    };

                    // Fetch appointments for this professional
                    const appointments = await getProfessionalAppointments(professional.id);

                    return {
                        ...professional,
                        appointments: appointments.filter(apt => apt.status !== 'cancelled'), // Exclude cancelled appointments
                        isExpanded: false,
                    };
                })
            );

            setProfessionals(professionalsWithAppointments);
            setFilteredProfessionals(professionalsWithAppointments);
        } catch (error) {
            console.error('Error loading professionals:', error);
            Alert.alert('Erro', 'Erro ao carregar profissionais e agendamentos.');
        } finally {
            setLoading(false);
        }
    }, [businessId]);

    // Filter professionals based on search text
    useEffect(() => {
        const filtered = professionals.filter(prof =>
            prof.name.toLowerCase().includes(searchText.toLowerCase()) ||
            prof.specialty.toLowerCase().includes(searchText.toLowerCase()) ||
            prof.appointments.some(apt =>
                apt.clientName?.toLowerCase().includes(searchText.toLowerCase()) ||
                apt.serviceName?.toLowerCase().includes(searchText.toLowerCase())
            )
        );
        setFilteredProfessionals(filtered);
    }, [searchText, professionals]);

    // Initialize data
    useEffect(() => {
        fetchBusinessId();
    }, [fetchBusinessId]);

    useEffect(() => {
        if (businessId) {
            loadProfessionalsWithAppointments();
        }
    }, [businessId, loadProfessionalsWithAppointments]);

    // Refresh handler
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadProfessionalsWithAppointments();
        setRefreshing(false);
    }, [loadProfessionalsWithAppointments]);

    // Toggle professional expansion
    const toggleProfessionalExpansion = (professionalId: string) => {
        setProfessionals(prev =>
            prev.map(prof =>
                prof.id === professionalId
                    ? { ...prof, isExpanded: !prof.isExpanded }
                    : prof
            )
        );
        setFilteredProfessionals(prev =>
            prev.map(prof =>
                prof.id === professionalId
                    ? { ...prof, isExpanded: !prof.isExpanded }
                    : prof
            )
        );
    };

    // Handle appointment status update
    const handleStatusUpdate = async (appointmentId: string, newStatus: Appointment['status']) => {
        try {
            await updateAppointmentStatus(appointmentId, newStatus);
            Alert.alert('Sucesso', 'Status do agendamento atualizado com sucesso.');
            onRefresh();
        } catch (error) {
            console.error('Error updating appointment status:', error);
            Alert.alert('Erro', 'Não foi possível atualizar o status do agendamento.');
        }
    };

    // Handle appointment deletion
    const handleDeleteAppointment = (appointment: Appointment) => {
        Alert.alert(
            'Confirmar Exclusão',
            `Tem certeza que deseja cancelar o agendamento de ${appointment.clientName} em ${appointment.date} Ã s ${appointment.time}?`,
            [
                { text: 'Não', style: 'cancel' },
                {
                    text: 'Sim, Cancelar',
                    style: 'destructive',
                    onPress: () => handleStatusUpdate(appointment.id, 'cancelled'),
                },
            ]
        );
    };

    // Open create appointment modal
    const openCreateModal = (professional: Professional) => {
        setSelectedProfessional(professional);
        resetForm();
        setIsCreateModalVisible(true);
    };

    // Open edit appointment modal
    const openEditModal = (appointment: Appointment) => {
        setSelectedAppointment(appointment);
        setClientName(appointment.clientName || '');
        setClientEmail(appointment.clientEmail || '');
        setClientPhone(appointment.clientPhone || '');
        setSelectedService(services.find(s => s.id === appointment.serviceId) || null);
        setSelectedDate(new Date(appointment.date));
        setSelectedTime(new Date(`2000-01-01T${appointment.time}`));
        setNotes(appointment.notes || '');
        setIsEditModalVisible(true);
    };

    // Reset form
    const resetForm = () => {
        setClientName('');
        setClientEmail('');
        setClientPhone('');
        setSelectedService(null);
        setSelectedDate(new Date());
        setSelectedTime(new Date());
        setNotes('');
    };

    // Handle create appointment
    const handleCreateAppointment = async () => {
        if (!selectedProfessional || !selectedService || !clientName.trim()) {
            Alert.alert('Erro', 'Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        try {
            const appointmentData = {
                businessId: businessId!,
                serviceId: selectedService.id,
                professionalId: selectedProfessional.id,
                clientId: 'owner-created', // Special ID for owner-created appointments
                clientName: clientName.trim(),
                clientEmail: clientEmail.trim() || undefined,
                clientPhone: clientPhone.trim() || undefined,
                date: selectedDate.toISOString().split('T')[0],
                time: selectedTime.toTimeString().slice(0, 5),
                serviceName: selectedService.name,
                professionalName: selectedProfessional.name,
                businessName: '', // Will be filled by the service
                price: selectedService.price,
                duration: selectedService.duration.toString(),
                status: 'scheduled' as const,
                notes: notes.trim() || undefined,
            };

            await saveAppointment(appointmentData);
            Alert.alert('Sucesso', 'Agendamento criado com sucesso.');
            setIsCreateModalVisible(false);
            onRefresh();
        } catch (error) {
            console.error('Error creating appointment:', error);
            Alert.alert('Erro', 'Não foi possível criar o agendamento.');
        }
    };

    // Handle edit appointment
    const handleEditAppointment = async () => {
        if (!selectedAppointment || !selectedService || !clientName.trim()) {
            Alert.alert('Erro', 'Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        try {
            // Update appointment date/time if changed
            const newDate = selectedDate.toISOString().split('T')[0];
            const newTime = selectedTime.toTimeString().slice(0, 5);

            if (newDate !== selectedAppointment.date || newTime !== selectedAppointment.time) {
                await rescheduleAppointment(selectedAppointment.id, newDate, newTime);
            }

            Alert.alert('Sucesso', 'Agendamento atualizado com sucesso.');
            setIsEditModalVisible(false);
            onRefresh();
        } catch (error) {
            console.error('Error updating appointment:', error);
            Alert.alert('Erro', 'Não foi possível atualizar o agendamento.');
        }
    };

    // Get status color
    const getStatusColor = (status: Appointment['status']) => {
        switch (status) {
            case 'scheduled': return colors.warning;
            case 'confirmed': return colors.primary;
            case 'completed': return colors.success;
            case 'cancelled': return colors.error;
            case 'no_show': return colors.lightText;
            default: return colors.lightText;
        }
    };

    // Get status text
    const getStatusText = (status: Appointment['status']) => {
        switch (status) {
            case 'scheduled': return 'Agendado';
            case 'confirmed': return 'Confirmado';
            case 'completed': return 'Concluído';
            case 'cancelled': return 'Cancelado';
            case 'no_show': return 'Faltou';
            default: return status;
        }
    };

    // Render appointment item
    const renderAppointmentItem = (appointment: Appointment) => (
        <View key={appointment.id} style={styles.appointmentItem}>
            <View style={styles.appointmentHeader}>
                <View style={styles.appointmentInfo}>
                    <Text style={styles.clientName}>{appointment.clientName || 'Cliente não informado'}</Text>
                    <Text style={styles.serviceName}>{appointment.serviceName}</Text>
                    <Text style={styles.dateTime}>{appointment.date} Ã s {appointment.time}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(appointment.status) }]}>
                    <Text style={styles.statusText}>{getStatusText(appointment.status)}</Text>
                </View>
            </View>

            <View style={styles.appointmentActions}>
                <TouchableOpacity
                    style={[styles.actionButton, styles.editButton]}
                    onPress={() => openEditModal(appointment)}
                >
                    <Icon name="edit" size={16} color={colors.white} />
                    <Text style={styles.actionButtonText}>Editar</Text>
                </TouchableOpacity>

                {appointment.status === 'scheduled' && (
                    <TouchableOpacity
                        style={[styles.actionButton, styles.confirmButton]}
                        onPress={() => handleStatusUpdate(appointment.id, 'confirmed')}
                    >
                        <Icon name="check" size={16} color={colors.white} />
                        <Text style={styles.actionButtonText}>Confirmar</Text>
                    </TouchableOpacity>
                )}

                {appointment.status === 'confirmed' && (
                    <TouchableOpacity
                        style={[styles.actionButton, styles.completeButton]}
                        onPress={() => handleStatusUpdate(appointment.id, 'completed')}
                    >
                        <Icon name="done" size={16} color={colors.white} />
                        <Text style={styles.actionButtonText}>Concluir</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDeleteAppointment(appointment)}
                >
                    <Icon name="cancel" size={16} color={colors.white} />
                    <Text style={styles.actionButtonText}>Cancelar</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    // Render professional item
    const renderProfessionalItem = ({ item }: { item: ProfessionalWithAppointments }) => (
        <View style={styles.professionalCard}>
            <TouchableOpacity
                style={styles.professionalHeader}
                onPress={() => toggleProfessionalExpansion(item.id)}
            >
                <View style={styles.professionalInfo}>
                    <Text style={styles.professionalName}>{item.name}</Text>
                    <Text style={styles.professionalSpecialty}>{item.specialty}</Text>
                    <Text style={styles.appointmentsCount}>
                        {item.appointments.length} agendamento{item.appointments.length !== 1 ? 's' : ''}
                    </Text>
                </View>
                <View style={styles.professionalActions}>
                    <TouchableOpacity
                        style={styles.newAppointmentButton}
                        onPress={() => openCreateModal(item)}
                    >
                        <Icon name="add" size={20} color={colors.primary} />
                        <Text style={styles.newAppointmentText}>Novo</Text>
                    </TouchableOpacity>
                    <Icon
                        name={item.isExpanded ? 'expand-less' : 'expand-more'}
                        size={24}
                        color={colors.text}
                    />
                </View>
            </TouchableOpacity>

            {item.isExpanded && (
                <View style={styles.appointmentsContainer}>
                    {item.appointments.length > 0 ? (
                        item.appointments.map(appointment => renderAppointmentItem(appointment))
                    ) : (
                        <Text style={styles.noAppointmentsText}>
                            Nenhum agendamento encontrado para este profissional.
                        </Text>
                    )}
                </View>
            )}
        </View>
    );

    // Render appointment form modal
    const renderAppointmentModal = (isEdit: boolean) => (
        <Modal
            animationType="slide"
            transparent={true}
            visible={isEdit ? isEditModalVisible : isCreateModalVisible}
            onRequestClose={() => isEdit ? setIsEditModalVisible(false) : setIsCreateModalVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>
                            {isEdit ? 'Editar Agendamento' : 'Novo Agendamento'}
                        </Text>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => isEdit ? setIsEditModalVisible(false) : setIsCreateModalVisible(false)}
                        >
                            <Icon name="close" size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalContent}>
                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Nome do Cliente *</Text>
                            <TextInput
                                style={styles.input}
                                value={clientName}
                                onChangeText={setClientName}
                                placeholder="Nome completo do cliente"
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Email do Cliente</Text>
                            <TextInput
                                style={styles.input}
                                value={clientEmail}
                                onChangeText={setClientEmail}
                                placeholder="email@exemplo.com"
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Telefone do Cliente</Text>
                            <TextInput
                                style={styles.input}
                                value={clientPhone}
                                onChangeText={setClientPhone}
                                placeholder="(00) 00000-0000"
                                keyboardType="phone-pad"
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Serviço *</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                {services.map(service => (
                                    <TouchableOpacity
                                        key={service.id}
                                        style={[
                                            styles.serviceButton,
                                            selectedService?.id === service.id && styles.selectedServiceButton
                                        ]}
                                        onPress={() => setSelectedService(service)}
                                    >
                                        <Text style={[
                                            styles.serviceButtonText,
                                            selectedService?.id === service.id && styles.selectedServiceButtonText
                                        ]}>
                                            {service.name}
                                        </Text>
                                        <Text style={styles.servicePriceText}>
                                            R$ {service.price.toFixed(2)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        <View style={styles.dateTimeContainer}>
                            <View style={styles.dateTimeItem}>
                                <Text style={styles.inputLabel}>Data *</Text>
                                <TouchableOpacity
                                    style={styles.dateTimeButton}
                                    onPress={() => setShowDatePicker(true)}
                                >
                                    <Text style={styles.dateTimeText}>
                                        {selectedDate.toLocaleDateString('pt-BR')}
                                    </Text>
                                    <Icon name="date-range" size={20} color={colors.primary} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.dateTimeItem}>
                                <Text style={styles.inputLabel}>Horário *</Text>
                                <TouchableOpacity
                                    style={styles.dateTimeButton}
                                    onPress={() => setShowTimePicker(true)}
                                >
                                    <Text style={styles.dateTimeText}>
                                        {selectedTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                    <Icon name="access-time" size={20} color={colors.primary} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>ObservaçÃµes</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={notes}
                                onChangeText={setNotes}
                                placeholder="ObservaçÃµes sobre o agendamento (opcional)"
                                multiline
                                numberOfLines={3}
                            />
                        </View>
                    </ScrollView>

                    <View style={styles.modalFooter}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => isEdit ? setIsEditModalVisible(false) : setIsCreateModalVisible(false)}
                        >
                            <Text style={styles.cancelButtonText}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.saveButton}
                            onPress={isEdit ? handleEditAppointment : handleCreateAppointment}
                        >
                            <Text style={styles.saveButtonText}>
                                {isEdit ? 'Atualizar' : 'Criar'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {showDatePicker && (
                <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display="default"
                    onChange={(event, date) => {
                        setShowDatePicker(false);
                        if (date) setSelectedDate(date);
                    }}
                    minimumDate={new Date()}
                />
            )}

            {showTimePicker && (
                <DateTimePicker
                    value={selectedTime}
                    mode="time"
                    display="default"
                    onChange={(event, time: Date | undefined) => {
                        setShowTimePicker(false);
                        if (time) setSelectedTime(time);
                    }}
                />
            )}
        </Modal>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Carregando profissionais...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Icon name="arrow-back" size={24} color={colors.white} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Gerenciar por Profissional</Text>
                <View style={styles.placeholder} />
            </View>

            <View style={styles.searchContainer}>
                <Icon name="search" size={20} color={colors.lightText} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar profissional, cliente ou serviço"
                    value={searchText}
                    onChangeText={setSearchText}
                />
            </View>

            <FlatList
                data={filteredProfessionals}
                renderItem={renderProfessionalItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContainer}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Icon name="people" size={64} color={colors.lightText} />
                        <Text style={styles.emptyText}>Nenhum profissional encontrado</Text>
                        <Text style={styles.emptySubtext}>
                            Adicione profissionais ao seu estabelecimento para gerenciar agendamentos.
                        </Text>
                    </View>
                }
            />

            {renderAppointmentModal(false)}
            {renderAppointmentModal(true)}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: colors.text,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: colors.primary,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.white,
    },
    placeholder: {
        width: 40,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        margin: 16,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: colors.white,
        borderRadius: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 16,
        color: colors.text,
    },
    listContainer: {
        padding: 16,
    },
    professionalCard: {
        backgroundColor: colors.white,
        borderRadius: 12,
        marginBottom: 16,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    professionalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    professionalInfo: {
        flex: 1,
    },
    professionalName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 4,
    },
    professionalSpecialty: {
        fontSize: 14,
        color: colors.lightText,
        marginBottom: 4,
    },
    appointmentsCount: {
        fontSize: 12,
        color: colors.primary,
        fontWeight: 'bold',
    },
    professionalActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    newAppointmentButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: colors.background,
        borderRadius: 6,
        marginRight: 8,
    },
    newAppointmentText: {
        fontSize: 12,
        color: colors.primary,
        fontWeight: 'bold',
        marginLeft: 4,
    },
    appointmentsContainer: {
        borderTopWidth: 1,
        borderTopColor: colors.lightGray,
        paddingTop: 16,
    },
    appointmentItem: {
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 12,
        backgroundColor: colors.background,
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: colors.primary,
    },
    appointmentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    appointmentInfo: {
        flex: 1,
    },
    clientName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 2,
    },
    serviceName: {
        fontSize: 14,
        color: colors.text,
        marginBottom: 2,
    },
    dateTime: {
        fontSize: 12,
        color: colors.lightText,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: colors.white,
    },
    appointmentActions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        minWidth: 70,
    },
    actionButtonText: {
        fontSize: 11,
        color: colors.white,
        fontWeight: 'bold',
        marginLeft: 4,
    },
    editButton: {
        backgroundColor: colors.primary,
    },
    confirmButton: {
        backgroundColor: colors.success,
    },
    completeButton: {
        backgroundColor: '#4CAF50',
    },
    deleteButton: {
        backgroundColor: colors.error,
    },
    noAppointmentsText: {
        textAlign: 'center',
        color: colors.lightText,
        fontStyle: 'italic',
        padding: 16,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        color: colors.lightText,
        textAlign: 'center',
        marginTop: 8,
        paddingHorizontal: 32,
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: '90%',
        maxHeight: '80%',
        backgroundColor: colors.white,
        borderRadius: 12,
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.lightGray,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
    },
    closeButton: {
        padding: 4,
    },
    modalContent: {
        padding: 16,
    },
    inputContainer: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: colors.lightGray,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: colors.text,
        backgroundColor: colors.white,
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    serviceButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: colors.background,
        marginRight: 8,
        minWidth: 100,
    },
    selectedServiceButton: {
        backgroundColor: colors.primary,
    },
    serviceButtonText: {
        fontSize: 14,
        color: colors.text,
        fontWeight: 'bold',
    },
    selectedServiceButtonText: {
        color: colors.white,
    },
    servicePriceText: {
        fontSize: 12,
        color: colors.lightText,
        marginTop: 2,
    },
    dateTimeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    dateTimeItem: {
        flex: 0.48,
    },
    dateTimeButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.lightGray,
        borderRadius: 8,
        padding: 12,
        backgroundColor: colors.white,
    },
    dateTimeText: {
        fontSize: 16,
        color: colors.text,
    },
    modalFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: colors.lightGray,
    },
    cancelButton: {
        flex: 0.48,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 8,
        backgroundColor: colors.lightGray,
    },
    cancelButtonText: {
        fontSize: 16,
        color: colors.text,
        fontWeight: 'bold',
    },
    saveButton: {
        flex: 0.48,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 8,
        backgroundColor: colors.primary,
    },
    saveButtonText: {
        fontSize: 16,
        color: colors.white,
        fontWeight: 'bold',
    },
});

export default ProfessionalAppointmentsScreen;
