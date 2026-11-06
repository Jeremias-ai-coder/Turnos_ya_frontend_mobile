import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

const PUSH_TOKEN_STORAGE_KEY = '@turnosya_push_token';

// Configurar cómo el sistema operativo maneja las notificaciones cuando la app está abierta
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface InAppNotification {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

/**
 * Solicita permisos de notificaciones al sistema operativo (Android/iOS)
 * y configura los canales prioritarios de sonido y vibración.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  try {
    if (Platform.OS === 'android') {
      // Canal principal con alta prioridad (alerta visual emergente y sonido)
      await Notifications.setNotificationChannelAsync('default', {
        name: 'General',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#009ee3',
        sound: 'default',
      });

      // Canal específico para recordatorios de turnos
      await Notifications.setNotificationChannelAsync('appointment_reminders', {
        name: 'Recordatorios de Turnos',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 300, 200, 300],
        lightColor: '#059669',
        sound: 'default',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    // Obtener token para push remoto (si corre en dispositivo físico)
    if (Device.isDevice) {
      try {
        const tokenData = await Notifications.getExpoPushTokenAsync();
        token = tokenData.data;
        if (token) {
          await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token);
        }
      } catch {
        // En emuladores o entornos sin EAS project ID puede fallar suavemente
      }
    }
  } catch (err) {
    console.warn('[Notifications] Error configurando permisos:', err);
  }

  return token;
}

/**
 * Programa automáticamente notificaciones locales en el sistema operativo:
 * 1. 24 horas antes del turno (si fue reservado con anticipación suficiente).
 * 2. 1 hora antes del turno.
 */
export async function scheduleAppointmentReminders(params: {
  appointmentId?: number;
  serviceName: string;
  businessName: string;
  dateStr: string; // 'yyyy-MM-dd' o ISO
  timeStr: string; // 'HH:mm'
}): Promise<string[]> {
  const scheduledIds: string[] = [];

  try {
    const cleanDate = params.dateStr.split('T')[0];
    const [year, month, day] = cleanDate.split('-').map(Number);
    const [hours, minutes] = params.timeStr.split(':').map(Number);

    const appointmentStart = new Date(year, month - 1, day, hours, minutes, 0);
    const now = new Date();

    // 1. Recordatorio 1 hora antes
    const oneHourBefore = new Date(appointmentStart.getTime() - 60 * 60 * 1000);
    if (oneHourBefore > now) {
      const id1h = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Recordatorio de Turno en 1 hora 🔔',
          body: `Tenés tu turno de "${params.serviceName}" en ${params.businessName} hoy a las ${params.timeStr} hs.`,
          data: {
            screen: 'AppointmentsTab',
            appointmentId: params.appointmentId,
          },
          sound: 'default',
          color: '#009ee3',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: oneHourBefore,
          channelId: 'appointment_reminders',
        },
      });
      scheduledIds.push(id1h);
    }

    // 2. Recordatorio 24 horas antes
    const oneDayBefore = new Date(appointmentStart.getTime() - 24 * 60 * 60 * 1000);
    if (oneDayBefore > now) {
      const id24h = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Turno programado para mañana 📅',
          body: `Recordá que mañana tenés tu cita de "${params.serviceName}" en ${params.businessName} a las ${params.timeStr} hs.`,
          data: {
            screen: 'AppointmentsTab',
            appointmentId: params.appointmentId,
          },
          sound: 'default',
          color: '#009ee3',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: oneDayBefore,
          channelId: 'appointment_reminders',
        },
      });
      scheduledIds.push(id24h);
    }
  } catch (err) {
    console.warn('[Notifications] Error programando recordatorio:', err);
  }

  return scheduledIds;
}

/**
 * Dispara una notificación instantánea al sistema operativo para probar el funcionamiento.
 */
export async function triggerTestNotification(): Promise<void> {
  await registerForPushNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Turnos Ya · Notificación del Sistema 🚀',
      body: '¡Hola! Las alertas y recordatorios en tu celular están 100% activos y funcionando.',
      data: { screen: 'AppointmentsTab' },
      sound: 'default',
      color: '#009ee3',
    },
    trigger: null, // trigger null = disparo inmediato
  });
}

/**
 * API Backend: Obtener lista de notificaciones del usuario autenticado
 */
export async function fetchInAppNotifications(limit: number = 25): Promise<{
  notifications: InAppNotification[];
  total: number;
  unreadCount: number;
}> {
  try {
    const res = await api.get(`/notifications?limit=${limit}`);
    return {
      notifications: res.data.data?.notifications || res.data.notifications || [],
      total: res.data.data?.total ?? res.data.total ?? 0,
      unreadCount: res.data.data?.unreadCount ?? res.data.unreadCount ?? 0,
    };
  } catch {
    return { notifications: [], total: 0, unreadCount: 0 };
  }
}

/**
 * API Backend: Marcar una notificación específica como leída
 */
export async function markNotificationAsRead(id: number): Promise<void> {
  try {
    await api.patch(`/notifications/${id}/read`);
  } catch (err) {
    console.warn('[Notifications] Error al marcar leída:', err);
  }
}

/**
 * API Backend: Marcar todas las notificaciones como leídas
 */
export async function markAllNotificationsAsRead(): Promise<void> {
  try {
    await api.patch('/notifications/read-all');
  } catch (err) {
    console.warn('[Notifications] Error al marcar todas leídas:', err);
  }
}
