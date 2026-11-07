// src/features/professionalArea/ProfessionalProfileScreen.tsx
// Perfil do profissional: foto, especialidade, nota, estabelecimento, portfolio, comunicados e sair.
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { doc, getDoc, onSnapshot, serverTimestamp, updateDoc } from '@react-native-firebase/firestore';
import { firebaseDb } from '../../config/firebase';
import { colors } from '../../constants/colors';
import { AppStackParamList } from '../../types/types';
import { useAuth } from '../auth/context/AuthContext';
import { useResolvedFirebaseUrl } from '../../hooks/useResolvedFirebaseUrl';
import ProfessionalPortfolioModal from '../professional/ProfessionalPortfolioModal';
import PortfolioEditor from './PortfolioEditor';
import { selectAndUploadImage } from '../../services/imageUpload';

const ProfessionalProfileScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<AppStackParamList>>();
  const { user, signOut } = useAuth();
  const [businessName, setBusinessName] = useState('');
  const [prof, setProf] = useState<Record<string, any> | null>(null);
  const [showPortfolio, setShowPortfolio] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const professionalId = (user as any)?.professionalId as string | undefined;
  const photo = useResolvedFirebaseUrl(prof?.image || null);

  useEffect(() => {
    if (!user?.businessId) {
      return;
    }
    getDoc(doc(firebaseDb, 'businesses', user.businessId))
      .then((s: { data: () => Record<string, any> | undefined }) => setBusinessName(s.data()?.name || ''))
      .catch(() => undefined);
  }, [user?.businessId]);

  // cadastro do profissional (foto, especialidade, nota), em tempo real
  useEffect(() => {
    if (!professionalId) {
      return;
    }
    return onSnapshot(
      doc(firebaseDb, 'professionals', professionalId),
      (s: { data: () => Record<string, any> | undefined }) => setProf(s.data() || null),
      () => undefined,
    );
  }, [professionalId]);

  const name = prof?.name || user?.displayName || 'Profissional';
  const rating = Number(prof?.rating) || 0;
  const reviewCount = Number(prof?.reviewsCount ?? prof?.reviewCount) || 0;

  // o profissional troca a propria foto (aparece na hora na pagina do estabelecimento)
  const changePhoto = async () => {
    if (!professionalId || !user?.uid) {
      return;
    }
    try {
      setUploadingPhoto(true);
      const r = await selectAndUploadImage({ storageKey: `professional_images/${user.uid}/perfil_${Date.now()}.jpg` });
      await updateDoc(doc(firebaseDb, 'professionals', professionalId), { image: r.downloadURL, updatedAt: serverTimestamp() });
    } catch (e) {
      if (e instanceof Error && !e.message.includes('cancelada')) {
        Alert.alert('Erro', 'Não foi possível trocar a foto.');
      }
    } finally {
      setUploadingPhoto(false);
    }
  };

  const items = [
    { icon: 'photo-library', label: 'Ver meu portfólio', onPress: () => setShowPortfolio(true), show: !!prof },
    { icon: 'collections', label: 'Editar meu portfólio (fotos e vídeo)', onPress: () => setShowEditor(true), show: !!prof },
    { icon: 'campaign', label: 'Comunicados', onPress: () => navigation.navigate('Announcements'), show: true },
    { icon: 'edit', label: 'Editar Perfil', onPress: () => navigation.navigate('EditProfile'), show: true },
    { icon: 'help-outline', label: 'Suporte', onPress: () => navigation.navigate('Support'), show: true },
  ].filter((it) => it.show);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={changePhoto} disabled={uploadingPhoto || !prof} activeOpacity={0.8}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.cameraBadge}>
            {uploadingPhoto ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Icon name="photo-camera" size={16} color={colors.white} />
            )}
          </View>
        </TouchableOpacity>
        {prof ? (
          <TouchableOpacity onPress={changePhoto} disabled={uploadingPhoto}>
            <Text style={styles.changePhoto}>{uploadingPhoto ? 'Enviando foto...' : 'Trocar foto'}</Text>
          </TouchableOpacity>
        ) : null}
        <Text style={styles.name}>{name}</Text>
        {prof?.specialty ? <Text style={styles.specialty}>{prof.specialty}</Text> : null}
        <Text style={styles.email}>{user?.email}</Text>
        {rating > 0 ? (
          <View style={styles.ratingRow}>
            <Icon name="star" size={16} color="#FFC107" />
            <Text style={styles.ratingText}>{rating.toFixed(1).replace('.', ',')}</Text>
            <Text style={styles.reviewText}>{`(${reviewCount} avaliações)`}</Text>
          </View>
        ) : null}
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

      {showEditor && prof && professionalId && user?.uid ? (
        <PortfolioEditor
          visible={showEditor}
          onClose={() => setShowEditor(false)}
          professionalId={professionalId}
          uid={user.uid}
          photos={Array.isArray(prof.portfolioImages) ? prof.portfolioImages : []}
          video={prof.portfolioVideo || ''}
        />
      ) : null}

      {showPortfolio && prof && professionalId ? (
        <ProfessionalPortfolioModal
          visible={showPortfolio}
          onClose={() => setShowPortfolio(false)}
          professional={{ id: professionalId, ...prof } as any}
        />
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 32 },
  header: { alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: colors.lightGray },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarImage: { width: 96, height: 96, borderRadius: 48, marginBottom: 12, backgroundColor: colors.lightGray },
  avatarText: { color: colors.white, fontSize: 36, fontWeight: 'bold' },
  cameraBadge: { position: 'absolute', right: 0, bottom: 12, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.white },
  changePhoto: { color: colors.primary, fontWeight: '600', fontSize: 14, marginBottom: 6 },
  name: { fontSize: 19, fontWeight: 'bold', color: colors.text },
  specialty: { fontSize: 14, color: colors.text, marginTop: 2 },
  email: { fontSize: 13, color: colors.lightText, marginTop: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  ratingText: { fontSize: 15, fontWeight: 'bold', color: colors.text, marginLeft: 4 },
  reviewText: { fontSize: 13, color: colors.lightText, marginLeft: 4 },
  businessRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  businessText: { fontSize: 14, color: colors.primary, fontWeight: '600', marginLeft: 6 },
  hint: { fontSize: 12, color: colors.lightText, textAlign: 'center', marginTop: 10 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.lightGray },
  menuText: { flex: 1, fontSize: 16, color: colors.text, marginLeft: 14 },
  logout: { marginTop: 30, marginHorizontal: 16, backgroundColor: colors.error, paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  logoutText: { color: colors.white, fontSize: 16, fontWeight: 'bold' },
});

export default ProfessionalProfileScreen;
