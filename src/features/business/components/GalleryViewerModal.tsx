import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  Dimensions,
  StatusBar,
  SafeAreaView,
  Linking,
  Alert,
} from 'react-native';
import { colors } from '../../../constants/colors';
import { storage, ref, getDownloadURL } from '../../../config/firebase';

const { width, height } = Dimensions.get('window');

export type GalleryItem = {
  type: 'photo' | 'video';
  storagePath: string;
};

type GalleryViewerModalProps = {
  visible: boolean;
  onClose: () => void;
  items: GalleryItem[];
  initialIndex?: number;
  businessName?: string;
};

const GalleryViewerModal: React.FC<GalleryViewerModalProps> = ({
  visible,
  onClose,
  items,
  initialIndex = 0,
  businessName = '',
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [urls, setUrls] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (!visible) return;
    const loadUrls = async () => {
      const newUrls: { [key: string]: string } = {};
      for (const item of items) {
        if (!item.storagePath) continue;
        try {
          if (item.storagePath.startsWith('http')) {
            newUrls[item.storagePath] = item.storagePath;
          } else {
            const itemRef = ref(storage, item.storagePath);
            const url = await getDownloadURL(itemRef);
            newUrls[item.storagePath] = url;
          }
        } catch (err) {
          console.error('Erro ao carregar URL:', err);
        }
      }
      setUrls(newUrls);
    };
    loadUrls();
  }, [items, visible]);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, visible]);

  const photos = items.filter(i => i.type === 'photo');
  const video = items.find(i => i.type === 'video');
  const allItems = [...photos, ...(video ? [video] : [])];
  const currentItem = allItems[currentIndex];

  const handleOpenVideo = async () => {
    if (!currentItem || currentItem.type !== 'video') return;
    const url = urls[currentItem.storagePath];
    if (!url) {
      Alert.alert('Erro', 'Vídeo ainda não carregado. Aguarde um momento.');
      return;
    }
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Erro', 'Não foi possível abrir o vídeo.');
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível abrir o vídeo.');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar backgroundColor="#000" barStyle="light-content" />
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {businessName}
          </Text>
          <Text style={styles.counter}>
            {currentIndex + 1}/{allItems.length}
          </Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.mainContainer}>
          {currentItem ? (
            currentItem.type === 'photo' ? (
              urls[currentItem.storagePath] ? (
                <Image
                  source={{ uri: urls[currentItem.storagePath] }}
                  style={styles.mainImage}
                  resizeMode="contain"
                />
              ) : (
                <Text style={styles.emptyText}>Carregando...</Text>
              )
            ) : (
              <TouchableOpacity style={styles.videoContainer} onPress={handleOpenVideo}>
                <Text style={styles.videoIcon}>▶</Text>
                <Text style={styles.videoLabel}>Vídeo do estabelecimento</Text>
                <Text style={styles.videoHint}>Toque para reproduzir</Text>
              </TouchableOpacity>
            )
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Nenhuma imagem disponível</Text>
            </View>
          )}
        </View>

        {allItems.length > 1 && (
          <View style={styles.navigationRow}>
            <TouchableOpacity
              style={[styles.navButton, currentIndex === 0 && styles.navButtonDisabled]}
              onPress={() => setCurrentIndex(i => Math.max(0, i - 1))}
              disabled={currentIndex === 0}
            >
              <Text style={styles.navButtonText}>‹</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.navButton,
                currentIndex === allItems.length - 1 && styles.navButtonDisabled,
              ]}
              onPress={() => setCurrentIndex(i => Math.min(allItems.length - 1, i + 1))}
              disabled={currentIndex === allItems.length - 1}
            >
              <Text style={styles.navButtonText}>›</Text>
            </TouchableOpacity>
          </View>
        )}

        {allItems.length > 1 && (
          <View style={styles.thumbnailContainer}>
            <FlatList
              data={allItems}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(_, index) => index.toString()}
              contentContainerStyle={styles.thumbnailList}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  onPress={() => setCurrentIndex(index)}
                  style={[
                    styles.thumbnail,
                    index === currentIndex && styles.thumbnailActive,
                  ]}
                >
                  {item.type === 'photo' && urls[item.storagePath] ? (
                    <Image
                      source={{ uri: urls[item.storagePath] }}
                      style={styles.thumbnailImage}
                      resizeMode="cover"
                    />
                  ) : item.type === 'video' ? (
                    <View style={styles.videoThumbnail}>
                      <Text style={styles.videoThumbnailIcon}>▶</Text>
                      <Text style={styles.videoThumbnailLabel}>Vídeo</Text>
                    </View>
                  ) : (
                    <View style={styles.thumbnailImage} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
  headerTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  counter: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginRight: 16,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  mainContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainImage: {
    width: width,
    height: height * 0.65,
  },
  videoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  videoIcon: {
    fontSize: 72,
    color: '#fff',
    marginBottom: 16,
  },
  videoLabel: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  videoHint: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    textAlign: 'center',
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
  },
  navigationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  navButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  navButtonText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  thumbnailContainer: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingVertical: 12,
  },
  thumbnailList: {
    paddingHorizontal: 16,
  },
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: 8,
    marginRight: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailActive: {
    borderColor: colors.primary,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#333',
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoThumbnailIcon: {
    color: '#fff',
    fontSize: 22,
  },
  videoThumbnailLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    marginTop: 2,
  },
});

export default GalleryViewerModal;
