import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../auth/context/AuthContext';
import { colors } from '../../constants/colors';
import { AppStackParamList } from '../../types/types';
import { Chat, getUserConversationsAsync } from '../../services/chat';

type ChatManagementNavigationProp = StackNavigationProp<AppStackParamList>;

const ChatManagementScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<ChatManagementNavigationProp>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [conversations, setConversations] = useState<Chat[]>([]);
  const insets = useSafeAreaInsets();

  const loadConversations = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Buscar conversas onde o usuário atual é um dos participantes
      const conversationsData = await getUserConversationsAsync(user.uid);
      // Filtrar apenas conversas onde o usuário é owner (pode ter businessId)
      const ownerConversations = conversationsData.filter(chat =>
        chat.ownerId === user.uid || chat.businessId,
      );
      setConversations(ownerConversations);
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [loadConversations]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  }, [loadConversations]);

  const handleConversationPress = (conversation: Chat) => {
    // Encontrar o ID do outro usuário (cliente)
    const otherUserId = conversation.participants.find(p => p !== user?.uid);
    if (!otherUserId) return;

    navigation.navigate('Chat', {
      chatId: conversation.id,
      otherUserId: otherUserId,
      otherUserName: conversation.businessName ? `Cliente - ${conversation.businessName}` : 'Cliente',
      businessId: conversation.businessId,
      businessName: conversation.businessName,
    });
  };

  const renderConversationItem = ({ item }: { item: Chat }) => {
    const lastMessageTime = item.lastMessage?.createdAt ? new Date(item.lastMessage.createdAt) : new Date();
    const hasUnreadMessages = (item.unreadCount || 0) > 0;
    const otherUserId = item.participants.find((p: string) => p !== user?.uid);

    return (
      <TouchableOpacity
        style={[
          styles.conversationItem,
          hasUnreadMessages && styles.unreadConversation,
        ]}
        onPress={() => handleConversationPress(item)}
      >
        <View style={styles.avatarContainer}>
          <Icon name="person" size={24} color={colors.white} />
        </View>
        <View style={styles.conversationInfo}>
          <View style={styles.conversationHeader}>
            <Text style={[
              styles.clientName,
              hasUnreadMessages && styles.unreadText,
            ]}>
              {item.businessName ? `Cliente - ${item.businessName}` : `Cliente ${otherUserId?.slice(0, 8) || 'Desconhecido'}`}
            </Text>
            <Text style={styles.messageTime}>
              {lastMessageTime.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
              })}
            </Text>
          </View>
          <View style={styles.messagePreview}>
            <Text
              style={[
                styles.lastMessage,
                hasUnreadMessages && styles.unreadText,
              ]}
              numberOfLines={1}
            >
              {item.lastMessage?.text || 'Nenhuma mensagem'}
            </Text>
            {hasUnreadMessages && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCount}>{item.unreadCount || 0}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mensagens</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Carregando conversas...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mensagens</Text>
        <View style={styles.headerSpacer} />
      </View>

      {conversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="chat" size={64} color={colors.lightGray} />
          <Text style={styles.emptyTitle}>Nenhuma conversa ainda</Text>
          <Text style={styles.emptyText}>
            As conversas com seus clientes aparecerão aqui quando eles enviarem mensagens.
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderConversationItem}
          keyExtractor={(item) => item.id}
          style={styles.conversationsList}
          contentContainerStyle={{ paddingBottom: insets.bottom }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.text,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 22,
  },
  conversationsList: {
    flex: 1,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  unreadConversation: {
    backgroundColor: '#f8f9fa',
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  conversationInfo: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  messageTime: {
    fontSize: 12,
    color: colors.lightText,
  },
  messagePreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    color: colors.lightText,
    flex: 1,
  },
  unreadText: {
    fontWeight: 'bold',
    color: colors.text,
  },
  unreadBadge: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  unreadCount: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.white,
  },
});

export default ChatManagementScreen;