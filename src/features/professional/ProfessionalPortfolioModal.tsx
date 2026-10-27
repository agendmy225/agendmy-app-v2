import React, { useEffect, useRef, useState } from 'react';
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
import { WebView } from 'react-native-webview';
import { storage, ref, getDownloadURL } from '../../config/firebase';

// links de YouTube, Instagram, Vimeo etc. abrem direto no app deles
const isExternalVideoLink = (url: string): boolean =>
  /youtube\.com|youtu\.be|instagram\.com|vimeo\.com|tiktok\.com|facebook\.com|fb\.watch/i.test(url || '');

// player do proprio aparelho (video HTML5 com os controles nativos do Android/iPhone)
const videoHtml = (url: string): string => {
  const safe = String(url).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  return '<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />' +
    '<style>html,body{margin:0;padding:0;height:100%;background:#000;}' +
    'body{display:flex;align-items:center;justify-content:center;}' +
    'video{width:100%;max-height:100%;background:#000;}</style></head><body>' +
    '<video src="' + safe + '" controls playsinline preload="metadata"></video></body></html>';
};

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
      ...(professional?.image ? [{ type: 'photo' as const, storagePath: professional.image }] : []),
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
  }, [visible, professional?.id, professional?.portfolioVideo, professional?.portfolioImages, professional?.image]);

  // mostra a barra de rolagem ao abrir, para o cliente ver que da para rolar
  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => {
    if (!visible || viewMode !== 'grid') {
      return;
    }
    const t = setTimeout(() => scrollRef.current?.flashScrollIndicators(), 500);
    return () => clearTimeout(t);
  }, [visible, viewMode]);

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
      // abre no app que o celular usa para esse tipo de link (player, YouTube, Instagram ou navegador)
      await Linking.openURL(url);
    } catch {
      Alert.alert('Não foi possível abrir o vídeo', 'Nenhum aplicativo do celular conseguiu abrir este vídeo.');
    }
  };

  const handleOpenInstagram = async () => {
    if (!professional.instagram) return;
    // Limpar o handle: remover @, espacos, e barras
    let handle = professional.instagram.replace(/[@\s\/]/g, '').trim();
    if (!handle) return;
    
    console.log('[Instagram] Handle limpo:', handle);
    
    // Usar a URL web direta - e mais confiavel que deep links
    // A URL abre no app do Instagram se instalado, ou no navegador
    const url = `https://www.instagram.com/${handle}/`;
    
    try {
      await Linking.openURL(url);
      console.log('[Instagram] Aberto com sucesso');
    } catch (err) {
      console.log('[Instagram] Erro ao abrir:', err);
      Alert.alert('Erro', 'Não foi possível abrir o Instagram de @' + handle);
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
                !urls[currentItem.storagePath] ? (
                  <Text style={stylesFullscreen.emptyText}>Carregando vídeo...</Text>
                ) : isExternalVideoLink(urls[currentItem.storagePath]) ? (
                  <TouchableOpacity style={stylesFullscreen.videoContainer} onPress={handleOpenVideo}>
                    <Text style={stylesFullscreen.videoIcon}>▶</Text>
                    <Text style={stylesFullscreen.videoLabel}>Vídeo do profissional</Text>
                    <Text style={stylesFullscreen.videoHint}>Toque para abrir no aplicativo</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={stylesFullscreen.playerWrapper}>
                    <WebView
                      source={{ html: videoHtml(urls[currentItem.storagePath]) }}
                      style={stylesFullscreen.player}
                      originWhitelist={['*']}
                      allowsInlineMediaPlayback
                      allowsFullscreenVideo
                      mediaPlaybackRequiresUserAction={false}
                      javaScriptEnabled
                      scrollEnabled={false}
                      bounces={false}
                    />
                    <TouchableOpacity style={stylesFullscreen.openOutsideButton} onPress={handleOpenVideo}>
                      <Text style={stylesFullscreen.openOutsideText}>Abrir no app de vídeo do celular</Text>
                    </TouchableOpacity>
                  </View>
                )
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

          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
            persistentScrollbar={true}
            indicatorStyle="black"
            nestedScrollEnabled={true}
            bounces={true}
          >
            {/* Info do profissional */}
            <View style={styles.profileSection}>
              {professional.image ? (
                urls[professional.image] ? (
                  <Image source={{ uri: urls[professional.image] }} style={styles.profileImage} />
                ) : (
                  <View style={[styles.profileImage, styles.profileImagePlaceholder]}>
                    <Icon name="person" size={40} color={colors.lightText} />
                  </View>
                )
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

            {/* Video - thumbnail quadrado */}
            {video ? (
              <View style={styles.videoSection}>
                <Text style={styles.sectionTitle}>Vídeo</Text>
                <TouchableOpacity
                  style={styles.videoThumbnailBox}
                  onPress={() => {
                    setCurrentIndex(photos.length);
                    setViewMode('fullscreen');
                  }}
                >
                  <View style={styles.videoThumbnailInner}>
                    <View style={styles.playIconCircle}>
                      <Text style={styles.playIconText}>▶</Text>
                    </View>
                  </View>
                  <Text style={styles.videoThumbnailLabel}>Vídeo de apresentação</Text>
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 80,
    flexGrow: 1,
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
  videoThumbnailBox: {
    alignItems: 'center',
    marginTop: 8,
  },
  videoThumbnailInner: {
    width: 140,
    height: 140,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  playIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIconText: {
    fontSize: 24,
    color: colors.primary,
    marginLeft: 4,
  },
  videoThumbnailLabel: {
    fontSize: 13,
    color: colors.lightText,
    textAlign: 'center',
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
  playerWrapper: {
    width: '100%',
    flex: 1,
    justifyContent: 'center',
  },
  player: {
    flex: 1,
    width: '100%',
    backgroundColor: '#000',
  },
  openOutsideButton: {
    alignSelf: 'center',
    marginVertical: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  openOutsideText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
