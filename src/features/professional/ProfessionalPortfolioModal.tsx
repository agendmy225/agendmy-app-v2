// src/features/professional/ProfessionalPortfolioModal.tsx
// Portfolio do profissional: dados dele + mural padrao de fotos e videos.
import React from 'react';
import { Alert, Image, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../constants/colors';
import { Professional } from '../../services/professionals';
import { useResolvedFirebaseUrl } from '../../hooks/useResolvedFirebaseUrl';
import MediaGalleryModal, { MediaItem } from '../../components/common/MediaGalleryModal';

type ProfessionalPortfolioModalProps = {
  visible: boolean;
  onClose: () => void;
  professional: Professional | null;
};

const ProfessionalPortfolioModal: React.FC<ProfessionalPortfolioModalProps> = ({
  visible,
  onClose,
  professional,
}) => {
  const avatar = useResolvedFirebaseUrl(professional?.image || null);

  if (!professional) {
    return null;
  }

  const items: MediaItem[] = [
    ...((professional.portfolioImages || []) as string[]).map((p) => ({ type: 'photo' as const, storagePath: p })),
    ...(professional.portfolioVideo ? [{ type: 'video' as const, storagePath: professional.portfolioVideo }] : []),
  ];

  const handleOpenInstagram = async () => {
    const handle = String(professional.instagram || '').replace(/[@\s/]/g, '').trim();
    if (!handle) {
      return;
    }
    try {
      await Linking.openURL(`https://www.instagram.com/${handle}/`);
    } catch {
      Alert.alert('Erro', 'Não foi possível abrir o Instagram de @' + handle);
    }
  };

  const header = (
    <View style={styles.profile}>
      {avatar ? (
        <Image source={{ uri: avatar }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Icon name="person" size={40} color={colors.lightText} />
        </View>
      )}
      <Text style={styles.name}>{professional.name}</Text>
      {professional.specialty ? <Text style={styles.specialty}>{professional.specialty}</Text> : null}
      {professional.bio ? <Text style={styles.bio}>{professional.bio}</Text> : null}
      {professional.instagram ? (
        <TouchableOpacity style={styles.instagramButton} onPress={handleOpenInstagram}>
          <Icon name="camera-alt" size={18} color={colors.white} />
          <Text style={styles.instagramText}>{professional.instagram}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  return (
    <MediaGalleryModal
      visible={visible}
      onClose={onClose}
      title="Portfólio"
      header={header}
      items={items}
      emptyText="Nenhuma foto no portfólio ainda."
    />
  );
};

const styles = StyleSheet.create({
  profile: { alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.lightGray },
  avatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 12, backgroundColor: colors.lightGray },
  avatarPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
  specialty: { fontSize: 14, color: colors.lightText, marginBottom: 8 },
  bio: { fontSize: 14, color: colors.text, textAlign: 'center', marginBottom: 12, lineHeight: 20 },
  instagramButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E4405F', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  instagramText: { color: colors.white, marginLeft: 8, fontWeight: 'bold' },
});

export default ProfessionalPortfolioModal;
