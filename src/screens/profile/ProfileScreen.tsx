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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { STORAGE_KEYS, getAutoDetectedBaseUrl } from '../../services/api';

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, logout } = useAuth();

  const [emailNotifs, setEmailNotifs] = useState(user?.emailNotifications ?? true);
  const [whatsappNotifs, setWhatsappNotifs] = useState(
    user?.whatsappNotifications ?? false
  );
  const [customApiUrl, setCustomApiUrl] = useState('');
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.API_URL).then((val) => {
      if (val && !val.includes('172.27.') && !val.includes('localhost') && !val.includes('10.0.2.2')) {
        setCustomApiUrl(val);
      } else {
        setCustomApiUrl(getAutoDetectedBaseUrl());
      }
    });
  }, []);

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

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que deseás cerrar tu sesión?',
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
              {user.phone ? (
                <Text style={styles.userPhone}>{user.phone}</Text>
              ) : null}
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>{user.role || 'CLIENTE'}</Text>
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
                onValueChange={setEmailNotifs}
                trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                thumbColor={emailNotifs ? Colors.primary : '#f4f3f4'}
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
                onValueChange={setWhatsappNotifs}
                trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                thumbColor={whatsappNotifs ? Colors.primary : '#f4f3f4'}
              />
            </View>
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
  roleBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  roleText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
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
  settingLabel: {
    fontSize: Typography.sizes.sm + 1,
    fontWeight: Typography.weights.semiBold,
    color: Colors.textTitle,
  },
  settingDesc: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
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
});
