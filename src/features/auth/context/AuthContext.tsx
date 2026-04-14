// Following React Native Firebase v22 modular API patterns
// https://rnfirebase.io/migrating-to-v22
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import {
  firebaseAuth,
  firebaseDb,
  firebaseStorage,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as authSignOut,
  updateProfile,
  updateEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendEmailVerification,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  FirebaseAuthTypes,
} from '../../../config/firebase';
import { FavoriteItem, addToFavorites, removeFromFavorites, getUserFavorites } from '../../../services/favorites';
import { notificationService } from '../../../services/notificationService';
import { Business } from '../../../services/businesses';

// Tipos de usuário
export type UserType = 'client' | 'owner';

// Interface para o usuário autenticado
interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  userType?: UserType;
  businessId?: string;
  photoURL?: string | null;
}

// Interface para os dados de atualização de perfil
export interface UpdateProfileData {
  displayName?: string;
  email?: string;
  photoURL?: string;
}

// Interface para o contexto de autenticação
export interface AuthContextData {
  user: User | null;
  loading: boolean;
  favorites: FavoriteItem[];
  signIn: (email: string, password: string, expectedUserType?: UserType) => Promise<void>;
  signUp: (name: string, email: string, password: string, userType: UserType, establishmentName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  toggleFavorite: (businessData: Pick<Business, 'id' | 'name' | 'address' | 'rating' | 'imageUrl' | 'coverImage'>) => Promise<void>;
  refreshFavorites: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUserProfile: (data: UpdateProfileData) => Promise<void>;
  updateUserPassword: (password: string) => Promise<void>;
  reauthenticate: (password: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
}

// Criação do contexto
export const AuthContext = createContext<AuthContextData>({} as AuthContextData);

// Props para o provedor de autenticação
interface AuthProviderProps {
  children: ReactNode;
}

// Provedor de autenticação
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);

