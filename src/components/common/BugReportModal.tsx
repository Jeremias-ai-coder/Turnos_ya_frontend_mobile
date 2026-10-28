import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';

interface BugReportModalProps {
  visible: boolean;
  onClose: () => void;
}

const CATEGORIES = [
  { id: 'ui', label: 'Error Visual / Pantalla', icon: 'color-palette-outline' },
  { id: 'booking', label: 'Error al Reservar', icon: 'calendar-outline' },
  { id: 'auth', label: 'Inicio de Sesión', icon: 'key-outline' },
  { id: 'perf', label: 'Lentitud / Rendimiento', icon: 'speedometer-outline' },
  { id: 'other', label: 'Otro Problema', icon: 'help-circle-outline' },
];

export const BugReportModal: React.FC<BugReportModalProps> = ({ visible, onClose }) => {
  const { user } = useAuth();
  const [category, setCategory] = useState('ui');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Datos requeridos', 'Por favor ingresá un título y describí el inconveniente.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/bug-reports', {
        title: title.trim(),
        description: description.trim(),
        category,
        contactEmail: email.trim() || user?.email || undefined,
        platform: `Mobile App (${Platform.OS} ${Platform.Version})`,
      });

      Alert.alert(
        '¡Reporte Recibido!',
        'Muchas gracias por informarnos. Nuestro equipo técnico revisará el ticket a la brevedad.',
        [{ text: 'Entendido', onPress: handleClose }]
      );
    } catch (err: any) {
      Alert.alert(
        'Error al enviar',
        err.response?.data?.message || 'No se pudo enviar el reporte. Por favor verificá tu conexión.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setCategory('ui');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.modalBox}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={styles.headerIcon}>
                <Ionicons name="bug" size={20} color="#dc2626" />
              </View>
              <div>
                <Text style={styles.headerTitle}>Reportar un Inconveniente</Text>
                <Text style={styles.headerSubtitle}>Ayudanos a mantener Turnos Ya impecable</Text>
              </div>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Categorías */}
            <Text style={styles.label}>Tipo de Inconveniente</Text>
            <View style={styles.chipRow}>
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.chip, isSelected && styles.chipActive]}
                    onPress={() => setCategory(cat.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={cat.icon as any}
                      size={14}
                      color={isSelected ? Colors.white : Colors.textSecondary}
                    />
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Título */}
            <Text style={styles.label}>Título o Resumen breve *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: No se cargan los horarios al elegir fecha"
              placeholderTextColor={Colors.textDisabled}
              value={title}
              onChangeText={setTitle}
            />

            {/* Descripción */}
            <Text style={styles.label}>¿Qué ocurrió y cómo podemos reproducirlo? *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describí los pasos que hiciste antes de que ocurriera el problema..."
              placeholderTextColor={Colors.textDisabled}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            {/* Email de contacto */}
            <Text style={styles.label}>Tu Correo Electrónico (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="tu@correo.com"
              placeholderTextColor={Colors.textDisabled}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </ScrollView>

          {/* Footer actions */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.btnCancel}
              onPress={handleClose}
              disabled={submitting}
            >
              <Text style={styles.btnCancelText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btnSubmit, submitting && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <>
                  <Ionicons name="paper-plane" size={16} color={Colors.white} />
                  <Text style={styles.btnSubmitText}>Enviar Reporte</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
  },
  headerSubtitle: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
  },
  body: {
    padding: Spacing.lg,
  },
  label: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semiBold,
    color: Colors.textTitle,
    marginBottom: 6,
    marginTop: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: Colors.white,
    fontWeight: Typography.weights.bold,
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: Typography.sizes.sm,
    color: Colors.textTitle,
  },
  textArea: {
    height: 90,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  btnCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCancelText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semiBold,
    color: Colors.textSecondary,
  },
  btnSubmit: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
  },
  btnSubmitText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
  },
});
