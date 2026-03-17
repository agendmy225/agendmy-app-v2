import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Alert,
  ActivityIndicator,
  ImageBackground,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth, UserType } from './context/AuthContext';
import { colors } from '../../constants/colors';

import { AppStackParamList } from '../../types/types'; // <-- Adjust the path as needed
import { validatePassword, getPasswordStrengthColor, getPasswordStrengthText } from '../../utils/passwordValidation';

// Importa a imagem de fundo
const backgroundImage = require('../../assets/images/fundo.png');

type RegisterScreenNavigationProp = StackNavigationProp<AppStackParamList, 'Register'>;
type RegisterScreenRouteProp = RouteProp<AppStackParamList, 'Register'>;


const RegisterScreen: React.FC = () => {
  const navigation = useNavigation<RegisterScreenNavigationProp>();
  const route = useRoute<RegisterScreenRouteProp>();
  const { userType } = route.params || { userType: 'client' as UserType };

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [establishmentName, setEstablishmentName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState(validatePassword(''));

  const { signUp } = useAuth();

  // Validar senha em tempo real
  useEffect(() => {
    setPasswordValidation(validatePassword(password));
  }, [password]);

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (!passwordValidation.isValid) {
      Alert.alert('Senha Inválida', passwordValidation.errors.join('\n'));
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Erro', 'As senhas não coincidem.');
      return;
    }

    if (userType === 'owner' && !establishmentName) {
      Alert.alert('Erro', 'Por favor, informe o nome do estabelecimento.');
      return;
    }

    setIsLoading(true);
    try {
      await signUp(name, email, password, userType as 'client' | 'owner', establishmentName);
      // A navegação será tratada pelo AuthContext
    } catch (error) {
      const err = error as Error;
      Alert.alert('Erro no Cadastro', err.message || 'Não foi possível criar a conta.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = () => {
    navigation.navigate('Login', { userType });
  };

  return (
    <ImageBackground source={backgroundImage} style={styles.backgroundContainer} resizeMode="cover">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.headerContainer}>
            <Text style={styles.clientTypeText}>{userType === 'client' ? 'CLIENTE' : 'PROPRIETÁRIO'}</Text>
            <Text style={styles.welcomeText}>BEM-VINDO!</Text>
            <Text style={styles.registerText}>Cadastre-se agora!</Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>NOME COMPLETO</Text>
              <TextInput
                style={styles.input}
                placeholder="Digite seu nome completo"
                placeholderTextColor={colors.placeholderText}
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>E-MAIL</Text>
              <TextInput
                style={styles.input}
                placeholder="Digite seu e-mail"
                placeholderTextColor={colors.placeholderText}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            {userType === 'owner' && (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>NOME DO ESTABELECIMENTO</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Digite o nome do seu estabelecimento"
                  placeholderTextColor={colors.placeholderText}
                  value={establishmentName}
                  onChangeText={setEstablishmentName}
                />
              </View>
            )}

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>SENHA</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Crie uma senha"
                  placeholderTextColor={colors.placeholderText}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Text style={styles.showPasswordText}>{showPassword ? 'OCULTAR' : 'MOSTRAR'}</Text>
                </TouchableOpacity>
              </View>
              {password.length > 0 && (
                <View style={styles.passwordStrengthContainer}>
                  <View style={styles.passwordStrengthBar}>
                    <View
                      style={[
                        styles.passwordStrengthFill,
                        passwordValidation.strength === 'weak'
                          ? styles.passwordStrengthFillWeak
                          : passwordValidation.strength === 'medium'
                            ? styles.passwordStrengthFillMedium
                            : styles.passwordStrengthFillStrong,
                      ]}
                    />
                  </View>
                  <Text
                    style={[
                      styles.passwordStrengthText,
                      passwordValidation.strength === 'weak'
                        ? styles.passwordStrengthTextWeak
                        : passwordValidation.strength === 'medium'
                          ? styles.passwordStrengthTextMedium
                          : styles.passwordStrengthTextStrong,
                    ]}
                  >
                    Senha {getPasswordStrengthText(passwordValidation.strength)}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>CONFIRMAR SENHA</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Confirme sua senha"
                  placeholderTextColor={colors.placeholderText}
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  <Text style={styles.showPasswordText}>{showConfirmPassword ? 'OCULTAR' : 'MOSTRAR'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={styles.registerButton}
              onPress={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.registerButtonText}>CADASTRAR</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
            >
              <Text style={styles.loginButtonText}>Já está cadastrado? Faça login aqui.</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>AGENDMY</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  headerContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  clientTypeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.offWhite,
    marginBottom: 10,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.offWhite,
    marginBottom: 10,
  },
  registerText: {
    fontSize: 14,
    color: colors.offWhite,
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
    marginTop: 30,
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.offWhite,
    marginBottom: 5,
  },
  input: {
    backgroundColor: colors.white,
    borderRadius: 8,
    height: 50,
    paddingHorizontal: 15,
    color: colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.lightGray,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 8,
    height: 50,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: colors.lightGray,
  },
  passwordInput: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
  },
  showPasswordText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  passwordStrengthContainer: {
    marginTop: 8,
  },
  passwordStrengthBar: {
    height: 8, // Aumenta a altura da barra
    backgroundColor: colors.lightGray, // Cor de fundo da barra
    borderRadius: 4,
    overflow: 'hidden', // Garante que o preenchimento não ultrapasse as bordas
    flex: 1, // Permite que a barra ocupe o espaço disponível
    marginRight: 10, // Adiciona um espaçamento à direita
  },
  passwordStrengthFill: {
    height: '100%',
    borderRadius: 4, // Adiciona bordas arredondadas ao preenchimento
  },
  passwordStrengthFillWeak: {
    width: '33%',
    backgroundColor: getPasswordStrengthColor('weak'),
  },
  passwordStrengthFillMedium: {
    width: '66%',
    backgroundColor: getPasswordStrengthColor('medium'),
  },
  passwordStrengthFillStrong: {
    width: '100%',
    backgroundColor: getPasswordStrengthColor('strong'),
  },
  passwordStrengthText: {
    fontSize: 12,
    fontWeight: '500',
  },
  passwordStrengthTextWeak: {
    color: getPasswordStrengthColor('weak'),
  },
  passwordStrengthTextMedium: {
    color: getPasswordStrengthColor('medium'),
  },
  passwordStrengthTextStrong: {
    color: getPasswordStrengthColor('strong'),
  },
  registerButton: {
    backgroundColor: colors.error,
    borderRadius: 5,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  registerButtonText: {
    color: colors.offWhite,
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginButton: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  loginButtonText: {
    color: colors.offWhite,
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  footer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  footerText: {
    color: colors.offWhite,
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default RegisterScreen;
