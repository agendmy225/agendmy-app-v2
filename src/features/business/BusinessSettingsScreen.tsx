import { Picker } from '@react-native-picker/picker';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { addDoc, collection, doc, firestore, getDoc, getDocs, limit, query, serverTimestamp, updateDoc, where } from '../../config/firebase';
import { BUSINESS_CATEGORIES } from '../../services/categories';
import { colors } from '../../constants/colors';
import { useAuth } from '../auth/context/AuthContext';
import { getCoordinatesFromAddress } from '../../services/maps';
import {
  deleteImageFromFirebase,
  selectAndUploadImage,
} from '../../services/imageUpload';
import StorageImage from '../../components/common/StorageImage';
import Config from 'react-native-config';

interface BusinessSettings {
  id?: string;
  name: string;
  description: string;
  address: string;
  addressNumber: string;
  addressComplement?: string;
  phone: string;
  email: string;
  logo: string;
  coverImage: string;
  category: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  workingHours: {
    [day: string]: {
      open: boolean;
      start: string;
      end: string;
    };
  };
  policies: {
    cancellationTimeLimit: number; // horas antes do agendamento
    cancellationFee: number; // percentual do valor
    noShowFee: number; // percentual do valor
    advanceBookingLimit: number; // dias
  }; notifications: {
    confirmationEnabled: boolean;
    reminderEnabled: boolean;
    reminderTime: number; // horas antes do agendamento
  };
  paymentMethods: {
    cash: boolean;
    creditCard: boolean;
    debitCard: boolean;
    pix: boolean;
    transfer: boolean;
    inApp: boolean;
  };
  defaultCommissionRate: number; // taxa padrÃ£o de comissÃ£o (0-1)
}

