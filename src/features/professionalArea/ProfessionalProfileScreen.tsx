// src/features/professionalArea/ProfessionalProfileScreen.tsx
// Perfil do profissional: dados, comunicados e sair.
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { doc, getDoc } from '@react-native-firebase/firestore';
import { firebaseDb } from '../../config/firebase';
import { colors } from '../../constants/colors';
import { AppStackParamList } from '../../types/types';
import { useAuth } from '../auth/context/AuthContext';

const ProfessionalProfileScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<AppStackParamList>>();
  const { user, signOut } = useAuth();
  const [businessName, setBusinessName] = useState('');

  useEffect(() => {
    if (!user?.businessId) {
      return;
    }
    getDoc(doc(firebaseDb, 'businesses', user.businessId))
      .then((s: { data: () => Record<string, any> | undefined }) => setBusinessName(s.data()?.name || ''))
      .catch(() => undefined);
  }, [user?.businessId]);

  const items = [
    { icon: 'campaign', label: 'Comunicados', onPress: () => navigation.navigate('Announcements') },
    { icon: 'edit', label: 'Editar Perfil', onPress: () => navigation.navigate('EditProfile') },
    { icon: 'help-outline', label: 'Suporte', onPress: () => navigation.navigate('Support') },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(user?.displayName || 'P').charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{user?.displayName || 'Profissional'}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        {businessName ? (
          <View style={styles.businessRow}>
            <Icon name="store" size={16} color={colors.primary} />
            <Text style={styles.businessText}>{businessName}</Text>
          </View>
        ) : null}
      </View>

      {items.map((it) => (
        <TouchableOpacity key={it.label} style={styles.menuItem} onPress={it.onPress}>
          <Icon name={it.icon} size={22} color={colors.primary} />
          <Text style={styles.menuText}>{it.label}</Text>
          <Icon name="chevron-right" size={22} color={colors.lightText} />
        </TouchableOpacity>
      ))}

      <TouchableOpacity style={styles.logout} onPress={() => signOut()}>
        <Text style={styles.logoutText}>Sair da Conta</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 32 },
  header: { alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: colors.lightGray },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { color: colors.white, fontSize: 32, fontWeight: 'bold' },
  name: { fontSize: 18, fontWeight: 'bold', color: colors.text },
  email: { fontSize: 14, color: colors.lightText, marginTop: 2 },
  businessRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  businessText: { fontSize: 14, color: colors.primary, fontWeight: '600', marginLeft: 6 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.lightGray },
  menuText: { flex: 1, fontSize: 16, color: colors.text, marginLeft: 14 },
  logout: { marginTop: 30, marginHorizontal: 16, backgroundColor: colors.error, paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  logoutText: { color: colors.white, fontSize: 16, fontWeight: 'bold' },
});

export default ProfessionalProfileScreen;
