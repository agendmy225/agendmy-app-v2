import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../auth/context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AppStackParamList } from '../../types/types';
import { FavoriteItem } from '../../services/favorites';
import { colors } from '../../constants/colors';
import Icon from 'react-native-vector-icons/MaterialIcons';

type FavoritesScreenNavigationProp = StackNavigationProp<AppStackParamList, 'Favorites'>;

const FavoritesScreen: React.FC = () => {
  const { favorites, loading: authLoading, refreshFavorites } = useAuth();
  const navigation = useNavigation<FavoritesScreenNavigationProp>() as any;
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshFavorites();
    setIsRefreshing(false);
  };

  const renderFavoriteItem = ({ item }: { item: FavoriteItem }) => (
    <TouchableOpacity
      style={styles.itemContainer}
      onPress={() => navigation.navigate('BusinessDetails', { businessId: item.businessId })}
    >
      <Image
        source={{ uri: item.businessImage || 'https://via.placeholder.com/80' }}
        style={styles.itemImage}
      />
      <View style={styles.itemTextContainer}>
        <Text style={styles.itemName}>{item.businessName}</Text>
        <Text style={styles.itemAddress} numberOfLines={1}>{item.businessAddress}</Text>
        <View style={styles.ratingContainer}>
          <Icon name="star" size={16} color={colors.primary} />
          <Text style={styles.itemRating}>{item.businessRating.toFixed(1)}</Text>
        </View>
      </View>
      <Icon name="chevron-right" size={24} color={colors.lightText} />
    </TouchableOpacity>
  );

  if (authLoading && favorites.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={favorites}
        renderItem={renderFavoriteItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View style={styles.centerContent}>
            <Text style={styles.emptyText}>VocÃª ainda nÃ£o adicionou nenhum favorito.</Text>
          </View>
        }
        contentContainerStyle={favorites.length === 0 ? styles.centerContent : styles.listContentContainer}
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  listContentContainer: {
    paddingVertical: 10,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: 15,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 10,
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 15,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  itemAddress: {
    fontSize: 14,
    color: colors.lightText,
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemRating: {
    fontSize: 14,
    color: colors.text,
    marginLeft: 4,
  },
  emptyText: {
    fontSize: 16,
    color: colors.lightText,
    textAlign: 'center',
  },
});

export default FavoritesScreen;
