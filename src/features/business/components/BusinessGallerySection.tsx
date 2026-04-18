import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { colors } from '../../../constants/colors';
import {
  selectAndUploadImage,
  selectAndUploadVideo,
  deleteImageFromFirebase,
} from '../../../services/imageUpload';
import StorageImage from '../../../components/common/StorageImage';

type BusinessGallerySectionProps = {
  businessId: string;
  gallery: string[];
  galleryVideo: string;
  onGalleryChange: (gallery: string[]) => void;
  onVideoChange: (video: string) => void;
};

const MAX_PHOTOS = 7;

const BusinessGallerySection: React.FC<BusinessGallerySectionProps> = ({
  businessId,
  gallery,
  galleryVideo,
  onGalleryChange,
  onVideoChange,
}) => {
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);

  const handleAddPhoto = async () => {
    if (gallery.length >= MAX_PHOTOS) {
      Alert.alert('Limite atingido', `Você já tem ${MAX_PHOTOS} fotos na galeria.`);
      return;
    }

    try {
      setIsUploadingPhoto(true);
      const result = await selectAndUploadImage({
        storageKey: `businesses/${businessId}/gallery/photo_${Date.now()}.jpg`,
      });
      onGalleryChange([...gallery, result.storagePath]);
      Alert.alert('Sucesso', 'Foto adicionada à galeria!');
    } catch (error) {
      if (error instanceof Error && !error.message.includes('cancelada')) {
        Alert.alert('Erro', 'Não foi possível fazer upload da foto.');
      }
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = (index: number) => {
    Alert.alert(
      'Remover foto',
      'Tem certeza que deseja remover esta foto da galeria?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteImageFromFirebase(gallery[index]);
              const newGallery = gallery.filter((_, i) => i !== index);
              onGalleryChange(newGallery);
            } catch {
              Alert.alert('Erro', 'Não foi possível remover a foto.');
            }
          },
        },
      ],
    );
  };

  const handleAddVideo = async () => {
    try {
      setIsUploadingVideo(true);
      const result = await selectAndUploadVideo(
        `businesses/${businessId}/gallery/video_${Date.now()}.mp4`,
      );
      onVideoChange(result.storagePath);
      Alert.alert('Sucesso', 'Vídeo adicionado à galeria!');
    } catch (error) {
      if (
        error instanceof Error &&
        !error.message.includes('cancelada') &&
        !error.message.includes('longo')
      ) {
        Alert.alert('Erro', 'Não foi possível fazer upload do vídeo.');
      }
    } finally {
      setIsUploadingVideo(false);
    }
  };

  const handleRemoveVideo = () => {
    Alert.alert(
      'Remover vídeo',
      'Tem certeza que deseja remover o vídeo da galeria?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteImageFromFirebase(galleryVideo);
              onVideoChange('');
            } catch {
              Alert.alert('Erro', 'Não foi possível remover o vídeo.');
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Fotos da Galeria</Text>
        <Text style={styles.sectionCount}>
          {gallery.length}/{MAX_PHOTOS}
        </Text>
      </View>
      <Text style={styles.sectionHelper}>
        Adicione até {MAX_PHOTOS} fotos do seu estabelecimento para os clientes verem.
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosRow}>
        {gallery.map((photo, index) => (
          <View key={index} style={styles.photoItem}>
            <StorageImage storagePath={photo} style={styles.photoThumb} />
            <TouchableOpacity
              style={styles.removePhotoButton}
              onPress={() => handleRemovePhoto(index)}
            >
              <Text style={styles.removePhotoButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}

        {gallery.length < MAX_PHOTOS && (
          <TouchableOpacity
            style={styles.addPhotoButton}
            onPress={handleAddPhoto}
            disabled={isUploadingPhoto}
          >
            {isUploadingPhoto ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Text style={styles.addPhotoIcon}>+</Text>
                <Text style={styles.addPhotoText}>Adicionar foto</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>

      <View style={[styles.sectionHeader, { marginTop: 24 }]}>
        <Text style={styles.sectionTitle}>Vídeo do Estabelecimento</Text>
      </View>
      <Text style={styles.sectionHelper}>
        Adicione um vídeo de até 20 segundos apresentando seu estabelecimento.
      </Text>

      {galleryVideo ? (
        <View style={styles.videoContainer}>
          <View style={styles.videoPreview}>
            <Text style={styles.videoPreviewIcon}>▶</Text>
            <Text style={styles.videoPreviewText}>Vídeo carregado</Text>
          </View>
          <TouchableOpacity style={styles.removeVideoButton} onPress={handleRemoveVideo}>
            <Text style={styles.removeVideoButtonText}>Remover vídeo</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.addVideoButton}
          onPress={handleAddVideo}
          disabled={isUploadingVideo}
        >
          {isUploadingVideo ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <>
              <Text style={styles.addVideoIcon}>▶</Text>
              <Text style={styles.addVideoText}>Selecionar vídeo (máx. 20 segundos)</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  sectionCount: {
    fontSize: 14,
    color: colors.lightText,
  },
  sectionHelper: {
    fontSize: 12,
    color: colors.lightText,
    marginBottom: 12,
  },
  photosRow: {
    flexDirection: 'row',
  },
  photoItem: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 10,
    position: 'relative',
  },
  photoThumb: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removePhotoButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  addPhotoButton: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  addPhotoIcon: {
    fontSize: 28,
    color: colors.primary,
    fontWeight: 'bold',
  },
  addPhotoText: {
    fontSize: 11,
    color: colors.primary,
    textAlign: 'center',
    marginTop: 4,
  },
  videoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
  },
  videoPreview: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  videoPreviewIcon: {
    fontSize: 24,
    color: colors.primary,
    marginRight: 10,
  },
  videoPreviewText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: 'bold',
  },
  removeVideoButton: {
    backgroundColor: '#d32f2f',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  removeVideoButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  addVideoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  addVideoIcon: {
    fontSize: 20,
    color: '#fff',
    marginRight: 10,
  },
  addVideoText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default BusinessGallerySection;
