import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import api from '../../services/api';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Estados para Segundo Factor de Autenticación (2FA)
  const [requireTwoFactor, setRequireTwoFactor] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');

  // Estados para Recuperación de Contraseña
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotError, setForgotError] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Por favor completá todos los campos.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', {
        email: email.trim(),
        password,
      });

      // Si el usuario tiene 2FA activo, pasamos al paso de verificación
      if (res.data?.require2FA) {
        setRequireTwoFactor(true);
        setTempToken(res.data.tempToken);
        setTwoFactorCode('');
        setError('');
        return;
      }

      const { token, user } = res.data;
      await login(token, user);
      navigation.goBack();
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Correo electrónico o contraseña incorrectos.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleTwoFactorVerify = async () => {
    const cleanCode = twoFactorCode.replace(/\s+/g, '').toUpperCase();
    if (!cleanCode) {
      setError('Por favor ingresá el código de 6 dígitos o un código de respaldo.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/2fa/login-verify', {
        tempToken,
        code: cleanCode,
      });

      const { token, user } = res.data;
      await login(token, user);
      navigation.goBack();
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Código de verificación incorrecto o expirado.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBackToCredentials = () => {
    setRequireTwoFactor(false);
    setTempToken('');
    setTwoFactorCode('');
    setError('');
  };

  const handleOpenForgotModal = () => {
    setForgotEmail(email.trim());
    setForgotError('');
    setForgotSuccess(false);
    setShowForgotModal(true);
  };

  const handleForgotSubmit = async () => {
    if (!forgotEmail.trim()) {
      setForgotError('Ingresá tu correo electrónico.');
      return;
    }
    setForgotError('');
    setForgotLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: forgotEmail.trim() });
      setForgotSuccess(true);
    } catch (err: any) {
      setForgotError(
        err.response?.data?.message || 'No se pudo procesar la solicitud. Verificá el correo.'
      );
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Navigation Header */}
        <View style={styles.navBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => {
              if (requireTwoFactor) {
                handleBackToCredentials();
              } else {
                navigation.goBack();
              }
            }}
          >
            <Ionicons name="arrow-back" size={22} color={Colors.textTitle} />
          </TouchableOpacity>
          <Text style={styles.navTitle}>
            {requireTwoFactor ? 'Verificación de Seguridad' : 'Iniciar Sesión'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brandContainer}>
            <Image
              source={require('../../../assets/brand/logo-color.png')}
              style={styles.brandLogo}
              resizeMode="contain"
            />
            <Text style={styles.welcomeTitle}>
              {requireTwoFactor ? 'Paso de Seguridad' : '¡Hola de nuevo!'}
            </Text>
            <Text style={styles.welcomeSubtitle}>
              {requireTwoFactor
                ? 'Tu cuenta está protegida con autenticación en dos pasos'
                : 'Ingresá tus credenciales para gestionar tus citas'}
            </Text>
          </View>

          <Card style={styles.card}>
            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color={Colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {requireTwoFactor ? (
              /* ====== PASO 2: VERIFICACIÓN 2FA ====== */
              <View>
                <View style={styles.twoFactorHeader}>
                  <View style={styles.shieldIconWrap}>
                    <Ionicons name="shield-checkmark" size={28} color={Colors.primary} />
                  </View>
                  <Text style={styles.twoFactorTitle}>Google Authenticator</Text>
                  <Text style={styles.twoFactorDesc}>
                    Ingresá el código numérico de 6 dígitos generado por tu aplicación autenticadora o uno de tus códigos de respaldo.
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Código de verificación (6 dígitos)</Text>
                  <View style={styles.twoFactorInputWrap}>
                    <TextInput
                      style={styles.twoFactorInput}
                      placeholder="123456"
                      placeholderTextColor={Colors.textDisabled}
                      value={twoFactorCode}
                      onChangeText={(val) => setTwoFactorCode(val.replace(/\s+/g, ''))}
                      maxLength={8}
                      keyboardType="default"
                      autoCapitalize="characters"
                      autoFocus
                    />
                  </View>
                </View>

                <Button
                  title="Confirmar e Iniciar Sesión"
                  size="lg"
                  loading={loading}
                  onPress={handleTwoFactorVerify}
                  style={{ marginTop: Spacing.sm }}
                />

                <TouchableOpacity
                  style={styles.cancelTwoFactorBtn}
                  onPress={handleBackToCredentials}
                  disabled={loading}
                >
                  <Text style={styles.cancelTwoFactorText}>
                    ← Volver a ingresar credenciales
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* ====== PASO 1: CREDENCIALES HABITUALES ====== */
              <View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Correo Electrónico</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons
                      name="mail-outline"
                      size={18}
                      color={Colors.textSecondary}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="ejemplo@correo.com"
                      placeholderTextColor={Colors.textDisabled}
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Contraseña</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={18}
                      color={Colors.textSecondary}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="••••••••"
                      placeholderTextColor={Colors.textDisabled}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={{ padding: 4 }}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={Colors.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.forgotBtn}
                  onPress={handleOpenForgotModal}
                  activeOpacity={0.7}
                >
                  <Text style={styles.forgotBtnText}>¿Olvidaste tu contraseña?</Text>
                </TouchableOpacity>

                <Button
                  title="Ingresar"
                  size="lg"
                  loading={loading}
                  onPress={handleLogin}
                  style={{ marginTop: Spacing.sm }}
                />

                <View style={styles.footerLinkRow}>
                  <Text style={styles.footerText}>¿No tenés una cuenta?</Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('Register')}
                  >
                    <Text style={styles.linkText}>Registrate acá</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal de Recuperación de Contraseña */}
      <Modal
        visible={showForgotModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowForgotModal(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalContainer}
          >
            <View style={styles.modalCard}>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowForgotModal(false)}
                hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
              >
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>

              {!forgotSuccess ? (
                <>
                  <View style={styles.modalIconWrap}>
                    <Ionicons name="key-outline" size={28} color={Colors.primary} />
                  </View>
                  <Text style={styles.modalTitle}>Recuperar Contraseña</Text>
                  <Text style={styles.modalSubtitle}>
                    Ingresá el correo electrónico asociado a tu cuenta y te enviaremos las instrucciones para restablecerla.
                  </Text>

                  {forgotError ? (
                    <View style={styles.modalErrorBox}>
                      <Ionicons name="alert-circle" size={16} color={Colors.danger} />
                      <Text style={styles.modalErrorText}>{forgotError}</Text>
                    </View>
                  ) : null}

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Correo Electrónico</Text>
                    <View style={styles.inputWrap}>
                      <Ionicons name="mail-outline" size={18} color={Colors.textSecondary} />
                      <TextInput
                        style={styles.input}
                        placeholder="tu-correo@ejemplo.com"
                        placeholderTextColor={Colors.textDisabled}
                        value={forgotEmail}
                        onChangeText={setForgotEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        autoFocus
                      />
                    </View>
                  </View>

                  <Button
                    title="Enviar Instrucciones"
                    size="md"
                    loading={forgotLoading}
                    onPress={handleForgotSubmit}
                    style={{ marginTop: Spacing.md }}
                  />

                  <TouchableOpacity
                    style={styles.modalCancelBtn}
                    onPress={() => setShowForgotModal(false)}
                  >
                    <Text style={styles.modalCancelText}>Cancelar</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={{ alignItems: 'center', paddingVertical: Spacing.md }}>
                  <View style={[styles.modalIconWrap, { backgroundColor: '#ecfdf5' }]}>
                    <Ionicons name="checkmark-circle" size={32} color={Colors.success} />
                  </View>
                  <Text style={styles.modalTitle}>¡Instrucciones enviadas!</Text>
                  <Text style={styles.modalSubtitle}>
                    Si <Text style={{ fontWeight: 'bold' }}>{forgotEmail}</Text> está registrado en Turnos Ya, recibirás un correo con el enlace para restablecer tu contraseña en minutos.
                  </Text>
                  <Button
                    title="Entendido"
                    size="md"
                    onPress={() => setShowForgotModal(false)}
                    style={{ width: '100%', marginTop: Spacing.lg }}
                  />
                </View>
              )}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  navBar: {
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
  navTitle: {
    fontSize: Typography.sizes.md + 1,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  brandLogo: {
    width: 180,
    height: 52,
    marginBottom: Spacing.md,
  },
  welcomeTitle: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.extraBold,
    color: Colors.textTitle,
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  card: {
    padding: Spacing.xl,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.statusCancelledBg,
    borderColor: Colors.statusCancelledBorder,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: 8,
  },
  errorText: {
    fontSize: Typography.sizes.xs + 1,
    color: Colors.danger,
    flex: 1,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: Typography.sizes.xs + 1,
    fontWeight: Typography.weights.semiBold,
    color: Colors.textTitle,
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderInput,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 48,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: Typography.sizes.md,
    color: Colors.textMain,
  },
  footerLinkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.xl,
  },
  footerText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
  },
  linkText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
  },
  twoFactorHeader: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  shieldIconWrap: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryLight || '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  twoFactorTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
    marginBottom: 4,
  },
  twoFactorDesc: {
    fontSize: Typography.sizes.xs + 1,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: Spacing.xs,
  },
  twoFactorInputWrap: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.md,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  twoFactorInput: {
    fontSize: 22,
    fontWeight: Typography.weights.bold,
    letterSpacing: 6,
    color: Colors.textTitle,
    textAlign: 'center',
    width: '100%',
  },
  cancelTwoFactorBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  cancelTwoFactorText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.weights.semiBold,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: 6,
    marginBottom: Spacing.xs,
    paddingVertical: 4,
  },
  forgotBtnText: {
    fontSize: Typography.sizes.xs + 1,
    color: Colors.primary,
    fontWeight: Typography.weights.semiBold,
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
  modalIconWrap: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.full,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
    textAlign: 'center',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: Typography.sizes.xs + 1,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing.lg,
  },
  modalErrorBox: {
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
  modalErrorText: {
    fontSize: Typography.sizes.xs,
    color: Colors.danger,
    flex: 1,
  },
  modalCancelBtn: {
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  modalCancelText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.weights.medium,
  },
});
