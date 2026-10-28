import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import api from '../../services/api';
import { Button } from './Button';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';

// Ícono SVG / Vectorial de Google
const GoogleGLogo: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <View style={[styles.googleIconCircle, { width: size + 4, height: size + 4 }]}>
    <Ionicons name="logo-google" size={size} color="#ea4335" />
  </View>
);

interface GoogleSignInButtonProps {
  buttonText?: string;
  onSuccess?: () => void;
  onError?: (err: string) => void;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  buttonText = 'Continuar con Google',
  onSuccess,
  onError,
}) => {
  const { login } = useAuth();
  const navigation = useNavigation<any>();

  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGoogleAuth = async (emailToUse: string, nameToUse?: string) => {
    const finalEmail = emailToUse.trim().toLowerCase();
    if (!finalEmail || !finalEmail.includes('@')) {
      setErrorMsg('Por favor ingresá un correo de Google válido.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const finalName = (nameToUse || finalEmail.split('@')[0]).trim();
      const res = await api.post('/auth/google', {
        email: finalEmail,
        name: finalName,
        googleId: `google-mobile-${Date.now()}`,
      });

      const { token, user } = res.data;
      if (token && user) {
        await login(token, user);
        setShowModal(false);
        onSuccess?.();
        navigation.navigate('MainTabs', { screen: 'HomeTab' });
      } else {
        throw new Error('Respuesta inválida del servidor');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Error al autenticar con Google.';
      setErrorMsg(msg);
      onError?.(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.googleBtn}
        onPress={() => {
          setErrorMsg(null);
          setShowModal(true);
        }}
        activeOpacity={0.8}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#4285f4" />
        ) : (
          <>
            <GoogleGLogo size={18} />
            <Text style={styles.googleBtnText}>{buttonText}</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Modal interactivo de Google Sign-In */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalContainer}
          >
            <View style={styles.modalCard}>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowModal(false)}
                hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
              >
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>

              <View style={styles.modalHeader}>
                <View style={styles.googleIconHeaderWrap}>
                  <Ionicons name="logo-google" size={28} color="#ea4335" />
                </View>
                <Text style={styles.modalTitle}>Acceso con Google</Text>
                <Text style={styles.modalSubtitle}>
                  Iniciá sesión o creá tu cuenta al instante mediante Google sin necesidad de contraseñas.
                </Text>
              </View>

              {errorMsg ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={16} color={Colors.danger} />
                  <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
              ) : null}

              {/* Acceso Rápido / Sugerencias de cuentas */}
              <View style={styles.quickAccountsSection}>
                <Text style={styles.sectionLabel}>Cuentas frecuentes para pruebas:</Text>
                <TouchableOpacity
                  style={styles.accountChip}
                  onPress={() => handleGoogleAuth('usuario.google@gmail.com', 'Usuario Google')}
                  disabled={loading}
                >
                  <View style={styles.accountAvatar}>
                    <Text style={styles.accountAvatarText}>G</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.accountName}>Usuario Google</Text>
                    <Text style={styles.accountEmail}>usuario.google@gmail.com</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={16} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>o con tu propia cuenta</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Ingreso manual de cuenta */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tu Correo de Google (Gmail)</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="mail-outline" size={18} color={Colors.textSecondary} />
                  <TextInput
                    style={styles.input}
                    placeholder="tu-correo@gmail.com"
                    placeholderTextColor={Colors.textDisabled}
                    value={googleEmail}
                    onChangeText={setGoogleEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tu Nombre Completo (Opcional)</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="person-outline" size={18} color={Colors.textSecondary} />
                  <TextInput
                    style={styles.input}
                    placeholder="Ej: Laura Gómez"
                    placeholderTextColor={Colors.textDisabled}
                    value={googleName}
                    onChangeText={setGoogleName}
                  />
                </View>
              </View>

              <Button
                title="Acceder con Google"
                size="md"
                loading={loading}
                onPress={() => handleGoogleAuth(googleEmail, googleName)}
                style={{ marginTop: Spacing.sm }}
              />

              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowModal(false)}
                disabled={loading}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#dadce0',
    borderRadius: BorderRadius.md,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  googleIconCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleBtnText: {
    fontSize: Typography.sizes.sm + 1,
    fontWeight: Typography.weights.semiBold,
    color: '#3c4043',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 420,
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    position: 'relative',
  },
  modalCloseBtn: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    zIndex: 10,
    padding: 6,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  googleIconHeaderWrap: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.full,
    backgroundColor: '#fff5f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  modalTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: Typography.sizes.xs + 1,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: Spacing.xs,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    gap: 6,
  },
  errorText: {
    fontSize: Typography.sizes.xs,
    color: Colors.danger,
    flex: 1,
  },
  quickAccountsSection: {
    marginBottom: Spacing.md,
  },
  sectionLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semiBold,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  accountChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  accountAvatar: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: '#ea4335',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountAvatarText: {
    color: Colors.white,
    fontWeight: Typography.weights.bold,
    fontSize: 14,
  },
  accountName: {
    fontSize: Typography.sizes.xs + 1,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
  },
  accountEmail: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.sm,
    gap: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
  },
  inputGroup: {
    marginBottom: Spacing.sm,
  },
  inputLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semiBold,
    color: Colors.textTitle,
    marginBottom: 4,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.borderInput,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    height: 44,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: Typography.sizes.sm,
    color: Colors.textMain,
  },
  cancelBtn: {
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  cancelText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
  },
});
