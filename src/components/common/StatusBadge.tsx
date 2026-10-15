import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, BorderRadius } from '../../constants/theme';
import { AppointmentStatus } from '../../types';

interface StatusBadgeProps {
  status: AppointmentStatus | string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const normalized = (status || '').toUpperCase();

  const getStyle = () => {
    switch (normalized) {
      case 'CONFIRMED':
        return {
          bg: Colors.statusConfirmedBg,
          text: Colors.statusConfirmedText,
          border: Colors.statusConfirmedBorder,
          label: 'Confirmado',
        };
      case 'CANCELLED':
        return {
          bg: Colors.statusCancelledBg,
          text: Colors.statusCancelledText,
          border: Colors.statusCancelledBorder,
          label: 'Cancelado',
        };
      case 'COMPLETED':
        return {
          bg: Colors.statusCompletedBg,
          text: Colors.statusCompletedText,
          border: Colors.statusCompletedBorder,
          label: 'Completado',
        };
      case 'PENDING':
      default:
        return {
          bg: Colors.statusPendingBg,
          text: Colors.statusPendingText,
          border: Colors.statusPendingBorder,
          label: 'Pendiente',
        };
    }
  };

  const current = getStyle();

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: current.bg,
          borderColor: current.border,
        },
      ]}
    >
      <Text style={[styles.text, { color: current.text }]}>
        {current.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    letterSpacing: 0.3,
  },
});
