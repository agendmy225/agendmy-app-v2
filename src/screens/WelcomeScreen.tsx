import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React from 'react';
import {
  ImageBackground,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '../constants/colors';
import { AppStackParamList } from '../types/types';

// Importar as imagens
const backgroundImage = require('../assets/images/fundo.png');
const logoImage = require('../assets/images/logo.png');

type WelcomeScreenNavigationProp = StackNavigationProp<AppStackParamList, 'Welcome'>;

const WelcomeScreen: React.FC = () => {
  const navigation = useNavigation<WelcomeScreenNavigationProp>();

  const handleClientPress = () => {
    console.log('Cliente selecionado');
    navigation.navigate('Login', { userType: 'client' });
  };

  const handleOwnerPress = () => {
    console.log('Proprietário selecionado');
    navigation.navigate('Login', { userType: 'owner' });
  };

  return (
    <ImageBackground source={backgroundImage} style={styles.backgroundContainer} resizeMode="cover">
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Image
              source={logoImage}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeText}>BEM-VINDO</Text>
            <Text style={styles.subtitleText}>Escolha o tipo de conta</Text>
          </View>

          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={styles.userTypeButton}
              onPress={handleOwnerPress}
            >
              <Text style={styles.buttonText}>PROPRIETÁRIO</Text>
            </TouchableOpacity>

            <Text style={styles.orText}>OU</Text>

            <TouchableOpacity
              style={styles.userTypeButton}
              onPress={handleClientPress}
            >
              <Text style={styles.buttonText}>CLIENTE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  logoContainer: {
    //alignItems: 'center',
    marginTop: 80,
  },
  logo: {
    width: 150,
    height: 150,
  },
  welcomeContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  subtitleText: {
    fontSize: 16,
    color: colors.white,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  buttonsContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 50,
  },
  userTypeButton: {
    backgroundColor: colors.brandRed,
    width: '80%',
    height: 52,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  orText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginVertical: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
});

export default WelcomeScreen;
