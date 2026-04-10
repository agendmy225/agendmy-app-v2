import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../../constants/colors';

const EditPaymentMethodScreen: React.FC = () => {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar CartÃƒÆ’Ã‚Â£o</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.comingSoonContainer}>
          <Icon name="credit-card" size={64} color={colors.lightText} />
          <Text style={styles.comingSoonTitle}>Em Breve</Text>
          <Text style={styles.comingSoonText}>
            A ediÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de cartÃƒÆ’Ã‚Âµes estarÃƒÆ’Ã‚Â¡ disponÃƒÆ’Ã‚Â­vel apÃƒÆ’Ã‚Â³s a integraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o com o gateway de pagamento.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: colors.lightGray,
  },
  backButton: { marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  comingSoonContainer: { alignItems: 'center' },
  comingSoonTitle: { fontSize: 22, fontWeight: 'bold', color: colors.text, marginTop: 16 },
  comingSoonText: { fontSize: 14, color: colors.lightText, textAlign: 'center', marginTop: 8, lineHeight: 22 },
});

export default EditPaymentMethodScreen;
