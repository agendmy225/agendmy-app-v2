import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  REMEMBER_LOGIN: 'remember_login',
  SAVED_EMAIL: 'saved_email',
  SAVED_PASSWORD: 'saved_password',
};

export interface SavedLoginData {
  email: string;
  password: string;
  remember: boolean;
}

export const saveLoginData = async (data: SavedLoginData): Promise<void> => {
  try {
    if (data.remember) {
      await AsyncStorage.setItem(STORAGE_KEYS.SAVED_EMAIL, data.email);
      await AsyncStorage.setItem(STORAGE_KEYS.SAVED_PASSWORD, data.password);
      await AsyncStorage.setItem(STORAGE_KEYS.REMEMBER_LOGIN, 'true');
    } else {
      await clearLoginData();
    }
  } catch (error) {
    // console.error('Erro ao salvar dados de login:', error);
  }
};

export const getSavedLoginData = async (): Promise<SavedLoginData | null> => {
  try {
    const remember = await AsyncStorage.getItem(STORAGE_KEYS.REMEMBER_LOGIN);
    if (remember === 'true') {
      const email = await AsyncStorage.getItem(STORAGE_KEYS.SAVED_EMAIL);
      const password = await AsyncStorage.getItem(STORAGE_KEYS.SAVED_PASSWORD);

      if (email && password) {
        return {
          email,
          password,
          remember: true,
        };
      }
    }
    return null;
  } catch (error) {
    // console.error('Erro ao recuperar dados de login:', error);
    return null;
  }
};

export const clearLoginData = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.SAVED_EMAIL);
    await AsyncStorage.removeItem(STORAGE_KEYS.SAVED_PASSWORD);
    await AsyncStorage.removeItem(STORAGE_KEYS.REMEMBER_LOGIN);
  } catch (error) {
    // console.error('Erro ao limpar dados de login:', error);
  }
};
