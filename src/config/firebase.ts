// React Native Firebase v22 - Modular API following official documentation
// https://rnfirebase.io/migrating-to-v22

import { getFirestore } from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';
import storageModule from '@react-native-firebase/storage';
import { getFunctions } from '@react-native-firebase/functions';

// Initialize Firebase instances following v22 patterns
export const firebaseDb = getFirestore();
export const firebaseAuth = getAuth();
export const firebaseStorage = storageModule();
export const firebaseFunctions = getFunctions();

// For backward compatibility, keep some exports
export const db = firebaseDb;
export const auth = firebaseAuth;
export const firestore = firebaseDb;
export const storage = firebaseStorage; // Adicionar storage export

// Re-export all Firestore modular functions
export {
  // Collection and document references
  collection,
  collectionGroup,
  doc,
  // Query functions
  query,
  where,
  orderBy,
  limit,
  startAt,
  startAfter,
  endAt,
  endBefore,
  // Read operations
  getDoc,
  getDocs,
  onSnapshot,
  // Write operations
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  // Field values and timestamps
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  increment,
  deleteField,
  // Firestore types
  Timestamp,
  GeoPoint,
  FieldValue,
  // Batch operations
  writeBatch,
  // Transactions
  runTransaction,
} from '@react-native-firebase/firestore';

// Re-export Auth modular functions
export {
  // Auth state
  onAuthStateChanged,
  // Sign in methods
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  // User management
  updateProfile,
  updateEmail,
  updatePassword,
  deleteUser,
  sendEmailVerification,
  sendPasswordResetEmail,
  reauthenticateWithCredential,
  EmailAuthProvider,
  // Token management
  getIdToken,
  getIdTokenResult,
} from '@react-native-firebase/auth';

// Re-export Storage modular functions
export {
  ref as storageRef,
  ref, // Adicionar ref com nome original
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  listAll,
  getMetadata,
  updateMetadata,
} from '@react-native-firebase/storage';

// Re-export Functions modular functions
export {
  httpsCallable,
  connectFunctionsEmulator,
} from '@react-native-firebase/functions';

// Re-export types for TypeScript support
export type { FirebaseAuthTypes } from '@react-native-firebase/auth';
export type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
export type { FirebaseStorageTypes } from '@react-native-firebase/storage';
export type { FirebaseFunctionsTypes } from '@react-native-firebase/functions';