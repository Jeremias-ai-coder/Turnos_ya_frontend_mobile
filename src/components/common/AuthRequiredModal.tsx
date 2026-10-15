import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';

interface AuthRequiredModalProps {
  visible: boolean;
  onClose: () => void;
  onLogin: () => void;
  onRegister: () => void;
}

export const AuthRequiredModal: React.FC<AuthRequiredModalProps> = ({
  visible,
  onClose,
  onLogin,
  onRegister,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalCard}>
              {/* Botón X para cerrar */}
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={onClose}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityLabel="Cerrar ventana"
              >
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>

              {/* Ícono de Alerta / Cerradura */}
              <View style={styles.iconCircle}>
                <Ionicons
                  name="calendar-clear"
                  size={32}
                  color={Colors.primary}
                />
              </View>

              {/* Título y Mensaje */}
              <Text style={styles.title}>
                Debe iniciar sesión para reservar un turno
              </Text>

              <Text style={styles.message}>
                Para seleccionar fecha, horario disponible y agendar tu cita,
                necesitamos que accedas a tu cuenta o te registres en segundos.
              </Text>

              {/* Botones de Acción */}
              <View style={styles.actionsContainer}>
                <Button
                  title="Iniciar Sesión"
                  size="lg"
                  onPress={onLogin}
                  style={styles.actionBtn}
                />

                <Button
                  title="Registrarme"
                  variant="outline"
                  size="lg"
                  onPress={onRegister}
                  style={styles.actionBtn}
                />
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    ...Shadows.hover,
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: Typography.sizes.lg + 1,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.sm,
  },
  message: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.xs,
  },
  actionsContainer: {
    width: '100%',
    gap: Spacing.md,
  },
  actionBtn: {
    width: '100%',
  },
});
