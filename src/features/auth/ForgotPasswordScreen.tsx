import { firebaseAuth, sendPasswordResetEmail } from '../../config/firebase';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AppStackParamList } from '../../types/types';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type ForgotPasswordScreenNavigationProp = StackNavigationProp<AppStackParamList, 'ForgotPassword'>;

const ForgotPasswordScreen: React.FC = () => {
  const navigation = useNavigation<ForgotPasswordScreenNavigationProp>();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert('Erro', 'Por favor, digite seu e-mail.');
      return;
    }

    setIsLoading(true);
    try {
      const actionCodeSettings = {
        url: 'https://agendmy-b7ed5.web.app/auth/reset-password',
        handleCodeInApp: false,
        iOS: { bundleId: 'com.appdev' },
        android: { packageName: 'com.appdev', installApp: false, minimumVersion: '1' },
      };

      await sendPasswordResetEmail(firebaseAuth, email, actionCodeSettings);

      Alert.alert(
        'E-mail Enviado',
        'Um e-mail da AGENDMY com instruÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes para redefinir sua senha foi enviado. Verifique sua caixa de entrada e spam. O link ÃƒÆ’Ã‚Â© vÃƒÆ’Ã‚Â¡lido por 1 hora.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (error: unknown) {
      let errorMessage = 'Ocorreu um erro ao enviar o e-mail de recuperaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o.';
      if (error && typeof error === 'object' && 'code' in error) {
        const firebaseError = error as { code: string };
        if (firebaseError.code === 'auth/user-not-found') {
          errorMessage = 'UsuÃƒÆ’Ã‚Â¡rio nÃƒÆ’Ã‚Â£o encontrado. Verifique seu e-mail.';
        } else if (firebaseError.code === 'auth/invalid-email') {
          errorMessage = 'E-mail invÃƒÆ’Ã‚Â¡lido. Verifique o formato.';
        } else if (firebaseError.code === 'auth/too-many-requests') {
          errorMessage = 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.';
        } else if (firebaseError.code === 'auth/operation-not-allowed') {
          errorMessage = 'OperaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o nÃƒÆ’Ã‚Â£o permitida. Entre em contato com o suporte.';
        }
      }
      Alert.alert('Erro', errorMessage);
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
            <Text style={styles.titleText}>RECUPERAR SENHA</Text>
            <Text style={styles.subtitleText}>
              Digite seu e-mail para receber as instruÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes de recuperaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de senha.
            </Text>
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

            <TouchableOpacity
              style={styles.resetButton}
              onPress={handleResetPassword}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.resetButtonText}>ENVIAR E-MAIL</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backButtonText}>Voltar ao Login</Text>
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
  headerContainer: { alignItems: 'center', marginTop: 80 },
  logoText: { fontSize: 42, fontWeight: 'bold', color: '#ffffff', letterSpacing: 2, marginBottom: 20 },
  logoAccent: { color: '#ff6680' },
  titleText: { fontSize: 22, fontWeight: 'bold', color: '#ffffff', marginBottom: 14, letterSpacing: 2 },
  subtitleText: { fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 22 },
  formContainer: { width: '100%', marginTop: 40 },
  inputContainer: { marginBottom: 20 },
  inputLabel: { fontSize: 13, fontWeight: 'bold', color: 'rgba(255,255,255,0.9)', marginBottom: 6, letterSpacing: 1 },
  input: { backgroundColor: '#ffffff', borderRadius: 10, height: 50, paddingHorizontal: 15, color: '#333', fontSize: 16 },
  resetButton: { backgroundColor: '#d31027', borderRadius: 25, height: 52, justifyContent: 'center', alignItems: 'center', marginTop: 20, elevation: 4 },
  resetButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', letterSpacing: 2 },
  backButton: { height: 50, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  backButtonText: { color: 'rgba(255,255,255,0.9)', fontSize: 16, textDecorationLine: 'underline' },
  footer: { alignItems: 'center', marginBottom: 20 },
  footerText: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 'bold', letterSpacing: 4 },
});

export default ForgotPasswordScreen;
