import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Alert,
  Linking,
  Platform,
  SafeAreaView,
  StatusBar,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../constants/colors';
import { Professional } from '../../services/professionals';
import { storage, ref, getDownloadURL } from '../../config/firebase';

const { width, height } = Dimensions.get('window');

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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [urls, setUrls] = useState<{ [key: string]: string }>({});
  const [viewMode, setViewMode] = useState<'grid' | 'fullscreen'>('grid');

  const photos = professional?.portfolioImages || [];
  const video = professional?.portfolioVideo || '';

  type GalleryItem = { type: 'photo' | 'video'; storagePath: string };
  const allItems: GalleryItem[] = [
    ...photos.map((p: string) => ({ type: 'photo' as const, storagePath: p })),
    ...(video ? [{ type: 'video' as const, storagePath: video }] : []),
  ];

  useEffect(() => {
    // Resetar urls quando profissional muda (fix do bug de video compartilhado)
    setUrls({});
    setCurrentIndex(0);
    if (!visible || !professional) return;
    
    const currentPhotos = professional?.portfolioImages || [];
    const currentVideo = professional?.portfolioVideo || '';
    const itemsToLoad = [
      ...currentPhotos.map((p: string) => ({ type: 'photo' as const, storagePath: p })),
      ...(currentVideo ? [{ type: 'video' as const, storagePath: currentVideo }] : []),
    ];
    
    const loadUrls = async () => {
      const newUrls: { [key: string]: string } = {};
      for (const item of itemsToLoad) {
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
          console.error('[Portfolio] Erro ao carregar URL:', err);
        }
      }
      setUrls(newUrls);
    };
    loadUrls();
  }, [visible, professional?.id, professional?.portfolioVideo, professional?.portfolioImages]);

  useEffect(() => {
    if (!visible) {
      setViewMode('grid');
      setCurrentIndex(0);
    }
  }, [visible]);

  if (!professional) return null;

  const currentItem = allItems[currentIndex];

  const handleOpenVideo = async () => {
    if (!currentItem || currentItem.type !== 'video') return;
    const url = urls[currentItem.storagePath];
    if (!url) {
      Alert.alert('Erro', 'Vídeo ainda não carregado. Aguarde um momento.');
      return;
    }
    try {
      await Linking.openURL(url);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
      Alert.alert('Erro ao abrir vídeo', errorMsg);
    }
  };

  const handleOpenInstagram = async () => {
    if (!professional.instagram) return;
    const handle = professional.instagram.replace('@', '').trim();
    if (!handle) return;
    
    // Tenta abrir no app do Instagram primeiro (deep link)
    const appUrl = `instagram://user?username=${handle}`;
    const webUrl = `https://www.instagram.com/${handle}/`;
    
    try {
      const canOpenApp = await Linking.canOpenURL(appUrl);
      if (canOpenApp) {
        await Linking.openURL(appUrl);
        return;
      }
    } catch (err) {
      console.log('[Instagram] App nao disponivel, tentando web:', err);
    }
    
    // Fallback: abrir no navegador
    try {
      await Linking.openURL(webUrl);
    } catch (err) {
      console.log('[Instagram] Erro:', err);
      Alert.alert('Erro', 'Não foi possível abrir o Instagram.');
    }
  };

  // Modo tela cheia (fullscreen viewer)
  if (viewMode === 'fullscreen') {
    return (
      <Modal visible={visible} transparent={false} animationType="fade" onRequestClose={() => setViewMode('grid')} statusBarTranslucent>
        <StatusBar backgroundColor="#000" barStyle="light-content" />
        <SafeAreaView style={stylesFullscreen.container}>
          <View style={stylesFullscreen.header}>
            <Text style={stylesFullscreen.headerTitle} numberOfLines={1}>{professional.name}</Text>
            <Text style={stylesFullscreen.counter}>{currentIndex + 1}/{allItems.length}</Text>
            <TouchableOpacity style={stylesFullscreen.closeButton} onPress={() => setViewMode('grid')}>
              <Text style={stylesFullscreen.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={stylesFullscreen.mainContainer}>
            {currentItem ? (
              currentItem.type === 'photo' ? (
                urls[currentItem.storagePath] ? (
                  <Image source={{ uri: urls[currentItem.storagePath] }} style={stylesFullscreen.mainImage} resizeMode="contain" />
                ) : (
                  <Text style={stylesFullscreen.emptyText}>Carregando...</Text>
                )
              ) : (
                <TouchableOpacity style={stylesFullscreen.videoContainer} onPress={handleOpenVideo}>
                  <Text style={stylesFullscreen.videoIcon}>▶</Text>
                  <Text style={stylesFullscreen.videoLabel}>Vídeo do profissional</Text>
                  <Text style={stylesFullscreen.videoHint}>Toque para reproduzir</Text>
                </TouchableOpacity>
              )
            ) : null}
          </View>
          {allItems.length > 1 && (
            <View style={stylesFullscreen.navigationRow}>
              <TouchableOpacity
                style={[stylesFullscreen.navButton, currentIndex === 0 && stylesFullscreen.navButtonDisabled]}
                onPress={() => setCurrentIndex(i => Math.max(0, i - 1))}
                disabled={currentIndex === 0}
              >
                <Text style={stylesFullscreen.navButtonText}>‹</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[stylesFullscreen.navButton, currentIndex === allItems.length - 1 && stylesFullscreen.navButtonDisabled]}
                onPress={() => setCurrentIndex(i => Math.min(allItems.length - 1, i + 1))}
                disabled={currentIndex === allItems.length - 1}
              >
                <Text style={stylesFullscreen.navButtonText}>›</Text>
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    );
  }

  // Modo grid (visualizacao principal)
  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Portfolio</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Info do profissional */}
            <View style={styles.profileSection}>
              {professional.image ? (
                <Image source={{ uri: professional.image.startsWith('http') ? professional.image : undefined }} style={styles.profileImage} />
              ) : (
                <View style={[styles.profileImage, styles.profileImagePlaceholder]}>
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

            {/* Galeria de fotos */}
            <View style={styles.gallerySection}>
              <Text style={styles.sectionTitle}>Galeria ({photos.length})</Text>
              {photos.length > 0 ? (
                <View style={styles.photosGrid}>
                  {photos.map((photoPath: string, index: number) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.photoItem}
                      onPress={() => {
                        setCurrentIndex(index);
                        setViewMode('fullscreen');
                      }}
                    >
                      {urls[photoPath] ? (
                        <Image source={{ uri: urls[photoPath] }} style={styles.photoImage} resizeMode="cover" />
                      ) : (
                        <View style={styles.photoPlaceholder}>
                          <Icon name="image" size={32} color={colors.lightText} />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyMessage}>Nenhuma foto no portfolio ainda.</Text>
              )}
            </View>

            {/* Video */}
            {video ? (
              <View style={styles.videoSection}>
                <Text style={styles.sectionTitle}>Video</Text>
                <TouchableOpacity
                  style={styles.videoCard}
                  onPress={() => {
                    setCurrentIndex(photos.length);
                    setViewMode('fullscreen');
                  }}
                >
                  <Text style={styles.videoCardIcon}>▶</Text>
                  <Text style={styles.videoCardText}>Vídeo de apresentação</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '92%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingBottom: 32,
  },
  profileSection: {
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
    backgroundColor: colors.lightGray,
  },
  profileImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  specialty: {
    fontSize: 14,
    color: colors.lightText,
    marginBottom: 8,
  },
  bio: {
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 20,
  },
  instagramButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E4405F',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  instagramText: {
    color: colors.white,
    marginLeft: 8,
    fontWeight: 'bold',
  },
  gallerySection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  photoItem: {
    width: (width - 40) / 3,
    height: (width - 40) / 3,
    margin: 4,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.lightGray,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyMessage: {
    fontSize: 14,
    color: colors.lightText,
    textAlign: 'center',
    paddingVertical: 20,
  },
  videoSection: {
    padding: 16,
  },
  videoCard: {
    backgroundColor: colors.lightGray,
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  videoCardIcon: {
    fontSize: 28,
    color: colors.primary,
    marginRight: 12,
  },
  videoCardText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: 'bold',
  },
});

const stylesFullscreen = StyleSheet.create({
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
    height: height * 0.7,
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
  },
  videoHint: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
  },
  navigationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
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
});

export default ProfessionalPortfolioModal;
