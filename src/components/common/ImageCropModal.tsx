import React, { useState, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import {
  GestureHandlerRootView,
  GestureDetector,
  Gesture,
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import ImageResizer from '@bam.tech/react-native-image-resizer';
import { colors } from '../../constants/colors';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

type ImageCropModalProps = {
  visible: boolean;
  imageUri: string | null;
  aspectRatio: number; // 1 para quadrado (logo), 16/9 para banner (capa)
  outputWidth: number;
  outputHeight: number;
  title?: string;
  onConfirm: (croppedUri: string) => void;
  onCancel: () => void;
};

const ImageCropModal: React.FC<ImageCropModalProps> = ({
  visible,
  imageUri,
  aspectRatio,
  outputWidth,
  outputHeight,
  title = 'Ajustar imagem',
  onConfirm,
  onCancel,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);

  // Area de crop: 85% da largura da tela, altura conforme aspectRatio
  const cropWidth = screenWidth * 0.85;
  const cropHeight = cropWidth / aspectRatio;

  // Valores animados
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  React.useEffect(() => {
    if (!visible) return;
    // Reset valores quando abrir
    scale.value = 1;
    savedScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;

    if (imageUri) {
      Image.getSize(
        imageUri,
        (w, h) => setImageSize({ width: w, height: h }),
        (err) => {
          console.error('[ImageCropModal] Erro ao obter tamanho:', err);
          setImageSize(null);
        },
      );
    }
  }, [imageUri, visible]);

  // Gesto de pinça (zoom)
  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = Math.max(0.5, Math.min(savedScale.value * event.scale, 5));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  // Gesto de arrastar
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = savedTranslateX.value + event.translationX;
      translateY.value = savedTranslateY.value + event.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  // Combinar gestos
  const composedGestures = Gesture.Simultaneous(pinchGesture, panGesture);

  // Estilo animado da imagem
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const handleConfirm = async () => {
    if (!imageUri || !imageSize) {
      Alert.alert('Erro', 'Imagem não carregada.');
      return;
    }

    try {
      setIsProcessing(true);

      // Calcular dimensoes da imagem exibida
      const imageAspectRatio = imageSize.width / imageSize.height;
      let displayWidth: number;
      let displayHeight: number;

      // A imagem e exibida com 'contain' dentro do cropWidth x cropHeight inicialmente
      // Mas vamos usar um tamanho grande fixo para nao perder qualidade
      const containerWidth = cropWidth;
      const containerHeight = cropHeight;

      if (imageAspectRatio > aspectRatio) {
        displayHeight = containerHeight;
        displayWidth = containerHeight * imageAspectRatio;
      } else {
        displayWidth = containerWidth;
        displayHeight = containerWidth / imageAspectRatio;
      }

      // Aplicar o scale do usuario
      const finalDisplayWidth = displayWidth * scale.value;
      const finalDisplayHeight = displayHeight * scale.value;

      // Calcular proporção: quanto a imagem original foi escalada
      const ratioX = imageSize.width / finalDisplayWidth;
      const ratioY = imageSize.height / finalDisplayHeight;

      // O centro da area de crop em coordenadas da imagem exibida
      // (container centraliza a imagem, depois translate movimenta)
      const cropCenterX = containerWidth / 2 - translateX.value;
      const cropCenterY = containerHeight / 2 - translateY.value;

      // Convert to source image coordinates
      const sourceOffsetX = (cropCenterX - containerWidth / 2 + finalDisplayWidth / 2) * ratioX - (containerWidth / 2) * ratioX;
      const sourceOffsetY = (cropCenterY - containerHeight / 2 + finalDisplayHeight / 2) * ratioY - (containerHeight / 2) * ratioY;

      // Calcular a area de crop na imagem source
      const cropSourceWidth = containerWidth * ratioX;
      const cropSourceHeight = containerHeight * ratioY;

      // Clamp para nao sair dos limites
      const cropX = Math.max(0, Math.min(sourceOffsetX, imageSize.width - cropSourceWidth));
      const cropY = Math.max(0, Math.min(sourceOffsetY, imageSize.height - cropSourceHeight));
      const finalCropW = Math.min(cropSourceWidth, imageSize.width - cropX);
      const finalCropH = Math.min(cropSourceHeight, imageSize.height - cropY);

      console.log('[ImageCropModal] Crop params:', {
        cropX, cropY, finalCropW, finalCropH,
        imageSize, outputWidth, outputHeight,
      });

      // Usar ImageResizer para cortar
      const result = await ImageResizer.createResizedImage(
        imageUri,
        outputWidth,
        outputHeight,
        'JPEG',
        85,
        0,
        undefined,
        false,
        {
          mode: 'cover',
          onlyScaleDown: false,
        },
      );

      console.log('[ImageCropModal] Cropped:', result.uri);
      onConfirm(result.uri);
    } catch (err) {
      console.error('[ImageCropModal] Erro ao processar:', err);
      Alert.alert('Erro', 'Não foi possível processar a imagem.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!visible || !imageUri) return null;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <StatusBar backgroundColor="#000" barStyle="light-content" />
      <GestureHandlerRootView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} style={styles.headerButton}>
            <Text style={styles.headerButtonText}>Cancelar</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
          <TouchableOpacity
            onPress={handleConfirm}
            style={styles.headerButton}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={[styles.headerButtonText, styles.confirmButtonText]}>Concluir</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Area de crop */}
        <View style={styles.cropArea}>
          <GestureDetector gesture={composedGestures}>
            <Animated.View style={styles.imageContainer}>
              <Animated.Image
                source={{ uri: imageUri }}
                style={[
                  {
                    width: cropWidth,
                    height: cropHeight,
                  },
                  animatedStyle,
                ]}
                resizeMode="contain"
              />
            </Animated.View>
          </GestureDetector>

          {/* Overlay de crop */}
          <View pointerEvents="none" style={styles.cropOverlay}>
            <View
              style={[
                styles.cropBox,
                { width: cropWidth, height: cropHeight },
              ]}
            />
          </View>
        </View>

        {/* Instrucoes */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Arraste para posicionar  |  Pince para ampliar
          </Text>
        </View>
      </GestureHandlerRootView>
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
    padding: 16,
    backgroundColor: '#33001b',
  },
  headerButton: {
    padding: 8,
    minWidth: 80,
  },
  headerButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  confirmButtonText: {
    fontWeight: 'bold',
    textAlign: 'right',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  cropArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cropOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cropBox: {
    borderWidth: 2,
    borderColor: '#d31027',
    backgroundColor: 'transparent',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#000',
  },
  footerText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },
});

export default ImageCropModal;
