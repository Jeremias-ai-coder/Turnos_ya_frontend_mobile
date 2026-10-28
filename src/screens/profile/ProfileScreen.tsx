import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  StatusBar,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { BugReportModal } from '../../components/common/BugReportModal';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useOwner } from '../../context/OwnerContext';
import api, { STORAGE_KEYS, getAutoDetectedBaseUrl } from '../../services/api';

interface UserSessionItem {
  id: string;
  deviceName: string;
  ipAddress?: string;
  lastActiveAt: string;
  createdAt: string;
  isCurrent: boolean;
}

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, logout, updateUser } = useAuth();
  const { isAdmin, setRoleMode } = useOwner();

  // Preferencias de Notificaciones
  const [emailNotifs, setEmailNotifs] = useState(user?.emailNotifications ?? true);
  const [whatsappNotifs, setWhatsappNotifs] = useState(user?.whatsappNotifications ?? false);
  const [savingNotifs, setSavingNotifs] = useState(false);

  // Configuración de red para desarrolladores / QA
  const [customApiUrl, setCustomApiUrl] = useState('');
  const [showConfig, setShowConfig] = useState(false);

  // Sesiones activas y dispositivos vinculados
  const [sessions, setSessions] = useState<UserSessionItem[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionActionLoading, setSessionActionLoading] = useState<string | null>(null);

  // Modal 2FA (Google Authenticator)
  const [showTwoFactorModal, setShowTwoFactorModal] = useState(false);
  const [twoFactorStep, setTwoFactorStep] = useState<'setup' | 'backup_codes' | 'disable'>('setup');
  const [twoFactorSecret, setTwoFactorSecret] = useState('');
  const [twoFactorCodeInput, setTwoFactorCodeInput] = useState('');
  const [twoFactorBackupCodes, setTwoFactorBackupCodes] = useState<string[]>([]);
  const [twoFactorDisablePassword, setTwoFactorDisablePassword] = useState('');
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);
  const [twoFactorCopied, setTwoFactorCopied] = useState(false);

  // Modal Verificación de Correo (OTP)
  const [showEmailVerifyModal, setShowEmailVerifyModal] = useState(false);
  const [emailVerifyToken, setEmailVerifyToken] = useState<string | null>(null);
  const [emailVerifyCode, setEmailVerifyCode] = useState('');
  const [emailVerifyLoading, setEmailVerifyLoading] = useState(false);
  const [emailVerifyError, setEmailVerifyError] = useState<string | null>(null);

  // Modal Cambio de Contraseña
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passwordChangeStep, setPasswordChangeStep] = useState<'inputs' | 'code'>('inputs');
  const [passwordConfirmToken, setPasswordConfirmToken] = useState<string | null>(null);
  const [passwordOtpCode, setPasswordOtpCode] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Modal Reporte de Bug / Soporte Técnico
  const [showBugModal, setShowBugModal] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.API_URL).then((val) => {
      if (val && !val.includes('172.27.') && !val.includes('localhost') && !val.includes('10.0.2.2')) {
        setCustomApiUrl(val);
      } else {
        setCustomApiUrl(getAutoDetectedBaseUrl());
      }
    });

    if (user) {
      loadSessions();
    }
  }, [user]);

  // Carga de sesiones activas del usuario
  const loadSessions = async () => {
    if (!user) return;
    setSessionsLoading(true);
    try {
      const res = await api.get('/auth/sessions');
      setSessions(res.data || []);
    } catch {
      // Si la llamada falla no interrumpe el uso
    } finally {
      setSessionsLoading(false);
    }
  };

  // Guardar URL de Servidor para QA
  const handleSaveApiUrl = async () => {
    try {
      if (!customApiUrl.trim()) {
        await AsyncStorage.removeItem(STORAGE_KEYS.API_URL);
        Alert.alert('Configuración', 'Se restauró la URL por defecto.');
      } else {
        await AsyncStorage.setItem(STORAGE_KEYS.API_URL, customApiUrl.trim());
        Alert.alert(
          'Configuración Guardada',
          'URL del servidor actualizada. Reiniciá la app si experimentás problemas.'
        );
      }
    } catch {
      Alert.alert('Error', 'No se pudo guardar la configuración.');
    }
  };

  // Guardar preferencias de notificaciones
  const handleToggleNotifications = async (type: 'email' | 'whatsapp', nextVal: boolean) => {
    if (type === 'email') setEmailNotifs(nextVal);
    if (type === 'whatsapp') setWhatsappNotifs(nextVal);

    if (!user) return;
    setSavingNotifs(true);
    try {
      await api.patch('/auth/profile', {
        emailNotifications: type === 'email' ? nextVal : emailNotifs,
        whatsappNotifications: type === 'whatsapp' ? nextVal : whatsappNotifs,
      });
      if (user) {
        updateUser({
          ...user,
          emailNotifications: type === 'email' ? nextVal : emailNotifs,
          whatsappNotifications: type === 'whatsapp' ? nextVal : whatsappNotifs,
        });
      }
    } catch {
      // Revertir si hubo error
      if (type === 'email') setEmailNotifs(!nextVal);
      if (type === 'whatsapp') setWhatsappNotifs(!nextVal);
      Alert.alert('Error', 'No se pudieron actualizar las preferencias de notificaciones.');
    } finally {
      setSavingNotifs(false);
    }
  };

  // ==============================================================
  // GESTIÓN DE SESIONES ACTIVAS
  // ==============================================================
  const handleRevokeSession = (sessionId: string) => {
    Alert.alert(
      'Cerrar Sesión Remota',
      '¿Deseás cerrar la sesión en este dispositivo de forma remota?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: async () => {
            setSessionActionLoading(sessionId);
            try {
              await api.delete(`/auth/sessions/${sessionId}`);
              setSessions((prev) => prev.filter((s) => s.id !== sessionId));
              Alert.alert('Éxito', 'La sesión fue cerrada correctamente.');
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.message || 'No se pudo cerrar la sesión.');
            } finally {
              setSessionActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleRevokeAllOtherSessions = () => {
    Alert.alert(
      'Cerrar Otras Sesiones',
      '¿Estás seguro de que deseás cerrar todas las demás sesiones excepto la actual?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Todas',
          style: 'destructive',
          onPress: async () => {
            setSessionActionLoading('all');
            try {
              await api.post('/auth/sessions/revoke-all');
              setSessions((prev) => prev.filter((s) => s.isCurrent));
              Alert.alert('Éxito', 'Todas las demás sesiones fueron cerradas con éxito.');
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.message || 'No se pudieron cerrar las demás sesiones.');
            } finally {
              setSessionActionLoading(null);
            }
          },
        },
      ]
    );
  };

  // ==============================================================
  // GESTIÓN 2FA (GOOGLE AUTHENTICATOR)
  // ==============================================================
  const handleOpenTwoFactorModal = async () => {
    setTwoFactorError(null);
    setTwoFactorCodeInput('');
    setTwoFactorDisablePassword('');
    setTwoFactorCopied(false);

    if (user?.twoFactorEnabled) {
      setTwoFactorStep('disable');
      setShowTwoFactorModal(true);
    } else {
      setTwoFactorStep('setup');
      setShowTwoFactorModal(true);
      setTwoFactorLoading(true);
      try {
        const res = await api.get('/auth/2fa/setup');
        setTwoFactorSecret(res.data.secret);
      } catch (err: any) {
        setTwoFactorError(err.response?.data?.message || 'Error al iniciar configuración 2FA.');
      } finally {
        setTwoFactorLoading(false);
      }
    }
  };

  const handleCopySecret = async () => {
    if (!twoFactorSecret) return;
    await Clipboard.setStringAsync(twoFactorSecret);
    setTwoFactorCopied(true);
    setTimeout(() => setTwoFactorCopied(false), 2000);
  };

  const handleCopyBackupCodes = async () => {
    if (twoFactorBackupCodes.length === 0) return;
    await Clipboard.setStringAsync(twoFactorBackupCodes.join('\n'));
    setTwoFactorCopied(true);
    setTimeout(() => setTwoFactorCopied(false), 2000);
  };

  const handleVerifyAndEnableTwoFactor = async () => {
    const code = twoFactorCodeInput.replace(/\s+/g, '');
    if (code.length < 6) {
      setTwoFactorError('Ingresá el código de 6 dígitos generado por tu app.');
      return;
    }

    setTwoFactorLoading(true);
    setTwoFactorError(null);
    try {
      const res = await api.post('/auth/2fa/verify-and-enable', { code });
      setTwoFactorBackupCodes(res.data.backupCodes || []);
      setTwoFactorStep('backup_codes');
      if (user) {
        updateUser({ ...user, twoFactorEnabled: true });
      }
    } catch (err: any) {
      setTwoFactorError(err.response?.data?.message || 'Código de verificación incorrecto o expirado.');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleDisableTwoFactor = async () => {
    if (!twoFactorDisablePassword) {
      setTwoFactorError('Ingresá tu contraseña actual para confirmar.');
      return;
    }

    setTwoFactorLoading(true);
    setTwoFactorError(null);
    try {
      await api.post('/auth/2fa/disable', { password: twoFactorDisablePassword });
      if (user) {
        updateUser({ ...user, twoFactorEnabled: false });
      }
      setShowTwoFactorModal(false);
      Alert.alert('Seguridad', 'El doble factor de autenticación fue desactivado.');
    } catch (err: any) {
      setTwoFactorError(err.response?.data?.message || 'Contraseña incorrecta.');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  // ==============================================================
  // VERIFICACIÓN DE CORREO ELECTRÓNICO (OTP)
  // ==============================================================
  const handleStartEmailVerification = async () => {
    setEmailVerifyLoading(true);
    setEmailVerifyError(null);
    try {
      const res = await api.post('/auth/send-verification-email');
      setEmailVerifyToken(res.data.verificationToken || null);
      setEmailVerifyCode('');
      setShowEmailVerifyModal(true);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'No se pudo enviar el correo de verificación.');
    } finally {
      setEmailVerifyLoading(false);
    }
  };

  const handleConfirmEmailVerification = async () => {
    const code = emailVerifyCode.replace(/\s+/g, '');
    if (code.length < 6) {
      setEmailVerifyError('Ingresá el código de 6 dígitos recibido por correo.');
      return;
    }

    setEmailVerifyLoading(true);
    setEmailVerifyError(null);
    try {
      await api.post('/auth/verify-email', {
        code,
        verificationToken: emailVerifyToken,
      });
      if (user) {
        updateUser({ ...user, emailVerified: true });
      }
      setShowEmailVerifyModal(false);
      Alert.alert('¡Excelente!', 'Tu dirección de correo ha sido verificada con éxito.');
    } catch (err: any) {
      setEmailVerifyError(err.response?.data?.message || 'Código de verificación incorrecto o expirado.');
    } finally {
      setEmailVerifyLoading(false);
    }
  };

  // ==============================================================
  // CAMBIO DE CONTRASEÑA
  // ==============================================================
  const handleOpenPasswordModal = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordOtpCode('');
    setPasswordConfirmToken(null);
    setPasswordChangeStep('inputs');
    setPasswordError(null);
    setShowPasswordModal(true);
  };

  const handleSubmitPasswordChange = async () => {
    setPasswordError(null);

    if (passwordChangeStep === 'inputs') {
      if (!currentPassword || !newPassword || !confirmPassword) {
        setPasswordError('Completá todos los campos.');
        return;
      }
      if (newPassword.length < 6) {
        setPasswordError('La nueva contraseña debe tener al menos 6 caracteres.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setPasswordError('Las nuevas contraseñas no coinciden.');
        return;
      }

      setPasswordLoading(true);
      try {
        const res = await api.patch('/auth/change-password', {
          currentPassword,
          newPassword,
        });

        if (res.data?.confirmationToken) {
          setPasswordConfirmToken(res.data.confirmationToken);
          setPasswordChangeStep('code');
        } else {
          setShowPasswordModal(false);
          Alert.alert('Éxito', res.data?.message || 'Tu contraseña fue actualizada.');
        }
      } catch (err: any) {
        setPasswordError(err.response?.data?.message || 'No se pudo cambiar la contraseña.');
      } finally {
        setPasswordLoading(false);
      }
    } else {
      // Paso 2: Confirmar con código OTP
      if (passwordOtpCode.trim().length !== 6) {
        setPasswordError('Ingresá el código de 6 dígitos enviado a tu correo.');
        return;
      }

      setPasswordLoading(true);
      try {
        const res = await api.post('/auth/confirm-password-change', {
          confirmationToken: passwordConfirmToken,
          code: passwordOtpCode.trim(),
        });
        setShowPasswordModal(false);
        Alert.alert('Éxito', res.data?.message || 'Tu contraseña fue actualizada exitosamente.');
      } catch (err: any) {
        setPasswordError(err.response?.data?.message || 'Código incorrecto o expirado.');
      } finally {
        setPasswordLoading(false);
      }
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que deseás cerrar tu sesión en esta app?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: () => logout(),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />

      <View style={styles.navBar}>
        <Text style={styles.navTitle}>Mi Perfil</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User Info Card */}
        {user ? (
          <Card style={styles.userCard}>
            <View style={styles.avatarWrap}>
              <Text style={styles.avatarInitials}>
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
            <View style={{ flex: 1, marginLeft: Spacing.md }}>
              <Text style={styles.userName}>{user.name}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
              {user.phone ? <Text style={styles.userPhone}>{user.phone}</Text> : null}
              <View style={styles.roleRow}>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleText}>{user.role || 'CLIENTE'}</Text>
                </View>
                {user.emailVerified ? (
                  <View style={[styles.verifiedPill, { backgroundColor: '#ecfdf5' }]}>
                    <Ionicons name="checkmark-circle" size={13} color="#059669" />
                    <Text style={[styles.verifiedPillText, { color: '#059669' }]}>Verificado</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.verifiedPill, { backgroundColor: '#fffbeb', borderColor: '#fde68a', borderWidth: 1 }]}
                    onPress={handleStartEmailVerification}
                  >
                    <Ionicons name="alert-circle" size={13} color="#d97706" />
                    <Text style={[styles.verifiedPillText, { color: '#d97706' }]}>Verificar correo</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </Card>
        ) : (
          <Card style={styles.guestCard}>
            <Ionicons name="person-circle-outline" size={54} color={Colors.primary} />
            <Text style={styles.guestTitle}>¡Bienvenido a Turnos Ya!</Text>
            <Text style={styles.guestDesc}>
              Iniciá sesión o creá tu cuenta para gestionar turnos y configurar alertas.
            </Text>
            <View style={styles.guestActions}>
              <Button
                title="Iniciar Sesión"
                size="md"
                onPress={() => navigation.navigate('Login')}
                style={{ flex: 1 }}
              />
              <Button
                title="Registrarse"
                variant="outline"
                size="md"
                onPress={() => navigation.navigate('Register')}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        )}

        {/* Admin Switcher to Owner Mode */}
        {user && isAdmin && (
          <View style={styles.adminBanner}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <Ionicons name="shield-checkmark" size={16} color="#b45309" />
                <Text style={styles.adminBannerTitle}>Acceso de Administrador</Text>
              </View>
              <Text style={styles.adminBannerSubtitle}>
                Podés alternar al panel de Dueño (Owner) para gestionar turnos y negocios.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.adminBannerBtn}
              onPress={() => setRoleMode('owner')}
              activeOpacity={0.8}
            >
              <Ionicons name="storefront" size={15} color={Colors.white} />
              <Text style={styles.adminBannerBtnText}>Panel Dueño</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Security Settings Section */}
        {user && (
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionHeader}>Seguridad de la Cuenta</Text>
            <Card style={styles.settingsCard}>
              {/* 2FA */}
              <View style={styles.securityItemRow}>
                <View style={{ flex: 1, paddingRight: Spacing.sm }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons
                      name="shield-checkmark"
                      size={18}
                      color={user.twoFactorEnabled ? Colors.success : Colors.primary}
                    />
                    <Text style={styles.settingLabel}>Google Authenticator (2FA)</Text>
                  </View>
                  <Text style={styles.settingDesc}>
                    {user.twoFactorEnabled
                      ? 'Protección alta activa. Se requiere código temporal al iniciar sesión.'
                      : 'Protegé tu cuenta con código temporal TOTP generado en tu celular.'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.actionPill,
                    user.twoFactorEnabled ? styles.actionPillDanger : styles.actionPillPrimary,
                  ]}
                  onPress={handleOpenTwoFactorModal}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.actionPillText,
                      user.twoFactorEnabled ? styles.actionPillTextDanger : styles.actionPillTextPrimary,
                    ]}
                  >
                    {user.twoFactorEnabled ? 'Desactivar' : 'Configurar'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />

              {/* Email Verification */}
              <View style={styles.securityItemRow}>
                <View style={{ flex: 1, paddingRight: Spacing.sm }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons
                      name="mail-unread-outline"
                      size={18}
                      color={user.emailVerified ? Colors.success : '#d97706'}
                    />
                    <Text style={styles.settingLabel}>Correo Electrónico</Text>
                  </View>
                  <Text style={styles.settingDesc}>
                    {user.emailVerified
                      ? 'Verificado para restablecimiento seguro de acceso y confirmaciones.'
                      : 'Pendiente de verificación para desbloquear funciones de seguridad.'}
                  </Text>
                </View>
                {user.emailVerified ? (
                  <View style={[styles.securityPill, styles.securityPillActive]}>
                    <Text style={[styles.securityPillText, styles.securityPillTextActive]}>
                      Verificado
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.actionPill, styles.actionPillWarning]}
                    onPress={handleStartEmailVerification}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.actionPillText, styles.actionPillTextWarning]}>
                      Verificar
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.divider} />

              {/* Password Change */}
              <View style={styles.securityItemRow}>
                <View style={{ flex: 1, paddingRight: Spacing.sm }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="key-outline" size={18} color={Colors.primary} />
                    <Text style={styles.settingLabel}>Contraseña de la Cuenta</Text>
                  </View>
                  <Text style={styles.settingDesc}>
                    Actualizá periódicamente tu contraseña para mantener la seguridad.
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.actionPill, styles.actionPillOutline]}
                  onPress={handleOpenPasswordModal}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.actionPillText, styles.actionPillTextOutline]}>
                    Cambiar
                  </Text>
                </TouchableOpacity>
              </View>
            </Card>
          </View>
        )}

        {/* Active Sessions & Linked Devices */}
        {user && (
          <View style={styles.sectionWrap}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeader}>Sesiones y Dispositivos</Text>
              <TouchableOpacity onPress={loadSessions} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="refresh-outline" size={18} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            <Card style={styles.settingsCard}>
              <Text style={styles.sessionsSubDesc}>
                Dispositivos que han iniciado sesión recientemente en tu cuenta de Turnos Ya.
              </Text>

              {sessionsLoading ? (
                <View style={{ paddingVertical: Spacing.lg, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={{ fontSize: Typography.sizes.xs, color: Colors.textSecondary, marginTop: 6 }}>
                    Cargando dispositivos...
                  </Text>
                </View>
              ) : sessions.length === 0 ? (
                <View style={{ paddingVertical: Spacing.md, alignItems: 'center' }}>
                  <Ionicons name="shield-outline" size={28} color={Colors.textDisabled} />
                  <Text style={{ fontSize: Typography.sizes.xs, color: Colors.textSecondary, marginTop: 4 }}>
                    Sesión actual segura y protegida.
                  </Text>
                </View>
              ) : (
                <View style={{ marginTop: Spacing.xs }}>
                  {sessions.map((s, idx) => {
                    const isMobileDevice =
                      s.deviceName?.toLowerCase().includes('phone') ||
                      s.deviceName?.toLowerCase().includes('android') ||
                      s.deviceName?.toLowerCase().includes('ios') ||
                      s.deviceName?.toLowerCase().includes('expo');

                    return (
                      <View key={s.id || idx}>
                        {idx > 0 && <View style={styles.sessionDivider} />}
                        <View style={styles.sessionItem}>
                          <View style={styles.deviceIconWrap}>
                            <Ionicons
                              name={isMobileDevice ? 'phone-portrait-outline' : 'laptop-outline'}
                              size={20}
                              color={s.isCurrent ? Colors.primary : Colors.textSecondary}
                            />
                          </View>
                          <View style={{ flex: 1, marginHorizontal: Spacing.sm }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={styles.deviceNameText} numberOfLines={1}>
                                {s.deviceName || 'Dispositivo Desconocido'}
                              </Text>
                              {s.isCurrent && (
                                <View style={styles.currentBadge}>
                                  <Text style={styles.currentBadgeText}>Actual</Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.deviceMetaText}>
                              {s.ipAddress ? `IP: ${s.ipAddress}` : 'Conectado recientemente'}
                            </Text>
                          </View>

                          {!s.isCurrent && (
                            <TouchableOpacity
                              style={styles.revokeSessionBtn}
                              onPress={() => handleRevokeSession(s.id)}
                              disabled={sessionActionLoading === s.id}
                            >
                              {sessionActionLoading === s.id ? (
                                <ActivityIndicator size="small" color={Colors.danger} />
                              ) : (
                                <Ionicons name="log-out-outline" size={18} color={Colors.danger} />
                              )}
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    );
                  })}

                  {sessions.some((s) => !s.isCurrent) && (
                    <TouchableOpacity
                      style={styles.revokeAllBtn}
                      onPress={handleRevokeAllOtherSessions}
                      disabled={sessionActionLoading === 'all'}
                      activeOpacity={0.8}
                    >
                      {sessionActionLoading === 'all' ? (
                        <ActivityIndicator size="small" color={Colors.danger} />
                      ) : (
                        <>
                          <Ionicons name="power-outline" size={15} color={Colors.danger} />
                          <Text style={styles.revokeAllBtnText}>Cerrar todas las demás sesiones</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </Card>
          </View>
        )}

        {/* Notifications Settings */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionHeader}>Notificaciones y Recordatorios</Text>
          <Card style={styles.settingsCard}>
            <View style={styles.settingRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>Avisos por Correo Electrónico</Text>
                <Text style={styles.settingDesc}>
                  Confirmaciones y cancelaciones automáticas
                </Text>
              </View>
              <Switch
                value={emailNotifs}
                onValueChange={(val) => handleToggleNotifications('email', val)}
                trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                thumbColor={emailNotifs ? Colors.primary : '#f4f3f4'}
                disabled={savingNotifs}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>Alertas por WhatsApp</Text>
                <Text style={styles.settingDesc}>
                  Recordatorios 2 horas antes de tu turno
                </Text>
              </View>
              <Switch
                value={whatsappNotifs}
                onValueChange={(val) => handleToggleNotifications('whatsapp', val)}
                trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                thumbColor={whatsappNotifs ? Colors.primary : '#f4f3f4'}
                disabled={savingNotifs}
              />
            </View>
          </Card>
        </View>

        {/* Support & Help Section */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionHeader}>Ayuda y Soporte</Text>
          <Card style={styles.settingsCard}>
            <TouchableOpacity
              style={styles.supportRow}
              onPress={() => setShowBugModal(true)}
              activeOpacity={0.7}
            >
              <View style={styles.supportIconWrap}>
                <Ionicons name="bug-outline" size={20} color={Colors.primary} />
              </View>
              <View style={{ flex: 1, marginHorizontal: Spacing.sm }}>
                <Text style={styles.settingLabel}>Reportar un problema técnico</Text>
                <Text style={styles.settingDesc}>
                  Informanos sobre cualquier inconveniente o error en la aplicación
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textDisabled} />
            </TouchableOpacity>
          </Card>
        </View>

        {/* Developer / Network Connection Settings */}
        <View style={styles.sectionWrap}>
          <TouchableOpacity
            style={styles.devHeaderToggle}
            onPress={() => setShowConfig(!showConfig)}
          >
            <Text style={styles.sectionHeader}>Conexión con el Servidor API</Text>
            <Ionicons
              name={showConfig ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={Colors.textSecondary}
            />
          </TouchableOpacity>

          {showConfig && (
            <Card style={styles.settingsCard}>
              <Text style={styles.configHelpText}>
                Para probar en un celular físico vía Expo Go, ingresá la IP local de tu PC (ej: http://192.168.1.50:3000/api/v1).
              </Text>
              <TextInput
                style={styles.configInput}
                placeholder="http://192.168.X.X:3000/api/v1"
                placeholderTextColor={Colors.textDisabled}
                value={customApiUrl}
                onChangeText={setCustomApiUrl}
                autoCapitalize="none"
              />
              <Button
                title="Guardar URL del Servidor"
                size="sm"
                onPress={handleSaveApiUrl}
                style={{ marginTop: Spacing.sm }}
              />
            </Card>
          )}
        </View>

        {/* Logout Button */}
        {user && (
          <View style={{ marginTop: Spacing.xl }}>
            <Button
              title="Cerrar Sesión"
              variant="outline"
              size="lg"
              onPress={handleLogout}
              textStyle={{ color: Colors.danger }}
              style={{ borderColor: Colors.statusCancelledBorder }}
            />
          </View>
        )}
      </ScrollView>

      {/* ============================================================== */}
      {/* MODAL 2FA (GOOGLE AUTHENTICATOR)                               */}
      {/* ============================================================== */}
      <Modal
        visible={showTwoFactorModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTwoFactorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalContainer}
          >
            <View style={styles.modalCard}>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowTwoFactorModal(false)}
                hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
              >
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>

              {twoFactorLoading ? (
                <View style={{ paddingVertical: Spacing.xxl, alignItems: 'center' }}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                  <Text style={{ marginTop: Spacing.md, color: Colors.textSecondary, fontSize: Typography.sizes.sm }}>
                    Procesando seguridad...
                  </Text>
                </View>
              ) : twoFactorStep === 'setup' ? (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={styles.modalIconWrap}>
                    <Ionicons name="shield-checkmark" size={28} color={Colors.primary} />
                  </View>
                  <Text style={styles.modalTitle}>Configurar 2FA</Text>
                  <Text style={styles.modalSubtitle}>
                    Google Authenticator genera códigos temporales de 6 dígitos que protegen tu cuenta.
                  </Text>

                  {twoFactorError ? (
                    <View style={styles.modalErrorBox}>
                      <Ionicons name="alert-circle" size={16} color={Colors.danger} />
                      <Text style={styles.modalErrorText}>{twoFactorError}</Text>
                    </View>
                  ) : null}

                  <Text style={styles.instructionStep}>
                    1. Abrí <Text style={{ fontWeight: 'bold' }}>Google Authenticator</Text> en tu teléfono.
                  </Text>
                  <Text style={styles.instructionStep}>
                    2. Tocá <Text style={{ fontWeight: 'bold' }}>+ y seleccioná "Ingresar clave de configuración"</Text>.
                  </Text>
                  <Text style={styles.instructionStep}>
                    3. Ingresá esta clave manual de configuración:
                  </Text>

                  {/* Secret Block */}
                  <View style={styles.secretBox}>
                    <Text style={styles.secretText} selectable>
                      {twoFactorSecret || 'CARGANDO-CLAVE...'}
                    </Text>
                    <TouchableOpacity
                      style={[styles.copyBtn, twoFactorCopied && styles.copyBtnSuccess]}
                      onPress={handleCopySecret}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={twoFactorCopied ? 'checkmark' : 'copy-outline'}
                        size={15}
                        color={twoFactorCopied ? Colors.white : Colors.primary}
                      />
                      <Text style={[styles.copyBtnText, twoFactorCopied && { color: Colors.white }]}>
                        {twoFactorCopied ? '¡Copiado!' : 'Copiar'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.instructionStep, { marginTop: Spacing.sm }]}>
                    4. Escribí el código de 6 dígitos que te muestra la app:
                  </Text>

                  <TextInput
                    style={styles.twoFactorInputBox}
                    placeholder="123456"
                    placeholderTextColor={Colors.textDisabled}
                    value={twoFactorCodeInput}
                    onChangeText={setTwoFactorCodeInput}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                  />

                  <Button
                    title="Verificar y Activar 2FA"
                    size="md"
                    onPress={handleVerifyAndEnableTwoFactor}
                    style={{ marginTop: Spacing.md }}
                  />
                </ScrollView>
              ) : twoFactorStep === 'backup_codes' ? (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={[styles.modalIconWrap, { backgroundColor: '#ecfdf5' }]}>
                    <Ionicons name="checkmark-circle" size={32} color={Colors.success} />
                  </View>
                  <Text style={styles.modalTitle}>¡2FA Activado con Éxito!</Text>
                  <Text style={styles.modalSubtitle}>
                    Guardá estos códigos de respaldo en un lugar seguro. Si perdés tu app autenticadora, podrás usarlos para ingresar:
                  </Text>

                  <View style={styles.backupCodesWrap}>
                    {twoFactorBackupCodes.map((code, idx) => (
                      <View key={idx} style={styles.backupCodeChip}>
                        <Text style={styles.backupCodeText}>{code}</Text>
                      </View>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={[styles.copyBackupBtn, twoFactorCopied && styles.copyBtnSuccess]}
                    onPress={handleCopyBackupCodes}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={twoFactorCopied ? 'checkmark' : 'copy-outline'}
                      size={16}
                      color={twoFactorCopied ? Colors.white : Colors.primary}
                    />
                    <Text style={[styles.copyBackupBtnText, twoFactorCopied && { color: Colors.white }]}>
                      {twoFactorCopied ? '¡Códigos Copiados!' : 'Copiar Todos los Códigos'}
                    </Text>
                  </TouchableOpacity>

                  <Button
                    title="Finalizar"
                    size="md"
                    onPress={() => setShowTwoFactorModal(false)}
                    style={{ marginTop: Spacing.lg }}
                  />
                </ScrollView>
              ) : (
                /* Desactivar 2FA */
                <View>
                  <View style={[styles.modalIconWrap, { backgroundColor: '#fef2f2' }]}>
                    <Ionicons name="lock-open-outline" size={28} color={Colors.danger} />
                  </View>
                  <Text style={styles.modalTitle}>Desactivar 2FA</Text>
                  <Text style={styles.modalSubtitle}>
                    Para desactivar el doble factor, por favor ingresá tu contraseña actual por seguridad:
                  </Text>

                  {twoFactorError ? (
                    <View style={styles.modalErrorBox}>
                      <Ionicons name="alert-circle" size={16} color={Colors.danger} />
                      <Text style={styles.modalErrorText}>{twoFactorError}</Text>
                    </View>
                  ) : null}

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Contraseña Actual</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="••••••••"
                      placeholderTextColor={Colors.textDisabled}
                      value={twoFactorDisablePassword}
                      onChangeText={setTwoFactorDisablePassword}
                      secureTextEntry
                      autoFocus
                    />
                  </View>

                  <Button
                    title="Confirmar Desactivación"
                    size="md"
                    onPress={handleDisableTwoFactor}
                    textStyle={{ color: Colors.white }}
                    style={{ backgroundColor: Colors.danger, borderColor: Colors.danger, marginTop: Spacing.md }}
                  />

                  <TouchableOpacity
                    style={styles.modalCancelBtn}
                    onPress={() => setShowTwoFactorModal(false)}
                  >
                    <Text style={styles.modalCancelText}>Cancelar</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL VERIFICACIÓN DE CORREO ELECTRÓNICO (OTP)                 */}
      {/* ============================================================== */}
      <Modal
        visible={showEmailVerifyModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEmailVerifyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalContainer}
          >
            <View style={styles.modalCard}>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowEmailVerifyModal(false)}
                hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
              >
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>

              <View style={styles.modalIconWrap}>
                <Ionicons name="mail-outline" size={28} color={Colors.primary} />
              </View>
              <Text style={styles.modalTitle}>Verificar Correo</Text>
              <Text style={styles.modalSubtitle}>
                Te enviamos un código de 6 dígitos a <Text style={{ fontWeight: 'bold' }}>{user?.email}</Text>.
              </Text>

              {emailVerifyError ? (
                <View style={styles.modalErrorBox}>
                  <Ionicons name="alert-circle" size={16} color={Colors.danger} />
                  <Text style={styles.modalErrorText}>{emailVerifyError}</Text>
                </View>
              ) : null}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Código de 6 dígitos</Text>
                <TextInput
                  style={styles.twoFactorInputBox}
                  placeholder="123456"
                  placeholderTextColor={Colors.textDisabled}
                  value={emailVerifyCode}
                  onChangeText={setEmailVerifyCode}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                />
              </View>

              <Button
                title="Confirmar Verificación"
                size="md"
                loading={emailVerifyLoading}
                onPress={handleConfirmEmailVerification}
                style={{ marginTop: Spacing.md }}
              />

              <TouchableOpacity
                style={styles.resendBtn}
                onPress={handleStartEmailVerification}
                disabled={emailVerifyLoading}
              >
                <Text style={styles.resendBtnText}>¿No te llegó? Reenviar código</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL CAMBIO DE CONTRASEÑA                                     */}
      {/* ============================================================== */}
      <Modal
        visible={showPasswordModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalContainer}
          >
            <View style={styles.modalCard}>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowPasswordModal(false)}
                hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
              >
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>

              <View style={styles.modalIconWrap}>
                <Ionicons name="key-outline" size={28} color={Colors.primary} />
              </View>
              <Text style={styles.modalTitle}>Cambiar Contraseña</Text>
              <Text style={styles.modalSubtitle}>
                {passwordChangeStep === 'inputs'
                  ? 'Ingresá tu contraseña actual y la nueva que deseás utilizar.'
                  : 'Ingresá el código de 6 dígitos enviado a tu correo para autorizar el cambio.'}
              </Text>

              {passwordError ? (
                <View style={styles.modalErrorBox}>
                  <Ionicons name="alert-circle" size={16} color={Colors.danger} />
                  <Text style={styles.modalErrorText}>{passwordError}</Text>
                </View>
              ) : null}

              {passwordChangeStep === 'inputs' ? (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Contraseña Actual</Text>
                    <View style={styles.inputWithIcon}>
                      <TextInput
                        style={styles.modalInputWithIcon}
                        placeholder="••••••••"
                        placeholderTextColor={Colors.textDisabled}
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                        secureTextEntry={!showCurrentPass}
                      />
                      <TouchableOpacity
                        onPress={() => setShowCurrentPass(!showCurrentPass)}
                        style={{ padding: 6 }}
                      >
                        <Ionicons
                          name={showCurrentPass ? 'eye-off-outline' : 'eye-outline'}
                          size={18}
                          color={Colors.textSecondary}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Nueva Contraseña (mín. 6 caracteres)</Text>
                    <View style={styles.inputWithIcon}>
                      <TextInput
                        style={styles.modalInputWithIcon}
                        placeholder="••••••••"
                        placeholderTextColor={Colors.textDisabled}
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry={!showNewPass}
                      />
                      <TouchableOpacity
                        onPress={() => setShowNewPass(!showNewPass)}
                        style={{ padding: 6 }}
                      >
                        <Ionicons
                          name={showNewPass ? 'eye-off-outline' : 'eye-outline'}
                          size={18}
                          color={Colors.textSecondary}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Confirmar Nueva Contraseña</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="••••••••"
                      placeholderTextColor={Colors.textDisabled}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showNewPass}
                    />
                  </View>

                  <Button
                    title="Actualizar Contraseña"
                    size="md"
                    loading={passwordLoading}
                    onPress={handleSubmitPasswordChange}
                    style={{ marginTop: Spacing.md }}
                  />
                </>
              ) : (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Código de Seguridad (6 dígitos)</Text>
                    <TextInput
                      style={styles.twoFactorInputBox}
                      placeholder="123456"
                      placeholderTextColor={Colors.textDisabled}
                      value={passwordOtpCode}
                      onChangeText={setPasswordOtpCode}
                      keyboardType="number-pad"
                      maxLength={6}
                      autoFocus
                    />
                  </View>

                  <Button
                    title="Confirmar Cambio de Contraseña"
                    size="md"
                    loading={passwordLoading}
                    onPress={handleSubmitPasswordChange}
                    style={{ marginTop: Spacing.md }}
                  />
                </>
              )}

              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowPasswordModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL REPORTE DE BUGS / SOPORTE TÉCNICO                         */}
      {/* ============================================================== */}
      <BugReportModal
        visible={showBugModal}
        onClose={() => setShowBugModal(false)}
      />
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
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 60,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  avatarWrap: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
  },
  userName: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
  },
  userEmail: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  userPhone: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  roleBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
  },
  roleText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  verifiedPillText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
  },
  guestCard: {
    alignItems: 'center',
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  guestTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
    marginTop: Spacing.sm,
  },
  guestDesc: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  guestActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
  },
  sectionWrap: {
    marginTop: Spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionHeader: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
    marginBottom: Spacing.sm,
  },
  devHeaderToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  settingsCard: {
    padding: Spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  securityItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  settingLabel: {
    fontSize: Typography.sizes.sm + 1,
    fontWeight: Typography.weights.semiBold,
    color: Colors.textTitle,
  },
  settingDesc: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  configHelpText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  configInput: {
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.borderInput,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm + 2,
    fontSize: Typography.sizes.sm,
    color: Colors.textMain,
  },
  adminBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: 8,
  },
  adminBannerTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: '#92400e',
  },
  adminBannerSubtitle: {
    fontSize: Typography.sizes.xs,
    color: '#78350f',
    marginTop: 2,
    lineHeight: 16,
  },
  adminBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d97706',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    gap: 4,
  },
  adminBannerBtnText: {
    color: Colors.white,
    fontWeight: Typography.weights.bold,
    fontSize: Typography.sizes.xs + 1,
  },
  securityPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  securityPillActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  securityPillText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
  },
  securityPillTextActive: {
    color: '#059669',
  },
  actionPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPillText: {
    fontSize: Typography.sizes.xs + 1,
    fontWeight: Typography.weights.bold,
  },
  actionPillPrimary: {
    backgroundColor: '#eff6ff',
    borderColor: Colors.primary,
  },
  actionPillTextPrimary: {
    color: Colors.primary,
    fontSize: Typography.sizes.xs + 1,
    fontWeight: Typography.weights.bold,
  },
  actionPillDanger: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  actionPillTextDanger: {
    color: Colors.danger,
    fontSize: Typography.sizes.xs + 1,
    fontWeight: Typography.weights.bold,
  },
  actionPillWarning: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  actionPillTextWarning: {
    color: '#b45309',
    fontSize: Typography.sizes.xs + 1,
    fontWeight: Typography.weights.bold,
  },
  actionPillOutline: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
  },
  actionPillTextOutline: {
    color: Colors.textTitle,
    fontSize: Typography.sizes.xs + 1,
    fontWeight: Typography.weights.semiBold,
  },
  sessionsSubDesc: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    lineHeight: 16,
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs + 2,
  },
  sessionDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  deviceIconWrap: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceNameText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semiBold,
    color: Colors.textTitle,
    flexShrink: 1,
  },
  deviceMetaText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  currentBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: BorderRadius.sm,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: Typography.weights.bold,
    color: '#059669',
  },
  revokeSessionBtn: {
    padding: 6,
  },
  revokeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.sm,
    paddingVertical: Spacing.xs + 2,
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: BorderRadius.md,
    backgroundColor: '#fff5f5',
  },
  revokeAllBtnText: {
    fontSize: Typography.sizes.xs + 1,
    fontWeight: Typography.weights.bold,
    color: Colors.danger,
  },
  supportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  supportIconWrap: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.md,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
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
    maxHeight: '90%',
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
    marginBottom: Spacing.md,
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
  instructionStep: {
    fontSize: Typography.sizes.xs + 1,
    color: Colors.textTitle,
    marginBottom: 4,
    lineHeight: 18,
  },
  secretBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginVertical: Spacing.xs,
  },
  secretText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
    letterSpacing: 2,
    flex: 1,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.sm,
  },
  copyBtnSuccess: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  copyBtnText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
  },
  twoFactorInputBox: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.md,
    height: 50,
    fontSize: 22,
    fontWeight: Typography.weights.bold,
    letterSpacing: 8,
    color: Colors.textTitle,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  backupCodesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
    marginVertical: Spacing.md,
  },
  backupCodeChip: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
  },
  backupCodeText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
    letterSpacing: 1,
  },
  copyBackupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xs,
  },
  copyBackupBtnText: {
    fontSize: Typography.sizes.xs + 1,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
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
  modalInput: {
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.borderInput,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm + 2,
    fontSize: Typography.sizes.sm,
    color: Colors.textMain,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.borderInput,
    borderRadius: BorderRadius.md,
    paddingRight: Spacing.xs,
  },
  modalInputWithIcon: {
    flex: 1,
    padding: Spacing.sm + 2,
    fontSize: Typography.sizes.sm,
    color: Colors.textMain,
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
  resendBtn: {
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  resendBtnText: {
    fontSize: Typography.sizes.xs + 1,
    color: Colors.primary,
    fontWeight: Typography.weights.bold,
  },
});
