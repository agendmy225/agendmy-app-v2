// src/components/AnnouncementsBell.tsx
// Sino de comunicados para o topo das telas iniciais, com contador de novos.
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../constants/colors';
import { AppStackParamList } from '../types/types';
import { useAnnouncements } from '../services/announcements';

const AnnouncementsBell: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<AppStackParamList>>();
  const { unreadCount } = useAnnouncements();

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={() => navigation.navigate('Announcements')}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Icon name={unreadCount > 0 ? 'notifications-active' : 'notifications-none'} size={26} color={colors.primary} />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    marginRight: 10,
    padding: 2,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.brandRed,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  badgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default AnnouncementsBell;
