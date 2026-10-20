import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Linking,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format, addDays, subDays, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import api from '../../services/api';
import { Appointment, AppointmentStatus } from '../../types';
import { useOwner } from '../../context/OwnerContext';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { StatusBadge } from '../../components/common/StatusBadge';
import { formatTimeToHHMM } from '../../utils/timeHelper';

type StatusFilter = 'ALL' | AppointmentStatus;

export const OwnerAgendaScreen: React.FC = () => {
  const { selectedBusiness, businesses, setSelectedBusiness, refreshBusinesses, loading: bizLoading } = useOwner();

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  // Cancel modal
  const [cancellingAptId, setCancellingAptId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Business selector modal
  const [bizSelectorVisible, setBizSelectorVisible] = useState(false);

  const fetchAppointments = useCallback(async () => {
    if (!selectedBusiness) {
      setAppointments([]);
      return;
    }

    setLoading(true);
    try {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const res = await api.get(`/appointments?businessId=${selectedBusiness.id}&date=${dateStr}&limit=100`);
      const raw = res.data?.data ?? res.data;
      const list: Appointment[] = Array.isArray(raw) ? raw : [];
      setAppointments(list);
    } catch (err: any) {
      console.warn('Error fetching owner appointments:', err?.message || err);
      setAppointments([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedBusiness, currentDate]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAppointments();
  };

  const handlePrevDay = () => setCurrentDate((prev) => subDays(prev, 1));
  const handleNextDay = () => setCurrentDate((prev) => addDays(prev, 1));
  const handleToday = () => setCurrentDate(new Date());

  const handleUpdateStatus = async (aptId: number, newStatus: AppointmentStatus) => {
    const actionLabel = newStatus === 'CONFIRMED' ? 'confirmar' : 'marcar como completado';
    Alert.alert(
      'Actualizar estado',
      `¿Deseas ${actionLabel} este turno?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              await api.patch(`/appointments/${aptId}/status`, { status: newStatus });
              setAppointments((prev) =>
                prev.map((a) => (a.id === aptId ? { ...a, status: newStatus } : a))
              );
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message || 'No se pudo actualizar el estado.');
            }
          },
        },
      ]
    );
  };

  const handleOpenCancelModal = (aptId: number) => {
    setCancellingAptId(aptId);
    setCancelReason('');
  };

  const handleConfirmCancel = async () => {
    if (!cancellingAptId) return;
    if (!cancelReason.trim()) {
      Alert.alert('Motivo requerido', 'Por favor ingresa un motivo para la cancelación.');
      return;
    }

    setCancelling(true);
    try {
      await api.patch(`/appointments/${cancellingAptId}/cancel`, {
        reason: cancelReason.trim(),
      });
      setAppointments((prev) =>
        prev.map((a) => (a.id === cancellingAptId ? { ...a, status: 'CANCELLED' } : a))
      );
      setCancellingAptId(null);
      setCancelReason('');
      Alert.alert('Turno cancelado', 'El turno ha sido cancelado exitosamente.');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'No se pudo cancelar el turno.');
    } finally {
      setCancelling(false);
    }
  };

  const handleCallClient = (phone?: string) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`);
  };

  const handleWhatsAppClient = (phone?: string, clientName?: string) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/[^\d]/g, '');
    const msg = encodeURIComponent(`Hola ${clientName || ''}, me comunico desde ${selectedBusiness?.name || 'Turnos Ya'} en relación a tu turno.`);
    Linking.openURL(`https://wa.me/${cleanPhone}?text=${msg}`).catch(() => {
      Linking.openURL(`tel:${phone}`);
    });
  };

  // Stats for the current day
  const stats = useMemo(() => {
    const total = appointments.length;
    const pending = appointments.filter((a) => (a.status || '').toUpperCase() === 'PENDING').length;
    const confirmed = appointments.filter((a) => (a.status || '').toUpperCase() === 'CONFIRMED').length;
    const completed = appointments.filter((a) => (a.status || '').toUpperCase() === 'COMPLETED').length;
    const cancelled = appointments.filter((a) => (a.status || '').toUpperCase() === 'CANCELLED').length;
    return { total, pending, confirmed, completed, cancelled };
  }, [appointments]);

  // Filtered appointments
  const filteredAppointments = useMemo(() => {
    if (statusFilter === 'ALL') return appointments;
    return appointments.filter((a) => (a.status || '').toUpperCase() === statusFilter);
  }, [appointments, statusFilter]);

  const formattedDate = useMemo(() => {
    const raw = format(currentDate, "EEEE d 'de' MMMM", { locale: es });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, [currentDate]);

  if (bizLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Cargando panel de negocio...</Text>
      </View>
    );
  }

  if (!selectedBusiness && businesses.length === 0) {
    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
        <View style={styles.headerHero}>
          <Image
            source={require('../../../assets/brand/logo-white.png')}
            style={styles.brandLogo}
            resizeMode="contain"
          />
          <Text style={styles.headerSubtitle}>Panel de Dueño</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="storefront-outline" size={64} color={Colors.primary} />
          <Text style={styles.emptyTitle}>Aún no tienes un negocio registrado</Text>
          <Text style={styles.emptySubtitle}>
            Para comenzar a gestionar turnos, servicios y horarios desde la app, registrá tu primer negocio.
          </Text>
          <TouchableOpacity style={styles.primaryActionBtn} onPress={refreshBusinesses}>
            <Text style={styles.primaryActionBtnText}>Actualizar Datos</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      <View style={styles.mainContainer}>
        {/* Celeste Hero Top Header */}
        <View style={styles.headerHero}>
          <View style={styles.headerTopRow}>
            <Image
              source={require('../../../assets/brand/logo-white.png')}
              style={styles.brandLogo}
              resizeMode="contain"
            />
            {businesses.length > 1 ? (
              <TouchableOpacity
                style={styles.bizSelectorPill}
                onPress={() => setBizSelectorVisible(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="swap-horizontal" size={14} color={Colors.white} />
                <Text style={styles.bizSelectorText} numberOfLines={1}>
                  {selectedBusiness?.name}
                </Text>
                <Ionicons name="chevron-down" size={12} color={Colors.white} />
              </TouchableOpacity>
            ) : (
              <View style={styles.singleBizPill}>
                <Ionicons name="business" size={13} color={Colors.white} />
                <Text style={styles.singleBizText} numberOfLines={1}>
                  {selectedBusiness?.name}
                </Text>
              </View>
            )}
          </View>

          {/* Date Selector Row */}
          <View style={styles.dateSelectorRow}>
            <TouchableOpacity onPress={handlePrevDay} style={styles.dateArrowBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="chevron-back" size={20} color={Colors.white} />
            </TouchableOpacity>

            <View style={styles.dateCenterWrap}>
              <Text style={styles.dateText}>{formattedDate}</Text>
              {isToday(currentDate) ? (
                <View style={styles.todayBadge}>
                  <Text style={styles.todayBadgeText}>Hoy</Text>
                </View>
              ) : (
                <TouchableOpacity onPress={handleToday} style={styles.goToTodayBtn}>
                  <Text style={styles.goToTodayText}>Ir a Hoy</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity onPress={handleNextDay} style={styles.dateArrowBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="chevron-forward" size={20} color={Colors.white} />
            </TouchableOpacity>
          </View>

          {/* Mini Stats Bar */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.total}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: '#fef08a' }]}>{stats.pending}</Text>
              <Text style={styles.statLabel}>Pendientes</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: '#bbf7d0' }]}>{stats.confirmed}</Text>
              <Text style={styles.statLabel}>Confirmados</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: '#93c5fd' }]}>{stats.completed}</Text>
              <Text style={styles.statLabel}>Listos</Text>
            </View>
          </View>
        </View>

        {/* Status Filters Bar */}
        <View style={styles.filterBarContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterList}>
            {[
              { key: 'ALL', label: `Todos (${stats.total})` },
              { key: 'PENDING', label: `Pendientes (${stats.pending})` },
              { key: 'CONFIRMED', label: `Confirmados (${stats.confirmed})` },
              { key: 'COMPLETED', label: `Completados (${stats.completed})` },
              { key: 'CANCELLED', label: `Cancelados (${stats.cancelled})` },
            ].map((item) => {
              const active = statusFilter === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  onPress={() => setStatusFilter(item.key as StatusFilter)}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Appointments List */}
        <View style={styles.listArea}>
          {loading && !refreshing ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Cargando turnos del día...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredAppointments}
              keyExtractor={(item) => String(item.id)}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.flatListContent}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
              }
              ListEmptyComponent={
                <View style={styles.emptyListWrap}>
                  <Ionicons name="calendar-outline" size={48} color={Colors.textDisabled} />
                  <Text style={styles.emptyListTitle}>No hay turnos para esta fecha</Text>
                  <Text style={styles.emptyListSubtitle}>
                    {statusFilter !== 'ALL'
                      ? 'No hay turnos con el filtro seleccionado.'
                      : 'Cuando los clientes reserven en tu negocio, aparecerán listados aquí.'}
                  </Text>
                  {!isToday(currentDate) && (
                    <TouchableOpacity style={styles.returnTodayBtn} onPress={handleToday}>
                      <Text style={styles.returnTodayText}>Ver turnos de Hoy</Text>
                    </TouchableOpacity>
                  )}
                </View>
              }
              renderItem={({ item }) => {
                const clientName = item.client?.name || item.user?.name || 'Cliente';
                const clientPhone = item.client?.phone || item.user?.phone || '';
                const clientEmail = item.client?.email || item.user?.email || '';
                const serviceName = item.service?.name || 'Servicio General';
                const serviceDuration = item.service?.durationMinutes ?? 30;
                const servicePrice = item.service?.price ?? 0;
                const status = (item.status || '').toUpperCase();

                return (
                  <View style={styles.appointmentCard}>
                    {/* Top row: time + status badge */}
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.timeTag}>
                        <Ionicons name="time" size={15} color={Colors.primary} />
                        <Text style={styles.timeTagText}>{formatTimeToHHMM(item.time)} hs</Text>
                      </View>
                      <StatusBadge status={item.status} />
                    </View>

                    {/* Client Information */}
                    <View style={styles.clientSection}>
                      <View style={styles.clientAvatar}>
                        <Text style={styles.clientAvatarText}>
                          {clientName.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.clientInfo}>
                        <Text style={styles.clientNameText}>{clientName}</Text>
                        {clientEmail ? (
                          <Text style={styles.clientMetaText} numberOfLines={1}>
                            {clientEmail}
                          </Text>
                        ) : null}
                      </View>

                      {/* Contact Buttons */}
                      {clientPhone ? (
                        <View style={styles.contactActions}>
                          <TouchableOpacity
                            style={[styles.contactCircleBtn, { backgroundColor: '#dcfce7' }]}
                            onPress={() => handleWhatsAppClient(clientPhone, clientName)}
                            accessibilityLabel="WhatsApp"
                          >
                            <Ionicons name="logo-whatsapp" size={17} color="#16a34a" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.contactCircleBtn, { backgroundColor: '#e0f2fe' }]}
                            onPress={() => handleCallClient(clientPhone)}
                            accessibilityLabel="Llamar"
                          >
                            <Ionicons name="call" size={16} color="#0284c7" />
                          </TouchableOpacity>
                        </View>
                      ) : null}
                    </View>

                    {/* Service & Price Info */}
                    <View style={styles.serviceRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.serviceTitle}>{serviceName}</Text>
                        <Text style={styles.serviceDuration}>Duración estimada: {serviceDuration} min</Text>
                      </View>
                      {servicePrice > 0 ? (
                        <Text style={styles.servicePrice}>${Number(servicePrice).toLocaleString('es-AR')}</Text>
                      ) : null}
                    </View>

                    {/* Notes if any */}
                    {item.notes ? (
                      <View style={styles.notesBox}>
                        <Text style={styles.notesLabel}>Nota del cliente:</Text>
                        <Text style={styles.notesText}>{item.notes}</Text>
                      </View>
                    ) : null}

                    {/* Action Buttons for Owner */}
                    {status === 'PENDING' && (
                      <View style={styles.cardActionsRow}>
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.confirmBtn]}
                          onPress={() => handleUpdateStatus(item.id, 'CONFIRMED')}
                        >
                          <Ionicons name="checkmark-circle" size={16} color={Colors.white} />
                          <Text style={styles.actionBtnText}>Confirmar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.cancelOutlineBtn]}
                          onPress={() => handleOpenCancelModal(item.id)}
                        >
                          <Ionicons name="close-circle-outline" size={16} color={Colors.danger} />
                          <Text style={[styles.actionBtnText, { color: Colors.danger }]}>Cancelar</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {status === 'CONFIRMED' && (
                      <View style={styles.cardActionsRow}>
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.completeBtn]}
                          onPress={() => handleUpdateStatus(item.id, 'COMPLETED')}
                        >
                          <Ionicons name="star" size={15} color={Colors.white} />
                          <Text style={styles.actionBtnText}>Marcar Completado</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.cancelOutlineBtn]}
                          onPress={() => handleOpenCancelModal(item.id)}
                        >
                          <Ionicons name="close-circle-outline" size={16} color={Colors.danger} />
                          <Text style={[styles.actionBtnText, { color: Colors.danger }]}>Cancelar</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              }}
            />
          )}
        </View>
      </View>

      {/* Cancel Reason Modal */}
      <Modal visible={cancellingAptId !== null} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Cancelar Turno</Text>
            <Text style={styles.modalSubtitle}>
              Ingresa el motivo de la cancelación. Se notificará al cliente automáticamente.
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Ej: Imprevisto técnico / Feriado / Cambio de horario"
              placeholderTextColor={Colors.textDisabled}
              value={cancelReason}
              onChangeText={setCancelReason}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setCancellingAptId(null)}
                disabled={cancelling}
              >
                <Text style={styles.modalCancelText}>Volver</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalConfirmBtn, { opacity: cancelling ? 0.6 : 1 }]}
                onPress={handleConfirmCancel}
                disabled={cancelling}
              >
                {cancelling ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.modalConfirmText}>Confirmar Cancelación</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Multiple Businesses Selector Modal */}
      <Modal visible={bizSelectorVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Seleccionar Negocio</Text>
            <Text style={styles.modalSubtitle}>Elige qué negocio deseas gestionar en este momento:</Text>

            <ScrollView style={{ maxHeight: 240, marginVertical: Spacing.sm }}>
              {businesses.map((biz) => {
                const isSelected = selectedBusiness?.id === biz.id;
                return (
                  <TouchableOpacity
                    key={biz.id}
                    style={[styles.bizItemOption, isSelected && styles.bizItemOptionActive]}
                    onPress={() => {
                      setSelectedBusiness(biz);
                      setBizSelectorVisible(false);
                    }}
                  >
                    <Ionicons
                      name="storefront"
                      size={18}
                      color={isSelected ? Colors.primary : Colors.textSecondary}
                    />
                    <Text style={[styles.bizItemText, isSelected && styles.bizItemTextActive]}>
                      {biz.name}
                    </Text>
                    {isSelected && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setBizSelectorVisible(false)}>
              <Text style={styles.modalCloseText}>Cerrar</Text>
            </TouchableOpacity>
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
  headerSubtitle: {
    color: Colors.white,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
    marginTop: 4,
  },
  bizSelectorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    gap: 6,
    maxWidth: 180,
  },
  bizSelectorText: {
    color: Colors.white,
    fontSize: Typography.sizes.xs + 1,
    fontWeight: Typography.weights.bold,
  },
  singleBizPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    gap: 5,
    maxWidth: 160,
  },
  singleBizText: {
    color: Colors.white,
    fontSize: Typography.sizes.xs + 1,
    fontWeight: Typography.weights.semiBold,
  },
  dateSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    marginVertical: Spacing.xs,
  },
  dateArrowBtn: {
    padding: 6,
    borderRadius: BorderRadius.full,
  },
  dateCenterWrap: {
    alignItems: 'center',
  },
  dateText: {
    color: Colors.white,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
  todayBadge: {
    backgroundColor: Colors.white,
    paddingHorizontal: 8,
    paddingVertical: 1,
    borderRadius: BorderRadius.full,
    marginTop: 2,
  },
  todayBadgeText: {
    color: Colors.primary,
    fontSize: Typography.sizes.xs - 1,
    fontWeight: Typography.weights.extraBold,
    textTransform: 'uppercase',
  },
  goToTodayBtn: {
    marginTop: 2,
  },
  goToTodayText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: Typography.sizes.xs,
    textDecorationLine: 'underline',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: Spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: BorderRadius.md,
    paddingVertical: 6,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: Typography.sizes.md + 1,
    fontWeight: Typography.weights.extraBold,
    color: Colors.white,
  },
  statLabel: {
    fontSize: Typography.sizes.xs - 1,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  filterBarContainer: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingVertical: 8,
  },
  filterList: {
    paddingHorizontal: Spacing.lg,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: Typography.sizes.xs + 1,
    color: Colors.textSecondary,
    fontWeight: Typography.weights.medium,
  },
  filterChipTextActive: {
    color: Colors.white,
    fontWeight: Typography.weights.bold,
  },
  listArea: {
    flex: 1,
  },
  flatListContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  appointmentCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    paddingBottom: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeTagText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
  },
  clientSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  clientAvatar: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientAvatarText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
  },
  clientInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  clientNameText: {
    fontSize: Typography.sizes.sm + 1,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
  },
  clientMetaText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  contactActions: {
    flexDirection: 'row',
    gap: 8,
  },
  contactCircleBtn: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    backgroundColor: '#f8fafc',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: 2,
  },
  serviceTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semiBold,
    color: Colors.textTitle,
  },
  serviceDuration: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  servicePrice: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.extraBold,
    color: Colors.primary,
  },
  notesBox: {
    marginTop: Spacing.xs,
    padding: Spacing.xs,
    backgroundColor: '#fefce8',
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: '#fef08a',
  },
  notesLabel: {
    fontSize: Typography.sizes.xs - 1,
    fontWeight: Typography.weights.bold,
    color: '#854d0e',
  },
  notesText: {
    fontSize: Typography.sizes.xs,
    color: '#713f12',
    marginTop: 1,
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: Spacing.sm,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    gap: 4,
  },
  confirmBtn: {
    backgroundColor: Colors.success,
  },
  completeBtn: {
    backgroundColor: Colors.primary,
  },
  cancelOutlineBtn: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  actionBtnText: {
    fontSize: Typography.sizes.xs + 1,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
  },
  emptyListWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: Spacing.xl,
  },
  emptyListTitle: {
    fontSize: Typography.sizes.md + 1,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
    marginTop: Spacing.md,
  },
  emptyListSubtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
    lineHeight: 18,
  },
  returnTodayBtn: {
    marginTop: Spacing.md,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryLight,
  },
  returnTodayText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
    backgroundColor: Colors.background,
  },
  emptyTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  primaryActionBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
  },
  primaryActionBtnText: {
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
  modalTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    lineHeight: 18,
  },
  modalInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    fontSize: Typography.sizes.sm,
    color: Colors.textMain,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: Spacing.md,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.weights.bold,
  },
  modalConfirmBtn: {
    flex: 2,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.danger,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: Typography.sizes.sm,
    color: Colors.white,
    fontWeight: Typography.weights.bold,
  },
  bizItemOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 6,
    gap: 8,
  },
  bizItemOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  bizItemText: {
    flex: 1,
    fontSize: Typography.sizes.sm,
    color: Colors.textMain,
    fontWeight: Typography.weights.medium,
  },
  bizItemTextActive: {
    color: Colors.primary,
    fontWeight: Typography.weights.bold,
  },
  modalCloseBtn: {
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: Spacing.xs,
  },
  modalCloseText: {
    fontSize: Typography.sizes.sm,
    color: Colors.primary,
    fontWeight: Typography.weights.bold,
  },
});
