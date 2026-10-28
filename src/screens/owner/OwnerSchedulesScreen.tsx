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
import { Schedule } from '../../types';
import { useOwner } from '../../context/OwnerContext';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { formatTimeToHHMM } from '../../utils/timeHelper';

const DAYS_OF_WEEK = [
  { day: 1, name: 'Lunes' },
  { day: 2, name: 'Martes' },
  { day: 3, name: 'Miércoles' },
  { day: 4, name: 'Jueves' },
  { day: 5, name: 'Viernes' },
  { day: 6, name: 'Sábado' },
  { day: 7, name: 'Domingo' },
];

export const OwnerSchedulesScreen: React.FC = () => {
  const { selectedBusiness } = useOwner();

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [saving, setSaving] = useState(false);

  const fetchSchedules = useCallback(async () => {
    if (!selectedBusiness) {
      setSchedules([]);
      return;
    }

    setLoading(true);
    try {
      const res = await api.get(`/businesses/${selectedBusiness.id}/schedules`);
      const raw = res.data?.data ?? res.data;
      const list: Schedule[] = Array.isArray(raw) ? raw : [];
      setSchedules(list);
    } catch (err: any) {
      console.warn('Error fetching schedules:', err?.message || err);
      setSchedules([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedBusiness]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSchedules();
  };

  const handleOpenModal = (day: number = 1) => {
    setSelectedDay(day);
    setStartTime('09:00');
    setEndTime('18:00');
    setModalVisible(true);
  };

  const handleSaveSchedule = async () => {
    if (!selectedBusiness) return;

    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      Alert.alert('Formato de hora incorrecto', 'Por favor ingresa horarios en formato HH:MM (ej: 09:00 o 18:30).');
      return;
    }

    if (startTime >= endTime) {
      Alert.alert('Horario inválido', 'La hora de apertura debe ser anterior a la hora de cierre.');
      return;
    }

    setSaving(true);
    try {
      await api.post(`/businesses/${selectedBusiness.id}/schedules`, {
        dayOfWeek: selectedDay,
        startTime: `${startTime}:00`,
        endTime: `${endTime}:00`,
      });

      Alert.alert('Horario agregado', 'El nuevo rango horario fue guardado exitosamente.');
      setModalVisible(false);
      fetchSchedules();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'No se pudo guardar el horario.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSchedule = (scheduleId: number, dayName: string, rangeStr: string) => {
    if (!selectedBusiness) return;

    Alert.alert(
      'Eliminar horario',
      `¿Deseas eliminar el horario ${rangeStr} para el día ${dayName}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/businesses/${selectedBusiness.id}/schedules/${scheduleId}`);
              setSchedules((prev) => prev.filter((s) => s.id !== scheduleId));
              Alert.alert('Horario eliminado', 'El horario fue eliminado correctamente.');
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message || 'No se pudo eliminar el horario.');
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
              <Text style={styles.headerTitle}>Horarios de Atención</Text>
              <Text style={styles.headerSubtitle}>
                Franjas habilitadas para reservas online
              </Text>
            </View>

            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => handleOpenModal(1)}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle" size={18} color={Colors.primary} />
              <Text style={styles.addBtnText}>Agregar</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Weekly List */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
          }
        >
          {loading && !refreshing ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Cargando horarios de atención...</Text>
            </View>
          ) : (
            DAYS_OF_WEEK.map((dayItem) => {
              const daySchedules = schedules.filter((s) => Number(s.dayOfWeek) === dayItem.day);
              const isOpen = daySchedules.length > 0;

              return (
                <View key={dayItem.day} style={styles.dayCard}>
                  <View style={styles.dayHeaderRow}>
                    <View style={styles.dayTitleWrap}>
                      <Text style={styles.dayName}>{dayItem.name}</Text>
                      <View style={[styles.dayStatusIndicator, isOpen ? styles.indicatorOpen : styles.indicatorClosed]}>
                        <Text style={[styles.indicatorText, isOpen ? styles.indicatorTextOpen : styles.indicatorTextClosed]}>
                          {isOpen ? 'Abierto' : 'Cerrado'}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.addSmallBtn}
                      onPress={() => handleOpenModal(dayItem.day)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Ionicons name="add" size={16} color={Colors.primary} />
                      <Text style={styles.addSmallBtnText}>Franja</Text>
                    </TouchableOpacity>
                  </View>

                  {isOpen ? (
                    <View style={styles.slotsRow}>
                      {daySchedules.map((sch) => {
                        const start = formatTimeToHHMM(sch.startTime);
                        const end = formatTimeToHHMM(sch.endTime);
                        const rangeStr = `${start} - ${end} hs`;

                        return (
                          <View key={sch.id} style={styles.slotPill}>
                            <Ionicons name="time" size={13} color={Colors.primary} />
                            <Text style={styles.slotPillText}>{rangeStr}</Text>
                            <TouchableOpacity
                              onPress={() => handleDeleteSchedule(sch.id, dayItem.name, rangeStr)}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Ionicons name="close-circle" size={16} color={Colors.danger} />
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    <Text style={styles.closedDayText}>
                      Sin turnos disponibles este día.
                    </Text>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      </View>

      {/* Add Schedule Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Agregar Horario</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Día de la Semana</Text>
                <View style={styles.daysGrid}>
                  {DAYS_OF_WEEK.map((d) => {
                    const isSelected = selectedDay === d.day;
                    return (
                      <TouchableOpacity
                        key={d.day}
                        style={[styles.dayChoiceChip, isSelected && styles.dayChoiceChipActive]}
                        onPress={() => setSelectedDay(d.day)}
                      >
                        <Text style={[styles.dayChoiceText, isSelected && styles.dayChoiceTextActive]}>
                          {d.name.slice(0, 3)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.timeInputsRow}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.label}>Hora Apertura (HH:MM)</Text>
                  <TextInput
                    style={styles.timeInput}
                    placeholder="09:00"
                    placeholderTextColor={Colors.textDisabled}
                    value={startTime}
                    onChangeText={setStartTime}
                    maxLength={5}
                  />
                </View>

                <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.label}>Hora Cierre (HH:MM)</Text>
                  <TextInput
                    style={styles.timeInput}
                    placeholder="18:00"
                    placeholderTextColor={Colors.textDisabled}
                    value={endTime}
                    onChangeText={setEndTime}
                    maxLength={5}
                  />
                </View>
              </View>

              <Text style={styles.modalHelperText}>
                Ejemplo: para un turno matutino ingresá 09:00 a 13:00. Podés agregar múltiples franjas en el mismo día.
              </Text>
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
                onPress={handleSaveSchedule}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.modalSaveText}>Guardar Horario</Text>
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
  addBtn: {
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
  addBtnText: {
    color: Colors.primary,
    fontWeight: Typography.weights.bold,
    fontSize: Typography.sizes.sm,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  dayCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  dayHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  dayTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dayName: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
  },
  dayStatusIndicator: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  indicatorOpen: {
    backgroundColor: '#ecfdf5',
  },
  indicatorClosed: {
    backgroundColor: '#f1f5f9',
  },
  indicatorText: {
    fontSize: Typography.sizes.xs - 1,
    fontWeight: Typography.weights.bold,
    textTransform: 'uppercase',
  },
  indicatorTextOpen: {
    color: '#059669',
  },
  indicatorTextClosed: {
    color: '#64748b',
  },
  addSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    gap: 2,
  },
  addSmallBtnText: {
    fontSize: Typography.sizes.xs,
    color: Colors.primary,
    fontWeight: Typography.weights.bold,
  },
  slotsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: Spacing.xs,
  },
  slotPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
  },
  slotPillText: {
    fontSize: Typography.sizes.xs + 1,
    fontWeight: Typography.weights.semiBold,
    color: Colors.textTitle,
  },
  closedDayText: {
    fontSize: Typography.sizes.xs + 1,
    color: Colors.textDisabled,
    fontStyle: 'italic',
    marginTop: 4,
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
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  dayChoiceChip: {
    flex: 1,
    minWidth: 42,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dayChoiceChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dayChoiceText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.weights.bold,
  },
  dayChoiceTextActive: {
    color: Colors.white,
  },
  timeInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
    textAlign: 'center',
    color: Colors.textTitle,
  },
  modalHelperText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    lineHeight: 16,
    marginTop: Spacing.xs,
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
