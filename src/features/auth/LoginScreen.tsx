import React, { useState, useEffect, useCallback } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AppStackParamList } from '../../types/types';
import { useAuth } from './context/AuthContext';
import { colors } from '../../constants/colors';
const backgroundImage = require('../../assets/images/fundo.png');

type LoginScreenNavigationProp = StackNavigationProp<AppStackParamList, 'Login'>;
type LoginScreenRouteProp = RouteProp<AppStackParamList, 'Login'>;


const LoginScreen: React.FC = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const route = useRoute<LoginScreenRouteProp>();
  const { userType } = route.params || { userType: 'client' };

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const { signIn } = useAuth();


  const loadSavedCredentials = useCallback(async () => {
    try {
      const savedEmail = await AsyncStorage.getItem('savedEmail');
      const savedPassword = await AsyncStorage.getItem('savedPassword');
      const savedUserType = await AsyncStorage.getItem('savedUserType');
      const shouldRemember = await AsyncStorage.getItem('rememberMe');

      if (shouldRemember === 'true' && savedEmail && savedPassword) {
        // Verificar se o tipo de usuário salvo corresponde ao tipo atual
        if (savedUserType === userType) {
          setEmail(savedEmail);
          setPassword(savedPassword);
          setRememberMe(true);

          // REMOVER AUTO-LOGIN AUTOMÁTICO - apenas pré-preencher campos
          // O usuário pode clicar em "ENTRAR" quando quiser fazer login

        } else {
          // Tipos diferentes - manter credenciais mas limpar apenas o tipo incompatível
          // Permite que o usuário use as credenciais salvas com o tipo correto
          setEmail(savedEmail || '');
          setPassword(savedPassword || '');
          setRememberMe(true);
          // Atualizar o tipo de usuário salvo para o atual
          await AsyncStorage.setItem('savedUserType', userType);
        }
      }
    } catch (error) {
      console.log('Erro ao carregar credenciais salvas:', error);
    }
  }, [userType]);

  // Carregar dados salvos ao inicializar a tela
  useEffect(() => {
    loadSavedCredentials();
  }, [loadSavedCredentials]);

  const saveCredentials = useCallback(async () => {
    try {
      if (rememberMe && email && password) {
        await AsyncStorage.setItem('savedEmail', email);
        await AsyncStorage.setItem('savedPassword', password);
        await AsyncStorage.setItem('savedUserType', userType);
        await AsyncStorage.setItem('rememberMe', 'true');
      } else {
        await AsyncStorage.removeItem('savedEmail');
        await AsyncStorage.removeItem('savedPassword');
        await AsyncStorage.removeItem('savedUserType');
        await AsyncStorage.removeItem('rememberMe');
      }
    } catch (error) {
      console.log('Erro ao salvar credenciais:', error);
    }
  }, [rememberMe, email, password, userType]);

  // Salvar credenciais sempre que o rememberMe, email ou password mudarem
  useEffect(() => {
    if (email && password) {
      saveCredentials();
    }
  }, [rememberMe, email, password, saveCredentials]);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erro', 'Por favor, preencha e-mail e senha.');
      return;
    }

    setIsLoading(true);
    try {
      await signIn(email, password, userType);
      // Salvar credenciais após o login bem-sucedido também
      await saveCredentials();
      // A navegação será tratada pelo AuthContext
    } catch (error) {
      const err = error as Error;
      Alert.alert('Erro no Login', err.message || 'Não foi possível fazer login. Verifique suas credenciais.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = () => {
    navigation.navigate('Register', { userType });
  };

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
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
            {rememberMe && email && password ? (
              <Text style={styles.savedCredentialsText}>Credenciais salvas! Clique em ENTRAR para acessar.</Text>
            ) : (
              <Text style={styles.loginText}>Já está cadastrado? Faça o login aqui.</Text>
            )}
          </View>

          <View style={styles.formContainer}>
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

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>SENHA</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="SENHA"
                  placeholderTextColor={colors.placeholderText}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Text style={styles.showPasswordText}>{showPassword ? 'OCULTAR' : 'MOSTRAR'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.rememberMeContainer}>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setRememberMe(!rememberMe)}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.rememberMeText}>Lembrar-me</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.loginButtonText}>ENTRAR</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.registerButton}
              onPress={handleRegister}
            >
              <Text style={styles.registerButtonText}>Cadastrar agora!</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.forgotPasswordButton}
              onPress={handleForgotPassword}
            >
              <Text style={styles.forgotPasswordText}>Esqueci minha senha</Text>
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
    marginTop: 60,
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
  loginText: {
    fontSize: 14,
    color: colors.offWhite,
    textAlign: 'center',
  },
  savedCredentialsText: {
    fontSize: 14,
    color: colors.primary,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  autoLoginText: {
    fontSize: 14,
    color: colors.primary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  formContainer: {
    width: '100%',
    marginTop: 40,
  },
  inputContainer: {
    marginBottom: 20,
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
  loginButton: {
    backgroundColor: colors.error,
    borderRadius: 5,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  loginButtonText: {
    color: colors.offWhite,
    fontSize: 16,
    fontWeight: 'bold',
  },
  registerButton: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  registerButtonText: {
    color: colors.offWhite,
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  rememberMeContainer: {
    marginBottom: 10,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 3,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
  },
  checkmark: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  rememberMeText: {
    color: colors.offWhite,
    fontSize: 14,
  },
  forgotPasswordButton: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 5,
  },
  forgotPasswordText: {
    color: colors.offWhite,
    fontSize: 14,
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

export default LoginScreen;
