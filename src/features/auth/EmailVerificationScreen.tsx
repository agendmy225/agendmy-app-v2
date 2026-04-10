import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '../../constants/colors';
import { useAuth } from './context/AuthContext';
const backgroundImage = require('../../assets/images/fundo.png');

const EmailVerificationScreen: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { sendVerificationEmail, signOut, user } = useAuth();

  const handleResendEmail = async () => {
    setIsLoading(true);
    try {
      await sendVerificationEmail();
      Alert.alert(
        'E-mail Enviado',
        'Um novo e-mail de verificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o foi enviado para sua caixa de entrada.',
      );
    } catch (error: unknown) {
      const err = error as Error;
      Alert.alert('Erro', err.message || 'NÃƒÆ’Ã‚Â£o foi possÃƒÆ’Ã‚Â­vel enviar o e-mail de verificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
    }
  };

  return (
    <ImageBackground source={backgroundImage} style={styles.backgroundContainer} resizeMode="cover">
      <View style={styles.container}>
        <View style={styles.contentContainer}>
          <View style={styles.headerContainer}>
            <Text style={styles.titleText}>VERIFICAR E-MAIL</Text>
            <Text style={styles.subtitleText}>
              Enviamos um e-mail de verificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o para:
            </Text>
            <Text style={styles.emailText}>{user?.email}</Text>
            <Text style={styles.instructionText}>
              Por favor, verifique sua caixa de entrada e clique no link de verificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o para ativar sua conta.
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.resendButton}
              onPress={handleResendEmail}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.resendButtonText}>REENVIAR E-MAIL</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.signOutButton}
              onPress={handleSignOut}
            >
              <Text style={styles.signOutButtonText}>Usar outra conta</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>AGENDMY</Text>
        </View>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  titleText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.black,
    marginBottom: 20,
  },
  subtitleText: {
    fontSize: 16,
    color: colors.black,
    textAlign: 'center',
    marginBottom: 10,
  },
  emailText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 20,
  },
  instructionText: {
    fontSize: 14,
    color: colors.black,
    textAlign: 'center',
    lineHeight: 20,
  },
  buttonContainer: {
    width: '100%',
  },
  resendButton: {
    backgroundColor: colors.primary,
    borderRadius: 5,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  resendButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  signOutButton: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signOutButtonText: {
    color: colors.black,
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  footer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  footerText: {
    color: colors.black,
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default EmailVerificationScreen;
