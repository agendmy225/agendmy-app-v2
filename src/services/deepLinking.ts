import { Linking, Alert, Platform } from 'react-native';

export interface DeepLinkOptions {
  fallbackUrl?: string;
  showErrorAlert?: boolean;
  errorTitle?: string;
  errorMessage?: string;
}

/**
 * Abre um deep link de forma robusta, especialmente para Android 11+ (API 30+)
 * com targetSdkVersion 35. Implementa estratÃƒÆ’Ã‚Â©gias mÃƒÆ’Ã‚Âºltiplas para garantir
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
      // EstratÃƒÆ’Ã‚Â©gia 1: Tentar abrir diretamente (funciona melhor em builds release)
      if (Platform.OS === 'android') {
        try {
          await Linking.openURL(instagramUrl);
          return true;
        } catch (directError) {
          console.log('Tentativa direta falhou, tentando com canOpenURL...', directError);
        }
      }

      // EstratÃƒÆ’Ã‚Â©gia 2: Verificar se pode abrir e entÃƒÆ’Ã‚Â£o abrir
      const canOpen = await Linking.canOpenURL(instagramUrl);
      if (canOpen) {
        await Linking.openURL(instagramUrl);
        return true;
      }

      // EstratÃƒÆ’Ã‚Â©gia 3: Fallback para URL web
      if (fallbackUrl) {
        const canOpenFallback = await Linking.canOpenURL(fallbackUrl);
        if (canOpenFallback) {
          await Linking.openURL(fallbackUrl);
          return true;
        }
      }

      // Se chegou aqui, nenhuma estratÃƒÆ’Ã‚Â©gia funcionou
      throw new Error('NÃƒÆ’Ã‚Â£o foi possÃƒÆ’Ã‚Â­vel abrir o Instagram');

    } catch (error) {
      console.error('Erro ao abrir Instagram:', error);

      if (options.showErrorAlert !== false) {
        Alert.alert(
          options.errorTitle || 'Instagram nÃƒÆ’Ã‚Â£o encontrado',
          options.errorMessage || 'O Instagram nÃƒÆ’Ã‚Â£o estÃƒÆ’Ã‚Â¡ instalado ou nÃƒÆ’Ã‚Â£o pode ser aberto. Deseja abrir no navegador?',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Abrir no navegador',
              onPress: () => {
                if (fallbackUrl) {
                  Linking.openURL(fallbackUrl).catch(() => {
                    Alert.alert('Erro', 'NÃƒÆ’Ã‚Â£o foi possÃƒÆ’Ã‚Â­vel abrir o link');
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
      // EstratÃƒÆ’Ã‚Â©gia similar ao Instagram
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

      throw new Error('NÃƒÆ’Ã‚Â£o foi possÃƒÆ’Ã‚Â­vel abrir o WhatsApp');

    } catch (error) {
      console.error('Erro ao abrir WhatsApp:', error);

      if (options.showErrorAlert !== false) {
        Alert.alert(
          options.errorTitle || 'WhatsApp nÃƒÆ’Ã‚Â£o encontrado',
          options.errorMessage || 'O WhatsApp nÃƒÆ’Ã‚Â£o estÃƒÆ’Ã‚Â¡ instalado ou nÃƒÆ’Ã‚Â£o pode ser aberto. Deseja abrir no navegador?',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Abrir no navegador',
              onPress: () => {
                if (fallbackUrl) {
                  Linking.openURL(fallbackUrl).catch(() => {
                    Alert.alert('Erro', 'NÃƒÆ’Ã‚Â£o foi possÃƒÆ’Ã‚Â­vel abrir o link');
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
   * MÃƒÆ’Ã‚Â©todo genÃƒÆ’Ã‚Â©rico para qualquer deep link
   */
  static async openDeepLink(
    appUrl: string,
    fallbackUrl?: string,
    options: DeepLinkOptions = {}
  ): Promise<boolean> {
    try {
      // EstratÃƒÆ’Ã‚Â©gia 1: Tentar abrir diretamente (Android)
      if (Platform.OS === 'android') {
        try {
          await Linking.openURL(appUrl);
          return true;
        } catch (directError) {
          console.log('Tentativa direta falhou, tentando com canOpenURL...', directError);
        }
      }

      // EstratÃƒÆ’Ã‚Â©gia 2: Verificar e abrir
      const canOpen = await Linking.canOpenURL(appUrl);
      if (canOpen) {
        await Linking.openURL(appUrl);
        return true;
      }

      // EstratÃƒÆ’Ã‚Â©gia 3: Fallback
      if (fallbackUrl) {
        const canOpenFallback = await Linking.canOpenURL(fallbackUrl);
        if (canOpenFallback) {
          await Linking.openURL(fallbackUrl);
          return true;
        }
      }

      throw new Error('NÃƒÆ’Ã‚Â£o foi possÃƒÆ’Ã‚Â­vel abrir o aplicativo');

    } catch (error) {
      console.error('Erro ao abrir deep link:', error);

      if (options.showErrorAlert !== false) {
        Alert.alert(
          options.errorTitle || 'Aplicativo nÃƒÆ’Ã‚Â£o encontrado',
          options.errorMessage || 'O aplicativo nÃƒÆ’Ã‚Â£o estÃƒÆ’Ã‚Â¡ instalado ou nÃƒÆ’Ã‚Â£o pode ser aberto.',
          [{ text: 'OK' }]
        );
      }

      return false;
    }
  }
}
