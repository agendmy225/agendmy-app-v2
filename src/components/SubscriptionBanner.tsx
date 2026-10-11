// src/components/SubscriptionBanner.tsx
// Aviso na tela inicial do dono quando o teste esta acabando ou o pagamento atrasou.
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../constants/colors';
import { AppStackParamList } from '../types/types';
import { useMyBusiness } from '../hooks/useMyBusiness';
import { getSubscriptionView, needsAttention } from '../services/subscription';

const SubscriptionBanner: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<AppStackParamList>>();
  const { business } = useMyBusiness();
  if (!business) {
    return null;
  }
  const view = getSubscriptionView(business);
  if (!needsAttention(view)) {
    return null;
  }
  return (
    <TouchableOpacity
      style={[styles.banner, { borderColor: view.color }]}
      onPress={() => navigation.navigate('OwnerSubscription')}
      activeOpacity={0.8}
    >
      <Icon name={view.icon} size={24} color={view.color} />
      <View style={styles.textBox}>
        <Text style={[styles.title, { color: view.color }]}>{view.label}</Text>
        <Text style={styles.text} numberOfLines={3}>{view.description}</Text>
      </View>
      <Icon name="chevron-right" size={24} color={colors.lightText} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
  },
  textBox: { flex: 1, marginHorizontal: 10 },
  title: { fontSize: 14, fontWeight: 'bold' },
  text: { fontSize: 12, color: colors.text, marginTop: 2 },
});

export default SubscriptionBanner;
