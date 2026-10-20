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
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import api from '../../services/api';
import { Business, Category } from '../../types';
import { BusinessCard } from '../../components/business/BusinessCard';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import {
  type Coordinates,
  calculateDistanceKm,
  requestUserLocation,
  DEFAULT_DEMO_COORDS,
} from '../../utils/locationHelper';

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

  // Estados de Ubicación y Cercanía
  const [userCoords, setUserCoords] = useState<Coordinates | null>(null);
  const [sortByProximity, setSortByProximity] = useState<boolean>(false);
  const [maxDistanceKm, setMaxDistanceKm] = useState<number | null>(null);
  const [locatingUser, setLocatingUser] = useState<boolean>(false);
  const [locationLabel, setLocationLabel] = useState<string>('Cerca de ti');

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

  const handleToggleProximity = async () => {
    if (sortByProximity) {
      setSortByProximity(false);
      setMaxDistanceKm(null);
      return;
    }

    // Si ya tenemos coordenadas, simplemente activamos
    if (userCoords) {
      setSortByProximity(true);
      return;
    }

    // Solicitar ubicación al dispositivo
    setLocatingUser(true);
    const result = await requestUserLocation();
    setLocatingUser(false);

    if (result.status === 'granted' && result.coords) {
      setUserCoords(result.coords);
      setSortByProximity(true);
      setLocationLabel('Cerca de ti');
    } else {
      Alert.alert(
        'Ubicación no disponible',
        'No pudimos acceder a tu GPS o los permisos fueron denegados. ¿Deseás probar el filtro de cercanía usando una ubicación de referencia (Centro CABA)?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Usar Centro CABA',
            onPress: () => {
              setUserCoords(DEFAULT_DEMO_COORDS);
              setSortByProximity(true);
              setLocationLabel('Centro CABA (Demo)');
            },
          },
        ]
      );
    }
  };

  const filteredBusinesses = useMemo(() => {
    // 1. Mapear con distancia calculada si hay coordenadas
    let result = businesses.map((b) => {
      if (userCoords && b.latitude != null && b.longitude != null) {
        const lat = Number(b.latitude);
        const lon = Number(b.longitude);
        if (!isNaN(lat) && !isNaN(lon)) {
          const dist = calculateDistanceKm(
            userCoords.latitude,
            userCoords.longitude,
            lat,
            lon
          );
          return { ...b, distanceKm: dist };
        }
      }
      return b;
    });

    // 2. Búsqueda por texto
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

    // 3. Filtro por categoría
    if (selectedCategory !== 'Todos') {
      const normCat = normalizeText(selectedCategory);
      result = result.filter((b) => normalizeText(b.category) === normCat);
    }

    // 4. Filtro por radio de distancia (ej: < 3 km, < 5 km)
    if (sortByProximity && maxDistanceKm !== null) {
      result = result.filter(
        (b) => b.distanceKm !== undefined && b.distanceKm <= maxDistanceKm
      );
    }

    // 5. Ordenamiento por cercanía (menor a mayor distancia)
    if (sortByProximity) {
      result.sort((a, b) => (a.distanceKm ?? 999999) - (b.distanceKm ?? 999999));
    }

    return result;
  }, [
    businesses,
    searchQuery,
    selectedCategory,
    userCoords,
    sortByProximity,
    maxDistanceKm,
  ]);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      <View style={styles.mainContainer}>
        {/* Top Section with Celeste Background (from Comercios destacados upwards) */}
        <View style={styles.heroSection}>
          {/* Top Navbar Header */}
          <View style={styles.topHeader}>
            <Image
              source={require('../../../assets/brand/logo-white.png')}
              style={styles.brandLogo}
              resizeMode="contain"
            />

            <View style={styles.headerRight}>
              {user ? (
                <Text style={styles.userNameText}>¡Hola, {user.name.split(' ')[0]}!</Text>
              ) : null}
              <TouchableOpacity
                style={styles.avatarButton}
                onPress={() => navigation.navigate('ProfileTab')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={user ? 'person' : 'person-outline'}
                  size={20}
                  color={Colors.primary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Search Input */}
          <View style={styles.searchContainer}>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={20} color={Colors.primary} />
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

          {/* Proximity & Distance Filter Bar */}
          <View style={styles.proximityBar}>
            <TouchableOpacity
              style={[
                styles.proximityBtn,
                sortByProximity && styles.proximityBtnActive,
              ]}
              onPress={handleToggleProximity}
              activeOpacity={0.7}
              disabled={locatingUser}
            >
              {locatingUser ? (
                <ActivityIndicator size="small" color={sortByProximity ? Colors.primary : Colors.white} />
              ) : (
                <Ionicons
                  name={sortByProximity ? 'navigate' : 'navigate-outline'}
                  size={14}
                  color={sortByProximity ? Colors.primary : Colors.white}
                />
              )}
              <Text
                style={[
                  styles.proximityBtnText,
                  sortByProximity && styles.proximityBtnTextActive,
                ]}
              >
                {sortByProximity ? locationLabel : 'Más cercanos'}
              </Text>
              {sortByProximity && (
                <TouchableOpacity
                  onPress={() => {
                    setSortByProximity(false);
                    setMaxDistanceKm(null);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={15} color={Colors.primary} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            {sortByProximity && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.radiusChipsContainer}
              >
                {[
                  { label: 'Todos', value: null },
                  { label: '< 3 km', value: 3 },
                  { label: '< 5 km', value: 5 },
                  { label: '< 10 km', value: 10 },
                ].map((option) => {
                  const isSelected = maxDistanceKm === option.value;
                  return (
                    <TouchableOpacity
                      key={option.label}
                      style={[
                        styles.radiusChip,
                        isSelected && styles.radiusChipActive,
                      ]}
                      onPress={() => setMaxDistanceKm(option.value)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.radiusChipText,
                          isSelected && styles.radiusChipTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>

        {/* Businesses List */}
        <View style={styles.listContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {sortByProximity
                ? 'Comercios más cercanos'
                : selectedCategory === 'Todos'
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
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  mainContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  heroSection: {
    backgroundColor: Colors.primary,
    paddingBottom: Spacing.md,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  brandLogo: {
    width: 110,
    height: 45,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  userNameText: {
    color: Colors.white,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semiBold,
  },
  avatarButton: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    marginVertical: Spacing.xs,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 46,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.sizes.md,
    color: Colors.textMain,
  },
  categoriesWrapper: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  categoriesList: {
    paddingHorizontal: Spacing.lg,
    gap: 8,
  },
  categoryChip: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  categoryChipActive: {
    backgroundColor: Colors.white,
    borderColor: Colors.white,
  },
  categoryChipText: {
    fontSize: Typography.sizes.sm,
    color: Colors.white,
    fontWeight: Typography.weights.medium,
  },
  categoryChipTextActive: {
    color: Colors.primary,
    fontWeight: Typography.weights.bold,
  },
  proximityBar: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  proximityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    gap: 5,
  },
  proximityBtnActive: {
    backgroundColor: Colors.white,
    borderColor: Colors.white,
  },
  proximityBtnText: {
    fontSize: Typography.sizes.xs + 1,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
  },
  proximityBtnTextActive: {
    color: Colors.primary,
  },
  radiusChipsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  radiusChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  radiusChipActive: {
    backgroundColor: Colors.white,
    borderColor: Colors.white,
  },
  radiusChipText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
    color: Colors.white,
  },
  radiusChipTextActive: {
    color: Colors.primary,
    fontWeight: Typography.weights.bold,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.background,
    paddingTop: Spacing.sm,
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
