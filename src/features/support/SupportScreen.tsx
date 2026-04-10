import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { AppStackParamList } from '../../types/types';
import { colors } from '../../constants/colors';

type SupportScreenNavigationProp = StackNavigationProp<AppStackParamList, 'Support'>;

const SupportScreen: React.FC = () => {
  const navigation = useNavigation<SupportScreenNavigationProp>();
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const supportTopics = [
    {
      id: 'account',
      title: 'Problemas com a conta',
      icon: 'account-circle',
      description: 'Login, senha, dados pessoais',
    },
    {
      id: 'booking',
      title: 'Agendamentos',
      icon: 'event',
      description: 'Problemas com reservas e horÃƒÆ’Ã‚Â¡rios',
    },
    {
      id: 'payment',
      title: 'Pagamentos',
      icon: 'payment',
      description: 'CobranÃƒÆ’Ã‚Â§as, reembolsos, cartÃƒÆ’Ã‚Âµes',
    },
    {
      id: 'technical',
      title: 'Problemas tÃƒÆ’Ã‚Â©cnicos',
      icon: 'build',
      description: 'Erros no app, travamentos',
    },
    {
      id: 'other',
      title: 'Outros assuntos',
      icon: 'help-outline',
      description: 'SugestÃƒÆ’Ã‚Âµes, reclamaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes gerais',
    },
  ];

  const handleSendMessage = async () => {
    if (!selectedTopic) {
      Alert.alert('AtenÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o', 'Por favor, selecione um tÃƒÆ’Ã‚Â³pico para sua mensagem.');
      return;
    }

    if (!message.trim()) {
      Alert.alert('AtenÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o', 'Por favor, escreva sua mensagem.');
      return;
    }

    // Enviar por email automaticamente
    const email = 'agendmy@gmail.com';
    const topicTitle = supportTopics.find(t => t.id === selectedTopic)?.title;
    const subject = topicTitle || 'SolicitaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de Suporte - App AGENDMY';
    const body = `${message.trim()}`;

    // Primeira tentativa: usando mailto
    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    try {
      await Linking.openURL(mailtoUrl);
      
      // Mostrar confirmaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o apÃƒÆ’Ã‚Â³s tentar abrir o email
      Alert.alert(
        'Email Aberto!',
        'O aplicativo de email foi aberto com sua mensagem. Complete o envio no seu aplicativo de email.',
        [
          {
            text: 'OK',
            onPress: () => {
              setSelectedTopic(null);
              setMessage('');
            },
          },
        ],
      );
    } catch (error) {
      console.error('Erro ao abrir mailto:', error);
      
      // Segunda tentativa: usando intent especÃƒÆ’Ã‚Â­fico para Android
      try {
        const gmailUrl = `googlegmail://co?to=${email}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        await Linking.openURL(gmailUrl);
        
        Alert.alert(
          'Gmail Aberto!',
          'O Gmail foi aberto com sua mensagem.',
          [
            {
              text: 'OK',
              onPress: () => {
                setSelectedTopic(null);
                setMessage('');
              },
            },
          ],
        );
      } catch (gmailError) {
        console.error('Erro ao abrir Gmail:', gmailError);
        
        Alert.alert(
          'Erro ao abrir email',
          'NÃƒÆ’Ã‚Â£o foi possÃƒÆ’Ã‚Â­vel abrir o aplicativo de e-mail automaticamente.\n\nEnvie manualmente para: agendmy@gmail.com\n\nAssunto: ' + subject + '\n\nMensagem: ' + body,
          [
            { text: 'OK' },
          ]
        );
      }
    }
  };

  const handleCallSupport = async () => {
    const phoneNumber = '11999999999'; // NÃƒÆ’Ã‚Âºmero de suporte
    const telUrl = `tel:${phoneNumber}`;
    
    try {
      const canOpen = await Linking.canOpenURL(telUrl);
      if (canOpen) {
        await Linking.openURL(telUrl);
      } else {
        Alert.alert('Erro', 'NÃƒÆ’Ã‚Â£o foi possÃƒÆ’Ã‚Â­vel abrir o aplicativo de telefone.');
      }
    } catch (error) {
      console.error('Erro ao abrir telefone:', error);
      Alert.alert('Erro', 'NÃƒÆ’Ã‚Â£o foi possÃƒÆ’Ã‚Â­vel fazer a ligaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o.');
    }
  };

  const handleEmailSupport = async () => {
    const email = 'agendmy@gmail.com';
    const topicTitle = selectedTopic ? supportTopics.find(t => t.id === selectedTopic)?.title : null;
    const subject = topicTitle || 'SolicitaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de Suporte - App AGENDMY';
    const body = message.trim() || 'Mensagem enviada atravÃƒÆ’Ã‚Â©s do app AGENDMY';

    // Primeira tentativa: usando mailto
    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    try {
      await Linking.openURL(mailtoUrl);
    } catch (error) {
      console.error('Erro ao abrir mailto:', error);
      
      // Segunda tentativa: usando intent especÃƒÆ’Ã‚Â­fico do Gmail
      try {
        const gmailUrl = `googlegmail://co?to=${email}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        await Linking.openURL(gmailUrl);
      } catch (gmailError) {
        console.error('Erro ao abrir Gmail:', gmailError);
        
        Alert.alert(
          'Erro ao abrir email',
          'NÃƒÆ’Ã‚Â£o foi possÃƒÆ’Ã‚Â­vel abrir o aplicativo de e-mail automaticamente.\n\nEmail: agendmy@gmail.com'
        );
      }
    }
  };

  const handleWhatsAppSupport = async () => {
    const phoneNumber = '5511999999999'; // NÃƒÆ’Ã‚Âºmero com cÃƒÆ’Ã‚Â³digo do paÃƒÆ’Ã‚Â­s
    const text = 'OlÃƒÆ’Ã‚Â¡, preciso de ajuda com o app AGENDMY';
    const whatsappUrl = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(text)}`;
    
    try {
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      } else {
        Alert.alert('WhatsApp nÃƒÆ’Ã‚Â£o disponÃƒÆ’Ã‚Â­vel', 'WhatsApp nÃƒÆ’Ã‚Â£o estÃƒÆ’Ã‚Â¡ instalado neste dispositivo.');
      }
    } catch (error) {
      console.error('Erro ao abrir WhatsApp:', error);
      Alert.alert('Erro', 'NÃƒÆ’Ã‚Â£o foi possÃƒÆ’Ã‚Â­vel abrir o WhatsApp.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Suporte</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Como podemos ajudar?</Text>
          <Text style={styles.sectionDescription}>
            Selecione um tÃƒÆ’Ã‚Â³pico abaixo ou entre em contato diretamente conosco.
          </Text>
        </View>

        <View style={styles.topicsContainer}>
          {supportTopics.map((topic) => (
            <TouchableOpacity
              key={topic.id}
              style={[
                styles.topicCard,
                selectedTopic === topic.id && styles.topicCardSelected,
              ]}
              onPress={() => setSelectedTopic(topic.id)}
            >
              <Icon
                name={topic.icon}
                size={32}
                color={selectedTopic === topic.id ? colors.white : colors.primary}
              />
              <Text
                style={[
                  styles.topicTitle,
                  selectedTopic === topic.id && styles.topicTitleSelected,
                ]}
              >
                {topic.title}
              </Text>
              <Text
                style={[
                  styles.topicDescription,
                  selectedTopic === topic.id && styles.topicDescriptionSelected,
                ]}
              >
                {topic.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {selectedTopic && (
          <View style={styles.messageSection}>
            <Text style={styles.messageLabel}>Descreva seu problema:</Text>
            <TextInput
              style={styles.messageInput}
              placeholder="Digite sua mensagem aqui..."
              placeholderTextColor={colors.lightText}
              multiline
              numberOfLines={6}
              value={message}
              onChangeText={setMessage}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleSendMessage}
            >
              <Text style={styles.sendButtonText}>Enviar Mensagem</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>Outras formas de contato</Text>

          <TouchableOpacity style={styles.contactOption} onPress={handleCallSupport}>
            <Icon name="phone" size={24} color={colors.primary} />
            <View style={styles.contactInfo}>
              <Text style={styles.contactOptionTitle}>Telefone</Text>
              <Text style={styles.contactOptionText}>(11) 9999-9999</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.contactOption} onPress={handleEmailSupport}>
            <Icon name="email" size={24} color={colors.primary} />
            <View style={styles.contactInfo}>
              <Text style={styles.contactOptionTitle}>E-mail</Text>
              <Text style={styles.contactOptionText}>agendmy@gmail.com</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.contactOption} onPress={handleWhatsAppSupport}>
            <Icon name="chat" size={24} color={colors.primary} />
            <View style={styles.contactInfo}>
              <Text style={styles.contactOptionTitle}>WhatsApp</Text>
              <Text style={styles.contactOptionText}>(11) 9999-9999</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.faqSection}>
          <Text style={styles.faqTitle}>Perguntas Frequentes</Text>
          <TouchableOpacity
            style={styles.faqButton}
            onPress={async () => {
              const faqUrl = 'https://agendmy.com/faq';
              try {
                const canOpen = await Linking.canOpenURL(faqUrl);
                if (canOpen) {
                  await Linking.openURL(faqUrl);
                } else {
                  Alert.alert('Erro', 'NÃƒÆ’Ã‚Â£o foi possÃƒÆ’Ã‚Â­vel abrir o link das perguntas frequentes.');
                }
              } catch (error) {
                console.error('Erro ao abrir FAQ:', error);
                Alert.alert('Erro', 'NÃƒÆ’Ã‚Â£o foi possÃƒÆ’Ã‚Â­vel abrir as perguntas frequentes.');
              }
            }}
          >
            <Text style={styles.faqButtonText}>Ver todas as perguntas frequentes</Text>
            <Icon name="arrow-forward" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
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
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 10,
  },
  sectionDescription: {
    fontSize: 16,
    color: colors.lightText,
    lineHeight: 22,
  },
  topicsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  topicCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  topicCardSelected: {
    backgroundColor: colors.primary,
  },
  topicTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 10,
    marginBottom: 5,
  },
  topicTitleSelected: {
    color: colors.white,
  },
  topicDescription: {
    fontSize: 14,
    color: colors.lightText,
    textAlign: 'center',
  },
  topicDescriptionSelected: {
    color: colors.white,
    opacity: 0.9,
  },
  messageSection: {
    padding: 20,
    backgroundColor: colors.white,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
  },
  messageLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 10,
  },
  messageInput: {
    borderWidth: 1,
    borderColor: colors.lightGray,
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    color: colors.text,
    minHeight: 120,
    marginBottom: 15,
  },
  sendButton: {
    backgroundColor: colors.primary,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  sendButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  contactSection: {
    padding: 20,
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 15,
  },
  contactOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  contactInfo: {
    marginLeft: 15,
  },
  contactOptionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  contactOptionText: {
    fontSize: 14,
    color: colors.lightText,
    marginTop: 2,
  },
  faqSection: {
    padding: 20,
    marginBottom: 20,
  },
  faqTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 15,
  },
  faqButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 8,
  },
  faqButtonText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '500',
  },
});

export default SupportScreen;
