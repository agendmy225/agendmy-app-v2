import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppStackParamList } from '../types/types';

type WelcomeScreenNavigationProp = StackNavigationProp<AppStackParamList, 'Welcome'>;

const WelcomeScreen: React.FC = () => {
  const navigation = useNavigation<WelcomeScreenNavigationProp>();
  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>Agend<Text style={styles.logoAccent}>My</Text></Text>
            <View style={styles.logoDivider} />
          </View>
          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeText}>BEM-VINDO</Text>
            <Text style={styles.subtitleText}>Escolha o tipo de conta</Text>
          </View>
          <View style={styles.buttonsContainer}>
            <TouchableOpacity style={styles.userTypeButton} onPress={() => navigation.navigate('Login', { userType: 'owner' })}>
              <Text style={styles.buttonText}>PROPRIETARIO</Text>
            </TouchableOpacity>
            <Text style={styles.orText}>OU</Text>
            <TouchableOpacity style={styles.userTypeButton} onPress={() => navigation.navigate('Login', { userType: 'client' })}>
              <Text style={styles.buttonText}>CLIENTE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#5a0025' },
  safeArea: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  logoContainer: { marginTop: 80, alignItems: 'center' },
  logoText: { fontSize: 60, fontWeight: 'bold', color: '#ffffff', letterSpacing: 2 },
  logoAccent: { color: '#ff6680' },
  logoDivider: { width: 60, height: 3, backgroundColor: '#d31027', marginTop: 10, borderRadius: 2 },
  welcomeContainer: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  welcomeText: { fontSize: 28, fontWeight: 'bold', color: '#ffffff', marginBottom: 10, letterSpacing: 4 },
  subtitleText: { fontSize: 16, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  buttonsContainer: { width: '100%', alignItems: 'center', marginBottom: 50 },
  userTypeButton: { backgroundColor: 'rgba(255,255,255,0.95)', width: '80%', height: 52, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginVertical: 10, elevation: 5 },
  buttonText: { color: '#5a0025', fontSize: 16, fontWeight: 'bold', letterSpacing: 2 },
  orText: { color: 'rgba(255,255,255,0.8)', fontSize: 16, fontWeight: 'bold', marginVertical: 10 },
});

export default WelcomeScreen;
