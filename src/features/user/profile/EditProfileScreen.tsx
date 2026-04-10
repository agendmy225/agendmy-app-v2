import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useEffect, useState } from 'react';
import {
  Alert, Image, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { colors } from '../../../constants/colors';
import { useAuth } from '../../auth/context/AuthContext';
import { AppStackParamList } from '../../../types/types';

interface ProfileUpdateData {
  displayName: string;
  email: string;
  photoURL?: string;
}

type EditProfileScreenNavigationProp = StackNavigationProp<
  AppStackParamList,
  'EditProfile'
>;

const EditProfileScreen: React.FC = () => {
  const { user, updateUserProfile, reauthenticate, updateUserPassword } = useAuth();
  const navigation = useNavigation<EditProfileScreenNavigationProp>();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [profileImageUri, setProfileImageUri] = useState<string | null>(user?.photoURL || null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null); // Imagem selecionada localmente
  // Efeito para atualizar a imagem de perfil quando o usuÃƒÆ’Ã‚Â¡rio for atualizado no contexto
  useEffect(() => {
    if (user?.photoURL && !selectedImageUri) {
      setProfileImageUri(user.photoURL);
    }
  }, [user?.photoURL, selectedImageUri]);

  const handleSelectProfileImage = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.7,
      selectionLimit: 1,
    });

    if (!result.didCancel && result.assets && result.assets.length > 0 && result.assets[0].uri) {
      // Atualiza imediatamente a interface com a nova foto selecionada
      const newUri = result.assets[0].uri;
      setSelectedImageUri(newUri); // Nova imagem selecionada
      setProfileImageUri(newUri); // Atualiza tambÃƒÆ’Ã‚Â©m a URI principal para exibiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o
      setIsProfileModalVisible(false);
    }
  };
  const handleSaveChanges = async () => {
    setIsUploading(true);
    try {
      const profileData: ProfileUpdateData = {
        displayName,
        email,
      };

      if (profileImageUri && profileImageUri !== user?.photoURL) {
        profileData.photoURL = profileImageUri;
      }

      // Atualizar nome, email e foto
      await updateUserProfile(profileData);

      // Atualizar senha, se fornecida e a atual estiver correta
      if (password && currentPassword) {
        await reauthenticate(currentPassword);
        await updateUserPassword(password);
      } else if (password && !currentPassword) {
        Alert.alert('Erro', 'Por favor, insira sua senha atual para definir uma nova.');
        setIsUploading(false);
        return;
      }
      Alert.alert('Sucesso', 'Perfil atualizado com sucesso!');
      // Limpa a imagem selecionada apÃƒÆ’Ã‚Â³s salvar com sucesso
      setSelectedImageUri(null);
      navigation.goBack();
    } catch (error: unknown) {
      Alert.alert('Erro ao atualizar perfil', error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setIsUploading(false);
    }
  };

  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);

  // FunÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o para criar source da imagem
  const getProfileImageSource = () => {
    // Prioriza a imagem selecionada, depois a do perfil, depois a padrÃƒÆ’Ã‚Â£o
    const imageUri = selectedImageUri || profileImageUri;
    if (imageUri) {
      return { uri: imageUri };
    }
    return require('../../../assets/images/logo.png');
  };

  const profileImageSource = getProfileImageSource();
  return (<View style={styles.container}>
    <Text style={styles.title}>Editar Perfil</Text>

    {/* Modal para editar foto de perfil */}
    {isProfileModalVisible && (
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.sectionTitle}>Alterar foto de perfil</Text>
          <Text style={styles.modalSubtitle}>A nova foto aparecerÃƒÆ’Ã‚Â¡ imediatamente. Lembre-se de salvar para confirmar as alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes.</Text>
          <TouchableOpacity style={styles.selectPhotoButton} onPress={handleSelectProfileImage}>
            <Text style={styles.saveButtonText}>Escolher foto da galeria</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.selectPhotoButton, { backgroundColor: colors.error }]} onPress={() => setIsProfileModalVisible(false)}>
            <Text style={styles.saveButtonText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    )}

    <TouchableOpacity onPress={() => setIsProfileModalVisible(true)} style={styles.profileImageContainer}>
      <Image
        key={`profile-image-${selectedImageUri || profileImageUri}`} // ForÃƒÆ’Ã‚Â§a re-render quando uma nova imagem ÃƒÆ’Ã‚Â© selecionada
        source={profileImageSource}
        style={styles.profileImage}
        resizeMode="cover" // Garante que a imagem seja redimensionada corretamente
      />
      <Text style={styles.editPhotoText}>Editar foto</Text>
    </TouchableOpacity>

    <TextInput
      style={styles.input}
      placeholder="Nome"
      value={displayName}
      onChangeText={setDisplayName}
    />

    <TextInput
      style={styles.input}
      placeholder="E-mail"
      value={email}
      onChangeText={setEmail}
      keyboardType="email-address"
      autoCapitalize="none"
    />

    <Text style={styles.sectionTitle}>Alterar Senha</Text>

    <TextInput
      style={styles.input}
      placeholder="Senha Atual (se for alterar a senha)"
      secureTextEntry
      value={currentPassword}
      onChangeText={setCurrentPassword}
    />

    <TextInput
      style={styles.input}
      placeholder="Nova Senha"
      secureTextEntry
      value={password}
      onChangeText={setPassword}
    />

    <TextInput
      style={styles.input}
      placeholder="Confirmar Nova Senha"
      secureTextEntry
      value={confirmPassword}
      onChangeText={setConfirmPassword}
    />

    <TouchableOpacity style={styles.saveButton} onPress={handleSaveChanges} disabled={isUploading}>
      {isUploading ? (
        <Text style={styles.saveButtonText}>Salvando...</Text>
      ) : (
        <Text style={styles.saveButtonText}>Salvar AlteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes</Text>
      )}
    </TouchableOpacity>
  </View>
  );
};

const styles = StyleSheet.create({
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.lightGray,
  },
  editPhotoText: {
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  profileImageContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  modalContent: {
    backgroundColor: colors.white,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    width: 300,
  },
  selectPhotoButton: {
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
    alignItems: 'center',
    width: 200,
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 20,
  },
  input: {
    backgroundColor: colors.white,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 5,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: colors.lightGray,
    color: colors.text,
  },
  saveButton: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  saveButtonText: {
    color: colors.white,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 10,
    marginBottom: 10,
  },
  modalSubtitle: {
    color: colors.text,
    textAlign: 'center',
    marginBottom: 15,
    paddingHorizontal: 10,
  },
});

export default EditProfileScreen;