const BusinessSettingsScreen: React.FC = () => {
  const { user, signOut } = useAuth(); // Adicionar signOut
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);

  // Estados para upload de imagens
  const [logoUploadProgress, setLogoUploadProgress] = useState<number | null>(null);
  const [coverUploadProgress, setCoverUploadProgress] = useState<number | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [settings, setSettings] = useState<BusinessSettings>({
    name: '',
    description: '',
    address: '',
    addressNumber: '',
    addressComplement: '',
    phone: '',
    email: '',
    logo: 'https://via.placeholder.com/150',
    coverImage: 'https://via.placeholder.com/500x200',
    category: '',
    workingHours: {
      monday: { open: true, start: '09:00', end: '18:00' },
      tuesday: { open: true, start: '09:00', end: '18:00' },
      wednesday: { open: true, start: '09:00', end: '18:00' },
      thursday: { open: true, start: '09:00', end: '18:00' },
      friday: { open: true, start: '09:00', end: '18:00' },
      saturday: { open: true, start: '09:00', end: '14:00' },
      sunday: { open: false, start: '09:00', end: '18:00' },
    },
    policies: {
      cancellationTimeLimit: 24,
      cancellationFee: 0.5,
      noShowFee: 1.0,
      advanceBookingLimit: 30,
    }, notifications: {
      confirmationEnabled: true,
      reminderEnabled: true,
      reminderTime: 24,
    },
    paymentMethods: {
      cash: true,
      creditCard: true,
      debitCard: true,
      pix: true,
      transfer: false,
      inApp: false,
    },
    defaultCommissionRate: 0.5,
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('general');

  const handleSignOut = async () => {
    try {
      await signOut();
      // A navegaÃ§Ã£o para a tela de login/welcome serÃ¡ tratada pelo AppNavigator
    } catch {
      Alert.alert('Erro', 'NÃ£o foi possÃ­vel fazer logout. Tente novamente.');
    }
  };

  const fetchBusinessId = React.useCallback(async () => { // Envolver com useCallback
    if (!user) { return; }

    try {      // Buscar o ID do estabelecimento do proprietÃ¡rio atual
      const businessSnapshot = await getDocs(
        query(
          collection(firestore, 'businesses'),
          where('ownerId', '==', user.uid),
          limit(1),
        ),
      );

      if (!businessSnapshot.empty) {
        const businessDoc = businessSnapshot.docs[0];
        setBusinessId(businessDoc.id);
      } else {
        // Se nÃ£o encontrar um estabelecimento, criar um novo com dados padrÃ£o
        const newBusinessData = {
          ownerId: user.uid,
          name: `NegÃ³cio de ${user.displayName || user.email}`,
          description: 'DescriÃ§Ã£o do seu novo estabelecimento.',
          address: '',
          addressNumber: '',
          addressComplement: '',
          phone: '',
          email: user.email || '',
          logo: 'https://via.placeholder.com/150',
          coverImage: 'https://via.placeholder.com/500x200',
          category: '',
          active: true,
          rating: 0,
          reviewCount: 0,
          workingHours: {
            monday: { open: true, start: '09:00', end: '18:00' },
            tuesday: { open: true, start: '09:00', end: '18:00' },
            wednesday: { open: true, start: '09:00', end: '18:00' },
            thursday: { open: true, start: '09:00', end: '18:00' },
            friday: { open: true, start: '09:00', end: '18:00' },
            saturday: { open: true, start: '09:00', end: '14:00' },
            sunday: { open: false, start: '09:00', end: '18:00' },
          },
          policies: {
            cancellationTimeLimit: 24,
            cancellationFee: 0.5,
            noShowFee: 1.0,
            advanceBookingLimit: 30,
          },
          notifications: {
            confirmationEnabled: true,
            reminderEnabled: true,
            reminderTime: 24,
          },
          paymentMethods: {
            cash: true,
            creditCard: true,
            debitCard: true,
            pix: true,
            transfer: false,
            inApp: false,
          },
          defaultCommissionRate: 0.5,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        const newBusinessRef = await addDoc(collection(firestore, 'businesses'), newBusinessData);
        setBusinessId(newBusinessRef.id);
      }
    } catch (error) {
      console.error("Erro ao buscar ou criar negÃ³cio:", error);
      Alert.alert("Erro", "NÃ£o foi possÃ­vel carregar ou criar os dados do seu negÃ³cio.");
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBusinessId();
  }, [fetchBusinessId]); // Adicionar fetchBusinessId como dependÃªncia

  const loadBusinessSettings = React.useCallback(async () => {
    if (!businessId) { return; }

    try {
      setLoading(true);      // Buscar configuraÃ§Ãµes do estabelecimento
      const businessDoc = await getDoc(doc(firestore, 'businesses', businessId));

      if (businessDoc.exists()) {
        const businessData = businessDoc.data() as BusinessSettings;        // Garantir que todos os campos existam
        // Usar uma cÃ³pia do estado 'settings' para evitar referÃªncias stale no merge
        setSettings(prevSettings => ({
          id: businessDoc.id,
          name: businessData.name || prevSettings.name,
          description: businessData.description || prevSettings.description,
          address: businessData.address || prevSettings.address,
          addressNumber: businessData.addressNumber || prevSettings.addressNumber,
          addressComplement: businessData.addressComplement || prevSettings.addressComplement,
          phone: businessData.phone || prevSettings.phone,
          email: businessData.email || prevSettings.email,
          logo: businessData.logo || prevSettings.logo,
          coverImage: businessData.coverImage || prevSettings.coverImage,
          category: businessData.category || prevSettings.category,
          workingHours: businessData.workingHours || prevSettings.workingHours,
          policies: {
            ...prevSettings.policies,
            ...(businessData.policies || {}),
          },
          notifications: {
            ...prevSettings.notifications,
            ...(businessData.notifications || {}),
          },
          paymentMethods: {
            ...prevSettings.paymentMethods,
            ...(businessData.paymentMethods || {}),
          },
          defaultCommissionRate: businessData.defaultCommissionRate !== undefined
            ? businessData.defaultCommissionRate
            : prevSettings.defaultCommissionRate,
        }));
      }

      setLoading(false);
    } catch (error) {
      console.error("Erro ao carregar configuraÃ§Ãµes do negÃ³cio:", error);
      setLoading(false);
    }
  }, [businessId]); // Remover settings daqui, pois usamos prevSettings

  useEffect(() => {
    if (businessId) {
      loadBusinessSettings();
    }
  }, [businessId, loadBusinessSettings]);


  const onRefresh = React.useCallback(async () => { // Envolver com useCallback
    setRefreshing(true);
    await loadBusinessSettings();
    setRefreshing(false);
  }, [loadBusinessSettings]); // Adicionar loadBusinessSettings como dependÃªncia
  const handleSaveSettings = async () => {
    if (!businessId) { return; }

    try {
      setSaving(true);      // Validar dados
      if (!settings.name.trim()) {
        Alert.alert('Erro', 'O nome do estabelecimento Ã© obrigatÃ³rio.');
        setSaving(false);
        return;
      }

      if (!settings.category || settings.category.trim() === '') {
        Alert.alert('Erro', 'A categoria do estabelecimento Ã© obrigatÃ³ria.');
        setSaving(false);
        return;
      }

      // Preparar dados para salvar
      const dataToSave = {
        ...settings,
        updatedAt: serverTimestamp(),
      };      // GeocodificaÃ§Ã£o automÃ¡tica do endereÃ§o
      if (settings.address && settings.address.trim()) {
        try {
          // Concatenar endereÃ§o completo para geocodificaÃ§Ã£o
          let fullAddress = settings.address.trim();
          if (settings.addressNumber && settings.addressNumber.trim()) {
            fullAddress += `, ${settings.addressNumber.trim()}`;
          }
          if (settings.addressComplement && settings.addressComplement.trim()) {
            fullAddress += `, ${settings.addressComplement.trim()}`;
          }

          const coordinates = await getCoordinatesFromAddress(fullAddress, Config.GOOGLE_MAPS_API_KEY || '');

          if (coordinates) {
            dataToSave.location = {
              latitude: coordinates.latitude,
              longitude: coordinates.longitude,
            };
          } else {
            Alert.alert(
              'Aviso',
              'NÃ£o foi possÃ­vel validar o endereÃ§o. O negÃ³cio pode nÃ£o aparecer corretamente no mapa.',
              [{ text: 'OK' }],
            );
          }
        } catch (error) {
          console.error("Erro ao validar endereÃ§o:", error);
          Alert.alert(
            'Aviso',
            'Erro ao validar o endereÃ§o. O negÃ³cio pode nÃ£o aparecer corretamente no mapa.',
            [{ text: 'OK' }],
          );
        }
      }      // Atualizar configuraÃ§Ãµes no Firestore
      const businessDocRef = doc(firestore, 'businesses', businessId);
      await updateDoc(businessDocRef, dataToSave);

      setHasChanges(false);
      Alert.alert('Sucesso', 'ConfiguraÃ§Ãµes salvas com sucesso!');

      setSaving(false);
    } catch (error) {
      console.error("Erro ao salvar configuraÃ§Ãµes:", error);
      Alert.alert('Erro', 'Ocorreu um erro ao salvar as configuraÃ§Ãµes. Tente novamente.');
      setSaving(false);
    }
  };

  const updateSettings = <K extends keyof BusinessSettings>(field: K, value: BusinessSettings[K]) => {
    setSettings(prev => ({
      ...prev,
      [field]: value,
    }));
    setHasChanges(true);
  };

  const updateNestedSettings = <K extends keyof BusinessSettings, SubK extends keyof BusinessSettings[K]>(
    category: K,
    field: SubK,
    value: BusinessSettings[K][SubK],
  ) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...(prev[category] as object),
        [field]: value,
      },
    }));
    setHasChanges(true);
  };

  const updateWorkingHours = (day: string, field: 'open' | 'start' | 'end', value: string | boolean) => {
    setSettings(prev => ({
      ...prev,
      workingHours: {
        ...prev.workingHours,
        [day]: {
          ...prev.workingHours[day],
          [field]: value,
        },
      },
    }));
    setHasChanges(true);
  };
  const handleUploadLogo = async () => {
    if (!businessId) {
      Alert.alert('Erro', 'ID do negÃ³cio nÃ£o encontrado');
      return;
    }

    if (!user) {
      Alert.alert('Erro', 'UsuÃ¡rio nÃ£o autenticado. FaÃ§a login novamente.');
      return;
    }

    try {
      setIsUploadingLogo(true);


      const result = await selectAndUploadImage(
        {
          storageKey: `businesses/${businessId}/logo_${Date.now()}.jpg`,
        },
        (progress) => {
          setLogoUploadProgress(progress);
        },
      );

      // Deletar logo anterior se existir e nÃ£o for placeholder
      if (settings.logo && !settings.logo.includes('placeholder')) {
        await deleteImageFromFirebase(settings.logo);
      }

      // Atualizar configuraÃ§Ãµes com nova URL
      updateSettings('logo', result.storagePath);

      Alert.alert('Sucesso', 'Logo atualizado com sucesso!');
    } catch (error) {
      if (error instanceof Error && !error.message.includes('cancelada')) {
        console.error("Erro ao fazer upload do logo:", error);
        let errorMessage = 'NÃ£o foi possÃ­vel fazer upload do logo.';
        if (error.message.includes('nÃ£o autorizado')) {
          errorMessage = 'Erro de autorizaÃ§Ã£o. Verifique as configuraÃ§Ãµes do Firebase Storage.';
        } else if (error.message.includes('conexÃ£o')) {
          errorMessage = 'Erro de conexÃ£o. Verifique sua internet e tente novamente.';
        }
        Alert.alert('Erro', errorMessage);
      }
    } finally {
      setIsUploadingLogo(false);
      setLogoUploadProgress(null);
    }
  };
  const handleUploadCoverImage = async () => {
    if (!businessId) {
      Alert.alert('Erro', 'ID do negÃ³cio nÃ£o encontrado');
      return;
    }

    if (!user) {
      Alert.alert('Erro', 'UsuÃ¡rio nÃ£o autenticado. FaÃ§a login novamente.');
      return;
    }

    try {
      setIsUploadingCover(true);


      const result = await selectAndUploadImage(
        {
          storageKey: `businesses/${businessId}/cover_${Date.now()}.jpg`,
        },
        (progress) => {
          setCoverUploadProgress(progress);
        },
      );

      // Deletar imagem anterior se existir e nÃ£o for placeholder
      if (settings.coverImage && !settings.coverImage.includes('placeholder')) {
        await deleteImageFromFirebase(settings.coverImage);
      }

      // Atualizar configuraÃ§Ãµes com nova URL
      updateSettings('coverImage', result.storagePath);

      Alert.alert('Sucesso', 'Imagem de capa atualizada com sucesso!');
    } catch (error) {
      if (error instanceof Error && !error.message.includes('cancelada')) {
        console.error("Erro ao fazer upload da imagem de capa:", error);
        let errorMessage = 'NÃ£o foi possÃ­vel fazer upload da imagem de capa.';
        if (error.message.includes('nÃ£o autorizado')) {
          errorMessage = 'Erro de autorizaÃ§Ã£o. Verifique as configuraÃ§Ãµes do Firebase Storage.';
        } else if (error.message.includes('conexÃ£o')) {
          errorMessage = 'Erro de conexÃ£o. Verifique sua internet e tente novamente.';
        }
        Alert.alert('Erro', errorMessage);
      }
    } finally {
      setIsUploadingCover(false);
      setCoverUploadProgress(null);
    }
  };

  const handleRemoveLogo = async () => {
    Alert.alert(
      'Remover Logo',
      'Tem certeza de que deseja remover o logo atual?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              if (settings.logo && !settings.logo.includes('placeholder')) {
                await deleteImageFromFirebase(settings.logo);
              }
              updateSettings('logo', 'https://via.placeholder.com/150');
              Alert.alert('Sucesso', 'Logo removido com sucesso!');
            } catch (error) {
              console.error("Erro ao remover logo:", error);
              Alert.alert('Erro', 'NÃ£o foi possÃ­vel remover o logo.');
            }
          },
        },
      ],
    );
  };

  const handleRemoveCoverImage = async () => {
    Alert.alert(
      'Remover Imagem de Capa',
      'Tem certeza de que deseja remover a imagem de capa atual?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              if (settings.coverImage && !settings.coverImage.includes('placeholder')) {
                await deleteImageFromFirebase(settings.coverImage);
              }
              updateSettings('coverImage', 'https://via.placeholder.com/500x200');
              Alert.alert('Sucesso', 'Imagem de capa removida com sucesso!');
            } catch (error) {
              console.error("Erro ao remover imagem de capa:", error);
              Alert.alert('Erro', 'NÃ£o foi possÃ­vel remover a imagem de capa.');
            }
          },
        },
      ],
    );
  };

  const renderGeneralSettings = () => (
    <View style={styles.sectionContent}>
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Nome do Estabelecimento *</Text>
        <TextInput
          style={styles.input}
          value={settings.name}
          onChangeText={(value) => updateSettings('name', value)}
          placeholder="Nome do seu estabelecimento"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>DescriÃ§Ã£o</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={settings.description}
          onChangeText={(value) => updateSettings('description', value)}
          placeholder="Descreva seu estabelecimento"
          multiline
          numberOfLines={4} />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Rua/Avenida</Text>
        <TextInput
          style={styles.input}
          value={settings.address}
          onChangeText={(value) => updateSettings('address', value)}
          placeholder="Nome da rua, avenida, etc."
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>NÃºmero</Text>
        <TextInput
          style={styles.input}
          value={settings.addressNumber}
          onChangeText={(value) => updateSettings('addressNumber', value)}
          placeholder="123"
          keyboardType="numeric"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Complemento (opcional)</Text>
        <TextInput
          style={styles.input}
          value={settings.addressComplement || ''}
          onChangeText={(value) => updateSettings('addressComplement', value)}
          placeholder="Apto, sala, andar, etc."
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Telefone</Text>
        <TextInput
          style={styles.input}
          value={settings.phone}
          onChangeText={(value) => updateSettings('phone', value)}
          placeholder="(00) 00000-0000"
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>E-mail</Text>
        <TextInput
          style={styles.input}
          value={settings.email}
          onChangeText={(value) => updateSettings('email', value)}
          placeholder="email@exemplo.com"
          keyboardType="email-address" />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Logo do NegÃ³cio</Text>

        {settings.logo && (
          <View style={styles.imagePreviewContainer}>
            <StorageImage
              storagePath={settings.logo}
              style={styles.logoPreview}
            />
          </View>
        )}

        <View style={styles.imageButtonsContainer}>
          <TouchableOpacity
            style={[styles.imageButton, styles.uploadButton]}
            onPress={handleUploadLogo}
            disabled={isUploadingLogo}
          >
            {isUploadingLogo ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.imageButtonText}>
                {settings.logo.includes('placeholder') ? 'Adicionar Logo' : 'Alterar Logo'}
              </Text>
            )}
          </TouchableOpacity>

          {!settings.logo.includes('placeholder') && (
            <TouchableOpacity
              style={[styles.imageButton, styles.removeButton]}
              onPress={handleRemoveLogo}
              disabled={isUploadingLogo}
            >
              <Text style={styles.imageButtonText}>Remover</Text>
            </TouchableOpacity>
          )}
        </View>

        {logoUploadProgress !== null && logoUploadProgress < 100 && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${logoUploadProgress}%` }]} />
            <Text style={styles.progressText}>{Math.round(logoUploadProgress)}%</Text>
          </View>)}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Imagem de Capa do NegÃ³cio</Text>

        {settings.coverImage && (
          <View style={styles.imagePreviewContainer}>
            <StorageImage
              storagePath={settings.coverImage}
              style={styles.coverPreview}
            />
          </View>
        )}

        <View style={styles.imageButtonsContainer}>
          <TouchableOpacity
            style={[styles.imageButton, styles.uploadButton]}
            onPress={handleUploadCoverImage}
            disabled={isUploadingCover}
          >
            {isUploadingCover ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.imageButtonText}>
                {settings.coverImage.includes('placeholder') ? 'Adicionar Imagem' : 'Alterar Imagem'}
              </Text>
            )}
          </TouchableOpacity>

          {!settings.coverImage.includes('placeholder') && (
            <TouchableOpacity
              style={[styles.imageButton, styles.removeButton]}
              onPress={handleRemoveCoverImage}
              disabled={isUploadingCover}
            >
              <Text style={styles.imageButtonText}>Remover</Text>
            </TouchableOpacity>
          )}
        </View>

        {coverUploadProgress !== null && coverUploadProgress < 100 && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${coverUploadProgress}%` }]} />
            <Text style={styles.progressText}>{Math.round(coverUploadProgress)}%</Text>
          </View>)}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Categoria *</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={settings.category}
            onValueChange={(value: string) => updateSettings('category', value)}
            style={styles.picker}
          >
            <Picker.Item label="Selecione uma categoria..." value="" />
            {BUSINESS_CATEGORIES.map((cat) => (
              <Picker.Item key={cat.id} label={cat.name} value={cat.id} />
            ))}
          </Picker>
        </View>
        <Text style={styles.inputHelper}>Escolha uma categoria que melhor descreve seu negÃ³cio</Text>
      </View>
    </View>
  );

  const renderWorkingHoursSettings = () => {
    const days = [
      { key: 'monday', label: 'Segunda-feira' },
      { key: 'tuesday', label: 'TerÃ§a-feira' },
      { key: 'wednesday', label: 'Quarta-feira' },
      { key: 'thursday', label: 'Quinta-feira' },
      { key: 'friday', label: 'Sexta-feira' },
      { key: 'saturday', label: 'SÃ¡bado' },
      { key: 'sunday', label: 'Domingo' },
    ];

    return (
      <View style={styles.sectionContent}>
        {days.map((day) => (
          <View key={day.key} style={styles.dayContainer}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayLabel}>{day.label}</Text>
              <Switch
                value={settings.workingHours[day.key].open}
                onValueChange={(value) => updateWorkingHours(day.key, 'open', value)}
                trackColor={{ false: colors.lightGray, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>

            {settings.workingHours[day.key].open && (
              <View style={styles.timeContainer}>
                <View style={styles.timeInputContainer}>
                  <Text style={styles.timeLabel}>Abertura</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={settings.workingHours[day.key].start}
                    onChangeText={(value) => updateWorkingHours(day.key, 'start', value)}
                    placeholder="09:00"
                  />
                </View>
                <Text style={styles.timeSeparator}>atÃ©</Text>
                <View style={styles.timeInputContainer}>
                  <Text style={styles.timeLabel}>Fechamento</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={settings.workingHours[day.key].end}
                    onChangeText={(value) => updateWorkingHours(day.key, 'end', value)}
                    placeholder="18:00"
                  />
                </View>
              </View>
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderPoliciesSettings = () => (
    <View style={styles.sectionContent}>
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Limite de Tempo para Cancelamento (horas)</Text>
        <TextInput
          style={styles.input}
          value={settings.policies.cancellationTimeLimit.toString()}
          onChangeText={(value) => {
            const numValue = parseInt(value, 10) || 0;
            updateNestedSettings('policies', 'cancellationTimeLimit', numValue);
          }}
          placeholder="24"
          keyboardType="numeric"
        />
        <Text style={styles.inputHelper}>
          Tempo mÃ­nimo antes do agendamento para cancelamento sem taxa
        </Text>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Taxa de Cancelamento (%)</Text>
        <TextInput
          style={styles.input}
          value={(settings.policies.cancellationFee * 100).toString()}
          onChangeText={(value) => {
            const numValue = parseFloat(value) || 0;
            updateNestedSettings('policies', 'cancellationFee', numValue / 100);
          }}
          placeholder="50"
          keyboardType="numeric"
        />
        <Text style={styles.inputHelper}>
          Percentual cobrado por cancelamentos fora do prazo
        </Text>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Taxa de NÃ£o Comparecimento (%)</Text>
        <TextInput
          style={styles.input}
          value={(settings.policies.noShowFee * 100).toString()}
          onChangeText={(value) => {
            const numValue = parseFloat(value) || 0;
            updateNestedSettings('policies', 'noShowFee', numValue / 100);
          }}
          placeholder="100"
          keyboardType="numeric"
        />
        <Text style={styles.inputHelper}>
          Percentual cobrado quando o cliente nÃ£o comparece
        </Text>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Limite de Agendamento Antecipado (dias)</Text>
        <TextInput
          style={styles.input}
          value={settings.policies.advanceBookingLimit.toString()}
          onChangeText={(value) => {
            const numValue = parseInt(value, 10) || 0;
            updateNestedSettings('policies', 'advanceBookingLimit', numValue);
          }}
          placeholder="30"
          keyboardType="numeric"
        />
        <Text style={styles.inputHelper}>
          Quantos dias no futuro os clientes podem agendar
        </Text>
      </View>
    </View>
  );

  const renderNotificationsSettings = () => (
    <View style={styles.sectionContent}>
      <View style={styles.switchContainer}>
        <Text style={styles.switchLabel}>ConfirmaÃ§Ã£o de Agendamento</Text>
        <Switch
          value={settings.notifications.confirmationEnabled}
          onValueChange={(value) => updateNestedSettings('notifications', 'confirmationEnabled', value)}
          trackColor={{ false: colors.lightGray, true: colors.primary }}
          thumbColor={colors.white}
        />
      </View>
      <Text style={styles.switchHelper}>
        Enviar notificaÃ§Ã£o ao cliente quando um agendamento for confirmado
      </Text>

      <View style={styles.switchContainer}>
        <Text style={styles.switchLabel}>Lembrete de Agendamento</Text>
        <Switch
          value={settings.notifications.reminderEnabled}
          onValueChange={(value) => updateNestedSettings('notifications', 'reminderEnabled', value)}
          trackColor={{ false: colors.lightGray, true: colors.primary }}
          thumbColor={colors.white}
        />
      </View>

      {settings.notifications.reminderEnabled && (
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Tempo do Lembrete (horas antes)</Text>
          <TextInput
            style={styles.input}
            value={settings.notifications.reminderTime.toString()}
            onChangeText={(value) => {
              const numValue = parseInt(value, 10) || 0;
              updateNestedSettings('notifications', 'reminderTime', numValue);
            }}
            placeholder="24"
            keyboardType="numeric"
          />
        </View>
      )}
    </View>
  );

  const renderPaymentSettings = () => (
    <View style={styles.sectionContent}>
      <View style={styles.switchContainer}>
        <Text style={styles.switchLabel}>Dinheiro</Text>
        <Switch
          value={settings.paymentMethods.cash}
          onValueChange={(value) => updateNestedSettings('paymentMethods', 'cash', value)}
          trackColor={{ false: colors.lightGray, true: colors.primary }}
          thumbColor={colors.white}
        />
      </View>

      <View style={styles.switchContainer}>
        <Text style={styles.switchLabel}>CartÃ£o de CrÃ©dito</Text>
        <Switch
          value={settings.paymentMethods.creditCard}
          onValueChange={(value) => updateNestedSettings('paymentMethods', 'creditCard', value)}
          trackColor={{ false: colors.lightGray, true: colors.primary }}
          thumbColor={colors.white}
        />
      </View>

      <View style={styles.switchContainer}>
        <Text style={styles.switchLabel}>CartÃ£o de DÃ©bito</Text>
        <Switch
          value={settings.paymentMethods.debitCard}
          onValueChange={(value) => updateNestedSettings('paymentMethods', 'debitCard', value)}
          trackColor={{ false: colors.lightGray, true: colors.primary }}
          thumbColor={colors.white}
        />
      </View>

      <View style={styles.switchContainer}>
        <Text style={styles.switchLabel}>PIX</Text>
        <Switch
          value={settings.paymentMethods.pix}
          onValueChange={(value) => updateNestedSettings('paymentMethods', 'pix', value)}
          trackColor={{ false: colors.lightGray, true: colors.primary }}
          thumbColor={colors.white}
        />
      </View>

      <View style={styles.switchContainer}>
        <Text style={styles.switchLabel}>TransferÃªncia BancÃ¡ria</Text>
        <Switch
          value={settings.paymentMethods.transfer}
          onValueChange={(value) => updateNestedSettings('paymentMethods', 'transfer', value)}
          trackColor={{ false: colors.lightGray, true: colors.primary }}
          thumbColor={colors.white}
        />
      </View>

      <View style={styles.switchContainer}>
        <Text style={styles.switchLabel}>Pagamento no App</Text>
        <Switch
          value={settings.paymentMethods.inApp}
          onValueChange={(value) => updateNestedSettings('paymentMethods', 'inApp', value)}
          trackColor={{ false: colors.lightGray, true: colors.primary }}
          thumbColor={colors.white}
        />
      </View>

      <View style={styles.divider} />

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Taxa de ComissÃ£o PadrÃ£o (%)</Text>
        <TextInput
          style={styles.input}
          value={(settings.defaultCommissionRate * 100).toString()}
          onChangeText={(value) => {
            const numValue = parseFloat(value) || 0;
            updateSettings('defaultCommissionRate', numValue / 100);
          }}
          placeholder="50"
          keyboardType="numeric"
        />
        <Text style={styles.inputHelper}>
          Percentual padrÃ£o de comissÃ£o para profissionais
        </Text>
      </View>
    </View>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'general':
        return renderGeneralSettings();
      case 'workingHours':
        return renderWorkingHoursSettings();
      case 'policies':
        return renderPoliciesSettings();
      case 'notifications':
        return renderNotificationsSettings();
      case 'payment':
        return renderPaymentSettings();
      default:
        return renderGeneralSettings();
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Carregando configuraÃ§Ãµes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ConfiguraÃ§Ãµes do Estabelecimento</Text>
      </View>

      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScrollContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeSection === 'general' && styles.activeTabButton]}
            onPress={() => setActiveSection('general')}
          >
            <Text style={[styles.tabText, activeSection === 'general' && styles.activeTabText]}>
              Geral
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeSection === 'workingHours' && styles.activeTabButton]}
            onPress={() => setActiveSection('workingHours')}
          >
            <Text style={[styles.tabText, activeSection === 'workingHours' && styles.activeTabText]}>
              HorÃ¡rios
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeSection === 'policies' && styles.activeTabButton]}
            onPress={() => setActiveSection('policies')}
          >
            <Text style={[styles.tabText, activeSection === 'policies' && styles.activeTabText]}>
              PolÃ­ticas
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeSection === 'notifications' && styles.activeTabButton]}
            onPress={() => setActiveSection('notifications')}
          >
            <Text style={[styles.tabText, activeSection === 'notifications' && styles.activeTabText]}>
              NotificaÃ§Ãµes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeSection === 'payment' && styles.activeTabButton]}
            onPress={() => setActiveSection('payment')}
          >
            <Text style={[styles.tabText, activeSection === 'payment' && styles.activeTabText]}>
              Pagamento
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderContent()}

        {/* BotÃ£o de Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
          <Text style={styles.logoutButtonText}>Sair da Conta</Text>
        </TouchableOpacity>
      </ScrollView>

      {hasChanges && !saving && ( // Mostrar botÃ£o Salvar apenas se houver mudanÃ§as e nÃ£o estiver salvando
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSaveSettings}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>Salvar AlteraÃ§Ãµes</Text>
          </TouchableOpacity>
        </View>
      )}
      {saving && ( // Indicador de salvamento no footer
        <View style={styles.footer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
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
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.text,
  },
  header: {
    padding: 20,
    backgroundColor: colors.primary,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.white,
    textAlign: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  tabsScrollContainer: {
    paddingHorizontal: 10,
  },
  tabButton: {
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  activeTabButton: {
    borderBottomWidth: 3,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 16,
    color: colors.lightText,
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  sectionContent: {
    // This style is a container for different sections, so it might not need specific styles
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 5,
  },
  input: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.lightGray,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  inputHelper: {
    fontSize: 12,
    color: colors.lightText,
    marginTop: 5,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: colors.lightGray,
    borderRadius: 8,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    color: colors.text,
  },
  imagePreviewContainer: {
    marginBottom: 15,
    alignItems: 'center',
  },
  logoPreview: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginTop: 10,
  },
  coverPreview: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginTop: 10,
  },
  imageButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  imageButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  uploadButton: {
    backgroundColor: colors.primary,
  },
  removeButton: {
    backgroundColor: colors.error,
  },
  imageButtonText: {
    color: colors.white,
    fontWeight: 'bold',
  },
  progressContainer: {
    height: 10,
    backgroundColor: colors.lightGray,
    borderRadius: 5,
    marginTop: 10,
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 5,
  },
  progressText: {
    textAlign: 'center',
    marginTop: 5,
    color: colors.text,
  },
  dayContainer: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayLabel: {
    fontSize: 16,
    color: colors.text,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  timeInputContainer: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    color: colors.lightText,
    marginBottom: 5,
  },
  timeInput: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.lightGray,
    textAlign: 'center',
  },
  timeSeparator: {
    fontSize: 16,
    color: colors.text,
    marginHorizontal: 10,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  switchLabel: {
    fontSize: 16,
    color: colors.text,
  },
  switchHelper: {
    fontSize: 12,
    color: colors.lightText,
    marginTop: -5,
    marginBottom: 10,
  },
  divider: {
    height: 1,
    backgroundColor: colors.lightGray,
    marginVertical: 20,
  },
  footer: {
    padding: 20,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.lightGray,
  },
  saveButton: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
    margin: 20,
    padding: 15,
    borderRadius: 8,
    backgroundColor: colors.error,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default BusinessSettingsScreen;
