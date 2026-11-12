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
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { BugReportModal } from '../../components/common/BugReportModal';
import { LegalModal, type LegalDocType } from '../../components/common/LegalModal';
import { BusinessDossierModal } from '../../components/business/BusinessDossierModal';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useOwner } from '../../context/OwnerContext';
import api, {
  STORAGE_KEYS,
  getAutoDetectedBaseUrl,
  CLOUD_API_URL,
  LOCAL_LAN_URL,
} from '../../services/api';

export type SubViewType =
  | 'hub'
  | 'personal_info'
  | 'security'
  | 'devices'
  | 'notifications'
  | 'privacy'
  | 'network'
  | 'favorites';

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
  const { isAdmin, setRoleMode, businesses, selectedBusiness } = useOwner();

  // Navegación modular interna (In-screen drill-down)
  const [activeSubView, setActiveSubView] = useState<SubViewType>('hub');

  // Modales adicionales
  const [dossierVisible, setDossierVisible] = useState(false);
  const [showBugModal, setShowBugModal] = useState(false);
  const [legalModalDoc, setLegalModalDoc] = useState<LegalDocType | null>(null);

  // Preferencias de Notificaciones
  const [emailNotifs, setEmailNotifs] = useState(user?.emailNotifications ?? true);
  const [whatsappNotifs, setWhatsappNotifs] = useState(user?.whatsappNotifications ?? false);
  const [savingNotifs, setSavingNotifs] = useState(false);

  // Preferencias de Privacidad
  const [privacySharePhone, setPrivacySharePhone] = useState(false);
  const [privacySystemNews, setPrivacySystemNews] = useState(true);
  const [privacyProfilePublic, setPrivacyProfilePublic] = useState(true);

  // Edición de Datos Personales
  const [editName, setEditName] = useState(user?.name || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [editProfileLoading, setEditProfileLoading] = useState(false);
  const [editProfileError, setEditProfileError] = useState<string | null>(null);

  // Servidor y Conectividad
  const [customApiUrl, setCustomApiUrl] = useState('');

  // Sesiones activas y dispositivos vinculados
  const [sessions, setSessions] = useState<UserSessionItem[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionActionLoading, setSessionActionLoading] = useState<string | null>(null);

  // Comercios Favoritos / Seguidos
  const [favoriteBusinesses, setFavoriteBusinesses] = useState<any[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);

  const loadFavoriteBusinesses = async () => {
    if (!user) {
      setFavoriteBusinesses([]);
      return;
    }
    setLoadingFavorites(true);
    try {
      const res = await api.get('/businesses/my/favorites');
      const list = res.data?.data ?? res.data ?? [];
      setFavoriteBusinesses(Array.isArray(list) ? list : []);
    } catch {
      // silencioso
    } finally {
      setLoadingFavorites(false);
    }
  };

  const handleToggleFavBizNotif = async (businessId: number, currentVal: boolean) => {
    const nextVal = !currentVal;
    setFavoriteBusinesses((prev) =>
      prev.map((f) => (f.businessId === businessId ? { ...f, receiveNotifications: nextVal } : f))
    );
    try {
      await api.patch(`/businesses/${businessId}/follow/notifications`, {
        receiveNotifications: nextVal,
      });
    } catch {
      setFavoriteBusinesses((prev) =>
        prev.map((f) => (f.businessId === businessId ? { ...f, receiveNotifications: currentVal } : f))
      );
    }
  };

  const handleUnfollowFromProfile = async (businessId: number) => {
    try {
      await api.post(`/businesses/${businessId}/follow`);
      setFavoriteBusinesses((prev) => prev.filter((f) => f.businessId !== businessId));
    } catch {
      // silencioso
    }
  };

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

  // Modal Cambio de Contraseña Seguro Multi-Paso
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passwordChangeStep, setPasswordChangeStep] = useState<
    'no_methods' | 'choose_method' | 'verify_email' | 'verify_2fa' | 'set_passwords'
  >('verify_email');
  const [passwordConfirmToken, setPasswordConfirmToken] = useState<string | null>(null);
  const [passwordOtpCode, setPasswordOtpCode] = useState('');
  const [password2faCode, setPassword2faCode] = useState('');
  const [changeAuthToken, setChangeAuthToken] = useState<string | null>(null);
  const [qaPasswordCode, setQaPasswordCode] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Sincronización inicial
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
      loadFavoriteBusinesses();
      setEditName(user.name || '');
      setEditPhone(user.phone || '');
    }
  }, [user]);

  // Soporte ergonómico para botón de atrás físico en Android
  useEffect(() => {
    if (activeSubView === 'hub') return;
    const onBackPress = () => {
      setActiveSubView('hub');
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backHandler.remove();
  }, [activeSubView]);

  // Carga de sesiones activas del usuario
  const loadSessions = async () => {
    if (!user) return;
    setSessionsLoading(true);
    try {
      const res = await api.get('/auth/sessions');
      setSessions(res.data || []);
    } catch {
      // Manejo silencioso de red
    } finally {
      setSessionsLoading(false);
    }
  };

  // Guardar URL de Servidor
  const handleSaveApiUrl = async () => {
    try {
      if (!customApiUrl.trim()) {
        await AsyncStorage.removeItem(STORAGE_KEYS.API_URL);
        setCustomApiUrl(getAutoDetectedBaseUrl());
        Alert.alert('Configuración', 'Se restauró el servidor por defecto (Nube oficial).');
      } else {
        await AsyncStorage.setItem(STORAGE_KEYS.API_URL, customApiUrl.trim());
        Alert.alert('Configuración Guardada', 'URL del servidor actualizada correctamente.');
      }
    } catch {
      Alert.alert('Error', 'No se pudo guardar la configuración.');
    }
  };

  // Selector rápido de servidores (Nube vs Local)
  const handleSelectServerPreset = async (url: string) => {
    try {
      setCustomApiUrl(url);
      await AsyncStorage.setItem(STORAGE_KEYS.API_URL, url);
      Alert.alert(
        'Servidor Conectado',
        url.includes('onrender')
          ? 'Conectado a la Nube (Render). Compatible con 4G, 5G y Wi-Fi.'
          : 'Conectado a la PC Local (192.168.1.71). Asegurate de estar en la misma red Wi-Fi.'
      );
    } catch {
      Alert.alert('Error', 'No se pudo aplicar el servidor.');
    }
  };

  // Guardar datos personales
  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      setEditProfileError('Por favor ingresá tu nombre.');
      return;
    }

    setEditProfileLoading(true);
    setEditProfileError(null);
    try {
      const res = await api.patch('/auth/profile', {
        name: editName.trim(),
        phone: editPhone.trim() || undefined,
      });

      if (user) {
        updateUser({
          ...user,
          name: res.data.name || editName.trim(),
          phone: res.data.phone || editPhone.trim(),
        });
      }
      Alert.alert('Éxito', 'Tus datos personales fueron actualizados.');
      setActiveSubView('hub');
    } catch (err: any) {
      setEditProfileError(err.response?.data?.message || 'Error al actualizar tus datos.');
    } finally {
      setEditProfileLoading(false);
    }
  };

  // Guardar preferencias de notificaciones con Optimistic Update
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
      if (type === 'email') setEmailNotifs(!nextVal);
      if (type === 'whatsapp') setWhatsappNotifs(!nextVal);
      Alert.alert('Error', 'No se pudieron actualizar las preferencias de notificaciones.');
    } finally {
      setSavingNotifs(false);
    }
  };

  // Revocar Sesión Remota Individual
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

  // Revocar Todas las demás sesiones
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

  // Flujo 2FA (Google Authenticator)
  const handleOpenTwoFactorModal = async (forceReset?: boolean | any) => {
    const shouldReset = forceReset === true;
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
        const url = shouldReset ? '/auth/2fa/setup?reset=true' : '/auth/2fa/setup';
        const res = await api.get(url);
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
    const code = twoFactorCodeInput.replace(/[\s-]+/g, '');
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
      setTwoFactorError(err.response?.data?.message || 'Código incorrecto o expirado.');
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

  // Verificación de Correo (OTP)
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

  // Cambio de Contraseña Seguro con Verificación Multi-Factor
  const handleOpenPasswordModal = async () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordOtpCode('');
    setPassword2faCode('');
    setPasswordConfirmToken(null);
    setChangeAuthToken(null);
    setQaPasswordCode(null);
    setPasswordError(null);

    const hasEmail = Boolean(user?.emailVerified);
    const has2FA = Boolean(user?.twoFactorEnabled);

    if (!hasEmail && !has2FA) {
      setPasswordChangeStep('no_methods');
      setShowPasswordModal(true);
      return;
    }

    if (hasEmail && has2FA) {
      setPasswordChangeStep('choose_method');
      setShowPasswordModal(true);
      return;
    }

    if (has2FA && !hasEmail) {
      setPasswordChangeStep('verify_2fa');
      setShowPasswordModal(true);
      return;
    }

    // Solo correo electrónico verificado
    setShowPasswordModal(true);
    setPasswordLoading(true);
    try {
      const res = await api.post('/auth/request-password-change-code');
      setPasswordConfirmToken(res.data.confirmationToken);
      setQaPasswordCode(res.data.qaCode || null);
      setPasswordChangeStep('verify_email');
    } catch (err: any) {
      setPasswordError(err.response?.data?.message || 'No se pudo enviar el código por correo.');
      setPasswordChangeStep('verify_email');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleChooseEmailMethod = async () => {
    setPasswordLoading(true);
    setPasswordError(null);
    try {
      const res = await api.post('/auth/request-password-change-code');
      setPasswordConfirmToken(res.data.confirmationToken);
      setQaPasswordCode(res.data.qaCode || null);
      setPasswordChangeStep('verify_email');
    } catch (err: any) {
      setPasswordError(err.response?.data?.message || 'No se pudo enviar el código por correo.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleChoose2FAMethod = () => {
    setPasswordError(null);
    setPassword2faCode('');
    setPasswordChangeStep('verify_2fa');
  };

  const handleVerifyPasswordEmailCode = async () => {
    const code = passwordOtpCode.trim();
    if (code.length !== 6) {
      setPasswordError('Ingresá el código de 6 dígitos enviado a tu correo.');
      return;
    }

    setPasswordLoading(true);
    setPasswordError(null);
    try {
      const res = await api.post('/auth/verify-password-change-code', {
        confirmationToken: passwordConfirmToken,
        code,
      });
      setChangeAuthToken(res.data.changeAuthToken);
      setPasswordChangeStep('set_passwords');
    } catch (err: any) {
      setPasswordError(err.response?.data?.message || 'Código incorrecto o expirado.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleVerifyPassword2FACode = async () => {
    const code = password2faCode.trim().replace(/\s+/g, '');
    if (code.length < 6) {
      setPasswordError('Ingresá el código de 6 dígitos de Google Authenticator.');
      return;
    }

    setPasswordLoading(true);
    setPasswordError(null);
    try {
      const res = await api.post('/auth/verify-password-change-2fa', { code });
      setChangeAuthToken(res.data.changeAuthToken);
      setPasswordChangeStep('set_passwords');
    } catch (err: any) {
      setPasswordError(err.response?.data?.message || 'Código de Authenticator incorrecto o expirado.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleResendPasswordEmailCode = async () => {
    setPasswordLoading(true);
    setPasswordError(null);
    try {
      const res = await api.post('/auth/request-password-change-code');
      setPasswordConfirmToken(res.data.confirmationToken);
      setQaPasswordCode(res.data.qaCode || null);
      Alert.alert('Código enviado', 'Enviamos un nuevo código de 6 dígitos a tu correo.');
    } catch (err: any) {
      setPasswordError(err.response?.data?.message || 'No se pudo reenviar el código.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleFinalizePasswordChange = async () => {
    setPasswordError(null);

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
      const res = await api.post('/auth/submit-password-change', {
        changeAuthToken,
        currentPassword,
        newPassword,
      });
      setShowPasswordModal(false);
      Alert.alert('¡Éxito!', res.data?.message || 'Tu contraseña fue actualizada correctamente.');
    } catch (err: any) {
      setPasswordError(err.response?.data?.message || 'No se pudo actualizar la contraseña.');
    } finally {
      setPasswordLoading(false);
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

  const isConnectedToCloud = customApiUrl.includes('onrender');

  // ==============================================================
  // TÍTULOS DINÁMICOS DE SECCIÓN
  // ==============================================================
  const SUBVIEW_TITLES: Record<SubViewType, string> = {
    hub: 'Mi Perfil',
    personal_info: 'Datos Personales',
    security: 'Seguridad y Acceso',
    devices: 'Dispositivos Vinculados',
    notifications: 'Notificaciones y Alertas',
    privacy: 'Privacidad y Legal',
    network: 'Servidor y Red',
    favorites: 'Mis Comercios Favoritos',
  };

  // ==============================================================
  // SUB-VISTA 1: DATOS PERSONALES
  // ==============================================================
  const renderPersonalInfoSubView = () => (
    <ScrollView contentContainerStyle={styles.subViewContent} showsVerticalScrollIndicator={false}>
      <Card style={styles.formCard}>
        <Text style={styles.formSectionTitle}>Información de Contacto</Text>
        <Text style={styles.formSectionSubtitle}>
          Estos datos se utilizan para asociar tus turnos y agendar reservas en comercios.
        </Text>

        {editProfileError ? (
          <View style={styles.modalErrorBox}>
            <Ionicons name="alert-circle" size={16} color={Colors.danger} />
            <Text style={styles.modalErrorText}>{editProfileError}</Text>
          </View>
        ) : null}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nombre Completo</Text>
          <TextInput
            style={styles.modalInput}
            value={editName}
            onChangeText={setEditName}
            placeholder="Tu nombre completo"
            placeholderTextColor={Colors.textDisabled}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Teléfono / WhatsApp</Text>
          <TextInput
            style={styles.modalInput}
            value={editPhone}
            onChangeText={setEditPhone}
            placeholder="+54 9 11 1234-5678"
            placeholderTextColor={Colors.textDisabled}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Dirección de Correo Electrónico</Text>
          <View style={styles.emailReadOnlyBox}>
            <Text style={styles.emailReadOnlyText}>{user?.email}</Text>
            {user?.emailVerified ? (
              <View style={styles.verifiedInlineTag}>
                <Ionicons name="checkmark-circle" size={13} color="#059669" />
                <Text style={styles.verifiedInlineText}>Verificado</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.verifyActionTag}
                onPress={handleStartEmailVerification}
              >
                <Text style={styles.verifyActionText}>Verificar</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <Button
          title="Guardar Cambios"
          size="md"
          loading={editProfileLoading}
          onPress={handleSaveProfile}
          style={{ marginTop: Spacing.md }}
        />
      </Card>
    </ScrollView>
  );

  // ==============================================================
  // SUB-VISTA 2: SEGURIDAD Y ACCESO
  // ==============================================================
  const renderSecuritySubView = () => (
    <ScrollView contentContainerStyle={styles.subViewContent} showsVerticalScrollIndicator={false}>
      {/* Resumen del Nivel de Seguridad */}
      <View style={styles.securityScoreCard}>
        <View style={styles.securityScoreHeader}>
          <Ionicons
            name={user?.twoFactorEnabled ? 'shield-checkmark' : user?.emailVerified ? 'shield-half' : 'shield-outline'}
            size={28}
            color={user?.twoFactorEnabled ? '#059669' : user?.emailVerified ? Colors.primary : '#d97706'}
          />
          <View style={{ flex: 1, marginLeft: Spacing.md }}>
            <Text style={styles.securityScoreTitle}>
              {user?.twoFactorEnabled
                ? 'Nivel de Protección: Alto'
                : user?.emailVerified
                ? 'Nivel de Protección: Estándar'
                : 'Nivel de Protección: Básico'}
            </Text>
            <Text style={styles.securityScoreDesc}>
              {user?.twoFactorEnabled
                ? 'Tu cuenta tiene habilitada la autenticación en dos pasos (TOTP).'
                : user?.emailVerified
                ? 'Correo verificado. Podés activar Google Authenticator para máxima seguridad.'
                : 'Verificá tu correo o activá Google Authenticator para proteger tu cuenta.'}
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionHeaderTitle}>MÉTODOS DE AUTENTICACIÓN</Text>
      <View style={styles.groupedList}>
        {/* Contraseña */}
        <TouchableOpacity style={styles.groupedRow} onPress={handleOpenPasswordModal} activeOpacity={0.7}>
          <View style={[styles.groupedRowIconWrap, { backgroundColor: '#eff6ff' }]}>
            <Ionicons name="key-outline" size={20} color={Colors.primary} />
          </View>
          <View style={styles.groupedRowBody}>
            <Text style={styles.groupedRowTitle}>Contraseña de la cuenta</Text>
            <Text style={styles.groupedRowSubtitle}>••••••••••••</Text>
          </View>
          <Text style={styles.groupedActionLabel}>Modificar</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.textDisabled} />
        </TouchableOpacity>

        <View style={styles.groupedDivider} />

        {/* 2FA */}
        <TouchableOpacity style={styles.groupedRow} onPress={handleOpenTwoFactorModal} activeOpacity={0.7}>
          <View
            style={[
              styles.groupedRowIconWrap,
              { backgroundColor: user?.twoFactorEnabled ? '#ecfdf5' : '#f8fafc' },
            ]}
          >
            <Ionicons
              name="phone-portrait-outline"
              size={20}
              color={user?.twoFactorEnabled ? '#059669' : Colors.textSecondary}
            />
          </View>
          <View style={styles.groupedRowBody}>
            <Text style={styles.groupedRowTitle}>Google Authenticator (2FA)</Text>
            <Text style={styles.groupedRowSubtitle}>
              {user?.twoFactorEnabled ? 'Activado · Códigos TOTP' : 'Protección de inicio de sesión'}
            </Text>
          </View>
          <View
            style={[
              styles.statusPill,
              user?.twoFactorEnabled ? styles.statusPillGreen : styles.statusPillGray,
            ]}
          >
            <Text
              style={[
                styles.statusPillText,
                user?.twoFactorEnabled ? styles.statusPillTextGreen : styles.statusPillTextGray,
              ]}
            >
              {user?.twoFactorEnabled ? 'Activo' : 'Inactivo'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={Colors.textDisabled} />
        </TouchableOpacity>

        <View style={styles.groupedDivider} />

        {/* Correo Electrónico Verificado */}
        <TouchableOpacity
          style={styles.groupedRow}
          onPress={user?.emailVerified ? undefined : handleStartEmailVerification}
          activeOpacity={user?.emailVerified ? 1 : 0.7}
        >
          <View
            style={[
              styles.groupedRowIconWrap,
              { backgroundColor: user?.emailVerified ? '#ecfdf5' : '#fffbeb' },
            ]}
          >
            <Ionicons
              name="mail-outline"
              size={20}
              color={user?.emailVerified ? '#059669' : '#d97706'}
            />
          </View>
          <View style={styles.groupedRowBody}>
            <Text style={styles.groupedRowTitle}>Correo electrónico</Text>
            <Text style={styles.groupedRowSubtitle}>{user?.email}</Text>
          </View>
          <View
            style={[
              styles.statusPill,
              user?.emailVerified ? styles.statusPillGreen : styles.statusPillAmber,
            ]}
          >
            <Text
              style={[
                styles.statusPillText,
                user?.emailVerified ? styles.statusPillTextGreen : styles.statusPillTextAmber,
              ]}
            >
              {user?.emailVerified ? 'Verificado' : 'Verificar'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Próximas Tecnologías */}
      <Text style={[styles.sectionHeaderTitle, { marginTop: Spacing.xl }]}>PRÓXIMAS TECNOLOGÍAS</Text>
      <View style={styles.groupedList}>
        <View style={[styles.groupedRow, { opacity: 0.75 }]}>
          <View style={[styles.groupedRowIconWrap, { backgroundColor: '#f1f5f9' }]}>
            <Ionicons name="finger-print-outline" size={20} color={Colors.textSecondary} />
          </View>
          <View style={styles.groupedRowBody}>
            <Text style={styles.groupedRowTitle}>Biometría & Passkeys</Text>
            <Text style={styles.groupedRowSubtitle}>Acceso instantáneo con huella o Face ID</Text>
          </View>
          <View style={styles.statusPillRoadmap}>
            <Text style={styles.statusPillRoadmapText}>Próximamente</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  // ==============================================================
  // SUB-VISTA 3: DISPOSITIVOS VINCULADOS
  // ==============================================================
  const renderDevicesSubView = () => (
    <ScrollView contentContainerStyle={styles.subViewContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.subViewHeaderDesc}>
        Gestioná los dispositivos donde iniciaste sesión con tu cuenta de Turnos Ya.
      </Text>

      <View style={styles.groupedList}>
        {sessionsLoading ? (
          <View style={{ padding: Spacing.xl, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={{ marginTop: Spacing.xs, color: Colors.textSecondary, fontSize: 13 }}>
              Cargando dispositivos...
            </Text>
          </View>
        ) : sessions.length === 0 ? (
          <View style={{ padding: Spacing.lg, alignItems: 'center' }}>
            <Ionicons name="checkmark-circle-outline" size={32} color="#059669" />
            <Text style={{ marginTop: Spacing.xs, color: Colors.textTitle, fontWeight: '700' }}>
              Sesión actual protegida
            </Text>
            <Text style={{ fontSize: 12, color: Colors.textSecondary, textAlign: 'center', marginTop: 2 }}>
              No hay otras sesiones activas registradas.
            </Text>
          </View>
        ) : (
          sessions.map((s, idx) => {
            const isMobile =
              s.deviceName?.toLowerCase().includes('phone') ||
              s.deviceName?.toLowerCase().includes('android') ||
              s.deviceName?.toLowerCase().includes('ios') ||
              s.deviceName?.toLowerCase().includes('expo');

            return (
              <View key={s.id || idx}>
                {idx > 0 && <View style={styles.groupedDivider} />}
                <View style={styles.groupedRow}>
                  <View style={[styles.groupedRowIconWrap, { backgroundColor: '#f1f5f9' }]}>
                    <Ionicons
                      name={isMobile ? 'phone-portrait-outline' : 'laptop-outline'}
                      size={20}
                      color={s.isCurrent ? Colors.primary : Colors.textSecondary}
                    />
                  </View>
                  <View style={styles.groupedRowBody}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.groupedRowTitle} numberOfLines={1}>
                        {s.deviceName || 'Dispositivo'}
                      </Text>
                      {s.isCurrent && (
                        <View style={styles.currentDevicePill}>
                          <Text style={styles.currentDeviceText}>Este celular</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.groupedRowSubtitle}>
                      {s.ipAddress ? `IP: ${s.ipAddress}` : 'Conexión segura'}
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
          })
        )}
      </View>

      {sessions.some((s) => !s.isCurrent) && (
        <TouchableOpacity
          style={styles.revokeAllSessionsBtn}
          onPress={handleRevokeAllOtherSessions}
          disabled={sessionActionLoading === 'all'}
          activeOpacity={0.8}
        >
          {sessionActionLoading === 'all' ? (
            <ActivityIndicator size="small" color={Colors.danger} />
          ) : (
            <>
              <Ionicons name="power-outline" size={18} color={Colors.danger} />
              <Text style={styles.revokeAllSessionsText}>Cerrar todas las demás sesiones</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </ScrollView>
  );

  // ==============================================================
  // SUB-VISTA 4: NOTIFICACIONES Y ALERTAS
  // ==============================================================
  const renderNotificationsSubView = () => (
    <ScrollView contentContainerStyle={styles.subViewContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.subViewHeaderDesc}>
        Elegí por qué canales querés recibir confirmaciones, cancelaciones y recordatorios de tus turnos.
      </Text>

      <View style={styles.groupedList}>
        <View style={styles.groupedRow}>
          <View style={[styles.groupedRowIconWrap, { backgroundColor: '#e0f2fe' }]}>
            <Ionicons name="mail-outline" size={20} color={Colors.primary} />
          </View>
          <View style={styles.groupedRowBody}>
            <Text style={styles.groupedRowTitle}>Avisos por Correo Electrónico</Text>
            <Text style={styles.groupedRowSubtitle}>
              Comprobantes digitales y modificaciones de agenda
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

        <View style={styles.groupedDivider} />

        <View style={styles.groupedRow}>
          <View style={[styles.groupedRowIconWrap, { backgroundColor: '#ecfdf5' }]}>
            <Ionicons name="logo-whatsapp" size={20} color="#059669" />
          </View>
          <View style={styles.groupedRowBody}>
            <Text style={styles.groupedRowTitle}>Recordatorios por WhatsApp</Text>
            <Text style={styles.groupedRowSubtitle}>
              Aviso automático de cortesía 2 horas antes de tu turno
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
      </View>

      <Text style={[styles.subViewHeaderDesc, { marginTop: Spacing.md, textAlign: 'center' }]}>
        ✓ Los cambios se guardan automáticamente en tu perfil.
      </Text>

      <Text style={[styles.sectionHeaderTitle, { marginTop: Spacing.xl }]}>
        AVISOS POR COMERCIO SEGUIDO ({favoriteBusinesses.length})
      </Text>
      <View style={styles.groupedList}>
        {favoriteBusinesses.length === 0 ? (
          <View style={{ padding: Spacing.lg, alignItems: 'center' }}>
            <Text style={{ fontSize: 12, color: Colors.textSecondary, textAlign: 'center' }}>
              Aún no seguís a ningún comercio. Tocá el corazón ❤️ en tus locales preferidos para recibir sus promos y avisos de feriados.
            </Text>
          </View>
        ) : (
          favoriteBusinesses.map((fav, idx) => (
            <View key={fav.businessId}>
              {idx > 0 && <View style={styles.groupedDivider} />}
              <View style={styles.groupedRow}>
                <View style={styles.groupedRowBody}>
                  <Text style={styles.groupedRowTitle}>
                    {fav.business?.name || `Comercio #${fav.businessId}`}
                  </Text>
                  <Text style={styles.groupedRowSubtitle}>
                    {fav.receiveNotifications
                      ? 'Recibiendo promos y avisos de feriados'
                      : 'Avisos silenciados'}
                  </Text>
                </View>
                <Switch
                  value={Boolean(fav.receiveNotifications)}
                  onValueChange={() => handleToggleFavBizNotif(fav.businessId, fav.receiveNotifications)}
                  trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                  thumbColor={fav.receiveNotifications ? Colors.primary : '#f4f3f4'}
                />
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );

  // ==============================================================
  // SUB-VISTA 4.5: MIS COMERCIOS FAVORITOS
  // ==============================================================
  const renderFavoritesSubView = () => (
    <ScrollView contentContainerStyle={styles.subViewContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.subViewHeaderDesc}>
        Gestioná tus comercios favoritos, entrá a reservar en 1 toque o activá/silenciá sus avisos de promociones y feriados.
      </Text>

      {loadingFavorites ? (
        <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 20 }} />
      ) : favoriteBusinesses.length === 0 ? (
        <Card style={{ padding: Spacing.xl, alignItems: 'center' }}>
          <Ionicons name="heart-outline" size={42} color="#fda4af" />
          <Text style={{ fontWeight: '700', fontSize: 15, color: Colors.textTitle, marginTop: 8 }}>
            Aún no tenés comercios en Favoritos
          </Text>
          <Text style={{ fontSize: 12, color: Colors.textSecondary, textAlign: 'center', marginTop: 4, marginBottom: 14 }}>
            Tocá el corazón ❤️ en cualquier comercio para guardarlo acá y enterarte de sus promociones o cierres por feriado.
          </Text>
          <Button
            title="Explorar Comercios"
            size="sm"
            onPress={() => navigation.navigate('HomeTab')}
          />
        </Card>
      ) : (
        <View style={styles.groupedList}>
          {favoriteBusinesses.map((fav, idx) => (
            <View key={fav.businessId}>
              {idx > 0 && <View style={styles.groupedDivider} />}
              <View style={[styles.groupedRow, { flexWrap: 'wrap', gap: 8 }]}>
                <TouchableOpacity
                  style={{ flex: 1, minWidth: 160 }}
                  onPress={() => navigation.navigate('BusinessDetail', { businessId: fav.businessId })}
                >
                  <Text style={styles.groupedRowTitle}>
                    {fav.business?.name || `Comercio #${fav.businessId}`}
                  </Text>
                  <Text style={styles.groupedRowSubtitle}>
                    {fav.business?.category || 'Servicios'} · {fav.business?.address || 'Ver local'}
                  </Text>
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => handleToggleFavBizNotif(fav.businessId, fav.receiveNotifications)}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: BorderRadius.full,
                      backgroundColor: fav.receiveNotifications ? '#f0f9ff' : '#f8fafc',
                      borderWidth: 1,
                      borderColor: fav.receiveNotifications ? '#bae6fd' : '#cbd5e1',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Ionicons
                      name={fav.receiveNotifications ? 'notifications' : 'notifications-off-outline'}
                      size={13}
                      color={fav.receiveNotifications ? '#0284c7' : '#64748b'}
                    />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: fav.receiveNotifications ? '#0284c7' : '#64748b' }}>
                      {fav.receiveNotifications ? 'Avisos' : 'Silenciado'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleUnfollowFromProfile(fav.businessId)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="heart-dislike-outline" size={18} color="#e11d48" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );

  // ==============================================================
  // SUB-VISTA 5: PRIVACIDAD Y DATOS
  // ==============================================================
  const renderPrivacySubView = () => (
    <ScrollView contentContainerStyle={styles.subViewContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.subViewHeaderDesc}>
        Controlá cómo se comparten tus datos y consultá las normativas de protección de datos personales.
      </Text>

      <Text style={styles.sectionHeaderTitle}>PERMISOS Y VISIBILIDAD</Text>
      <View style={styles.groupedList}>
        <View style={styles.groupedRow}>
          <View style={styles.groupedRowBody}>
            <Text style={styles.groupedRowTitle}>Compartir teléfono con comercios</Text>
            <Text style={styles.groupedRowSubtitle}>
              Permite que el local te llame ante emergencias o cambios
            </Text>
          </View>
          <Switch
            value={privacySharePhone}
            onValueChange={setPrivacySharePhone}
            trackColor={{ false: Colors.border, true: Colors.primaryLight }}
            thumbColor={privacySharePhone ? Colors.primary : '#f4f3f4'}
          />
        </View>

        <View style={styles.groupedDivider} />

        <View style={styles.groupedRow}>
          <View style={styles.groupedRowBody}>
            <Text style={styles.groupedRowTitle}>Novedades y mejoras del servicio</Text>
            <Text style={styles.groupedRowSubtitle}>
              Recibir avisos sobre nuevas funciones de Turnos Ya
            </Text>
          </View>
          <Switch
            value={privacySystemNews}
            onValueChange={setPrivacySystemNews}
            trackColor={{ false: Colors.border, true: Colors.primaryLight }}
            thumbColor={privacySystemNews ? Colors.primary : '#f4f3f4'}
          />
        </View>

        <View style={styles.groupedDivider} />

        <View style={styles.groupedRow}>
          <View style={styles.groupedRowBody}>
            <Text style={styles.groupedRowTitle}>Perfil visible en reservas</Text>
            <Text style={styles.groupedRowSubtitle}>
              Muestra tu nombre al profesional asignado
            </Text>
          </View>
          <Switch
            value={privacyProfilePublic}
            onValueChange={setPrivacyProfilePublic}
            trackColor={{ false: Colors.border, true: Colors.primaryLight }}
            thumbColor={privacyProfilePublic ? Colors.primary : '#f4f3f4'}
          />
        </View>
      </View>

      <Text style={[styles.sectionHeaderTitle, { marginTop: Spacing.xl }]}>
        PROTECCIÓN DE DATOS (LEY 25.326)
      </Text>
      <View style={styles.groupedList}>
        <TouchableOpacity
          style={styles.groupedRow}
          onPress={() => setLegalModalDoc('terms')}
          activeOpacity={0.7}
        >
          <View style={[styles.groupedRowIconWrap, { backgroundColor: Colors.primaryLight }]}>
            <Ionicons name="document-text-outline" size={20} color={Colors.primary} />
          </View>
          <View style={styles.groupedRowBody}>
            <Text style={styles.groupedRowTitle}>Términos y Condiciones Generales</Text>
            <Text style={styles.groupedRowSubtitle}>Políticas y condiciones de uso del servicio</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={Colors.textDisabled} />
        </TouchableOpacity>

        <View style={styles.groupedDivider} />

        <TouchableOpacity
          style={styles.groupedRow}
          onPress={() => setLegalModalDoc('privacy')}
          activeOpacity={0.7}
        >
          <View style={[styles.groupedRowIconWrap, { backgroundColor: '#ecfdf5' }]}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#059669" />
          </View>
          <View style={styles.groupedRowBody}>
            <Text style={styles.groupedRowTitle}>Política de Privacidad (Ley 25.326)</Text>
            <Text style={styles.groupedRowSubtitle}>Tratamiento confidencial de tus datos</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={Colors.textDisabled} />
        </TouchableOpacity>

        <View style={styles.groupedDivider} />

        <TouchableOpacity
          style={styles.groupedRow}
          onPress={() => setLegalModalDoc('cookies')}
          activeOpacity={0.7}
        >
          <View style={[styles.groupedRowIconWrap, { backgroundColor: '#fffbeb' }]}>
            <Ionicons name="cube-outline" size={20} color="#d97706" />
          </View>
          <View style={styles.groupedRowBody}>
            <Text style={styles.groupedRowTitle}>Preferencias de Cookies y Datos Locales</Text>
            <Text style={styles.groupedRowSubtitle}>Almacenamiento seguro en tu dispositivo</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={Colors.textDisabled} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  // ==============================================================
  // SUB-VISTA 6: SERVIDOR Y RED (QA / DESARROLLADOR)
  // ==============================================================
  const renderNetworkSubView = () => (
    <ScrollView contentContainerStyle={styles.subViewContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.subViewHeaderDesc}>
        Ajustá el punto de enlace de la API. Usá la Nube cuando estés conectado a datos móviles (4G/5G).
      </Text>

      <Card style={styles.formCard}>
        <Text style={styles.formSectionTitle}>Servidor Activo</Text>
        <View style={styles.networkStatusRow}>
          <View style={[styles.serverDot, { backgroundColor: isConnectedToCloud ? '#059669' : Colors.primary }]} />
          <Text style={styles.networkStatusText}>
            {isConnectedToCloud ? 'Conectado a la Nube (Render Cloud)' : 'Conectado a PC Local (Wi-Fi)'}
          </Text>
        </View>

        <View style={styles.presetButtonsRow}>
          <TouchableOpacity
            style={[styles.presetBtn, isConnectedToCloud && styles.presetBtnActive]}
            onPress={() => handleSelectServerPreset(CLOUD_API_URL)}
          >
            <Ionicons name="cloud-outline" size={18} color={isConnectedToCloud ? Colors.white : Colors.primary} />
            <Text style={[styles.presetBtnText, isConnectedToCloud && styles.presetBtnTextActive]}>
              Nube (Render)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.presetBtn, !isConnectedToCloud && styles.presetBtnActive]}
            onPress={() => handleSelectServerPreset(LOCAL_LAN_URL)}
          >
            <Ionicons name="laptop-outline" size={18} color={!isConnectedToCloud ? Colors.white : Colors.primary} />
            <Text style={[styles.presetBtnText, !isConnectedToCloud && styles.presetBtnTextActive]}>
              PC Local (Wi-Fi)
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.inputGroup, { marginTop: Spacing.md }]}>
          <Text style={styles.label}>URL personalizada</Text>
          <TextInput
            style={styles.modalInput}
            value={customApiUrl}
            onChangeText={setCustomApiUrl}
            placeholder="http://192.168.1.X:3000/api/v1"
            placeholderTextColor={Colors.textDisabled}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <Button
          title="Guardar URL Personalizada"
          size="md"
          onPress={handleSaveApiUrl}
          style={{ marginTop: Spacing.sm }}
        />
      </Card>
    </ScrollView>
  );

  // ==============================================================
  // VISTA PRINCIPAL: HUB MODULAR
  // ==============================================================
  const renderHubView = () => (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* 1. Tarjeta Hero de Usuario */}
      {user ? (
        <Card style={styles.userCard}>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarInitials}>
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </Text>
          </View>
          <View style={{ flex: 1, marginLeft: Spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={styles.userName} numberOfLines={1}>{user.name}</Text>
              <TouchableOpacity
                style={styles.editProfilePill}
                onPress={() => setActiveSubView('personal_info')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="create-outline" size={14} color={Colors.primary} />
                <Text style={styles.editProfilePillText}>Editar</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.userEmail} numberOfLines={1}>{user.email}</Text>
            {user.phone ? (
              <Text style={styles.userPhone} numberOfLines={1}>📞 {user.phone}</Text>
            ) : (
              <TouchableOpacity onPress={() => setActiveSubView('personal_info')}>
                <Text style={[styles.userPhone, { color: Colors.primary }]}>+ Agregar teléfono</Text>
              </TouchableOpacity>
            )}

            <View style={styles.roleRow}>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>{user.role?.toUpperCase() || 'CLIENTE'}</Text>
              </View>
            </View>
          </View>
        </Card>
      ) : (
        <Card style={styles.guestCard}>
          <Ionicons name="person-circle-outline" size={54} color={Colors.primary} />
          <Text style={styles.guestTitle}>¡Bienvenido a Turnos Ya!</Text>
          <Text style={styles.guestDesc}>
            Iniciá sesión o registrate para gestionar tus turnos y configurar tu cuenta.
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

      {/* 2. Píldora de Estado de Salud de la Cuenta */}
      {user && (
        <TouchableOpacity
          style={[
            styles.healthPillCard,
            user.twoFactorEnabled
              ? styles.healthPillGreen
              : user.emailVerified
              ? styles.healthPillBlue
              : styles.healthPillAmber,
          ]}
          onPress={() => setActiveSubView('security')}
          activeOpacity={0.8}
        >
          <Ionicons
            name={user.twoFactorEnabled ? 'shield-checkmark' : user.emailVerified ? 'shield-half' : 'alert-circle'}
            size={20}
            color={user.twoFactorEnabled ? '#059669' : user.emailVerified ? Colors.primary : '#d97706'}
          />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text
              style={[
                styles.healthPillTitle,
                user.twoFactorEnabled
                  ? styles.healthPillTitleGreen
                  : user.emailVerified
                  ? styles.healthPillTitleBlue
                  : styles.healthPillTitleAmber,
              ]}
            >
              {user.twoFactorEnabled
                ? 'Cuenta Protegida · Doble Factor Activo'
                : user.emailVerified
                ? 'Nivel Estándar · Correo Verificado'
                : 'Atención Requerida · Correo No Verificado'}
            </Text>
            <Text style={styles.healthPillDesc}>
              {user.twoFactorEnabled
                ? 'Tu cuenta tiene la máxima seguridad con Google Authenticator.'
                : user.emailVerified
                ? 'Podés activar Google Authenticator (2FA) para mayor seguridad.'
                : 'Verificá tu correo electrónico para proteger tus turnos.'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={Colors.textDisabled} />
        </TouchableOpacity>
      )}

      {/* 3. Panel de Comercio / Onboarding Contextual */}
      {user && selectedBusiness?.status === 'pending_approval' && (
        <View style={styles.bizStatusCardPending}>
          <View style={styles.bizStatusHeader}>
            <View style={styles.bizStatusIconWrapPending}>
              <Ionicons name="time" size={18} color="#009ee3" />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.bizStatusTitlePending}>Tu negocio está en revisión</Text>
              <Text style={styles.bizStatusDescPending}>
                Estamos evaluando los datos de "{selectedBusiness.name}". Te avisaremos por email.
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.bizStatusDossierBtn}
            onPress={() => setDossierVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="eye-outline" size={15} color="#009ee3" />
            <Text style={styles.bizStatusDossierBtnText}>Ver ficha completa enviada</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 4. Switcher Admin a Modo Dueño */}
      {user && isAdmin && (
        <View style={styles.adminBanner}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <Ionicons name="shield-checkmark" size={16} color={Colors.primary} />
              <Text style={styles.adminBannerTitle}>Modo Administrador</Text>
            </View>
            <Text style={styles.adminBannerDesc}>
              Podés alternar a la vista de Dueño de Comercio para gestionar turnos.
            </Text>
          </View>
          <Button
            title="Ir a Dueño"
            size="sm"
            onPress={() => setRoleMode('owner')}
            style={styles.adminBannerBtn}
          />
        </View>
      )}

      {/* ============================================================== */}
      {/* GRUPO 1: CUENTA Y DATOS                                        */}
      {/* ============================================================== */}
      {user && (
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionHeaderTitle}>CUENTA Y SEGURIDAD</Text>
          <View style={styles.groupedList}>
            {/* Datos Personales */}
            <TouchableOpacity
              style={styles.groupedRow}
              onPress={() => setActiveSubView('personal_info')}
              activeOpacity={0.7}
            >
              <View style={[styles.groupedRowIconWrap, { backgroundColor: '#eff6ff' }]}>
                <Ionicons name="person-outline" size={20} color={Colors.primary} />
              </View>
              <View style={styles.groupedRowBody}>
                <Text style={styles.groupedRowTitle}>Datos Personales</Text>
                <Text style={styles.groupedRowSubtitle}>
                  {user.phone ? `${user.name} · ${user.phone}` : `${user.name} · Sin teléfono`}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textDisabled} />
            </TouchableOpacity>

            <View style={styles.groupedDivider} />

            {/* Seguridad y Acceso */}
            <TouchableOpacity
              style={styles.groupedRow}
              onPress={() => setActiveSubView('security')}
              activeOpacity={0.7}
            >
              <View style={[styles.groupedRowIconWrap, { backgroundColor: '#ecfdf5' }]}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#059669" />
              </View>
              <View style={styles.groupedRowBody}>
                <Text style={styles.groupedRowTitle}>Seguridad y Contraseña</Text>
                <Text style={styles.groupedRowSubtitle}>
                  {user.twoFactorEnabled ? '2FA activo · Máxima protección' : 'Contraseña y doble factor (2FA)'}
                </Text>
              </View>
              <View
                style={[
                  styles.statusPill,
                  user.twoFactorEnabled ? styles.statusPillGreen : styles.statusPillGray,
                ]}
              >
                <Text
                  style={[
                    styles.statusPillText,
                    user.twoFactorEnabled ? styles.statusPillTextGreen : styles.statusPillTextGray,
                  ]}
                >
                  {user.twoFactorEnabled ? '2FA Activo' : 'Básica'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textDisabled} />
            </TouchableOpacity>

            <View style={styles.groupedDivider} />

            {/* Dispositivos vinculados */}
            <TouchableOpacity
              style={styles.groupedRow}
              onPress={() => setActiveSubView('devices')}
              activeOpacity={0.7}
            >
              <View style={[styles.groupedRowIconWrap, { backgroundColor: '#f1f5f9' }]}>
                <Ionicons name="laptop-outline" size={20} color={Colors.textSecondary} />
              </View>
              <View style={styles.groupedRowBody}>
                <Text style={styles.groupedRowTitle}>Dispositivos Vinculados</Text>
                <Text style={styles.groupedRowSubtitle}>
                  {sessions.length > 0
                    ? `${sessions.length} equipo${sessions.length > 1 ? 's' : ''} conectado${sessions.length > 1 ? 's' : ''}`
                    : 'Gestioná tus sesiones abiertas'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textDisabled} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ============================================================== */}
      {/* GRUPO 2: PREFERENCIAS Y PRIVACIDAD                             */}
      {/* ============================================================== */}
      {user && (
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionHeaderTitle}>PREFERENCIAS</Text>
          <View style={styles.groupedList}>
            {/* Mis Comercios Favoritos */}
            <TouchableOpacity
              style={styles.groupedRow}
              onPress={() => {
                loadFavoriteBusinesses();
                setActiveSubView('favorites');
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.groupedRowIconWrap, { backgroundColor: '#fff1f2' }]}>
                <Ionicons name="heart-outline" size={20} color="#e11d48" />
              </View>
              <View style={styles.groupedRowBody}>
                <Text style={styles.groupedRowTitle}>Mis Comercios Favoritos</Text>
                <Text style={styles.groupedRowSubtitle}>
                  {favoriteBusinesses.length > 0
                    ? `${favoriteBusinesses.length} comercio${favoriteBusinesses.length === 1 ? '' : 's'} seguido${favoriteBusinesses.length === 1 ? '' : 's'}`
                    : 'Comercios seguidos y alertas de promociones'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textDisabled} />
            </TouchableOpacity>

            <View style={styles.groupedDivider} />

            {/* Notificaciones */}
            <TouchableOpacity
              style={styles.groupedRow}
              onPress={() => setActiveSubView('notifications')}
              activeOpacity={0.7}
            >
              <View style={[styles.groupedRowIconWrap, { backgroundColor: '#f5f3ff' }]}>
                <Ionicons name="notifications-outline" size={20} color="#7c3aed" />
              </View>
              <View style={styles.groupedRowBody}>
                <Text style={styles.groupedRowTitle}>Notificaciones y Alertas</Text>
                <Text style={styles.groupedRowSubtitle}>
                  {whatsappNotifs && emailNotifs
                    ? 'WhatsApp y correo activos'
                    : whatsappNotifs
                    ? 'Solo WhatsApp activo'
                    : emailNotifs
                    ? 'Solo correo activo'
                    : 'Alertas desactivadas'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textDisabled} />
            </TouchableOpacity>

            <View style={styles.groupedDivider} />

            {/* Privacidad */}
            <TouchableOpacity
              style={styles.groupedRow}
              onPress={() => setActiveSubView('privacy')}
              activeOpacity={0.7}
            >
              <View style={[styles.groupedRowIconWrap, { backgroundColor: '#fffbeb' }]}>
                <Ionicons name="lock-closed-outline" size={20} color="#d97706" />
              </View>
              <View style={styles.groupedRowBody}>
                <Text style={styles.groupedRowTitle}>Privacidad y Legal</Text>
                <Text style={styles.groupedRowSubtitle}>
                  Visibilidad, Ley 25.326 y Términos y Condiciones
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textDisabled} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ============================================================== */}
      {/* GRUPO 3: AYUDA Y SISTEMA                                       */}
      {/* ============================================================== */}
      <View style={styles.sectionWrap}>
        <Text style={styles.sectionHeaderTitle}>AYUDA Y SISTEMA</Text>
        <View style={styles.groupedList}>
          {/* Reporte de bug */}
          <TouchableOpacity
            style={styles.groupedRow}
            onPress={() => setShowBugModal(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.groupedRowIconWrap, { backgroundColor: '#fef2f2' }]}>
              <Ionicons name="bug-outline" size={20} color={Colors.danger} />
            </View>
            <View style={styles.groupedRowBody}>
              <Text style={styles.groupedRowTitle}>Reportar un problema</Text>
              <Text style={styles.groupedRowSubtitle}>
                Avisanos si encontraste un error en la aplicación
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.textDisabled} />
          </TouchableOpacity>

          <View style={styles.groupedDivider} />

          {/* Servidor y red */}
          <TouchableOpacity
            style={styles.groupedRow}
            onPress={() => setActiveSubView('network')}
            activeOpacity={0.7}
          >
            <View style={[styles.groupedRowIconWrap, { backgroundColor: '#f1f5f9' }]}>
              <Ionicons name="server-outline" size={20} color={Colors.primary} />
            </View>
            <View style={styles.groupedRowBody}>
              <Text style={styles.groupedRowTitle}>Servidor y Conexión (QA)</Text>
              <Text style={styles.groupedRowSubtitle}>
                {isConnectedToCloud ? 'Nube (Render)' : 'PC Local Wi-Fi'}
              </Text>
            </View>
            <View style={styles.serverStatusBadge}>
              <View style={[styles.serverDot, { backgroundColor: isConnectedToCloud ? '#059669' : Colors.primary }]} />
              <Text style={styles.serverStatusBadgeText}>
                {isConnectedToCloud ? 'Nube' : 'Local'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.textDisabled} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 5. Cerrar Sesión */}
      {user && (
        <View style={{ marginTop: Spacing.xl, marginBottom: Spacing.lg }}>
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
            <Text style={styles.logoutBtnText}>Cerrar Sesión</Text>
          </TouchableOpacity>

          <Text style={styles.versionFooter}>Turnos Ya Mobile · Versión 1.0.0 (Build 2026)</Text>
        </View>
      )}
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      {/* Barra de navegación superior adaptativa */}
      <View style={styles.navBar}>
        {activeSubView !== 'hub' ? (
          <TouchableOpacity
            style={styles.navBackBtn}
            onPress={() => setActiveSubView('hub')}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="arrow-back" size={22} color={Colors.primary} />
            <Text style={styles.navBackText}>Volver</Text>
          </TouchableOpacity>
        ) : null}

        <Text
          style={[
            styles.navTitle,
            activeSubView !== 'hub' && { textAlign: 'center', flex: 1, marginRight: 40 },
          ]}
          numberOfLines={1}
        >
          {SUBVIEW_TITLES[activeSubView]}
        </Text>
      </View>

      {/* Renderizado de la vista activa */}
      {activeSubView === 'hub' && renderHubView()}
      {activeSubView === 'personal_info' && renderPersonalInfoSubView()}
      {activeSubView === 'security' && renderSecuritySubView()}
      {activeSubView === 'devices' && renderDevicesSubView()}
      {activeSubView === 'notifications' && renderNotificationsSubView()}
      {activeSubView === 'favorites' && renderFavoritesSubView()}
      {activeSubView === 'privacy' && renderPrivacySubView()}
      {activeSubView === 'network' && renderNetworkSubView()}

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

              <View style={styles.modalIconWrap}>
                <Ionicons name="shield-checkmark-outline" size={28} color={Colors.primary} />
              </View>
              <Text style={styles.modalTitle}>Google Authenticator</Text>
              <Text style={styles.modalSubtitle}>
                {twoFactorStep === 'setup'
                  ? 'Configurá tu doble factor de autenticación para proteger tus inicios de sesión.'
                  : twoFactorStep === 'backup_codes'
                  ? 'Guardá estos códigos de respaldo en un lugar seguro.'
                  : 'Ingresá tu contraseña actual para desactivar el doble factor.'}
              </Text>

              {twoFactorError ? (
                <View style={styles.modalErrorBox}>
                  <Ionicons name="alert-circle" size={16} color={Colors.danger} />
                  <Text style={styles.modalErrorText}>{twoFactorError}</Text>
                </View>
              ) : null}

              {twoFactorStep === 'setup' && (
                <View>
                  <Text style={styles.modalDesc}>
                    Copiá la clave secreta y pegala en tu aplicación Google Authenticator o Authy:
                  </Text>

                  <TouchableOpacity
                    style={styles.secretKeyBox}
                    onPress={handleCopySecret}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.secretKeyText} numberOfLines={1}>
                      {twoFactorSecret || 'Cargando clave secreta...'}
                    </Text>
                    <Ionicons
                      name={twoFactorCopied ? 'checkmark' : 'copy-outline'}
                      size={18}
                      color={twoFactorCopied ? '#059669' : Colors.primary}
                    />
                  </TouchableOpacity>

                  <Text style={styles.secretKeyHint}>
                    {twoFactorCopied ? '¡Clave copiada al portapapeles!' : 'Tocá la clave para copiarla'}
                  </Text>

                  <TouchableOpacity
                    onPress={() => handleOpenTwoFactorModal(true)}
                    disabled={twoFactorLoading}
                    style={{ alignItems: 'center', marginBottom: Spacing.sm }}
                  >
                    <Text style={{ fontSize: 12, color: Colors.primary, textDecorationLine: 'underline' }}>
                      ¿Problemas con el código? Generar nueva clave
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Código de 6 dígitos generado por la app</Text>
                    <TextInput
                      style={styles.twoFactorInputBox}
                      placeholder="123456"
                      placeholderTextColor={Colors.textDisabled}
                      value={twoFactorCodeInput}
                      onChangeText={setTwoFactorCodeInput}
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                  </View>

                  <Button
                    title="Verificar y Activar 2FA"
                    size="md"
                    loading={twoFactorLoading}
                    disabled={twoFactorCodeInput.length < 6}
                    onPress={handleVerifyAndEnableTwoFactor}
                    style={{ marginTop: Spacing.md }}
                  />
                </View>
              )}

              {twoFactorStep === 'backup_codes' && (
                <View>
                  <Text style={styles.modalDesc}>
                    Si perdés acceso a tu celular, podés ingresar a tu cuenta con uno de estos códigos:
                  </Text>

                  <View style={styles.backupCodesGrid}>
                    {twoFactorBackupCodes.map((code, idx) => (
                      <View key={idx} style={styles.backupCodePill}>
                        <Text style={styles.backupCodeText}>{code}</Text>
                      </View>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={styles.copyBackupCodesBtn}
                    onPress={handleCopyBackupCodes}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={twoFactorCopied ? 'checkmark' : 'copy-outline'}
                      size={16}
                      color={twoFactorCopied ? '#059669' : Colors.primary}
                    />
                    <Text style={styles.copyBackupCodesText}>
                      {twoFactorCopied ? '¡Códigos copiados!' : 'Copiar todos los códigos'}
                    </Text>
                  </TouchableOpacity>

                  <Button
                    title="Entendido, Guardar"
                    size="md"
                    onPress={() => setShowTwoFactorModal(false)}
                    style={{ marginTop: Spacing.md }}
                  />
                </View>
              )}

              {twoFactorStep === 'disable' && (
                <View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Contraseña Actual</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="••••••••"
                      placeholderTextColor={Colors.textDisabled}
                      value={twoFactorDisablePassword}
                      onChangeText={setTwoFactorDisablePassword}
                      secureTextEntry
                    />
                  </View>

                  <Button
                    title="Desactivar 2FA"
                    variant="danger"
                    size="md"
                    loading={twoFactorLoading}
                    onPress={handleDisableTwoFactor}
                    style={{ marginTop: Spacing.md }}
                  />
                </View>
              )}

              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowTwoFactorModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
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
      {/* MODAL CAMBIO DE CONTRASEÑA SEGURO MULTI-PASO                   */}
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

              <View
                style={[
                  styles.modalIconWrap,
                  passwordChangeStep === 'no_methods' && { backgroundColor: '#fee2e2' },
                ]}
              >
                <Ionicons
                  name={
                    passwordChangeStep === 'no_methods'
                      ? 'shield-outline'
                      : passwordChangeStep === 'choose_method'
                      ? 'shield-checkmark-outline'
                      : passwordChangeStep === 'verify_2fa'
                      ? 'phone-portrait-outline'
                      : passwordChangeStep === 'verify_email'
                      ? 'mail-outline'
                      : 'key-outline'
                  }
                  size={28}
                  color={passwordChangeStep === 'no_methods' ? Colors.danger : Colors.primary}
                />
              </View>

              <Text style={styles.modalTitle}>
                {passwordChangeStep === 'no_methods'
                  ? 'Verificación Requerida'
                  : passwordChangeStep === 'choose_method'
                  ? 'Verificar Identidad'
                  : passwordChangeStep === 'verify_2fa'
                  ? 'Google Authenticator'
                  : passwordChangeStep === 'verify_email'
                  ? 'Verificación por Correo'
                  : 'Nueva Contraseña'}
              </Text>

              <Text style={styles.modalSubtitle}>
                {passwordChangeStep === 'no_methods'
                  ? 'Para proteger tu cuenta, requerimos verificar tu identidad antes de cambiar la contraseña. Actualmente no tienes ningún método de verificación configurado.'
                  : passwordChangeStep === 'choose_method'
                  ? 'Tenés dos métodos de verificación activos. Elegí cuál deseás utilizar para autorizar el cambio:'
                  : passwordChangeStep === 'verify_2fa'
                  ? 'Ingresá el código de 6 dígitos generado por tu app Google Authenticator:'
                  : passwordChangeStep === 'verify_email'
                  ? `Te enviamos un código de 6 dígitos a ${user?.email}. Ingrésalo para continuar:`
                  : 'Ingresá tu contraseña actual y la nueva que deseás utilizar.'}
              </Text>

              {passwordError ? (
                <View style={styles.modalErrorBox}>
                  <Ionicons name="alert-circle" size={16} color={Colors.danger} />
                  <Text style={styles.modalErrorText}>{passwordError}</Text>
                </View>
              ) : null}

              {/* CASO 0: SIN MÉTODOS CONFIGURADOS */}
              {passwordChangeStep === 'no_methods' && (
                <View style={{ marginTop: Spacing.sm }}>
                  <TouchableOpacity
                    style={styles.methodOptionCard}
                    onPress={() => {
                      setShowPasswordModal(false);
                      handleStartEmailVerification();
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.methodIconWrap, { backgroundColor: '#e0f2fe' }]}>
                      <Ionicons name="mail" size={22} color={Colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.methodTitle}>Verificar Correo Electrónico</Text>
                      <Text style={styles.methodDesc}>{user?.email || 'Verificar ahora'}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={Colors.textDisabled} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.methodOptionCard}
                    onPress={() => {
                      setShowPasswordModal(false);
                      handleOpenTwoFactorModal();
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.methodIconWrap, { backgroundColor: '#ecfdf5' }]}>
                      <Ionicons name="shield-checkmark" size={22} color="#059669" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.methodTitle}>Activar Google Authenticator (2FA)</Text>
                      <Text style={styles.methodDesc}>Códigos de máxima seguridad</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={Colors.textDisabled} />
                  </TouchableOpacity>
                </View>
              )}

              {/* CASO 1: SELECCIONAR MÉTODO */}
              {passwordChangeStep === 'choose_method' && (
                <View style={{ marginTop: Spacing.sm }}>
                  <TouchableOpacity
                    style={styles.methodOptionCard}
                    onPress={handleChooseEmailMethod}
                    disabled={passwordLoading}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.methodIconWrap, { backgroundColor: '#e0f2fe' }]}>
                      <Ionicons name="mail" size={22} color={Colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.methodTitle}>Código por Correo Electrónico</Text>
                      <Text style={styles.methodDesc}>Enviar código a {user?.email}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={Colors.textDisabled} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.methodOptionCard}
                    onPress={handleChoose2FAMethod}
                    disabled={passwordLoading}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.methodIconWrap, { backgroundColor: '#ecfdf5' }]}>
                      <Ionicons name="phone-portrait" size={22} color="#059669" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.methodTitle}>Google Authenticator (2FA)</Text>
                      <Text style={styles.methodDesc}>Usar código dinámico de tu app</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={Colors.textDisabled} />
                  </TouchableOpacity>
                </View>
              )}

              {/* CASO 2: VERIFICAR 2FA */}
              {passwordChangeStep === 'verify_2fa' && (
                <View style={{ marginTop: Spacing.sm }}>
                  {user?.emailVerified && user?.twoFactorEnabled && (
                    <TouchableOpacity
                      style={styles.backMethodBtn}
                      onPress={() => setPasswordChangeStep('choose_method')}
                    >
                      <Ionicons name="arrow-back" size={14} color={Colors.primary} />
                      <Text style={styles.backMethodText}>Elegir otro método</Text>
                    </TouchableOpacity>
                  )}

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Código de Google Authenticator</Text>
                    <TextInput
                      style={styles.twoFactorInputBox}
                      placeholder="123456"
                      placeholderTextColor={Colors.textDisabled}
                      value={password2faCode}
                      onChangeText={setPassword2faCode}
                      keyboardType="number-pad"
                      maxLength={8}
                      autoFocus
                    />
                  </View>

                  <Button
                    title="Verificar Identidad"
                    size="md"
                    loading={passwordLoading}
                    disabled={password2faCode.trim().length < 6}
                    onPress={handleVerifyPassword2FACode}
                    style={{ marginTop: Spacing.md }}
                  />
                </View>
              )}

              {/* CASO 3: VERIFICAR EMAIL OTP */}
              {passwordChangeStep === 'verify_email' && (
                <View style={{ marginTop: Spacing.sm }}>
                  {user?.emailVerified && user?.twoFactorEnabled && (
                    <TouchableOpacity
                      style={styles.backMethodBtn}
                      onPress={() => setPasswordChangeStep('choose_method')}
                    >
                      <Ionicons name="arrow-back" size={14} color={Colors.primary} />
                      <Text style={styles.backMethodText}>Elegir otro método</Text>
                    </TouchableOpacity>
                  )}

                  {qaPasswordCode && (
                    <TouchableOpacity
                      style={{
                        backgroundColor: '#f8fafc',
                        borderWidth: 1,
                        borderColor: '#cbd5e1',
                        borderRadius: 8,
                        padding: 8,
                        marginBottom: Spacing.sm,
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                      onPress={() => setPasswordOtpCode(qaPasswordCode)}
                    >
                      <Text style={{ fontSize: Typography.sizes.xs, color: '#334155', fontWeight: 'bold' }}>
                        Modo pruebas: {qaPasswordCode}
                      </Text>
                      <Text style={{ fontSize: Typography.sizes.xs, color: Colors.primary, fontWeight: 'bold' }}>
                        Autocompletar
                      </Text>
                    </TouchableOpacity>
                  )}

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
                    title="Verificar Código"
                    size="md"
                    loading={passwordLoading}
                    disabled={passwordOtpCode.trim().length !== 6}
                    onPress={handleVerifyPasswordEmailCode}
                    style={{ marginTop: Spacing.md }}
                  />

                  <TouchableOpacity
                    style={styles.resendBtn}
                    onPress={handleResendPasswordEmailCode}
                    disabled={passwordLoading}
                  >
                    <Text style={styles.resendBtnText}>¿No te llegó? Reenviar código</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* CASO 4: FORMULARIO DE NUEVA CONTRASEÑA */}
              {passwordChangeStep === 'set_passwords' && (
                <View style={{ marginTop: Spacing.sm }}>
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
                    title="Guardar Nueva Contraseña"
                    size="md"
                    loading={passwordLoading}
                    onPress={handleFinalizePasswordChange}
                    style={{ marginTop: Spacing.md }}
                  />
                </View>
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
      {/* MODAL FICHA COMPLETA DE NEGOCIO                                */}
      {/* ============================================================== */}
      {selectedBusiness && (
        <BusinessDossierModal
          visible={dossierVisible}
          business={selectedBusiness}
          onClose={() => setDossierVisible(false)}
        />
      )}

      {/* ============================================================== */}
      {/* MODAL REPORTE DE BUGS / SOPORTE TÉCNICO                         */}
      {/* ============================================================== */}
      <BugReportModal
        visible={showBugModal}
        onClose={() => setShowBugModal(false)}
      />

      {/* ============================================================== */}
      {/* MODAL LEGAL: TÉRMINOS, PRIVACIDAD (LEY 25.326) Y COOKIES        */}
      {/* ============================================================== */}
      <LegalModal
        visible={Boolean(legalModalDoc)}
        initialDoc={legalModalDoc || 'terms'}
        onClose={() => setLegalModalDoc(null)}
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
    height: 52,
    backgroundColor: Colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  navTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
  },
  navBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingRight: 8,
  },
  navBackText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semiBold,
    color: Colors.primary,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl * 2,
  },
  subViewContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl * 2,
  },
  subViewHeaderDesc: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    lineHeight: 18,
  },
  // User Card
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatarWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#bfdbfe',
  },
  avatarInitials: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.extraBold,
    color: Colors.primary,
  },
  userName: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
    flex: 1,
  },
  userEmail: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  userPhone: {
    fontSize: Typography.sizes.xs,
    color: Colors.textMain,
    marginTop: 2,
    fontWeight: Typography.weights.medium,
  },
  editProfilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  editProfilePillText: {
    fontSize: Typography.sizes.xs,
    color: Colors.primary,
    fontWeight: Typography.weights.semiBold,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: Spacing.sm,
  },
  roleBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  roleText: {
    fontSize: 10,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  // Health Pill Card
  healthPillCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  healthPillGreen: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  healthPillBlue: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  healthPillAmber: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  healthPillTitle: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
  },
  healthPillTitleGreen: { color: '#065f46' },
  healthPillTitleBlue: { color: '#1e40af' },
  healthPillTitleAmber: { color: '#92400e' },
  healthPillDesc: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  // Security Score Card (en sub-vista de seguridad)
  securityScoreCard: {
    backgroundColor: '#ffffff',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  securityScoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  securityScoreTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
  },
  securityScoreDesc: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  // Sections & Grouped Inset Lists
  sectionWrap: {
    marginBottom: Spacing.lg,
  },
  sectionHeaderTitle: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  groupedList: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  groupedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  groupedDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 56,
  },
  groupedRowIconWrap: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  groupedRowBody: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  groupedRowTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semiBold,
    color: Colors.textTitle,
  },
  groupedRowSubtitle: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  groupedActionLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.primary,
    fontWeight: Typography.weights.semiBold,
    marginRight: 4,
  },
  // Status Pills
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    marginRight: 4,
  },
  statusPillGreen: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  statusPillGray: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statusPillAmber: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: Typography.weights.bold,
  },
  statusPillTextGreen: { color: '#059669' },
  statusPillTextGray: { color: Colors.textSecondary },
  statusPillTextAmber: { color: '#d97706' },
  statusPillRoadmap: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statusPillRoadmapText: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: Typography.weights.medium,
  },
  // Server Status Badge
  serverStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 4,
  },
  serverStatusBadgeText: {
    fontSize: 10,
    fontWeight: Typography.weights.bold,
    color: Colors.textMain,
  },
  serverDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  // Subview Forms
  formCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  formSectionTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
    marginBottom: 2,
  },
  formSectionSubtitle: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    lineHeight: 16,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semiBold,
    color: Colors.textTitle,
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 44,
    fontSize: Typography.sizes.sm,
    color: Colors.textMain,
  },
  emailReadOnlyBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  emailReadOnlyText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.weights.medium,
  },
  verifiedInlineTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  verifiedInlineText: {
    fontSize: 10,
    fontWeight: Typography.weights.bold,
    color: '#059669',
  },
  verifyActionTag: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  verifyActionText: {
    fontSize: 11,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
  },
  // Devices & Sessions
  currentDevicePill: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  currentDeviceText: {
    fontSize: 9,
    fontWeight: Typography.weights.bold,
    color: '#059669',
  },
  revokeSessionBtn: {
    padding: 6,
    marginLeft: 6,
  },
  revokeAllSessionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingVertical: 12,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.md,
  },
  revokeAllSessionsText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    color: Colors.danger,
  },
  // Network Subview
  networkStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.md,
  },
  networkStatusText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textTitle,
    fontWeight: Typography.weights.medium,
  },
  presetButtonsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  presetBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  presetBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  presetBtnText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
  },
  presetBtnTextActive: {
    color: Colors.white,
  },
  // Logout & Footer
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#fca5a5',
    paddingVertical: 12,
    borderRadius: BorderRadius.lg,
  },
  logoutBtnText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: Colors.danger,
  },
  versionFooter: {
    fontSize: 11,
    color: Colors.textDisabled,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  // Guest Card
  guestCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    marginBottom: Spacing.md,
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
    marginTop: 4,
    marginBottom: Spacing.lg,
    lineHeight: 18,
  },
  guestActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
  },
  // Business Status Banners
  bizStatusCardPending: {
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  bizStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bizStatusIconWrapPending: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bizStatusTitlePending: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    color: '#0369a1',
  },
  bizStatusDescPending: {
    fontSize: 11,
    color: '#0284c7',
    marginTop: 2,
    lineHeight: 15,
  },
  bizStatusDossierBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: BorderRadius.md,
    paddingVertical: 7,
    marginTop: Spacing.sm,
  },
  bizStatusDossierBtnText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    color: '#0284c7',
  },
  adminBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  adminBannerTitle: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
  },
  adminBannerDesc: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  adminBannerBtn: {
    marginLeft: Spacing.sm,
  },
  // Modals Styling
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  modalCloseBtn: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    zIndex: 10,
    padding: 4,
  },
  modalIconWrap: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    alignSelf: 'center',
  },
  modalTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
    textAlign: 'center',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  modalDesc: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing.sm,
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
  inputWithIcon: {
    position: 'relative',
    justifyContent: 'center',
  },
  modalInputWithIcon: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingRight: 40,
    height: 44,
    fontSize: Typography.sizes.sm,
    color: Colors.textMain,
  },
  twoFactorInputBox: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.md,
    height: 50,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
    textAlign: 'center',
    letterSpacing: 6,
  },
  secretKeyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    marginBottom: 4,
  },
  secretKeyText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
    flex: 1,
    marginRight: Spacing.sm,
  },
  secretKeyHint: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  backupCodesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: Spacing.sm,
    justifyContent: 'center',
  },
  backupCodePill: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 5,
    minWidth: '45%',
    alignItems: 'center',
  },
  backupCodeText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
  },
  copyBackupCodesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    marginVertical: Spacing.xs,
  },
  copyBackupCodesText: {
    fontSize: Typography.sizes.xs,
    color: Colors.primary,
    fontWeight: Typography.weights.semiBold,
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
  methodOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#ffffff',
    marginBottom: Spacing.sm,
  },
  methodIconWrap: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  methodTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: Colors.textMain,
    marginBottom: 2,
  },
  methodDesc: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
  },
  backMethodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.sm,
    alignSelf: 'flex-start',
  },
  backMethodText: {
    fontSize: Typography.sizes.xs,
    color: Colors.primary,
    fontWeight: Typography.weights.semiBold,
  },
  resendBtn: {
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  resendBtnText: {
    fontSize: Typography.sizes.xs,
    color: Colors.primary,
    fontWeight: Typography.weights.semiBold,
  },
});
