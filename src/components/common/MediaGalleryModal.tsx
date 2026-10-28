// src/components/common/MediaGalleryModal.tsx
// Mural de fotos e videos (padrao do app): usado no portfolio do profissional
// e na galeria do estabelecimento.
// - grade organizada: Fotos e Videos em secoes separadas, com barra de rolagem
// - tela cheia: desliza entre as fotos/videos; o video toca no player do proprio celular
//   e tem o botao para abrir no app de video do aparelho
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Linking,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../constants/colors';
import { firebaseStorage } from '../../config/firebase';

export type MediaItem = { type: 'photo' | 'video'; storagePath: string };

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  header?: React.ReactNode;
  items: MediaItem[];
  emptyText?: string;
}

// links de YouTube, Instagram, Vimeo etc. abrem direto no app deles
const isExternalVideoLink = (url: string): boolean =>
  /youtube\.com|youtu\.be|instagram\.com|vimeo\.com|tiktok\.com|facebook\.com|fb\.watch/i.test(url || '');

const resolveUrl = async (pathOrUrl: string): Promise<string | null> => {
  if (!pathOrUrl) {
    return null;
  }
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }
  try {
    return await firebaseStorage.ref(pathOrUrl).getDownloadURL();
  } catch {
    return null;
  }
};

// player do proprio aparelho (video HTML5 com os controles nativos do Android/iPhone)
const videoHtml = (url: string): string => {
  const safe = String(url).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  return '<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />' +
    '<style>html,body{margin:0;padding:0;height:100%;background:#000;}' +
    'body{display:flex;align-items:center;justify-content:center;}' +
    'video{width:100%;max-height:100%;background:#000;}</style></head><body>' +
    '<video src="' + safe + '" controls playsinline preload="metadata"></video></body></html>';
};

const openExternally = async (url?: string) => {
  if (!url) {
    Alert.alert('Aguarde', 'O vídeo ainda está carregando.');
    return;
  }
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('Não foi possível abrir o vídeo', 'Nenhum aplicativo do celular conseguiu abrir este vídeo.');
  }
};

