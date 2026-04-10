import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Alert,
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
  TouchableWithoutFeedback,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useRoute, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../constants/colors';
import { Message, getChatMessages, sendMessage, createOrGetChat, deleteMessage } from '../../services/chat';
import { useAuth } from '../auth/context/AuthContext';

interface ChatScreenParams {
  chatId?: string;
  businessId?: string;
  businessName?: string;
  otherUserId: string;
  otherUserName: string;
  professionalId?: string;
  professionalName?: string;
  initialConversationId?: string;
  chatWithUserName?: string;
}

const ChatScreen: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [chatId, setChatId] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const route = useRoute();
  const navigation = useNavigation();
  const flatListRef = useRef<FlatList>(null);
  const { user } = useAuth();
  const { chatId: initialChatId, otherUserId, otherUserName } = route.params as ChatScreenParams;
  const insets = useSafeAreaInsets();

  const initializeChat = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const params = route.params as ChatScreenParams;
      const newChatId = await createOrGetChat(
        user.uid,
        otherUserId,
        params.businessId,
        params.businessName,
      );
      setChatId(newChatId);
    } catch (error) {
      // Handle error
      console.error('Erro ao criar/obter chat:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, otherUserId, route.params]);

  useEffect(() => {
    if (initialChatId) {
      setChatId(initialChatId);
    } else {
      initializeChat();
    }
  }, [initialChatId, initializeChat]);

  useEffect(() => {
    if (!chatId) return;

    const unsubscribe = getChatMessages(chatId, (loadedMessages) => {
      console.log('Mensagens recebidas do chat:', loadedMessages);
      setMessages(loadedMessages);
      if (isLoading) setIsLoading(false);
    });

    return () => unsubscribe();
  }, [chatId, isLoading]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !chatId || !user) return;

    try {
      await sendMessage(chatId, user.uid, newMessage.trim());
      setNewMessage('');
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      Alert.alert(
        'Erro ao enviar',
        'NÃƒÆ’Ã‚Â£o foi possÃƒÆ’Ã‚Â­vel enviar sua mensagem. Tente novamente.',
        [{ text: 'OK' }],
      );
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!chatId) return;

    Alert.alert(
      'Excluir Mensagem',
      'Tem certeza de que deseja excluir esta mensagem?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Excluir',
          onPress: async () => {
            try {
              await deleteMessage(chatId, messageId);
            } catch (error) {
              console.error('Erro ao excluir mensagem:', error);
              Alert.alert('Erro', 'NÃƒÆ’Ã‚Â£o foi possÃƒÆ’Ã‚Â­vel excluir a mensagem.');
            }
          },
          style: 'destructive',
        },
      ],
      { cancelable: false },
    );
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMyMessage = item.senderId === user?.uid;
    const messageTime = item.createdAt?.toDate ? item.createdAt.toDate() : new Date();

    return (
      <TouchableWithoutFeedback onPress={() => setSelectedMessage(null)} onLongPress={() => isMyMessage && setSelectedMessage(item.id)}>
        <View style={[styles.messageContainer, isMyMessage ? styles.myMessage : styles.otherMessage]}>
          {isMyMessage && selectedMessage === item.id && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteMessage(item.id)}
            >
              <Icon name="delete" size={20} color={colors.white} />
            </TouchableOpacity>
          )}
          <View style={isMyMessage ? styles.myMessageContent : styles.otherMessageContent}>
            <Text style={[styles.messageText, isMyMessage ? styles.myMessageText : styles.otherMessageText]}>
              {item.text}
            </Text>
            <Text style={[styles.messageTime, isMyMessage ? styles.myMessageTime : styles.otherMessageTime]}>
              {messageTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>
      </TouchableWithoutFeedback>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Carregando conversa...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Icon name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {otherUserName}
            </Text>
            <Text style={styles.headerSubtitle}>
              {user?.uid === otherUserId ? 'VocÃƒÆ’Ã‚Âª' : 'Outro usuÃƒÆ’Ã‚Â¡rio'}
            </Text>
          </View>
          <TouchableOpacity style={styles.headerAction}>
            <Icon name="phone" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }}
          onLayout={() => {
            flatListRef.current?.scrollToEnd({ animated: false });
          }}
          keyboardShouldPersistTaps="handled"
        />

        <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TextInput
            style={styles.textInput}
            placeholder="Digite sua mensagem..."
            placeholderTextColor={colors.lightText}
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={500}
            onFocus={() => {
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }, 300);
            }}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              newMessage.trim() ? styles.sendButtonActive : styles.sendButtonInactive,
            ]}
            onPress={handleSendMessage}
            disabled={!newMessage.trim()}
          >
            <Icon
              name="send"
              size={20}
              color={newMessage.trim() ? colors.white : colors.lightText}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.lightText,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.lightText,
    marginTop: 2,
  },
  headerAction: {
    marginLeft: 12,
    padding: 4,
  },
  messagesList: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  messagesContent: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 12,
    maxWidth: '80%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  myMessageContent: {
    flex: 1,
  },
  otherMessageContent: {
    flex: 1,
  },
  deleteButton: {
    padding: 8,
    marginRight: 8,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: colors.white,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    elevation: 1,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  senderName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  myMessageText: {
    color: colors.white,
  },
  otherMessageText: {
    color: colors.text,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  otherMessageTime: {
    color: colors.lightText,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.lightGray,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.lightGray,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 12,
    maxHeight: 100,
    fontSize: 16,
    color: colors.text,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonActive: {
    backgroundColor: colors.primary,
  },
  sendButtonInactive: {
    backgroundColor: colors.lightGray,
  },
});

export default ChatScreen;