  // Monitor auth state changes with modular API
  useEffect(() => {
    const subscriber = onAuthStateChanged(firebaseAuth, async (firebaseAuthUser: FirebaseAuthTypes.User | null) => {
      if (firebaseAuthUser) {
        try {
          console.log('ðŸ” AuthContext: Buscando dados do usuário no Firestore para UID:', firebaseAuthUser.uid);
          const userDocRef = doc(firebaseDb, 'users', firebaseAuthUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          let userDataFromDb: User | null = null;

          if (userDocSnap.exists()) {
            const dbData = userDocSnap.data();
            console.log('âœ… AuthContext: Dados do usuário encontrados no Firestore:', { userType: dbData?.userType, businessId: dbData?.businessId });
            userDataFromDb = {
              uid: firebaseAuthUser.uid,
              email: firebaseAuthUser.email,
              displayName: firebaseAuthUser.displayName,
              photoURL: firebaseAuthUser.photoURL,
              userType: dbData?.userType as UserType,
              businessId: dbData?.businessId,
            };
            setUser(userDataFromDb);
          } else {
            console.log('âš ௸ AuthContext: Usuário não encontrado no Firestore, usando dados básicos do Auth');
            userDataFromDb = {
              uid: firebaseAuthUser.uid,
              email: firebaseAuthUser.email,
              displayName: firebaseAuthUser.displayName,
              photoURL: firebaseAuthUser.photoURL,
            };
            setUser(userDataFromDb);
          }

          if (userDataFromDb && userDataFromDb.userType === 'client') {
            console.log('ðŸ”„ AuthContext: Carregando favoritos para cliente');
            await refreshFavoritesInternal();
          }
        } catch (error) {
          console.error('࢝Œ AuthContext: Erro ao buscar dados do usuário no Firestore:', error);
          setUser(null);
          setFavorites([]);
        }
      } else {
        console.log('ðŸ”“ AuthContext: Usuário não autenticado');
        setUser(null);
        setFavorites([]);
      }
      setLoading(false);
    });

    return subscriber; // unsubscribe on unmount
  }, []);

  const refreshFavoritesInternal = async () => {
    try {
      console.log('ðŸ”„ AuthContext: Carregando favoritos do usuário');
      const userFavorites = await getUserFavorites();
      console.log('âœ… AuthContext: Favoritos carregados com sucesso:', userFavorites.length, 'items');
      setFavorites(userFavorites);
    } catch (error) {
      console.error('࢝Œ AuthContext: Erro ao carregar favoritos:', error);
      setFavorites([]);
    }
  };

  const refreshFavorites = async () => {
    if (user) {
      await refreshFavoritesInternal();
    }
  };

  const toggleFavorite = async (businessData: Pick<Business, 'id' | 'name' | 'address' | 'rating' | 'imageUrl' | 'coverImage'>) => {
    if (!user) {
      throw new Error('Usuário não autenticado para favoritar.');
    }
    try {
      const isCurrentlyFavorite = favorites.some(fav => fav.businessId === businessData.id);
      if (isCurrentlyFavorite) {
        await removeFromFavorites(businessData.id);
      } else {
        const businessToAdd: Business = {
          ...businessData,
          ownerId: '', description: '', phone: '', email: '', category: '',
          reviewCount: 0, workingHours: {} as never, policies: {} as never,
          notifications: {} as never, paymentMethods: {} as never,
          defaultCommissionRate: 0, active: true, createdAt: new Date(),
          updatedAt: new Date(), logo: '',
        };
        await addToFavorites(businessToAdd);
      }
      await refreshFavoritesInternal();
    } catch (error) {
      throw error;
    }
  };

  // Sign in function using modular API
  const signIn = async (email: string, password: string, expectedUserType?: UserType) => {
    try {
      setLoading(true);
      const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
      if (userCredential.user) {
        const userDocRef = doc(firebaseDb, 'users', userCredential.user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          const actualUserType = userData?.userType as UserType;

          if (expectedUserType && actualUserType !== expectedUserType) {
            await authSignOut(firebaseAuth);
            throw new Error(`Esta conta é de ${actualUserType === 'client' ? 'cliente' : 'proprietário'}. Para acessar como ${expectedUserType === 'client' ? 'cliente' : 'proprietário'}, use a conta correta.`);
          }

          if (actualUserType === 'client') {
            await refreshFavoritesInternal();
          }
        } else {
          await authSignOut(firebaseAuth);
          throw new Error('Dados do usuário não encontrados. Entre em contato com o suporte.');
        }
      }
      // Solicitar permissão de notificação e registrar token FCM após login
      try {
        const loggedUser = firebaseAuth.currentUser;
        if (loggedUser) {
          notificationService.requestUserPermission(loggedUser.uid);
        }
      } catch { /* silencioso */ }
    } catch (error) {
      const err = error as { code: string; message?: string };
      let errorMessage = err.message || 'Ocorreu um erro durante o login.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        errorMessage = 'E-mail ou senha incorretos. Verifique seus dados.';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'E-mail inválido. Verifique o formato.';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Muitas tentativas de login. Tente novamente mais tarde.';
      }
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (name: string, email: string, password: string, userType: UserType, establishmentName?: string) => {
    try {
      setLoading(true);
      const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      const firebaseAuthUser = userCredential.user;

      await updateProfile(firebaseAuthUser, { displayName: name });

      const userDataForFirestore = {
        uid: firebaseAuthUser.uid, 
        name, 
        email, 
        userType,
        createdAt: serverTimestamp(),
      };
      const userDocRef = doc(firebaseDb, 'users', firebaseAuthUser.uid);
      await setDoc(userDocRef, userDataForFirestore);

      if (userType === 'owner' && establishmentName) {
        // Criar documento na coleção 'businesses' para o novo negócio
        const { addDoc, collection: fsCollection } = await import('@react-native-firebase/firestore');
        const businessRef = await addDoc(fsCollection(firebaseDb, 'businesses'), {
          ownerId: firebaseAuthUser.uid,
          name: establishmentName,
          nameLowercase: establishmentName.toLowerCase(),
          description: '',
          address: '',
          phone: '',
          email: email,
          logo: '',
          coverImage: '',
          imageUrl: '',
          category: '',
          rating: 0,
          reviewCount: 0,
          active: true,
          workingHours: {
            sunday:    { open: false, start: '09:00', end: '18:00' },
            monday:    { open: true,  start: '09:00', end: '18:00' },
            tuesday:   { open: true,  start: '09:00', end: '18:00' },
            wednesday: { open: true,  start: '09:00', end: '18:00' },
            thursday:  { open: true,  start: '09:00', end: '18:00' },
            friday:    { open: true,  start: '09:00', end: '18:00' },
            saturday:  { open: true,  start: '09:00', end: '14:00' },
          },
          policies: {
            cancellationTimeLimit: 24,
            cancellationFee: 0,
            noShowFee: 0,
            advanceBookingLimit: 30,
          },
          notifications: {
            confirmationEnabled: true,
            reminderEnabled: true,
            reminderTime: 60,
          },
          paymentMethods: {
            cash: true, creditCard: false, debitCard: false,
            pix: false, transfer: false, inApp: false,
          },
          defaultCommissionRate: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        // Salvar businessId no documento do usuário
        await updateDoc(doc(firebaseDb, 'users', firebaseAuthUser.uid), {
          businessId: businessRef.id,
        });

        // Criar documento na coleção 'owners' com referência ao negócio
        const ownerDocRef = doc(firebaseDb, 'owners', firebaseAuthUser.uid);
        await setDoc(ownerDocRef, {
          userId: firebaseAuthUser.uid,
          businessId: businessRef.id,
          businessName: establishmentName,
          createdAt: serverTimestamp(),
        });
      }

      if (userType === 'client') {
        const clientData = {
          userId: firebaseAuthUser.uid,
          createdAt: serverTimestamp(),
        };
        const clientDocRef = doc(firebaseDb, 'clients', firebaseAuthUser.uid);
        await setDoc(clientDocRef, clientData);
        setFavorites([]);
      }

      // Reler o documento para pegar o businessId persistido
      const updatedDoc = await getDoc(doc(firebaseDb, 'users', firebaseAuthUser.uid));
      const updatedData = updatedDoc.exists() ? updatedDoc.data() : {};
      setUser({
        uid: firebaseAuthUser.uid,
        email: firebaseAuthUser.email,
        displayName: name,
        userType,
        businessId: updatedData?.businessId,
      });
    } catch (error) {
      const err = error as { code: string };
      let errorMessage = 'Ocorreu um erro durante o cadastro.';
      if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'Este e-mail já está em uso. Tente outro ou faça login.';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'E-mail inválido. Verifique o formato.';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'Senha muito fraca. Use pelo menos 6 caracteres.';
      }
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await authSignOut(firebaseAuth);
      setFavorites([]);
      // Limpeza do AsyncStorage...
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    const firebaseAuthUser = firebaseAuth.currentUser;
    if (!firebaseAuthUser) return;

    try {
      await firebaseAuthUser.reload();
      const refreshedAuthUser = firebaseAuth.currentUser;
      if (!refreshedAuthUser) return;

      const userDocRef = doc(firebaseDb, 'users', refreshedAuthUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const dbData = userDocSnap.data();
        setUser({
          uid: refreshedAuthUser.uid, 
          email: refreshedAuthUser.email,
          displayName: refreshedAuthUser.displayName, 
          photoURL: refreshedAuthUser.photoURL,
          userType: dbData?.userType as UserType, 
          businessId: dbData?.businessId,
        });
      }
    } catch (error) {
      console.error("Erro ao recarregar usuário:", error);
    }
  };

  const reauthenticate = async (password: string) => {
    const firebaseAuthUser = firebaseAuth.currentUser;
    if (!firebaseAuthUser || !firebaseAuthUser.email) {
      throw new Error('Usuário não encontrado ou sem e-mail para reautenticar.');
    }
    const credential = EmailAuthProvider.credential(firebaseAuthUser.email, password);
    try {
      await reauthenticateWithCredential(firebaseAuthUser, credential);
    } catch (error) {
      const err = error as { code: string };
      if (err.code === 'auth/wrong-password') {
        throw new Error('Senha atual incorreta.');
      }
      throw new Error('Erro ao reautenticar. Tente novamente.');
    }
  };

  const updateUserProfile = async (data: UpdateProfileData) => {
    const firebaseAuthUser = firebaseAuth.currentUser;
    if (!firebaseAuthUser) throw new Error('Usuário não autenticado.');

    try {
      let photoURL = data.photoURL;
      if (photoURL && (photoURL.startsWith('file://') || photoURL.startsWith('content://'))) {
        const filename = `users/${firebaseAuthUser.uid}/avatar`;
        const storageRef = firebaseStorage.ref(filename);
        // @react-native-firebase usa putFile para URIs locais
        await storageRef.putFile(photoURL.replace('file://', ''));
        photoURL = await storageRef.getDownloadURL();
      }

      const profileUpdateData: { displayName?: string; photoURL?: string } = {};
      if (data.displayName) profileUpdateData.displayName = data.displayName;
      if (photoURL) profileUpdateData.photoURL = photoURL;

      if (Object.keys(profileUpdateData).length > 0) {
        await updateProfile(firebaseAuthUser, profileUpdateData);
      }

      if (data.email && data.email !== firebaseAuthUser.email) {
        await updateEmail(firebaseAuthUser, data.email);
      }

      const userDocRef = doc(firebaseDb, 'users', firebaseAuthUser.uid);
      const userDataToUpdate: { [key: string]: unknown } = {};
      if (data.displayName) userDataToUpdate.name = data.displayName;
      if (data.email) userDataToUpdate.email = data.email;
      if (photoURL) userDataToUpdate.photoURL = photoURL;

      if (Object.keys(userDataToUpdate).length > 0) {
        await updateDoc(userDocRef, userDataToUpdate as Record<string, unknown>);
      }
      await refreshUser();
    } catch (error) {
      const err = error as { code: string; message: string };
      if (err.code === 'auth/requires-recent-login') {
        throw new Error('Esta operação é sensível e requer autenticação recente. Por favor, faça login novamente.');
      }
      throw new Error(`Erro ao atualizar o perfil: ${err.message || 'Causa desconhecida'}`);
    }
  };

  const updateUserPassword = async (password: string) => {
    const firebaseAuthUser = firebaseAuth.currentUser;
    if (!firebaseAuthUser) throw new Error('Usuário não autenticado.');
    try {
      await updatePassword(firebaseAuthUser, password);
    } catch (error) {
      const err = error as { code: string };
      if (err.code === 'auth/requires-recent-login') {
        throw new Error('Esta operação é sensível e requer autenticação recente. Por favor, faça login novamente.');
      }
      throw new Error('Erro ao atualizar a senha.');
    }
  };

  const sendVerificationEmail = async () => {
    const firebaseAuthUser = firebaseAuth.currentUser;
    if (!firebaseAuthUser) throw new Error('Usuário não autenticado.');
    try {
      await sendEmailVerification(firebaseAuthUser);
    } catch {
      throw new Error('Erro ao enviar e-mail de verificação.');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user, loading, favorites, signIn, signUp, signOut,
        toggleFavorite, refreshFavorites, refreshUser, updateUserProfile,
        updateUserPassword, reauthenticate, sendVerificationEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextData {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
