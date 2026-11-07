// src/features/professionalArea/PortfolioEditor.tsx
// O profissional edita o proprio portfolio: ate 7 fotos e 1 video (ate 20 segundos).
// Cada mudanca e salva na hora no cadastro dele e aparece na pagina do estabelecimento.
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { doc, serverTimestamp, updateDoc } from '@react-native-firebase/firestore';
import { firebaseDb } from '../../config/firebase';
import { colors } from '../../constants/colors';
import { selectAndUploadImage, selectAndUploadVideo } from '../../services/imageUpload';
import { useResolvedFirebaseUrl } from '../../hooks/useResolvedFirebaseUrl';

const MAX_PHOTOS = 7;

const Thumb: React.FC<{ path: string }> = ({ path }) => {
  const uri = useResolvedFirebaseUrl(path);
  return uri ? (
    <Image source={{ uri }} style={styles.thumb} />
  ) : (
    <View style={[styles.thumb, styles.thumbEmpty]}>
      <ActivityIndicator size="small" color={colors.primary} />
    </View>
  );
};

interface Props {
  visible: boolean;
  onClose: () => void;
  professionalId: string;
  uid: string;
  photos: string[];
  video: string;
}

const PortfolioEditor: React.FC<Props> = ({ visible, onClose, professionalId, uid, photos, video }) => {
  const [busy, setBusy] = useState<'photo' | 'video' | null>(null);

  const save = async (data: Record<string, unknown>) => {
    await updateDoc(doc(firebaseDb, 'professionals', professionalId), { ...data, updatedAt: serverTimestamp() });
  };

  const addPhoto = async () => {
    if (photos.length >= MAX_PHOTOS) {
      Alert.alert('Limite atingido', `Você já tem ${MAX_PHOTOS} fotos. Remova alguma para adicionar outra.`);
      return;
    }
    try {
      setBusy('photo');
      const r = await selectAndUploadImage({ storageKey: `professional_images/${uid}/portfolio_${Date.now()}.jpg` });
      await save({ portfolioImages: [...photos, r.downloadURL] });
    } catch (e) {
      if (e instanceof Error && !e.message.includes('cancelada')) {
        Alert.alert('Erro', 'Não foi possível adicionar a foto.');
      }
    } finally {
      setBusy(null);
    }
  };

  const removePhoto = (index: number) => {
    Alert.alert('Remover foto', 'Tirar esta foto do seu portfólio?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () => save({ portfolioImages: photos.filter((_, i) => i !== index) })
          .catch(() => Alert.alert('Erro', 'Não foi possível remover a foto.')),
      },
    ]);
  };

  const setVideo = async () => {
    try {
      setBusy('video');
      const r = await selectAndUploadVideo(`professional_images/${uid}/video_${Date.now()}.mp4`);
      await save({ portfolioVideo: r.downloadURL });
    } catch (e) {
      if (e instanceof Error && !e.message.includes('cancelada') && !e.message.includes('longo')) {
        Alert.alert('Erro', 'Não foi possível enviar o vídeo.');
      }
    } finally {
      setBusy(null);
    }
  };

  const removeVideo = () => {
    Alert.alert('Remover vídeo', 'Tirar o vídeo do seu portfólio?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () => save({ portfolioVideo: '' }).catch(() => Alert.alert('Erro', 'Não foi possível remover o vídeo.')),
      },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icon name="arrow-back" size={24} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Editar meu portfólio</Text>
          <View style={styles.headerSpacer} />
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.tip}>As mudanças aparecem na hora para os clientes, na página do estabelecimento.</Text>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Fotos</Text>
            <Text style={styles.count}>{`${photos.length}/${MAX_PHOTOS}`}</Text>
          </View>
          <View style={styles.grid}>
            {photos.map((p, i) => (
              <View key={`${i}-${p}`} style={styles.cell}>
                <Thumb path={p} />
                <TouchableOpacity style={styles.remove} onPress={() => removePhoto(i)}>
                  <Icon name="close" size={16} color={colors.white} />
                </TouchableOpacity>
              </View>
            ))}
            {photos.length < MAX_PHOTOS ? (
              <TouchableOpacity style={[styles.cell, styles.add]} onPress={addPhoto} disabled={busy !== null}>
                {busy === 'photo' ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <>
                    <Icon name="add-a-photo" size={28} color={colors.primary} />
                    <Text style={styles.addText}>Adicionar</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Vídeo (até 20 segundos)</Text>
          </View>
          {video ? (
            <View style={styles.videoRow}>
              <Icon name="play-circle-filled" size={32} color={colors.primary} />
              <Text style={styles.videoText}>Vídeo no portfólio</Text>
              <TouchableOpacity style={styles.smallButton} onPress={setVideo} disabled={busy !== null}>
                <Text style={styles.smallButtonText}>Trocar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.smallButton, styles.dangerButton]} onPress={removeVideo} disabled={busy !== null}>
                <Text style={styles.smallButtonTextLight}>Remover</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.videoAdd} onPress={setVideo} disabled={busy !== null}>
              {busy === 'video' ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <Icon name="videocam" size={22} color={colors.white} />
                  <Text style={styles.videoAddText}>Adicionar vídeo</Text>
                </>
              )}
            </TouchableOpacity>
          )}
          {busy === 'video' ? <Text style={styles.tip}>Enviando o vídeo, aguarde...</Text> : null}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: colors.primary },
  headerTitle: { flex: 1, textAlign: 'center', color: colors.white, fontSize: 18, fontWeight: 'bold' },
  headerSpacer: { width: 24 },
  content: { padding: 16, paddingBottom: 40 },
  tip: { fontSize: 13, color: colors.lightText, marginBottom: 12, textAlign: 'center' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: colors.text },
  count: { fontSize: 14, color: colors.lightText },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  cell: { width: 100, height: 100, margin: 4, borderRadius: 8, overflow: 'hidden' },
  thumb: { width: '100%', height: '100%', backgroundColor: colors.lightGray },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  remove: { position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  add: { borderWidth: 2, borderStyle: 'dashed', borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  addText: { fontSize: 12, color: colors.primary, marginTop: 4 },
  videoRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: 10, padding: 12 },
  videoText: { flex: 1, fontSize: 14, color: colors.text, marginLeft: 8, fontWeight: '600' },
  smallButton: { borderWidth: 1, borderColor: colors.primary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginLeft: 6 },
  smallButtonText: { color: colors.primary, fontWeight: '600', fontSize: 13 },
  dangerButton: { backgroundColor: colors.error, borderColor: colors.error },
  smallButtonTextLight: { color: colors.white, fontWeight: '600', fontSize: 13 },
  videoAdd: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 14 },
  videoAddText: { color: colors.white, fontWeight: 'bold', fontSize: 15, marginLeft: 8 },
});

export default PortfolioEditor;
