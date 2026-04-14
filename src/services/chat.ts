// Following React Native Firebase v22 modular API patterns
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from '@react-native-firebase/firestore';
import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { firebaseDb } from '../config/firebase';

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  createdAt: any;
  isRead: boolean;
}

export interface Chat {
  id: string;
  participants: string[];
  lastMessage: Message | null;
  updatedAt: any;
  lastMessageTime?: any;
  unreadCount?: number;
  clientId?: string;
  businessId?: string;
  ownerId?: string; // ID do proprietário do estabelecimento
  businessName?: string; // Nome do estabelecimento para facilitar exibição
}

export type Conversation = Chat;

export const createOrGetChat = async (currentUserId: string, otherUserId: string, businessId?: string, businessName?: string): Promise<string> => {
  // Validação reforçada: ambos UIDs devem ser strings diferentes e não vazias
  if (
    !currentUserId ||
    !otherUserId ||
    typeof currentUserId !== 'string' ||
    typeof otherUserId !== 'string' ||
    currentUserId === otherUserId
  ) {
    throw new Error('IDs de participantes inválidos para criação de chat.');
  }

  const chatsRef = collection(firebaseDb, 'chats');
  const q = query(
    chatsRef,
    where('participants', 'array-contains', currentUserId),
  );

  const querySnapshot = await getDocs(q);
  let existingChat: Chat | null = null;

  querySnapshot.forEach((docSnap: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
    const chat = { id: docSnap.id, ...docSnap.data() } as Chat;
    if (Array.isArray(chat.participants) && chat.participants.includes(otherUserId)) {
      existingChat = chat;
    }
  });

  if (existingChat !== null) {
    return (existingChat as Chat).id;
  }

  // Garante que participants sempre será um array de duas strings distintas
  const participants = [currentUserId, otherUserId];

  // Dados do chat para criação
  const chatData: any = {
    participants,
    lastMessage: null,
    updatedAt: serverTimestamp(),
  };

  // Se temos informaçÃµes do negócio, adicionar aos dados
  if (businessId) {
    chatData.businessId = businessId;
  }
  if (businessName) {
    chatData.businessName = businessName;
  }

  // Tentar identificar quem é client e quem é owner baseado nas coleçÃµes
  try {
    // Verificar se currentUserId está na coleção clients
    const clientDoc = await getDocs(query(collection(firebaseDb, 'clients'), where('userId', '==', currentUserId)));

    if (!clientDoc.empty) {
      chatData.clientId = currentUserId;
      chatData.ownerId = otherUserId;
    } else {
      // Verificar se otherUserId está na coleção clients
      const otherClientDoc = await getDocs(query(collection(firebaseDb, 'clients'), where('userId', '==', otherUserId)));
      if (!otherClientDoc.empty) {
        chatData.clientId = otherUserId;
        chatData.ownerId = currentUserId;
      }
    }
  } catch (error) {
    // Se não conseguir identificar, continua sem esses campos específicos
    console.log('Não foi possível identificar tipos de usuário:', error);
  }

  const newChatRef = await addDoc(chatsRef, chatData);

  return newChatRef.id;
};

export const sendMessage = async (chatId: string, senderId: string, text: string): Promise<void> => {
  try {
    const messagesCollection = collection(firebaseDb, 'chats', chatId, 'messages');
    const messageData = {
      senderId,
      text,
      createdAt: serverTimestamp(),
      isRead: false,
    };
    await addDoc(messagesCollection, messageData);

    const chatRef = doc(firebaseDb, 'chats', chatId);
    await updateDoc(chatRef, {
      lastMessage: {
        text,
        createdAt: serverTimestamp(),
      },
      updatedAt: serverTimestamp(),
    });
  } catch {
    throw new Error('Erro ao enviar mensagem');
  }
};

export const deleteMessage = async (chatId: string, messageId: string): Promise<void> => {
  try {
    const messageRef = doc(firebaseDb, 'chats', chatId, 'messages', messageId);
    await deleteDoc(messageRef);
  } catch (error) {
    console.error('Erro ao excluir mensagem:', error);
    throw new Error('Não foi possível excluir a mensagem. Tente novamente.');
  }
};

export const getChatMessages = (chatId: string, callback: (messages: Message[]) => void): (() => void) => {
  const messagesCollection = collection(firebaseDb, 'chats', chatId, 'messages');
  const q = query(messagesCollection, orderBy('createdAt', 'asc'));

  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const messages: Message[] = [];
    querySnapshot.forEach((docSnap: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
      messages.push({ id: docSnap.id, chatId, ...docSnap.data() } as Message);
    });
    callback(messages);
  });

  return unsubscribe;
};

export const getChatList = (userId: string, callback: (chats: Chat[]) => void): (() => void) => {
  const chatsCollection = collection(firebaseDb, 'chats');
  const q = query(chatsCollection, where('participants', 'array-contains', userId));

  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const chats: Chat[] = [];
    querySnapshot.forEach((docSnap: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
      chats.push({ id: docSnap.id, ...docSnap.data() } as Chat);
    });
    callback(chats);
  });

  return unsubscribe;
};

// Alias for compatibility
export const getOrCreateConversation = createOrGetChat;
export const getUserConversations = getChatList;

// New async function for getting conversations (for screens that need async pattern)
export const getUserConversationsAsync = async (userId: string): Promise<Chat[]> => {
  const chatsCollection = collection(firebaseDb, 'chats');
  const q = query(chatsCollection, where('participants', 'array-contains', userId));

  const querySnapshot = await getDocs(q);
  const chats: Chat[] = [];

  querySnapshot.forEach((docSnap: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
    chats.push({ id: docSnap.id, ...docSnap.data() } as Chat);
  });

  return chats;
};