const MediaGalleryModal: React.FC<Props> = ({ visible, onClose, title, header, items, emptyText }) => {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [shown, setShown] = useState(false);
  const [viewer, setViewer] = useState<number | null>(null);
  const [pageWidth, setPageWidth] = useState(Dimensions.get('window').width);
  const scrollRef = useRef<ScrollView>(null);
  const pagerRef = useRef<FlatList<MediaItem>>(null);

  const photos = (items || []).filter((i) => i && i.type === 'photo' && i.storagePath);
  const videos = (items || []).filter((i) => i && i.type === 'video' && i.storagePath);
  const ordered = [...photos, ...videos];
  const itemsKey = ordered.map((i) => i.storagePath).join('|');

  // carrega os links das fotos e videos
  useEffect(() => {
    if (!visible) {
      setShown(false);
      setViewer(null);
      return;
    }
    let active = true;
    (async () => {
      const out: Record<string, string> = {};
      await Promise.all(ordered.map(async (it) => {
        const u = await resolveUrl(it.storagePath);
        if (u) {
          out[it.storagePath] = u;
        }
      }));
      if (active) {
        setUrls(out);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, itemsKey]);

  // a lista so e montada depois que a janela terminou de abrir (no Android a rolagem
  // nao funcionava quando a lista era criada durante a animacao de abertura)
  useEffect(() => {
    if (!visible) {
      return;
    }
    const t = setTimeout(() => setShown(true), 400);
    return () => clearTimeout(t);
  }, [visible]);

  // mostra a barra de rolagem ao abrir, para indicar que da para rolar
  useEffect(() => {
    if (!shown || viewer !== null) {
      return;
    }
    const t = setTimeout(() => scrollRef.current?.flashScrollIndicators(), 300);
    return () => clearTimeout(t);
  }, [shown, viewer]);

  const openViewer = (index: number) => setViewer(index);

  const goTo = (index: number) => {
    if (index < 0 || index >= ordered.length) {
      return;
    }
    setViewer(index);
    pagerRef.current?.scrollToIndex({ index, animated: true });
  };

  const onPageEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / Math.max(1, pageWidth));
    if (index !== viewer && index >= 0 && index < ordered.length) {
      setViewer(index);
    }
  };

  const handleBack = () => {
    if (viewer !== null) {
      setViewer(null);
    } else {
      onClose();
    }
  };

  const cellSize = Math.floor((Dimensions.get('window').width - 32 - 16) / 3);

  const renderGrid = () => (
    <View style={styles.sheet}>
      <View style={styles.header}>
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icon name="close" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>
      {!shown ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
          persistentScrollbar={true}
          indicatorStyle="black"
          nestedScrollEnabled={true}
        >
          {header}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="photo-library" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>{`Fotos (${photos.length})`}</Text>
            </View>
            {photos.length > 0 ? (
              <View style={styles.grid}>
                {photos.map((p, i) => (
                  <TouchableOpacity
                    key={`p-${i}-${p.storagePath}`}
                    style={[styles.cell, { width: cellSize, height: cellSize }]}
                    activeOpacity={0.8}
                    onPress={() => openViewer(i)}
                  >
                    {urls[p.storagePath] ? (
                      <Image source={{ uri: urls[p.storagePath] }} style={styles.cellImage} resizeMode="cover" />
                    ) : (
                      <View style={styles.cellPlaceholder}>
                        <Icon name="image" size={28} color={colors.lightText} />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text style={styles.empty}>{emptyText || 'Nenhuma foto ainda.'}</Text>
            )}
          </View>

          {videos.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Icon name="videocam" size={20} color={colors.primary} />
                <Text style={styles.sectionTitle}>{`Vídeos (${videos.length})`}</Text>
              </View>
              <View style={styles.grid}>
                {videos.map((v, j) => (
                  <TouchableOpacity
                    key={`v-${j}-${v.storagePath}`}
                    style={[styles.cell, styles.videoCell, { width: cellSize, height: cellSize }]}
                    activeOpacity={0.8}
                    onPress={() => openViewer(photos.length + j)}
                  >
                    <View style={styles.playCircle}>
                      <Icon name="play-arrow" size={30} color={colors.primary} />
                    </View>
                    <Text style={styles.videoCellLabel}>{videos.length > 1 ? `Vídeo ${j + 1}` : 'Vídeo'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );

  const renderPage = ({ item, index }: { item: MediaItem; index: number }) => {
    const url = urls[item.storagePath];
    return (
      <View style={[styles.page, { width: pageWidth }]}>
        {item.type === 'photo' ? (
          url ? (
            <Image source={{ uri: url }} style={styles.fullImage} resizeMode="contain" />
          ) : (
            <ActivityIndicator size="large" color="#fff" />
          )
        ) : !url ? (
          <ActivityIndicator size="large" color="#fff" />
        ) : isExternalVideoLink(url) ? (
          <TouchableOpacity style={styles.externalVideo} onPress={() => openExternally(url)}>
            <Icon name="play-circle-filled" size={80} color="#fff" />
            <Text style={styles.externalTitle}>Vídeo</Text>
            <Text style={styles.externalHint}>Toque para abrir no aplicativo</Text>
          </TouchableOpacity>
        ) : index === viewer ? (
          <View style={styles.playerWrapper}>
            <WebView
              source={{ html: videoHtml(url) }}
              style={styles.player}
              originWhitelist={['*']}
              allowsInlineMediaPlayback
              allowsFullscreenVideo
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled
              scrollEnabled={false}
              bounces={false}
            />
            <TouchableOpacity style={styles.openOutside} onPress={() => openExternally(url)}>
              <Icon name="open-in-new" size={16} color="#fff" />
              <Text style={styles.openOutsideText}>Abrir no app de vídeo do celular</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Icon name="play-circle-outline" size={80} color="rgba(255,255,255,0.6)" />
        )}
      </View>
    );
  };

  const renderViewer = () => {
    const index = viewer || 0;
    const current = ordered[index];
    return (
      <View style={styles.viewer}>
        <View style={styles.viewerHeader}>
          <TouchableOpacity onPress={() => setViewer(null)} style={styles.viewerButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icon name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.viewerTitle} numberOfLines={1}>
            {current && current.type === 'video' ? 'Vídeo' : 'Foto'} {index + 1} de {ordered.length}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.viewerButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icon name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.flex} onLayout={(e) => setPageWidth(e.nativeEvent.layout.width || pageWidth)}>
          <FlatList
            ref={pagerRef}
            data={ordered}
            keyExtractor={(it, i) => `${i}-${it.storagePath}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={index}
            getItemLayout={(_, i) => ({ length: pageWidth, offset: pageWidth * i, index: i })}
            onMomentumScrollEnd={onPageEnd}
            renderItem={renderPage}
            extraData={{ viewer, urls, pageWidth }}
          />
        </View>
        {ordered.length > 1 ? (
          <View style={styles.navRow}>
            <TouchableOpacity
              style={[styles.navButton, index === 0 && styles.navDisabled]}
              onPress={() => goTo(index - 1)}
              disabled={index === 0}
            >
              <Icon name="chevron-left" size={32} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.navButton, index === ordered.length - 1 && styles.navDisabled]}
              onPress={() => goTo(index + 1)}
              disabled={index === ordered.length - 1}
            >
              <Icon name="chevron-right" size={32} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleBack}
      onShow={() => setShown(true)}
    >
      <View style={[styles.overlay, viewer !== null && styles.overlayDark]}>
        {viewer === null ? renderGrid() : renderViewer()}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  overlayDark: { backgroundColor: '#000' },
  sheet: { height: '92%', backgroundColor: colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.lightGray },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: 'bold', color: colors.text, marginRight: 12 },
  closeButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.lightGray, justifyContent: 'center', alignItems: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingBottom: 60 },
  section: { paddingHorizontal: 16, paddingTop: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginLeft: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  cell: { margin: 4, borderRadius: 8, overflow: 'hidden', backgroundColor: colors.lightGray },
  cellImage: { width: '100%', height: '100%' },
  cellPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  videoCell: { backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' },
  playCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' },
  videoCellLabel: { color: '#fff', fontSize: 12, fontWeight: '600', marginTop: 8 },
  empty: { fontSize: 14, color: colors.lightText, textAlign: 'center', paddingVertical: 16 },
  viewer: { flex: 1, backgroundColor: '#000' },
  viewerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 16, paddingBottom: 10 },
  viewerButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  viewerTitle: { flex: 1, color: '#fff', fontSize: 15, fontWeight: '600', textAlign: 'center', marginHorizontal: 8 },
  page: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fullImage: { width: '100%', height: '100%' },
  externalVideo: { alignItems: 'center', padding: 24 },
  externalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginTop: 8 },
  externalHint: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 4 },
  playerWrapper: { flex: 1, width: '100%' },
  player: { flex: 1, backgroundColor: '#000' },
  openOutside: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', marginVertical: 12, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)' },
  openOutsideText: { color: '#fff', fontSize: 14, fontWeight: '600', marginLeft: 6 },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  navButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  navDisabled: { opacity: 0.3 },
});

export default MediaGalleryModal;
