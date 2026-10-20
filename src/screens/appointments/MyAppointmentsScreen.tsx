import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { format, isPast, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import api from '../../services/api';
import { Appointment } from '../../types';
import { Card } from '../../components/common/Card';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Button } from '../../components/common/Button';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { formatTimeToHHMM } from '../../utils/timeHelper';

type AppointmentTab = 'UPCOMING' | 'HISTORY';

export const MyAppointmentsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [activeTab, setActiveTab] = useState<AppointmentTab>('UPCOMING');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const fetchAppointments = async () => {
    if (!user) {
      setAppointments([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const res = await api.get('/appointments');
      const raw = res.data?.data ?? res.data ?? [];
      setAppointments(Array.isArray(raw) ? raw : []);
    } catch (err: any) {
      console.warn('Error fetching appointments:', err?.message || err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAppointments();
    }, [user])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchAppointments();
  };

  const handleCancelAppointment = (appointment: Appointment) => {
    Alert.alert(
      'Cancelar Turno',
      '¿Estás seguro de que deseás cancelar este turno?',
      [
        { text: 'No, mantener', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            setCancellingId(appointment.id);
            try {
              await api.patch(`/appointments/${appointment.id}/cancel`);
              Alert.alert('Turno cancelado', 'Tu reserva ha sido cancelada.');
              fetchAppointments();
            } catch (err: any) {
              const msg =
                err.response?.data?.message || 'No se pudo cancelar el turno.';
              Alert.alert('Error', msg);
            } finally {
              setCancellingId(null);
            }
          },
        },
      ]
    );
  };

  // Separar en Próximos e Historial según estado de la reserva
  const { upcomingList, historyList } = useMemo(() => {
    const upcoming: Appointment[] = [];
    const history: Appointment[] = [];

    appointments.forEach((apt) => {
      const statusUpper = (apt.status || '').toUpperCase();
      if (
        statusUpper === 'CONFIRMED' ||
        statusUpper === 'PENDING' ||
        statusUpper === 'IN_PROGRESS'
      ) {
        upcoming.push(apt);
      } else {
        history.push(apt);
      }
    });

    return { upcomingList: upcoming, historyList: history };
  }, [appointments]);

  const currentList = activeTab === 'UPCOMING' ? upcomingList : historyList;

  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.guestContainer}>
          <Ionicons
            name="calendar-outline"
            size={64}
            color={Colors.textDisabled}
          />
          <Text style={styles.guestTitle}>Gestioná todos tus turnos</Text>
          <Text style={styles.guestSubtitle}>
            Iniciá sesión para ver tus reservas confirmadas, recibir recordatorios y
            cancelar si lo necesitás.
          </Text>
          <Button
            title="Iniciar Sesión"
            size="lg"
            onPress={() => navigation.navigate('Login')}
            style={{ width: '80%', marginTop: Spacing.md }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />

      {/* Top Navbar */}
      <View style={styles.navBar}>
        <Text style={styles.navTitle}>Mis Turnos</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setActiveTab('UPCOMING')}
          style={[
            styles.tabButton,
            activeTab === 'UPCOMING' && styles.tabButtonActive,
          ]}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'UPCOMING' && styles.tabTextActive,
            ]}
          >
            Próximos ({upcomingList.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setActiveTab('HISTORY')}
          style={[
            styles.tabButton,
            activeTab === 'HISTORY' && styles.tabButtonActive,
          ]}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'HISTORY' && styles.tabTextActive,
            ]}
          >
            Historial ({historyList.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Appointments List */}
      <View style={styles.listContainer}>
        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Cargando tus turnos...</Text>
          </View>
        ) : (
          <FlatList
            data={currentList}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.flatListContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[Colors.primary]}
              />
            }
            renderItem={({ item }) => {
              let dateFormatted = item.date;
              try {
                dateFormatted = format(
                  parseISO(item.date),
                  "EEEE d 'de' MMMM",
                  { locale: es }
                );
              } catch {
                // mantener original
              }

              const timeFormatted = formatTimeToHHMM(item.time);
              const canCancel =
                item.status === 'PENDING' || item.status === 'CONFIRMED';

              return (
                <Card style={styles.appointmentCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.businessIconWrap}>
                      <Ionicons
                        name="storefront"
                        size={20}
                        color={Colors.primary}
                      />
                    </View>
                    <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                      <Text style={styles.cardBusinessName} numberOfLines={1}>
                        {item.business?.name || 'Comercio'}
                      </Text>
                      <Text style={styles.cardBusinessAddress} numberOfLines={1}>
                        {item.business?.address || ''}
                      </Text>
                    </View>
                    <StatusBadge status={item.status} />
                  </View>

                  <View style={styles.cardDivider} />

                  <View style={styles.cardBody}>
                    <View style={styles.bodyRow}>
                      <Ionicons
                        name="cut-outline"
                        size={16}
                        color={Colors.textSecondary}
                      />
                      <Text style={styles.serviceName}>
                        {item.service?.name || 'Servicio'}
                      </Text>
                      {item.service?.price !== undefined && (
                        <Text style={styles.servicePrice}>
                          ${Number(item.service.price).toLocaleString('es-AR')}
                        </Text>
                      )}
                    </View>

                    <View style={styles.bodyRow}>
                      <Ionicons
                        name="calendar-outline"
                        size={16}
                        color={Colors.textSecondary}
                      />
                      <Text style={styles.dateText}>
                        {dateFormatted} - {timeFormatted} hs
                      </Text>
                    </View>

                    {item.notes ? (
                      <View style={styles.bodyRow}>
                        <Ionicons
                          name="chatbubble-ellipses-outline"
                          size={16}
                          color={Colors.textSecondary}
                        />
                        <Text style={styles.notesText} numberOfLines={2}>
                          {item.notes}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {canCancel && (
                    <View style={styles.cardFooter}>
                      <Button
                        title="Cancelar Turno"
                        variant="outline"
                        size="sm"
                        loading={cancellingId === item.id}
                        onPress={() => handleCancelAppointment(item)}
                        style={styles.cancelBtn}
                        textStyle={{ color: Colors.danger }}
                      />
                    </View>
                  )}
                </Card>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons
                  name="calendar-clear-outline"
                  size={54}
                  color={Colors.textDisabled}
                />
                <Text style={styles.emptyTitle}>
                  {activeTab === 'UPCOMING'
                    ? 'No tenés turnos programados'
                    : 'Sin historial de turnos'}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {activeTab === 'UPCOMING'
                    ? 'Reservá un turno en tus comercios preferidos de forma fácil y rápida.'
                    : 'Aquí aparecerán los turnos anteriores y los cancelados.'}
                </Text>
                {activeTab === 'UPCOMING' && (
                  <Button
                    title="Explorar Comercios"
                    size="md"
                    onPress={() => navigation.navigate('HomeTab')}
                    style={{ marginTop: Spacing.md }}
                  />
                )}
              </View>
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
  navBar: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  navTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tabButton: {
    paddingVertical: Spacing.md,
    marginRight: Spacing.xl,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: Typography.sizes.sm + 1,
    color: Colors.textSecondary,
    fontWeight: Typography.weights.medium,
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: Typography.weights.bold,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  flatListContent: {
    paddingBottom: Spacing.xxl,
  },
  appointmentCard: {
    marginBottom: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  businessIconWrap: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBusinessName: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
  },
  cardBusinessAddress: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  cardDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm + 2,
  },
  cardBody: {
    gap: 8,
  },
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  serviceName: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semiBold,
    color: Colors.textTitle,
    flex: 1,
  },
  servicePrice: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
  },
  dateText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textMain,
    textTransform: 'capitalize',
  },
  notesText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    flex: 1,
  },
  cardFooter: {
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    alignItems: 'flex-end',
  },
  cancelBtn: {
    borderColor: Colors.statusCancelledBorder,
    backgroundColor: Colors.statusCancelledBg,
  },
  centerLoading: {
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
  guestContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  guestTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  guestSubtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
});
