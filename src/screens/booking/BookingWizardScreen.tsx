import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import {
  format,
  addDays,
  isToday,
  isSameDay,
} from 'date-fns';
import { es } from 'date-fns/locale';
import api from '../../services/api';
import { BusinessService, Schedule } from '../../types';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { SlotPill } from '../../components/common/SlotPill';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import {
  formatTimeToHHMM,
  toISOTimeString,
  generateSlotsForSchedule,
  getEffectiveDurationMinutes,
} from '../../utils/timeHelper';

type WizardStep = 1 | 2 | 3;

export const BookingWizardScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { businessId, businessName, businessAddress, preselectedServiceId } =
    route.params || {};
  const { user } = useAuth();

  const [step, setStep] = useState<WizardStep>(1);
  const [loading, setLoading] = useState<boolean>(true);

  // Business Data
  const [services, setServices] = useState<BusinessService[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);

  // Wizard selections
  const [selectedService, setSelectedService] = useState<BusinessService | null>(
    null
  );
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>('');

  // Busy slots & Hold token
  const [busySlots, setBusySlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [holdToken, setHoldToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [confirmedSuccess, setConfirmedSuccess] = useState<boolean>(false);

  // 1. Cargar servicios y horarios
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sRes, schRes] = await Promise.all([
          api.get(`/businesses/${businessId}/services`),
          api.get(`/businesses/${businessId}/schedules`),
        ]);

        const sData = sRes.data?.data ?? sRes.data ?? [];
        setServices(sData);

        const schData = schRes.data?.data ?? schRes.data ?? [];
        setSchedules(schData);

        if (preselectedServiceId) {
          const match = sData.find(
            (s: BusinessService) => s.id === Number(preselectedServiceId)
          );
          if (match) {
            setSelectedService(match);
            setStep(2);
          }
        }
      } catch (err) {
        console.error('Error fetching booking data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (businessId) {
      fetchData();
    }
  }, [businessId, preselectedServiceId]);

  // 2. Cargar slots ocupados al cambiar fecha
  useEffect(() => {
    if (!businessId || !selectedDate) return;

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    setLoadingSlots(true);

    api
      .get(`/businesses/${businessId}/busy-slots?date=${dateStr}`)
      .then((res) => {
        const raw = res.data?.data ?? [];
        setBusySlots(raw.map((item: string) => formatTimeToHHMM(item)));
      })
      .catch(() => setBusySlots([]))
      .finally(() => setLoadingSlots(false));
  }, [businessId, selectedDate]);

  // 3. Countdown timer para el Hold Token
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (expiresAt) {
      timer = setInterval(() => {
        const diff = new Date(expiresAt).getTime() - Date.now();
        if (diff <= 0) {
          clearInterval(timer);
          setHoldToken(null);
          setExpiresAt(null);
          setTimeLeft(0);
          Alert.alert(
            'Tiempo Expirado',
            'La reserva temporal ha expirado. Por favor selecciona el horario nuevamente.'
          );
          setStep(2);
        } else {
          setTimeLeft(Math.ceil(diff / 1000));
        }
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [expiresAt]);

  // Generador de días para selector horizontal (próximos 14 días)
  const availableDays = useMemo(() => {
    const days: Date[] = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      days.push(addDays(today, i));
    }
    return days;
  }, []);

  const getBusinessDayOfWeek = (d: Date): number => {
    const jsDay = d.getDay();
    return jsDay === 0 ? 7 : jsDay;
  };

  const currentDaySchedules = useMemo(() => {
    if (!selectedDate) return [];
    const dow = getBusinessDayOfWeek(selectedDate);
    return schedules.filter((s) => s.dayOfWeek === dow);
  }, [selectedDate, schedules]);

  // Generador de slots de turnos
  const slotGroups = useMemo(() => {
    if (!selectedDate || !selectedService) return [];
    const duration = selectedService.durationMinutes || 30;

    if (currentDaySchedules.length > 0) {
      return currentDaySchedules
        .map((sch) => {
          const startStr = formatTimeToHHMM(sch.startTime);
          const endStr = formatTimeToHHMM(sch.endTime);
          const [startH] = startStr.split(':').map(Number);
          const isMorning = startH < 13;
          const title = isMorning
            ? `Mañana (${startStr} a ${endStr})`
            : `Tarde (${startStr} a ${endStr})`;
          const slots = generateSlotsForSchedule(
            sch.startTime,
            sch.endTime,
            duration
          );
          return { title, slots };
        })
        .filter((g) => g.slots.length > 0);
    }

    if (schedules.length === 0) {
      return [
        {
          title: 'Mañana (09:00 a 13:00)',
          slots: generateSlotsForSchedule('09:00', '13:00', duration),
        },
        {
          title: 'Tarde (13:00 a 18:00)',
          slots: generateSlotsForSchedule('13:00', '18:00', duration),
        },
      ];
    }

    return [];
  }, [selectedDate, selectedService, currentDaySchedules, schedules]);

  const isSlotPast = (slotTime: string) => {
    if (!isToday(selectedDate)) return false;
    const [h, m] = slotTime.split(':').map(Number);
    const now = new Date();
    return h < now.getHours() || (h === now.getHours() && m <= now.getMinutes());
  };

  const isSlotUnavailable = (slotTime: string) => {
    if (!selectedService) return true;
    if (isSlotPast(slotTime)) return true;

    const effectiveDuration = getEffectiveDurationMinutes(
      selectedService.durationMinutes
    );
    const slotsCount = effectiveDuration / 30;
    const [h, m] = slotTime.split(':').map(Number);
    const startM = h * 60 + m;

    for (let i = 0; i < slotsCount; i++) {
      const curM = startM + i * 30;
      const curH = Math.floor(curM / 60);
      const curMin = curM % 60;
      const subSlot = `${String(curH).padStart(2, '0')}:${String(curMin).padStart(
        2,
        '0'
      )}`;
      if (busySlots.includes(subSlot)) return true;
    }
    return false;
  };

  // Paso 2 -> Paso 3: Hold temporal
  const handleHold = async () => {
    if (!selectedService || !selectedDate || !selectedTime) {
      Alert.alert('Atención', 'Por favor seleccioná un horario para continuar.');
      return;
    }

    setSubmitting(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const res = await api.post('/appointments/hold', {
        businessId: Number(businessId),
        serviceId: selectedService.id,
        date: `${dateStr}T00:00:00.000Z`,
        time: toISOTimeString(selectedTime),
      });

      setHoldToken(res.data.holdToken);
      setExpiresAt(res.data.expiresAt);
      setStep(3);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        'El horario seleccionado no está disponible. Por favor elegí otro.';
      Alert.alert('Horario no disponible', msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Paso 3: Confirmación Final
  const handleConfirmAppointment = async () => {
    if (!user) {
      Alert.alert(
        'Iniciá Sesión',
        'Necesitás una cuenta para confirmar tu turno.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Ir a Iniciar Sesión',
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
      return;
    }

    if (!holdToken || !selectedService || !selectedDate || !selectedTime) {
      Alert.alert('Error', 'Datos de reserva incompletos.');
      return;
    }

    setSubmitting(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      await api.post('/appointments', {
        businessId: Number(businessId),
        serviceId: selectedService.id,
        date: `${dateStr}T00:00:00.000Z`,
        time: toISOTimeString(selectedTime),
        holdToken,
        notes,
      });

      setConfirmedSuccess(true);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        'No se pudo confirmar el turno. Intentalo nuevamente.';
      Alert.alert('Error en confirmación', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Preparando agenda de reservas...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Pantalla de Confirmación Exitosa
  if (confirmedSuccess) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.successContainer}>
          <View style={styles.successIconBox}>
            <Ionicons name="checkmark" size={48} color={Colors.success} />
          </View>
          <Text style={styles.successTitle}>¡Turno Reservado con Éxito!</Text>
          <Text style={styles.successSubtitle}>
            Tu turno en {businessName} ha sido agendado. Podés ver el estado y los
            recordatorios en tu sección de reservas.
          </Text>

          <Card style={styles.successSummaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Servicio:</Text>
              <Text style={styles.summaryValue}>{selectedService?.name}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Fecha:</Text>
              <Text style={styles.summaryValue}>
                {selectedDate
                  ? format(selectedDate, "EEEE d 'de' MMMM", { locale: es })
                  : ''}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Horario:</Text>
              <Text style={styles.summaryValue}>{selectedTime} hs</Text>
            </View>
          </Card>

          <Button
            title="Ver Mis Turnos"
            size="lg"
            onPress={() => navigation.navigate('AppointmentsTab')}
            style={{ width: '100%', marginBottom: Spacing.md }}
          />
          <Button
            title="Volver al Inicio"
            variant="outline"
            size="lg"
            onPress={() => navigation.navigate('HomeTab')}
            style={{ width: '100%' }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            if (step > 1) {
              setStep((step - 1) as WizardStep);
            } else {
              navigation.goBack();
            }
          }}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.textTitle} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {businessName || 'Reservar Turno'}
          </Text>
          <Text style={styles.headerSubtitle}>Paso {step} de 3</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Wizard Step Progress Bar */}
      <View style={styles.stepperContainer}>
        {[1, 2, 3].map((s) => (
          <View key={s} style={styles.stepItem}>
            <View
              style={[
                styles.stepCircle,
                s === step && styles.stepCircleActive,
                s < step && styles.stepCircleDone,
              ]}
            >
              {s < step ? (
                <Ionicons name="checkmark" size={14} color={Colors.white} />
              ) : (
                <Text
                  style={[
                    styles.stepNum,
                    s === step && styles.stepNumActive,
                  ]}
                >
                  {s}
                </Text>
              )}
            </View>
            <Text
              style={[
                styles.stepLabel,
                s === step && styles.stepLabelActive,
              ]}
            >
              {s === 1 ? 'Servicio' : s === 2 ? 'Fecha y Hora' : 'Confirmar'}
            </Text>
          </View>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ================= PASO 1: SERVICIO ================= */}
        {step === 1 && (
          <View>
            <Text style={styles.stepTitle}>Seleccioná el servicio</Text>
            <Text style={styles.stepDesc}>
              Elegí la atención que deseás recibir en {businessName}.
            </Text>

            {services.map((srv) => {
              const isSelected = selectedService?.id === srv.id;
              return (
                <TouchableOpacity
                  key={srv.id}
                  activeOpacity={0.8}
                  onPress={() => setSelectedService(srv)}
                >
                  <Card
                    style={[
                      styles.selectableServiceCard,
                      isSelected && styles.selectableServiceCardActive,
                    ]}
                  >
                    <View style={styles.radioOuter}>
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                    <View style={styles.serviceContent}>
                      <Text style={styles.serviceItemName}>{srv.name}</Text>
                      {srv.description ? (
                        <Text style={styles.serviceItemDesc}>
                          {srv.description}
                        </Text>
                      ) : null}
                      <View style={styles.serviceItemMeta}>
                        <Text style={styles.serviceDuration}>
                          ⏱ {srv.durationMinutes || 30} min
                        </Text>
                        {srv.price !== undefined && srv.price !== null && (
                          <Text style={styles.servicePrice}>
                            ${Number(srv.price).toLocaleString('es-AR')}
                          </Text>
                        )}
                      </View>
                    </View>
                  </Card>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ================= PASO 2: FECHA Y HORA ================= */}
        {step === 2 && (
          <View>
            <Text style={styles.stepTitle}>Seleccioná fecha y horario</Text>
            <Text style={styles.stepDesc}>
              Servicio: <Text style={{ fontWeight: 'bold' }}>{selectedService?.name}</Text> ({selectedService?.durationMinutes || 30} min)
            </Text>

            {/* Selector de días horizontal */}
            <Text style={styles.subSectionTitle}>1. Elegí el día</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.daysSlider}
            >
              {availableDays.map((d, index) => {
                const isSelected = isSameDay(d, selectedDate);
                const dayName = format(d, 'EEE', { locale: es }).replace('.', '');
                const dayNum = format(d, 'd');
                const today = isToday(d);

                return (
                  <TouchableOpacity
                    key={index}
                    activeOpacity={0.7}
                    onPress={() => {
                      setSelectedDate(d);
                      setSelectedTime(null);
                    }}
                    style={[
                      styles.dayCard,
                      isSelected && styles.dayCardActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayName,
                        isSelected && styles.dayTextActive,
                      ]}
                    >
                      {today ? 'Hoy' : dayName}
                    </Text>
                    <Text
                      style={[
                        styles.dayNum,
                        isSelected && styles.dayTextActive,
                      ]}
                    >
                      {dayNum}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Selector de horarios */}
            <Text style={[styles.subSectionTitle, { marginTop: Spacing.lg }]}>
              2. Horarios disponibles para el{' '}
              {format(selectedDate, "d 'de' MMMM", { locale: es })}
            </Text>

            {loadingSlots ? (
              <View style={styles.slotsLoading}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.slotsLoadingText}>
                  Buscando horarios disponibles...
                </Text>
              </View>
            ) : slotGroups.length === 0 ? (
              <Card style={styles.noSlotsCard}>
                <Ionicons name="time-outline" size={32} color={Colors.textDisabled} />
                <Text style={styles.noSlotsText}>
                  El comercio no atiende o no tiene turnos libres en este día.
                </Text>
              </Card>
            ) : (
              slotGroups.map((group, gIdx) => (
                <View key={gIdx} style={styles.slotGroupContainer}>
                  <Text style={styles.slotGroupTitle}>{group.title}</Text>
                  <View style={styles.slotPillsGrid}>
                    {group.slots.map((slot) => {
                      const unavailable = isSlotUnavailable(slot);
                      const isSelected = selectedTime === slot;
                      return (
                        <SlotPill
                          key={slot}
                          time={slot}
                          selected={isSelected}
                          disabled={unavailable}
                          onPress={() => setSelectedTime(slot)}
                        />
                      );
                    })}
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* ================= PASO 3: CONFIRMACIÓN ================= */}
        {step === 3 && (
          <View>
            <Text style={styles.stepTitle}>Revisá y confirmá tu turno</Text>

            {/* Hold Banner */}
            {timeLeft > 0 && (
              <View style={styles.holdBanner}>
                <Ionicons name="stopwatch-outline" size={20} color={Colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.holdBannerTitle}>Turno apartado temporalmente</Text>
                  <Text style={styles.holdBannerSubtitle}>
                    Completá la confirmación antes de que expire: {formatTimer(timeLeft)}
                  </Text>
                </View>
              </View>
            )}

            {/* Summary Card */}
            <Card style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Ionicons name="business" size={24} color={Colors.primary} />
                <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                  <Text style={styles.reviewBusinessName}>{businessName}</Text>
                  <Text style={styles.reviewBusinessAddress}>{businessAddress}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.detailItem}>
                <Ionicons name="cut-outline" size={18} color={Colors.textSecondary} />
                <View style={styles.detailTextWrap}>
                  <Text style={styles.detailLabel}>Servicio</Text>
                  <Text style={styles.detailValue}>{selectedService?.name}</Text>
                </View>
                {selectedService?.price !== undefined && (
                  <Text style={styles.detailPrice}>
                    ${Number(selectedService.price).toLocaleString('es-AR')}
                  </Text>
                )}
              </View>

              <View style={styles.detailItem}>
                <Ionicons name="calendar-outline" size={18} color={Colors.textSecondary} />
                <View style={styles.detailTextWrap}>
                  <Text style={styles.detailLabel}>Fecha y Hora</Text>
                  <Text style={styles.detailValue}>
                    {selectedDate
                      ? format(selectedDate, "EEEE d 'de' MMMM", { locale: es })
                      : ''}{' '}
                    - {selectedTime} hs
                  </Text>
                </View>
              </View>
            </Card>

            {/* Notes / Special requirements */}
            <View style={styles.notesContainer}>
              <Text style={styles.subSectionTitle}>Notas u observaciones (opcional)</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="Ej: Avisar al llegar, consulta específica..."
                placeholderTextColor={Colors.textDisabled}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Auth Reminder if guest */}
            {!user && (
              <View style={styles.guestReminder}>
                <Ionicons name="information-circle" size={22} color={Colors.info} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.guestTitle}>Se requiere una cuenta</Text>
                  <Text style={styles.guestDesc}>
                    Para registrar tu turno y enviarte recordatorios, iniciá sesión o registrate.
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <View style={styles.bottomBar}>
        {step === 1 && (
          <Button
            title="Continuar"
            size="lg"
            disabled={!selectedService}
            onPress={() => setStep(2)}
          />
        )}

        {step === 2 && (
          <Button
            title="Reservar Horario"
            size="lg"
            loading={submitting}
            disabled={!selectedTime}
            onPress={handleHold}
          />
        )}

        {step === 3 && (
          <Button
            title={user ? 'Confirmar Turno' : 'Iniciar Sesión para Confirmar'}
            size="lg"
            loading={submitting}
            onPress={handleConfirmAppointment}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    padding: Spacing.xs,
  },
  headerTitleWrap: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
  },
  headerSubtitle: {
    fontSize: Typography.sizes.xs,
    color: Colors.primary,
    fontWeight: Typography.weights.semiBold,
  },
  stepperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  stepItem: {
    alignItems: 'center',
    gap: 4,
  },
  stepCircle: {
    width: 26,
    height: 26,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.borderInput,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  stepCircleActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  stepCircleDone: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  stepNum: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    color: Colors.textSecondary,
  },
  stepNumActive: {
    color: Colors.primary,
  },
  stepLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.weights.medium,
  },
  stepLabelActive: {
    color: Colors.primary,
    fontWeight: Typography.weights.bold,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 110,
  },
  stepTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
    marginBottom: 4,
  },
  stepDesc: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  subSectionTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
    marginBottom: Spacing.sm,
  },
  selectableServiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  selectableServiceCardActive: {
    borderColor: Colors.primary,
    backgroundColor: '#fbfdff',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
  },
  serviceContent: {
    flex: 1,
  },
  serviceItemName: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
    marginBottom: 2,
  },
  serviceItemDesc: {
    fontSize: Typography.sizes.xs + 1,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  serviceItemMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceDuration: {
    fontSize: Typography.sizes.xs + 1,
    color: Colors.textSecondary,
  },
  servicePrice: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
  },
  daysSlider: {
    gap: 8,
    paddingVertical: 4,
  },
  dayCard: {
    width: 60,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCardActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dayName: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  dayNum: {
    fontSize: Typography.sizes.md + 1,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
  },
  dayTextActive: {
    color: Colors.white,
  },
  slotsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 20,
  },
  slotsLoadingText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
  },
  noSlotsCard: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 8,
  },
  noSlotsText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  slotGroupContainer: {
    marginBottom: Spacing.md,
  },
  slotGroupTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semiBold,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  slotPillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  holdBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.statusPendingBg,
    borderColor: Colors.statusPendingBorder,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    gap: 12,
  },
  holdBannerTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
  },
  holdBannerSubtitle: {
    fontSize: Typography.sizes.xs,
    color: Colors.textMain,
    marginTop: 2,
  },
  reviewCard: {
    marginBottom: Spacing.lg,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewBusinessName: {
    fontSize: Typography.sizes.md + 1,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
  },
  reviewBusinessAddress: {
    fontSize: Typography.sizes.xs + 1,
    color: Colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  detailTextWrap: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  detailLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: Typography.sizes.sm + 1,
    fontWeight: Typography.weights.semiBold,
    color: Colors.textTitle,
  },
  detailPrice: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
  },
  notesContainer: {
    marginBottom: Spacing.lg,
  },
  notesInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderInput,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: Typography.sizes.sm,
    color: Colors.textMain,
    textAlignVertical: 'top',
  },
  guestReminder: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: 10,
  },
  guestTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
  },
  guestDesc: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  successIconBox: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.statusConfirmedBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  successTitle: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.extraBold,
    color: Colors.textTitle,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  successSubtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  successSummaryCard: {
    width: '100%',
    marginBottom: Spacing.xl,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  summaryLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
  },
  summaryValue: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
  },
});
