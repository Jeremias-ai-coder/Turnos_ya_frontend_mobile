import React, { useState, useEffect } from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
  AppState,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NotificationModal } from './NotificationModal';
import {
  fetchInAppNotifications,
  subscribeToNotificationSync,
} from '../../services/notificationService';
import { useAuth } from '../../context/AuthContext';
import { Colors, Typography, BorderRadius } from '../../constants/theme';

interface NotificationBellProps {
  color?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  color = Colors.white,
  size = 22,
  style,
}) => {
  const { user } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const checkUnread = async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    const data = await fetchInAppNotifications(10);
    setUnreadCount(data.unreadCount);
  };

  useEffect(() => {
    checkUnread();

    // 1. Sincronización instantánea in-app (0ms de latencia ante reservas o cancelaciones)
    const unsubscribe = subscribeToNotificationSync(() => {
      checkUnread();
    });

    // 2. Polling ágil de respaldo cada 12 segundos (reemplaza los 45s anteriores)
    const interval = setInterval(checkUnread, 12000);

    // 3. Sincronizar inmediatamente cuando la app vuelve al primer plano
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        checkUnread();
      }
    });

    return () => {
      unsubscribe();
      clearInterval(interval);
      appStateSub.remove();
    };
  }, [user]);

  return (
    <>
      <TouchableOpacity
        style={[styles.bellBtn, style]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.75}
        accessibilityLabel="Notificaciones"
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons
          name={unreadCount > 0 ? 'notifications' : 'notifications-outline'}
          size={size}
          color={color}
        />

        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <NotificationModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onCountChange={(newCount) => setUnreadCount(newCount)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  bellBtn: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: BorderRadius.full,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: Typography.weights.bold,
    textAlign: 'center',
    lineHeight: 11,
  },
});

