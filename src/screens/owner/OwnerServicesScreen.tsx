import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Alert,
  Image,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { BusinessService } from '../../types';
import { useOwner } from '../../context/OwnerContext';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';

const DURATION_PRESETS = [15, 30, 45, 60, 90, 120];

export const OwnerServicesScreen: React.FC = () => {
  const { selectedBusiness } = useOwner();

  const [services, setServices] = useState<BusinessService[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Form Modal (Add / Edit)
  const [modalVisible, setModalVisible] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDuration, setFormDuration] = useState<number>(30);
  const [formPrice, setFormPrice] = useState<string>('0');
  const [saving, setSaving] = useState(false);

  const fetchServices = useCallback(async () => {
    if (!selectedBusiness) {
      setServices([]);
      return;
    }

    setLoading(true);
    try {
      const res = await api.get(`/businesses/${selectedBusiness.id}/services`);
      const raw = res.data?.data ?? res.data;
      const list: BusinessService[] = Array.isArray(raw) ? raw : [];
      setServices(list);
    } catch (err: any) {
      console.warn('Error fetching services:', err?.message || err);
      setServices([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedBusiness]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchServices();
  };

  const handleOpenCreateModal = () => {
    setEditingServiceId(null);
    setFormName('');
    setFormDescription('');
    setFormDuration(30);
    setFormPrice('0');
    setModalVisible(true);
  };

  const handleOpenEditModal = (svc: BusinessService) => {
    setEditingServiceId(svc.id);
    setFormName(svc.name);
    setFormDescription(svc.description || '');
    setFormDuration(svc.durationMinutes ?? 30);
    setFormPrice(String(svc.price ?? 0));
    setModalVisible(true);
  };

  const handleSaveService = async () => {
    if (!selectedBusiness) return;
    if (!formName.trim()) {
      Alert.alert('Campo requerido', 'Por favor ingresa el nombre del servicio.');
      return;
    }

    const priceNum = parseFloat(formPrice) || 0;
    if (priceNum < 0) {
      Alert.alert('Precio inválido', 'El precio no puede ser negativo.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formName.trim(),
        description: formDescription.trim(),
        durationMinutes: formDuration,
        price: priceNum,
      };

      if (editingServiceId) {
        await api.put(`/businesses/${selectedBusiness.id}/services/${editingServiceId}`, payload);
        Alert.alert('Éxito', 'Servicio actualizado correctamente.');
      } else {
        await api.post(`/businesses/${selectedBusiness.id}/services`, payload);
        Alert.alert('Éxito', 'Nuevo servicio creado correctamente.');
      }

      setModalVisible(false);
      fetchServices();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'No se pudo guardar el servicio.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteService = (serviceId: number, serviceName: string) => {
    if (!selectedBusiness) return;

    Alert.alert(
      'Eliminar servicio',
      `¿Estás seguro de que deseas eliminar "${serviceName}"? Los clientes ya no podrán reservarlo.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/businesses/${selectedBusiness.id}/services/${serviceId}`);
              setServices((prev) => prev.filter((s) => s.id !== serviceId));
              Alert.alert('Servicio eliminado', 'El servicio fue eliminado con éxito.');
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message || 'No se pudo eliminar el servicio.');
            }
          },
        },
      ]
    );
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
            <View style={styles.bizBadge}>
              <Ionicons name="business" size={13} color={Colors.white} />
              <Text style={styles.bizBadgeText} numberOfLines={1}>
                {selectedBusiness?.name || 'Mi Negocio'}
              </Text>
            </View>
          </View>

          <View style={styles.headerActionRow}>
            <View>
              <Text style={styles.headerTitle}>Catálogo de Servicios</Text>
              <Text style={styles.headerSubtitle}>
                {services.length} {services.length === 1 ? 'servicio configurado' : 'servicios configurados'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.addServiceBtn}
              onPress={handleOpenCreateModal}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle" size={18} color={Colors.primary} />
              <Text style={styles.addServiceBtnText}>Nuevo</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Services List */}
        <View style={styles.listArea}>
          {loading && !refreshing ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Cargando servicios...</Text>
            </View>
          ) : (
            <FlatList
              data={services}
              keyExtractor={(item) => String(item.id)}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.flatListContent}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
              }
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <Ionicons name="briefcase-outline" size={54} color={Colors.textDisabled} />
                  <Text style={styles.emptyTitle}>No tienes servicios registrados</Text>
                  <Text style={styles.emptySubtitle}>
                    Agregá los servicios que ofrece tu comercio para que los clientes puedan solicitar turnos.
                  </Text>
                  <TouchableOpacity style={styles.createFirstBtn} onPress={handleOpenCreateModal}>
                    <Ionicons name="add" size={18} color={Colors.white} />
                    <Text style={styles.createFirstBtnText}>Crear Primer Servicio</Text>
                  </TouchableOpacity>
                </View>
              }
              renderItem={({ item }) => (
                <View style={styles.serviceCard}>
                  <View style={styles.serviceMain}>
                    <Text style={styles.serviceName}>{item.name}</Text>
                    {item.description ? (
                      <Text style={styles.serviceDescription} numberOfLines={2}>
                        {item.description}
                      </Text>
                    ) : null}

                    <View style={styles.serviceBadgesRow}>
                      <View style={styles.durationPill}>
                        <Ionicons name="time-outline" size={13} color="#0284c7" />
                        <Text style={styles.durationPillText}>{item.durationMinutes ?? 30} min</Text>
                      </View>

                      <View style={styles.pricePill}>
                        <Text style={styles.pricePillText}>
                          ${Number(item.price ?? 0).toLocaleString('es-AR')}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={styles.iconActionBtn}
                      onPress={() => handleOpenEditModal(item)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="pencil" size={18} color={Colors.primary} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.iconActionBtn, { backgroundColor: '#fee2e2' }]}
                      onPress={() => handleDeleteService(item.id, item.name)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      </View>

      {/* Add / Edit Service Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>
                {editingServiceId ? 'Editar Servicio' : 'Nuevo Servicio'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Nombre del Servicio *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: Corte de Pelo + Barba"
                  placeholderTextColor={Colors.textDisabled}
                  value={formName}
                  onChangeText={setFormName}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Descripción (Opcional)</Text>
                <TextInput
                  style={[styles.input, { minHeight: 65, textAlignVertical: 'top' }]}
                  placeholder="Detalles sobre qué incluye este servicio..."
                  placeholderTextColor={Colors.textDisabled}
                  value={formDescription}
                  onChangeText={setFormDescription}
                  multiline
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Duración estimada</Text>
                <View style={styles.presetsRow}>
                  {DURATION_PRESETS.map((d) => {
                    const isSelected = formDuration === d;
                    return (
                      <TouchableOpacity
                        key={d}
                        style={[styles.presetChip, isSelected && styles.presetChipActive]}
                        onPress={() => setFormDuration(d)}
                      >
                        <Text style={[styles.presetText, isSelected && styles.presetTextActive]}>
                          {d} min
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Precio ($ ARS)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor={Colors.textDisabled}
                  value={formPrice}
                  onChangeText={setFormPrice}
                  keyboardType="numeric"
                />
              </View>
            </ScrollView>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setModalVisible(false)}
                disabled={saving}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSaveBtn, { opacity: saving ? 0.7 : 1 }]}
                onPress={handleSaveService}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.modalSaveText}>
                    {editingServiceId ? 'Guardar Cambios' : 'Crear Servicio'}
                  </Text>
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
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    marginTop: Spacing.sm,
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
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
    marginBottom: Spacing.sm,
  },
  brandLogo: {
    width: 110,
    height: 42,
  },
  bizBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    gap: 5,
    maxWidth: 160,
  },
  bizBadgeText: {
    color: Colors.white,
    fontSize: Typography.sizes.xs + 1,
    fontWeight: Typography.weights.semiBold,
  },
  headerActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  headerTitle: {
    color: Colors.white,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.extraBold,
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: Typography.sizes.xs + 1,
    marginTop: 1,
  },
  addServiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  addServiceBtnText: {
    color: Colors.primary,
    fontWeight: Typography.weights.bold,
    fontSize: Typography.sizes.sm,
  },
  listArea: {
    flex: 1,
  },
  flatListContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  serviceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  serviceMain: {
    flex: 1,
    marginRight: Spacing.md,
  },
  serviceName: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
  },
  serviceDescription: {
    fontSize: Typography.sizes.xs + 1,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  serviceBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: Spacing.xs,
  },
  durationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: '#bae6fd',
    gap: 3,
  },
  durationPillText: {
    fontSize: Typography.sizes.xs,
    color: '#0284c7',
    fontWeight: Typography.weights.semiBold,
  },
  pricePill: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  pricePillText: {
    fontSize: Typography.sizes.xs,
    color: '#059669',
    fontWeight: Typography.weights.bold,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 6,
  },
  iconActionBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    fontSize: Typography.sizes.md + 1,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
    marginTop: Spacing.md,
  },
  emptySubtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
    lineHeight: 18,
    marginBottom: Spacing.lg,
  },
  createFirstBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    gap: 6,
  },
  createFirstBtnText: {
    color: Colors.white,
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
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  presetChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  presetText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.weights.medium,
  },
  presetTextActive: {
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
