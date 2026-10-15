import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import api from '../../services/api';
import { Business, Category } from '../../types';
import { BusinessCard } from '../../components/business/BusinessCard';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';

const DEFAULT_CATEGORIES = [
  'Todos',
  'Peluquería',
  'Estética',
  'Salud',
  'Deportes',
  'Trámites',
  'Mascotas',
  'Otros',
];

const normalizeText = (text: string = '') =>
  text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const fetchBusinesses = async () => {
    setErrorMsg('');
    try {
      const res = await api.get('/businesses');
      const raw = res.data?.data ?? res.data;
      const data = Array.isArray(raw) ? raw : [];
      setBusinesses(data);
    } catch (err: any) {
      console.warn('Error fetching businesses:', err?.message || err);
      const url = api.defaults.baseURL || '';
      setErrorMsg(
        err.message?.includes('Network Error')
          ? `No se pudo conectar con el backend (${url}). Verificá que la PC y el celular estén en la misma red Wi-Fi.`
          : (err.response?.data?.message || err.message || 'Error al conectar con el servidor')
      );
      setBusinesses([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      const raw = res.data?.data ?? res.data;
      if (Array.isArray(raw) && raw.length > 0) {
        setCategories(['Todos', ...raw.map((c: Category) => c.name)]);
      }
    } catch {
      // Usar categorías por defecto
    }
  };

  useEffect(() => {
    fetchBusinesses();
    fetchCategories();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBusinesses();
  };

  const filteredBusinesses = useMemo(() => {
    let result = [...businesses];

    if (searchQuery.trim()) {
      const q = normalizeText(searchQuery);
      result = result.filter((b) => {
        const inName = normalizeText(b.name).includes(q);
        const inCat = normalizeText(b.category).includes(q);
        const inAddr = normalizeText(b.address).includes(q);
        const inDesc = normalizeText(b.description).includes(q);
        const inServices = b.services?.some(
          (s) =>
            normalizeText(s.name).includes(q) ||
            normalizeText(s.description).includes(q)
        );
        return inName || inCat || inAddr || inDesc || inServices;
      });
    }

    if (selectedCategory !== 'Todos') {
      const normCat = normalizeText(selectedCategory);
      result = result.filter((b) => normalizeText(b.category) === normCat);
    }

    return result;
  }, [businesses, searchQuery, selectedCategory]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      {/* Top Navbar Header */}
      <View style={styles.topHeader}>
        <View>
          <View style={styles.brandRow}>
            <Text style={styles.brandPrimary}>Turnos</Text>
            <Text style={styles.brandSecondary}>Ya</Text>
          </View>
          <Text style={styles.subtitle}>
            {user ? `¡Hola, ${user.name.split(' ')[0]}!` : 'Encontrá y reservá tu turno al instante'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.avatarButton}
          onPress={() => navigation.navigate('ProfileTab')}
        >
          <Ionicons
            name={user ? 'person' : 'person-outline'}
            size={20}
            color={Colors.primary}
          />
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por comercio, servicio o dirección..."
            placeholderTextColor={Colors.textDisabled}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Pills Slider */}
      <View style={styles.categoriesWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
        >
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                activeOpacity={0.7}
                onPress={() => setSelectedCategory(cat)}
                style={[
                  styles.categoryChip,
                  isSelected && styles.categoryChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    isSelected && styles.categoryChipTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Businesses List */}
      <View style={styles.listContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {selectedCategory === 'Todos'
              ? 'Comercios destacados'
              : `Comercios en ${selectedCategory}`}
          </Text>
          <Text style={styles.resultsCount}>
            {filteredBusinesses.length}{' '}
            {filteredBusinesses.length === 1 ? 'resultado' : 'resultados'}
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Cargando opciones disponibles...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredBusinesses}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <BusinessCard
                business={item}
                onPress={() =>
                  navigation.navigate('BusinessDetail', { businessId: item.id })
                }
              />
            )}
            contentContainerStyle={styles.flatListContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[Colors.primary]}
              />
            }
            ListEmptyComponent={
              errorMsg ? (
                <View style={styles.emptyContainer}>
                  <Ionicons
                    name="cloud-offline-outline"
                    size={54}
                    color={Colors.danger}
                  />
                  <Text style={[styles.emptyTitle, { color: Colors.danger }]}>
                    Error de Conexión
                  </Text>
                  <Text style={styles.emptySubtitle}>{errorMsg}</Text>
                  <TouchableOpacity
                    style={[styles.clearFiltersBtn, { backgroundColor: Colors.primary }]}
                    onPress={fetchBusinesses}
                  >
                    <Text style={[styles.clearFiltersText, { color: Colors.white }]}>
                      Reintentar Conexión
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.emptyContainer}>
                  <Ionicons
                    name="storefront-outline"
                    size={54}
                    color={Colors.textDisabled}
                  />
                  <Text style={styles.emptyTitle}>No encontramos comercios</Text>
                  <Text style={styles.emptySubtitle}>
                    Probá ajustando la búsqueda o seleccionando otra categoría.
                  </Text>
                  {searchQuery || selectedCategory !== 'Todos' ? (
                    <TouchableOpacity
                      style={styles.clearFiltersBtn}
                      onPress={() => {
                        setSearchQuery('');
                        setSelectedCategory('Todos');
                      }}
                    >
                      <Text style={styles.clearFiltersText}>Limpiar filtros</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              )
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  brandPrimary: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.extraBold,
    color: Colors.textTitle,
  },
  brandSecondary: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.extraBold,
    color: Colors.primary,
    marginLeft: 2,
  },
  subtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  avatarButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    marginVertical: Spacing.sm,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderInput,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 46,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.sizes.md,
    color: Colors.textMain,
  },
  categoriesWrapper: {
    marginBottom: Spacing.sm,
  },
  categoriesList: {
    paddingHorizontal: Spacing.lg,
    gap: 8,
  },
  categoryChip: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryChipText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.weights.medium,
  },
  categoryChipTextActive: {
    color: Colors.white,
    fontWeight: Typography.weights.bold,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    marginTop: Spacing.xs,
  },
  sectionTitle: {
    fontSize: Typography.sizes.md + 1,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
  },
  resultsCount: {
    fontSize: Typography.sizes.xs + 1,
    color: Colors.textSecondary,
  },
  flatListContent: {
    paddingBottom: Spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
    marginTop: Spacing.md,
  },
  emptySubtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  clearFiltersBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryLight,
  },
  clearFiltersText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
  },
});
