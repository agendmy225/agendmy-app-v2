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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AppStackParamList } from '../../types/types';
import { useAuth } from './context/AuthContext';

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
        if (savedUserType === userType) {
          setEmail(savedEmail);
          setPassword(savedPassword);
          setRememberMe(true);
        } else {
          setEmail(savedEmail || '');
          setPassword(savedPassword || '');
          setRememberMe(true);
          await AsyncStorage.setItem('savedUserType', userType);
        }
      }
    } catch (error) {
      console.log('Erro ao carregar credenciais salvas:', error);
    }
  }, [userType]);

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
      await saveCredentials();
    } catch (error) {
      const err = error as Error;
      Alert.alert('Erro no Login', err.message || 'NÃ£o foi possÃ­vel fazer login. Verifique suas credenciais.');
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
    <View style={styles.backgroundContainer}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.headerContainer}>
            <Text style={styles.logoText}>
              Agend<Text style={styles.logoAccent}>My</Text>
            </Text>
            <Text style={styles.clientTypeText}>
              {userType === 'client' ? 'CLIENTE' : 'PROPRIETÃRIO'}
            </Text>
            <Text style={styles.welcomeText}>BEM-VINDO!</Text>
            {rememberMe && email && password ? (
              <Text style={styles.savedCredentialsText}>Credenciais salvas! Clique em ENTRAR para acessar.</Text>
            ) : (
              <Text style={styles.loginText}>JÃ¡ estÃ¡ cadastrado? FaÃ§a o login aqui.</Text>
            )}
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>E-MAIL</Text>
              <TextInput
                style={styles.input}
                placeholder="Digite seu e-mail"
                placeholderTextColor="#999"
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
                  placeholder="Digite sua senha"
                  placeholderTextColor="#999"
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
                  {rememberMe && <Text style={styles.checkmark}>âœ“</Text>}
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
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>ENTRAR</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
              <Text style={styles.registerButtonText}>Cadastrar agora!</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.forgotPasswordButton} onPress={handleForgotPassword}>
              <Text style={styles.forgotPasswordText}>Esqueci minha senha</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>AGENDMY</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  backgroundContainer: {
    flex: 1,
    backgroundColor: '#5a0025',
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
  logoText: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 2,
    marginBottom: 10,
  },
  logoAccent: {
    color: '#ff6680',
  },
  clientTypeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 6,
    letterSpacing: 3,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 10,
    letterSpacing: 2,
  },
  loginText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  savedCredentialsText: {
    fontSize: 14,
    color: '#ffcccc',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  formContainer: {
    width: '100%',
    marginTop: 40,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 6,
    letterSpacing: 1,
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    height: 50,
    paddingHorizontal: 15,
    color: '#333',
    fontSize: 16,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    height: 50,
    paddingHorizontal: 15,
  },
  passwordInput: {
    flex: 1,
    color: '#333',
    fontSize: 16,
  },
  showPasswordText: {
    color: '#d31027',
    fontSize: 12,
    fontWeight: 'bold',
  },
  loginButton: {
    backgroundColor: '#d31027',
    borderRadius: 25,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    elevation: 4,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  registerButton: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  registerButtonText: {
    color: 'rgba(255,255,255,0.9)',
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
    borderColor: '#ffffff',
    borderRadius: 3,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    backgroundColor: '#d31027',
    borderColor: '#d31027',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  rememberMeText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
  },
  forgotPasswordButton: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 5,
  },
  forgotPasswordText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  footer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  footerText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 4,
  },
});

export default LoginScreen;
