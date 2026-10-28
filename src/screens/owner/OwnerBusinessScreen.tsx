import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Alert,
  Image,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { Review } from '../../types';
import { useOwner } from '../../context/OwnerContext';
import { useAuth } from '../../context/AuthContext';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';

const CATEGORY_CHOICES = [
  'Peluquería',
  'Estética',
  'Salud',
  'Deportes',
  'Trámites',
  'Mascotas',
  'Otros',
];

export const OwnerBusinessScreen: React.FC = () => {
  const { selectedBusiness, businesses, setSelectedBusiness, refreshBusinesses, isAdmin, activeRoleMode, toggleRoleMode } = useOwner();
  const { user, logout } = useAuth();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsStats, setReviewsStats] = useState<{ average: number; count: number }>({ average: 0, count: 0 });
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Edit Business Modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [savingBiz, setSavingBiz] = useState(false);

  const fetchReviews = useCallback(async () => {
    if (!selectedBusiness) return;
    setLoadingReviews(true);
    try {
      const res = await api.get(`/businesses/${selectedBusiness.id}/reviews`);
      const raw = res.data?.data ?? res.data;
      const list: Review[] = Array.isArray(raw) ? raw : [];
      setReviews(list);
      setReviewsStats(res.data?.stats ?? {
        average: selectedBusiness.rating ? Number(selectedBusiness.rating) : 0,
        count: selectedBusiness.reviewCount ? Number(selectedBusiness.reviewCount) : list.length,
      });
    } catch {
      setReviews([]);
    } finally {
      setLoadingReviews(false);
      setRefreshing(false);
    }
  }, [selectedBusiness]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const onRefresh = () => {
    setRefreshing(true);
    refreshBusinesses();
    fetchReviews();
  };

  const handleOpenEditModal = () => {
    if (!selectedBusiness) return;
    setFormName(selectedBusiness.name || '');
    setFormCategory(selectedBusiness.category || 'Otros');
    setFormAddress(selectedBusiness.address || '');
    setFormPhone(selectedBusiness.phone || '');
    setFormDescription(selectedBusiness.description || '');
    setEditModalVisible(true);
  };

  const handleSaveBusiness = async () => {
    if (!selectedBusiness) return;
    if (!formName.trim()) {
      Alert.alert('Nombre requerido', 'El nombre del negocio no puede estar vacío.');
      return;
    }

    setSavingBiz(true);
    try {
      const payload = {
        name: formName.trim(),
        category: formCategory,
        address: formAddress.trim(),
        phone: formPhone.trim(),
        description: formDescription.trim(),
      };

      await api.patch(`/businesses/${selectedBusiness.id}`, payload);
      Alert.alert('Éxito', 'Los datos del negocio han sido actualizados.');
      setEditModalVisible(false);
      refreshBusinesses();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'No se pudieron actualizar los datos.');
    } finally {
      setSavingBiz(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Cerrar Sesión', '¿Estás seguro de que deseas salir de tu cuenta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar Sesión', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      <View style={styles.mainContainer}>
        {/* Header Hero */}
        <View style={styles.headerHero}>
          <View style={styles.headerTopRow}>
            <Image
              source={require('../../../assets/brand/logo-white.png')}
              style={styles.brandLogo}
              resizeMode="contain"
            />
            <View style={styles.badgeWrap}>
              <Text style={styles.badgeRoleText}>DUEÑO</Text>
            </View>
          </View>
          <Text style={styles.headerTitle}>Mi Negocio & Perfil</Text>
          <Text style={styles.headerSubtitle}>
            Administración del local y configuración de cuenta
          </Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
          }
        >
          {/* Admin Switcher Card (Only if user has Admin role) */}
          {isAdmin && (
            <View style={styles.adminCard}>
              <View style={styles.adminHeaderRow}>
                <Ionicons name="shield-checkmark" size={20} color="#b45309" />
                <Text style={styles.adminTitle}>Modo Administrador Activo</Text>
              </View>
              <Text style={styles.adminDescription}>
                Tu cuenta tiene permisos de Administrador global. Podés alternar libremente entre la vista de Dueño y la vista de Cliente para probar ambas experiencias.
              </Text>
              <TouchableOpacity
                style={styles.adminSwitchBtn}
                onPress={toggleRoleMode}
                activeOpacity={0.8}
              >
                <Ionicons name="swap-horizontal" size={16} color={Colors.white} />
                <Text style={styles.adminSwitchText}>
                  Cambiar a Vista Cliente
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Business Info Card */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.bizName}>{selectedBusiness?.name || 'Mi Negocio'}</Text>
                <View style={styles.categoryPill}>
                  <Text style={styles.categoryPillText}>
                    {selectedBusiness?.category || 'Comercio'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.editBtn}
                onPress={handleOpenEditModal}
                activeOpacity={0.8}
              >
                <Ionicons name="pencil" size={15} color={Colors.primary} />
                <Text style={styles.editBtnText}>Editar</Text>
              </TouchableOpacity>
            </View>

            {selectedBusiness?.description ? (
              <Text style={styles.bizDescription}>{selectedBusiness.description}</Text>
            ) : null}

            <View style={styles.infoDivider} />

            <View style={styles.infoItemRow}>
              <Ionicons name="location-outline" size={18} color={Colors.primary} />
              <Text style={styles.infoText}>
                {selectedBusiness?.address || 'Dirección no configurada'}
              </Text>
            </View>

            <View style={styles.infoItemRow}>
              <Ionicons name="call-outline" size={18} color={Colors.primary} />
              <Text style={styles.infoText}>
                {selectedBusiness?.phone || 'Teléfono no configurado'}
              </Text>
            </View>
          </View>

          {/* Multiple Businesses Switcher */}
          {businesses.length > 1 && (
            <View style={styles.card}>
              <Text style={styles.cardSectionTitle}>Tus Negocios Registrados ({businesses.length})</Text>
              <Text style={styles.cardSectionSubtitle}>
                Tocá un negocio para cambiar el panel activo:
              </Text>

              {businesses.map((biz) => {
                const isSelected = selectedBusiness?.id === biz.id;
                return (
                  <TouchableOpacity
                    key={biz.id}
                    style={[styles.bizChoiceRow, isSelected && styles.bizChoiceRowActive]}
                    onPress={() => setSelectedBusiness(biz)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="storefront"
                      size={18}
                      color={isSelected ? Colors.primary : Colors.textSecondary}
                    />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={[styles.bizChoiceName, isSelected && styles.bizChoiceNameActive]}>
                        {biz.name}
                      </Text>
                      <Text style={styles.bizChoiceAddress}>{biz.address || biz.category}</Text>
                    </View>
                    {isSelected && (
                      <View style={styles.activePill}>
                        <Text style={styles.activePillText}>Activo</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Customer Reviews & Ratings */}
          <View style={styles.card}>
            <View style={styles.reviewsHeaderRow}>
              <View>
                <Text style={styles.cardSectionTitle}>Reseñas de Clientes</Text>
                <Text style={styles.cardSectionSubtitle}>Opiniones y calificaciones recibidas</Text>
              </View>

              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={16} color={Colors.star} />
                <Text style={styles.ratingScore}>
                  {reviewsStats.average ? Number(reviewsStats.average).toFixed(1) : 'Nuevo'}
                </Text>
                <Text style={styles.ratingCount}>({reviewsStats.count})</Text>
              </View>
            </View>

            {loadingReviews ? (
              <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 16 }} />
            ) : reviews.length === 0 ? (
              <View style={styles.emptyReviews}>
                <Text style={styles.emptyReviewsText}>
                  Aún no hay reseñas registradas para este comercio.
                </Text>
              </View>
            ) : (
              reviews.slice(0, 5).map((rev) => (
                <View key={rev.id} style={styles.reviewItem}>
                  <View style={styles.reviewTopRow}>
                    <Text style={styles.reviewAuthor}>{rev.user?.name || 'Cliente verificado'}</Text>
                    <View style={styles.starsRow}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Ionicons
                          key={s}
                          name={s <= rev.rating ? 'star' : 'star-outline'}
                          size={13}
                          color={Colors.star}
                        />
                      ))}
                    </View>
                  </View>
                  {rev.comment ? <Text style={styles.reviewComment}>{rev.comment}</Text> : null}
                </View>
              ))
            )}
          </View>

          {/* User Account & Logout */}
          <View style={styles.card}>
            <Text style={styles.cardSectionTitle}>Cuenta de Usuario</Text>

            <View style={styles.userProfileRow}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'D'}
                </Text>
              </View>
              <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                <Text style={styles.userName}>{user?.name}</Text>
                <Text style={styles.userEmail}>{user?.email}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
              <Ionicons name="log-out-outline" size={18} color={Colors.danger} />
              <Text style={styles.logoutBtnText}>Cerrar Sesión</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      {/* Edit Business Modal */}
      <Modal visible={editModalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Editar Datos del Negocio</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Nombre del Negocio *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: Barbería Premium"
                  placeholderTextColor={Colors.textDisabled}
                  value={formName}
                  onChangeText={setFormName}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Rubro / Categoría</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
                  {CATEGORY_CHOICES.map((cat) => {
                    const isSelected = formCategory === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[styles.catChip, isSelected && styles.catChipActive]}
                        onPress={() => setFormCategory(cat)}
                      >
                        <Text style={[styles.catChipText, isSelected && styles.catChipTextActive]}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Dirección</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: Av. Santa Fe 3200, Palermo"
                  placeholderTextColor={Colors.textDisabled}
                  value={formAddress}
                  onChangeText={setFormAddress}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Teléfono de Contacto</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: +54 9 11 1234-5678"
                  placeholderTextColor={Colors.textDisabled}
                  value={formPhone}
                  onChangeText={setFormPhone}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Descripción del Negocio</Text>
                <TextInput
                  style={[styles.input, { minHeight: 70, textAlignVertical: 'top' }]}
                  placeholder="Contale a tus clientes sobre tu experiencia y servicios..."
                  placeholderTextColor={Colors.textDisabled}
                  value={formDescription}
                  onChangeText={setFormDescription}
                  multiline
                />
              </View>
            </ScrollView>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setEditModalVisible(false)}
                disabled={savingBiz}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSaveBtn, { opacity: savingBiz ? 0.7 : 1 }]}
                onPress={handleSaveBusiness}
                disabled={savingBiz}
              >
                {savingBiz ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.modalSaveText}>Guardar Cambios</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  headerHero: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.md,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  brandLogo: {
    width: 110,
    height: 42,
  },
  badgeWrap: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  badgeRoleText: {
    color: Colors.white,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.extraBold,
    letterSpacing: 0.5,
  },
  headerTitle: {
    color: Colors.white,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.extraBold,
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: Typography.sizes.xs + 1,
    marginTop: 2,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.md,
  },
  adminCard: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fcd34d',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  adminHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  adminTitle: {
    fontSize: Typography.sizes.sm + 1,
    fontWeight: Typography.weights.bold,
    color: '#92400e',
  },
  adminDescription: {
    fontSize: Typography.sizes.xs + 1,
    color: '#78350f',
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  adminSwitchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d97706',
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    gap: 6,
  },
  adminSwitchText: {
    color: Colors.white,
    fontWeight: Typography.weights.bold,
    fontSize: Typography.sizes.xs + 1,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  bizName: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.extraBold,
    color: Colors.textTitle,
  },
  categoryPill: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    marginTop: 4,
  },
  categoryPillText: {
    color: Colors.primary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  editBtnText: {
    color: Colors.primary,
    fontSize: Typography.sizes.xs + 1,
    fontWeight: Typography.weights.bold,
  },
  bizDescription: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginTop: Spacing.xs,
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: Spacing.sm,
  },
  infoItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  infoText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textMain,
    flex: 1,
  },
  cardSectionTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
  },
  cardSectionSubtitle: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    marginTop: 1,
    marginBottom: Spacing.sm,
  },
  bizChoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 6,
  },
  bizChoiceRowActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  bizChoiceName: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
  },
  bizChoiceNameActive: {
    color: Colors.primary,
  },
  bizChoiceAddress: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  activePill: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  activePillText: {
    color: Colors.white,
    fontSize: Typography.sizes.xs - 1,
    fontWeight: Typography.weights.bold,
  },
  reviewsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  ratingScore: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: '#b45309',
  },
  ratingCount: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
  },
  emptyReviews: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  emptyReviewsText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textDisabled,
    fontStyle: 'italic',
  },
  reviewItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  reviewTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  reviewAuthor: {
    fontSize: Typography.sizes.xs + 1,
    fontWeight: Typography.weights.semiBold,
    color: Colors.textTitle,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewComment: {
    fontSize: Typography.sizes.xs + 1,
    color: Colors.textSecondary,
    lineHeight: 16,
    marginTop: 2,
  },
  userProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.sm,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
  },
  userName: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
  },
  userEmail: {
    fontSize: Typography.sizes.xs + 1,
    color: Colors.textSecondary,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
    gap: 6,
  },
  logoutBtnText: {
    color: Colors.danger,
    fontWeight: Typography.weights.bold,
    fontSize: Typography.sizes.sm,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
  },
  formGroup: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: Typography.sizes.xs + 1,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: Typography.sizes.sm,
    color: Colors.textMain,
  },
  categoryScroll: {
    gap: 6,
    paddingVertical: 2,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  catChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  catChipText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.weights.medium,
  },
  catChipTextActive: {
    color: Colors.white,
    fontWeight: Typography.weights.bold,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: BorderRadius.md,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.weights.bold,
  },
  modalSaveBtn: {
    flex: 2,
    paddingVertical: 11,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  modalSaveText: {
    fontSize: Typography.sizes.sm,
    color: Colors.white,
    fontWeight: Typography.weights.bold,
  },
});
