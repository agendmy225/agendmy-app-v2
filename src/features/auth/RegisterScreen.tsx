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
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth, UserType } from './context/AuthContext';
import { AppStackParamList } from '../../types/types';
import { validatePassword, getPasswordStrengthColor, getPasswordStrengthText } from '../../utils/passwordValidation';

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
    } catch (error) {
      const err = error as Error;
      Alert.alert('Erro no Cadastro', err.message || 'Não foi possível criar a conta.');
    } finally {
      setIsLoading(false);
    }
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
            <Text style={styles.welcomeText}>CADASTRO</Text>
            <Text style={styles.registerText}>Cadastre-se agora!</Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>NOME COMPLETO</Text>
              <TextInput
                style={styles.input}
                placeholder="Digite seu nome completo"
                placeholderTextColor="#999"
                value={name}
                onChangeText={setName}
              />
            </View>

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

            {userType === 'owner' && (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>NOME DO ESTABELECIMENTO</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Digite o nome do seu estabelecimento"
                  placeholderTextColor="#999"
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
                  placeholderTextColor="#999"
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
                  placeholderTextColor="#999"
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
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.registerButtonText}>CADASTRAR</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => navigation.navigate('Login', { userType })}
            >
              <Text style={styles.loginButtonText}>Já está cadastrado? Faça login aqui.</Text>
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
  backgroundContainer: { flex: 1, backgroundColor: '#5a0025' },
  container: { flex: 1 },
  scrollContainer: { flexGrow: 1, padding: 20, justifyContent: 'space-between' },
  headerContainer: { alignItems: 'center', marginTop: 40 },
  logoText: { fontSize: 42, fontWeight: 'bold', color: '#ffffff', letterSpacing: 2, marginBottom: 8 },
  logoAccent: { color: '#ff6680' },
  clientTypeText: { fontSize: 14, fontWeight: 'bold', color: 'rgba(255,255,255,0.7)', letterSpacing: 3, marginBottom: 4 },
  welcomeText: { fontSize: 26, fontWeight: 'bold', color: '#ffffff', marginBottom: 6, letterSpacing: 2 },
  registerText: { fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  formContainer: { width: '100%', marginTop: 30 },
  inputContainer: { marginBottom: 15 },
  inputLabel: { fontSize: 13, fontWeight: 'bold', color: 'rgba(255,255,255,0.9)', marginBottom: 6, letterSpacing: 1 },
  input: { backgroundColor: '#ffffff', borderRadius: 10, height: 50, paddingHorizontal: 15, color: '#333', fontSize: 16 },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 10, height: 50, paddingHorizontal: 15 },
  passwordInput: { flex: 1, color: '#333', fontSize: 16 },
  showPasswordText: { color: '#d31027', fontSize: 12, fontWeight: 'bold' },
  passwordStrengthContainer: { marginTop: 8 },
  passwordStrengthBar: { height: 6, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  passwordStrengthFill: { height: '100%', borderRadius: 3 },
  passwordStrengthFillWeak: { width: '33%', backgroundColor: getPasswordStrengthColor('weak') },
  passwordStrengthFillMedium: { width: '66%', backgroundColor: getPasswordStrengthColor('medium') },
  passwordStrengthFillStrong: { width: '100%', backgroundColor: getPasswordStrengthColor('strong') },
  passwordStrengthText: { fontSize: 12, fontWeight: '500' },
  passwordStrengthTextWeak: { color: getPasswordStrengthColor('weak') },
  passwordStrengthTextMedium: { color: getPasswordStrengthColor('medium') },
  passwordStrengthTextStrong: { color: getPasswordStrengthColor('strong') },
  registerButton: { backgroundColor: '#d31027', borderRadius: 25, height: 52, justifyContent: 'center', alignItems: 'center', marginTop: 20, elevation: 4 },
  registerButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', letterSpacing: 2 },
  loginButton: { height: 50, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  loginButtonText: { color: 'rgba(255,255,255,0.9)', fontSize: 16, textDecorationLine: 'underline' },
  footer: { alignItems: 'center', marginBottom: 20 },
  footerText: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 'bold', letterSpacing: 4 },
});

export default RegisterScreen;
