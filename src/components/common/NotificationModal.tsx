import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {
  fetchInAppNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  triggerTestNotification,
  type InAppNotification,
} from '../../services/notificationService';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';

interface NotificationModalProps {
  visible: boolean;
  onClose: () => void;
  onCountChange?: (count: number) => void;
}

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffSec = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

    if (diffSec < 60) return 'Hace un momento';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `Hace ${diffMin} min`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `Hace ${diffHours} h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;

    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  visible,
  onClose,
  onCountChange,
}) => {
  const navigation = useNavigation<any>();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchInAppNotifications(30);
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
      onCountChange?.(data.unreadCount);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible]);

  const handleMarkAsRead = async (notif: InAppNotification) => {
    if (!notif.isRead) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
      );
      const newCount = Math.max(0, unreadCount - 1);
      setUnreadCount(newCount);
      onCountChange?.(newCount);
      await markNotificationAsRead(notif.id);
    }

    onClose();

    // Deep-linking inteligente según tipo de notificación o marcador #BIZ_{id}
    const bizMatch = notif.message.match(/#BIZ_(\d+)/);
    const extractedBizId = bizMatch ? Number(bizMatch[1]) : null;
    const t = (notif.type || '').toUpperCase();

    if (
      t.includes('BUSINESS_BROADCAST') ||
      t.includes('BUSINESS_HOLIDAY_CLOSURE') ||
      t.includes('FREE_SLOT_ALERT')
    ) {
      if (extractedBizId) {
        navigation.navigate('BusinessDetail', { businessId: extractedBizId });
        return;
      }
    }

    if (
      t.includes('APPOINTMENT') ||
      t.includes('REMINDER') ||
      notif.message.toLowerCase().includes('turno')
    ) {
      navigation.navigate('AppointmentsTab');
      return;
    }

    if (
      t.includes('BUSINESS_APPROVED') ||
      t.includes('BUSINESS_OBSERVED') ||
      t.includes('BUSINESS_PENDING') ||
      t.includes('REVIEW')
    ) {
      navigation.navigate('ProfileTab');
      return;
    }

    if (extractedBizId) {
      navigation.navigate('BusinessDetail', { businessId: extractedBizId });
    }
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    onCountChange?.(0);
    await markAllNotificationsAsRead();
  };

  const handleTestSystemPush = async () => {
    try {
      await triggerTestNotification();
      Alert.alert(
        '¡Alerta enviada!',
        'Revisá la barra superior o cortina de notificaciones de tu celular. Deberías ver la notificación de Turnos Ya.',
        [{ text: 'Entendido' }]
      );
    } catch {
      Alert.alert('Aviso', 'Asegurate de haber permitido las notificaciones para Turnos Ya en los ajustes de tu celular.');
    }
  };

  const filteredNotifications =
    filter === 'unread' ? notifications.filter((n) => !n.isRead) : notifications;

  const getIconForType = (type: string) => {
    const t = (type || '').toUpperCase();
    if (t.includes('CANCEL') || t.includes('OBSERVED') || t.includes('HOLIDAY')) {
      return { name: 'alert-circle-outline' as const, color: Colors.danger, bg: '#fef2f2' };
    }
    if (t.includes('BROADCAST') || t.includes('PROMO')) {
      return { name: 'megaphone-outline' as const, color: '#e11d48', bg: '#fff1f2' };
    }
    if (t.includes('REMINDER') || t.includes('RESCHEDULED')) {
      return { name: 'alarm-outline' as const, color: '#0284c7', bg: '#f0f9ff' };
    }
    if (t.includes('CONFIRM') || t.includes('APPROVED') || t.includes('COMPLETED')) {
      return { name: 'checkmark-circle-outline' as const, color: '#059669', bg: '#ecfdf5' };
    }
    return { name: 'notifications-outline' as const, color: Colors.primary, bg: Colors.primaryLight };
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Cabecera del Centro de Notificaciones */}
        <View style={styles.header}>
          <View style={styles.headerTitleWrap}>
            <View style={styles.headerIconCircle}>
              <Ionicons name="notifications" size={20} color={Colors.primary} />
            </View>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.headerTitle}>Notificaciones</Text>
                {unreadCount > 0 && (
                  <View style={styles.badgePill}>
                    <Text style={styles.badgePillText}>{unreadCount} nueva{unreadCount > 1 ? 's' : ''}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.headerSubtitle}>Avisos y recordatorios en tiempo real</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Barra de Acciones y Filtros */}
        <View style={styles.actionBar}>
          <View style={styles.filterTabs}>
            <TouchableOpacity
              style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
              onPress={() => setFilter('all')}
            >
              <Text style={[styles.filterTabText, filter === 'all' && styles.filterTabTextActive]}>
                Todas ({notifications.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterTab, filter === 'unread' && styles.filterTabActive]}
              onPress={() => setFilter('unread')}
            >
              <Text style={[styles.filterTabText, filter === 'unread' && styles.filterTabTextActive]}>
                No leídas ({unreadCount})
              </Text>
            </TouchableOpacity>
          </View>

          {unreadCount > 0 && (
            <TouchableOpacity
              style={styles.markAllBtn}
              onPress={handleMarkAllRead}
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark-done" size={15} color={Colors.primary} />
              <Text style={styles.markAllBtnText}>Marcar leídas</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Botón interactivo de prueba al sistema operativo */}
        <View style={styles.testPushBanner}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.testPushTitle}>¿Querés probar una alerta en tu celular?</Text>
            <Text style={styles.testPushDesc}>Dispara una notificación real nativa al sistema operativo.</Text>
          </View>
          <TouchableOpacity
            style={styles.testPushBtn}
            onPress={handleTestSystemPush}
            activeOpacity={0.8}
          >
            <Ionicons name="paper-plane" size={14} color="#ffffff" />
            <Text style={styles.testPushBtnText}>Probar en SO</Text>
          </TouchableOpacity>
        </View>

        {/* Lista de Notificaciones */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Cargando notificaciones...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {filteredNotifications.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="notifications-off-outline" size={42} color={Colors.textDisabled} />
                </View>
                <Text style={styles.emptyTitle}>
                  {filter === 'unread' ? 'Sin notificaciones pendientes' : 'No tenés notificaciones aún'}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {filter === 'unread'
                    ? '¡Estás al día! Todas tus alertas fueron leídas.'
                    : 'Cuando reserves un turno o haya cambios en tus citas, los verás acá y en tu celular.'}
                </Text>
              </View>
            ) : (
              filteredNotifications.map((notif) => {
                const iconInfo = getIconForType(notif.type);
                return (
                  <TouchableOpacity
                    key={notif.id}
                    style={[
                      styles.notifCard,
                      !notif.isRead && styles.notifCardUnread,
                    ]}
                    onPress={() => handleMarkAsRead(notif)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.notifIconWrap, { backgroundColor: iconInfo.bg }]}>
                      <Ionicons name={iconInfo.name} size={20} color={iconInfo.color} />
                    </View>

                    <View style={styles.notifBody}>
                      <View style={styles.notifHeaderRow}>
                        <Text style={[styles.notifTitle, !notif.isRead && styles.notifTitleUnread]}>
                          {notif.title}
                        </Text>
                        {!notif.isRead && <View style={styles.unreadDot} />}
                      </View>

                      <Text style={styles.notifMessage} numberOfLines={3}>
                        {notif.message.replace(/\s*#BIZ_\d+/g, '')}
                      </Text>

                      <Text style={styles.notifTime}>{formatRelativeTime(notif.createdAt)}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}

            <View style={{ height: Spacing.xl }} />
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
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
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'android' ? Spacing.lg : Spacing.md,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
  },
  headerSubtitle: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  badgePill: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  badgePillText: {
    fontSize: 10,
    fontWeight: Typography.weights.bold,
    color: '#059669',
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  filterTab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.md,
    backgroundColor: '#f1f5f9',
  },
  filterTabActive: {
    backgroundColor: Colors.primaryLight,
  },
  filterTabText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
    color: Colors.textSecondary,
  },
  filterTabTextActive: {
    color: Colors.primary,
    fontWeight: Typography.weights.bold,
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  markAllBtnText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semiBold,
    color: Colors.primary,
  },
  testPushBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  testPushTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: '#0369a1',
  },
  testPushDesc: {
    fontSize: Typography.sizes.xs,
    color: '#0284c7',
    marginTop: 2,
  },
  testPushBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.md,
    ...Shadows.subtle,
  },
  testPushBtnText: {
    color: '#ffffff',
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.subtle,
  },
  notifCardUnread: {
    backgroundColor: '#ffffff',
    borderColor: Colors.primaryBorder,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  notifIconWrap: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  notifBody: {
    flex: 1,
  },
  notifHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  notifTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semiBold,
    color: Colors.textTitle,
    flex: 1,
  },
  notifTitleUnread: {
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginLeft: 6,
  },
  notifMessage: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 6,
  },
  notifTime: {
    fontSize: 10,
    color: Colors.textDisabled,
    fontWeight: Typography.weights.medium,
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: Spacing.xl,
  },
  emptyIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
    textAlign: 'center',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

