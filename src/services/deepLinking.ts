import { Linking, Alert, Platform } from 'react-native';

export interface DeepLinkOptions {
  fallbackUrl?: string;
  showErrorAlert?: boolean;
  errorTitle?: string;
  errorMessage?: string;
}

/**
 * Abre um deep link de forma robusta, especialmente para Android 11+ (API 30+)
 * com targetSdkVersion 35. Implementa estratégias múltiplas para garantir
 * que os links funcionem tanto no Expo Go quanto em APKs gerados.
 */
export class DeepLinkService {
  /**
   * Abre link do Instagram de forma robusta
   */
  static async openInstagram(username: string, options: DeepLinkOptions = {}): Promise<boolean> {
    const instagramUrl = `instagram://user?username=${username}`;
    const fallbackUrl = options.fallbackUrl || `https://www.instagram.com/${username}`;

    try {
      // Estratégia 1: Tentar abrir diretamente (funciona melhor em builds release)
      if (Platform.OS === 'android') {
        try {
          await Linking.openURL(instagramUrl);
          return true;
        } catch (directError) {
          console.log('Tentativa direta falhou, tentando com canOpenURL...', directError);
        }
      }

      // Estratégia 2: Verificar se pode abrir e então abrir
      const canOpen = await Linking.canOpenURL(instagramUrl);
      if (canOpen) {
        await Linking.openURL(instagramUrl);
        return true;
      }

      // Estratégia 3: Fallback para URL web
      if (fallbackUrl) {
        const canOpenFallback = await Linking.canOpenURL(fallbackUrl);
        if (canOpenFallback) {
          await Linking.openURL(fallbackUrl);
          return true;
        }
      }

      // Se chegou aqui, nenhuma estratégia funcionou
      throw new Error('Não foi possível abrir o Instagram');

    } catch (error) {
      console.error('Erro ao abrir Instagram:', error);

      if (options.showErrorAlert !== false) {
        Alert.alert(
          options.errorTitle || 'Instagram não encontrado',
          options.errorMessage || 'O Instagram não está instalado ou não pode ser aberto. Deseja abrir no navegador?',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Abrir no navegador',
              onPress: () => {
                if (fallbackUrl) {
                  Linking.openURL(fallbackUrl).catch(() => {
                    Alert.alert('Erro', 'Não foi possível abrir o link');
                  });
                }
              }
            }
          ]
        );
      }

      return false;
    }
  }

  /**
   * Abre WhatsApp de forma robusta
   */
  static async openWhatsApp(phone: string, message?: string, options: DeepLinkOptions = {}): Promise<boolean> {
    const encodedMessage = message ? encodeURIComponent(message) : '';
    const whatsappUrl = `whatsapp://send?phone=${phone}${message ? `&text=${encodedMessage}` : ''}`;
    const fallbackUrl = options.fallbackUrl || `https://wa.me/${phone}${message ? `?text=${encodedMessage}` : ''}`;

    try {
      // Estratégia similar ao Instagram
      if (Platform.OS === 'android') {
        try {
          await Linking.openURL(whatsappUrl);
          return true;
        } catch (directError) {
          console.log('Tentativa direta WhatsApp falhou, tentando com canOpenURL...', directError);
        }
      }

      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
        return true;
      }

      if (fallbackUrl) {
        const canOpenFallback = await Linking.canOpenURL(fallbackUrl);
        if (canOpenFallback) {
          await Linking.openURL(fallbackUrl);
          return true;
        }
      }

      throw new Error('Não foi possível abrir o WhatsApp');

    } catch (error) {
      console.error('Erro ao abrir WhatsApp:', error);

      if (options.showErrorAlert !== false) {
        Alert.alert(
          options.errorTitle || 'WhatsApp não encontrado',
          options.errorMessage || 'O WhatsApp não está instalado ou não pode ser aberto. Deseja abrir no navegador?',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Abrir no navegador',
              onPress: () => {
                if (fallbackUrl) {
                  Linking.openURL(fallbackUrl).catch(() => {
                    Alert.alert('Erro', 'Não foi possível abrir o link');
                  });
                }
              }
            }
          ]
        );
      }

      return false;
    }
  }

  /**
   * Método genérico para qualquer deep link
   */
  static async openDeepLink(
    appUrl: string,
    fallbackUrl?: string,
    options: DeepLinkOptions = {}
  ): Promise<boolean> {
    try {
      // Estratégia 1: Tentar abrir diretamente (Android)
      if (Platform.OS === 'android') {
        try {
          await Linking.openURL(appUrl);
          return true;
        } catch (directError) {
          console.log('Tentativa direta falhou, tentando com canOpenURL...', directError);
        }
      }

      // Estratégia 2: Verificar e abrir
      const canOpen = await Linking.canOpenURL(appUrl);
      if (canOpen) {
        await Linking.openURL(appUrl);
        return true;
      }

      // Estratégia 3: Fallback
      if (fallbackUrl) {
        const canOpenFallback = await Linking.canOpenURL(fallbackUrl);
        if (canOpenFallback) {
          await Linking.openURL(fallbackUrl);
          return true;
        }
      }

      throw new Error('Não foi possível abrir o aplicativo');

    } catch (error) {
      console.error('Erro ao abrir deep link:', error);

      if (options.showErrorAlert !== false) {
        Alert.alert(
          options.errorTitle || 'Aplicativo não encontrado',
          options.errorMessage || 'O aplicativo não está instalado ou não pode ser aberto.',
          [{ text: 'OK' }]
        );
      }

      return false;
    }
  }
}
