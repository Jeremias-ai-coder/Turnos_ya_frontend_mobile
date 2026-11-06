import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Linking,
  Platform,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';

export type LegalDocType = 'terms' | 'privacy' | 'cookies';

interface LegalModalProps {
  visible: boolean;
  initialDoc?: LegalDocType;
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  visible,
  initialDoc = 'terms',
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<LegalDocType>(initialDoc);

  // Estados de preferencias de cookies / almacenamiento local
  const [analyticsCookies, setAnalyticsCookies] = useState(true);
  const [preferencesCookies, setPreferencesCookies] = useState(true);
  const [savedCookiesToast, setSavedCookiesToast] = useState(false);

  useEffect(() => {
    if (visible) {
      setActiveTab(initialDoc);
      setSavedCookiesToast(false);
    }
  }, [visible, initialDoc]);

  const handleOpenWeb = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    } catch {
      // Ignorar error de Linking si no hay app para abrir
    }
  };

  const handleSaveCookiePreferences = () => {
    setSavedCookiesToast(true);
    setTimeout(() => {
      setSavedCookiesToast(false);
      onClose();
    }, 800);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Cabecera del Modal */}
        <View style={styles.header}>
          <View style={styles.headerTitleWrap}>
            <View
              style={[
                styles.headerIconWrap,
                activeTab === 'privacy' && styles.headerIconWrapGreen,
                activeTab === 'cookies' && styles.headerIconWrapAmber,
              ]}
            >
              <Ionicons
                name={
                  activeTab === 'terms'
                    ? 'document-text'
                    : activeTab === 'privacy'
                    ? 'shield-checkmark'
                    : 'cube-outline'
                }
                size={22}
                color={
                  activeTab === 'privacy'
                    ? '#059669'
                    : activeTab === 'cookies'
                    ? '#d97706'
                    : Colors.primary
                }
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {activeTab === 'terms'
                  ? 'Términos y Condiciones'
                  : activeTab === 'privacy'
                  ? 'Política de Privacidad'
                  : 'Preferencias de Cookies'}
              </Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {activeTab === 'terms'
                  ? 'Condiciones generales de uso y servicio'
                  : activeTab === 'privacy'
                  ? 'Protección de datos personales · Ley 25.326'
                  : 'Almacenamiento local y personalización'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={onClose}
            style={styles.closeBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel="Cerrar legal"
          >
            <Ionicons name="close" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Selector de pestañas */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'terms' && styles.tabItemActive]}
            onPress={() => setActiveTab('terms')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="document-text-outline"
              size={16}
              color={activeTab === 'terms' ? Colors.primary : Colors.textSecondary}
            />
            <Text
              style={[styles.tabItemText, activeTab === 'terms' && styles.tabItemTextActive]}
            >
              Términos
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'privacy' && styles.tabItemActive]}
            onPress={() => setActiveTab('privacy')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={16}
              color={activeTab === 'privacy' ? Colors.primary : Colors.textSecondary}
            />
            <Text
              style={[styles.tabItemText, activeTab === 'privacy' && styles.tabItemTextActive]}
            >
              Privacidad (Ley 25.326)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'cookies' && styles.tabItemActive]}
            onPress={() => setActiveTab('cookies')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="cube-outline"
              size={16}
              color={activeTab === 'cookies' ? Colors.primary : Colors.textSecondary}
            />
            <Text
              style={[styles.tabItemText, activeTab === 'cookies' && styles.tabItemTextActive]}
            >
              Cookies
            </Text>
          </TouchableOpacity>
        </View>

        {/* Contenido Principal con Scroll */}
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
        >
          {/* ============================================================== */}
          {/* PESTAÑA 1: TÉRMINOS Y CONDICIONES GENERALES                   */}
          {/* ============================================================== */}
          {activeTab === 'terms' && (
            <View>
              {/* Callout de Bienvenida */}
              <View style={styles.calloutCard}>
                <Ionicons name="information-circle" size={20} color={Colors.primary} style={{ marginTop: 2 }} />
                <Text style={styles.calloutText}>
                  Bienvenido a <Text style={{ fontWeight: Typography.weights.bold }}>Turnos Ya</Text>. Al utilizar nuestra plataforma web y aplicación móvil, aceptás de manera plena los presentes Términos y Condiciones que rigen la relación entre las personas usuarias, los comercios y Turnos Ya S.R.L.
                </Text>
              </View>

              <Text style={styles.lastUpdatedText}>
                Última actualización: Octubre 2026 · República Argentina
              </Text>

              {/* Sección 1 */}
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>1. Naturaleza del Servicio</Text>
                <Text style={styles.paragraph}>
                  Turnos Ya es una solución de software como servicio (SaaS) que proporciona infraestructura tecnológica para que profesionales independientes, centros estéticos, consultorios, barberías y comercios publiquen sus agendas y permitan a clientes reservar, reprogramar o cancelar turnos en tiempo real.
                </Text>
              </View>

              {/* Sección 2 */}
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>2. Capacidad Legal y Registro de Cuentas</Text>
                <Text style={styles.paragraph}>
                  Para utilizar el servicio de reservas es necesario ser mayor de 18 años o contar con autorización expresa de sus tutores legales. Las personas usuarias se comprometen a suministrar datos verdaderos, exactos y actualizados (nombre, correo electrónico y teléfono). Cada cuenta es personal e intransferible.
                </Text>
              </View>

              {/* Sección 3 */}
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>3. Compromiso de Asistencia y Cancelaciones</Text>
                <Text style={styles.paragraph}>
                  La confirmación de un turno genera un compromiso de asistencia entre el cliente y el comercio prestador. En caso de no poder concurrir, la persona usuaria se compromete a cancelar o reprogramar el turno con una antelación mínima sugerida de al menos 2 horas a través de la sección "Mis Turnos" de la aplicación, liberando así el cupo para otros solicitantes.
                </Text>
              </View>

              {/* Sección 4 */}
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>4. Responsabilidad sobre la Prestación del Servicio</Text>
                <Text style={styles.paragraph}>
                  Turnos Ya actúa exclusivamente como canal tecnológico facilitador de la agenda digital. La prestación efectiva de los servicios presenciales (médicos, estéticos, técnicos, deportivos u otros), su calidad, idoneidad, puntualidad y precios son de exclusiva responsabilidad del comercio o profesional prestador contratado.
                </Text>
              </View>

              {/* Sección 5 */}
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>5. Seguridad de las Credenciales</Text>
                <Text style={styles.paragraph}>
                  El usuario es responsable de resguardar su contraseña y métodos de doble factor de autenticación (2FA). Turnos Ya implementa cifrado simétrico AES-256 para tokens de segundo factor y hashing criptográfico bcrypt para proteger tus credenciales, permitiendo además revocar sesiones remotas en cualquier momento desde el panel de perfil.
                </Text>
              </View>

              {/* Sección 6 */}
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>6. Legislación y Jurisdicción</Text>
                <Text style={styles.paragraph}>
                  Estos términos y condiciones se rigen e interpretan bajo las leyes vigentes de la República Argentina. Ante cualquier controversia, las partes se someten voluntariamente a la competencia de los Tribunales Ordinarios de la Ciudad Autónoma de Buenos Aires, con renuncia a cualquier otro fuero o jurisdicción.
                </Text>
              </View>

              {/* Enlaces de soporte y web */}
              <View style={styles.linkCard}>
                <Text style={styles.linkCardTitle}>¿Querés consultar la versión online?</Text>
                <Text style={styles.linkCardSubtitle}>
                  También podés visualizar estos términos y el marco normativo en nuestro sitio web oficial.
                </Text>
                <TouchableOpacity
                  style={styles.externalLinkBtn}
                  onPress={() => handleOpenWeb('https://turnosya.com/terminos')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="globe-outline" size={16} color={Colors.primary} />
                  <Text style={styles.externalLinkText}>Abrir en navegador (turnosya.com/terminos)</Text>
                  <Ionicons name="open-outline" size={14} color={Colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ============================================================== */}
          {/* PESTAÑA 2: POLÍTICA DE PRIVACIDAD (LEY 25.326)                */}
          {/* ============================================================== */}
          {activeTab === 'privacy' && (
            <View>
              {/* Callout de Privacidad */}
              <View style={[styles.calloutCard, styles.calloutCardGreen]}>
                <Ionicons name="lock-closed" size={20} color="#059669" style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.calloutText, { color: '#065f46', fontWeight: Typography.weights.semiBold }]}>
                    Tu privacidad es sagrada y está respaldada por ley.
                  </Text>
                  <Text style={[styles.calloutText, { color: '#047857', marginTop: 4 }]}>
                    En Turnos Ya no comercializamos ni cedemos tus datos personales a terceros. La información que proporcionás se utiliza con el fin exclusivo de coordinar tus citas de manera ágil y segura.
                  </Text>
                </View>
              </View>

              <View style={styles.badgeBanner}>
                <Ionicons name="shield-checkmark" size={16} color="#059669" />
                <Text style={styles.badgeBannerText}>
                  Cumplimiento estricto de la Ley Nacional 25.326 de Protección de Datos Personales
                </Text>
              </View>

              {/* Sección 1 */}
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>1. Datos Recopilados y Finalidad</Text>
                <Text style={styles.paragraph}>
                  Recolectamos nombre completo, dirección de correo electrónico, número de teléfono de contacto y la información asociada a tus reservas (comercio, servicio seleccionado, fecha y horario). Estos datos tienen como único propósito:
                </Text>
                <View style={styles.bulletList}>
                  <View style={styles.bulletItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#059669" style={{ marginTop: 2 }} />
                    <Text style={styles.bulletText}>Confirmar y coordinar tus reservas en tiempo real.</Text>
                  </View>
                  <View style={styles.bulletItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#059669" style={{ marginTop: 2 }} />
                    <Text style={styles.bulletText}>Enviarte recordatorios útiles y avisos de reprogramación por email o WhatsApp.</Text>
                  </View>
                  <View style={styles.bulletItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#059669" style={{ marginTop: 2 }} />
                    <Text style={styles.bulletText}>Identificación fehaciente al presentarte en el establecimiento.</Text>
                  </View>
                </View>
              </View>

              {/* Sección 2 */}
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>2. Medidas de Seguridad y Ciberseguridad</Text>
                <Text style={styles.paragraph}>
                  Implementamos altos estándares de ciberseguridad en nuestra infraestructura cloud y bases de datos:
                </Text>
                <View style={styles.bulletList}>
                  <View style={styles.bulletItem}>
                    <Ionicons name="shield-outline" size={16} color={Colors.primary} style={{ marginTop: 2 }} />
                    <Text style={styles.bulletText}>Cifrado simétrico AES-256 en reposo para secretos de doble factor (2FA).</Text>
                  </View>
                  <View style={styles.bulletItem}>
                    <Ionicons name="shield-outline" size={16} color={Colors.primary} style={{ marginTop: 2 }} />
                    <Text style={styles.bulletText}>Hashing criptográfico bcrypt con salt aleatorio para contraseñas de acceso.</Text>
                  </View>
                  <View style={styles.bulletItem}>
                    <Ionicons name="shield-outline" size={16} color={Colors.primary} style={{ marginTop: 2 }} />
                    <Text style={styles.bulletText}>Tráfico íntegramente cifrado bajo protocolo HTTPS / TLS de alta seguridad.</Text>
                  </View>
                  <View style={styles.bulletItem}>
                    <Ionicons name="shield-outline" size={16} color={Colors.primary} style={{ marginTop: 2 }} />
                    <Text style={styles.bulletText}>Auditoría de sesiones activas con revocación remota en tiempo real.</Text>
                  </View>
                </View>
              </View>

              {/* Sección 3 */}
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>3. Derechos ARCO (Acceso, Rectificación y Supresión)</Text>
                <Text style={styles.paragraph}>
                  De conformidad con el Artículo 14 de la Ley 25.326, tenés derecho a acceder en forma gratuita a tus datos personales registrados en nuestra base en intervalos no inferiores a seis meses, salvo acreditación de un interés legítimo.
                </Text>
                <Text style={[styles.paragraph, { marginTop: 8 }]}>
                  Podés actualizar tus datos directamente desde tu Perfil o solicitar la supresión definitiva de tu cuenta y registros enviando un correo con asunto "Derechos ARCO" a:
                </Text>
                <TouchableOpacity
                  style={styles.emailPill}
                  onPress={() => handleOpenWeb('mailto:privacidad@turnosya.com')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="mail" size={16} color={Colors.primary} />
                  <Text style={styles.emailPillText}>privacidad@turnosya.com</Text>
                </TouchableOpacity>
              </View>

              {/* Sección 4 */}
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>4. Autoridad de Control en la República Argentina</Text>
                <Text style={styles.paragraph}>
                  La <Text style={{ fontWeight: Typography.weights.semiBold }}>Agencia de Acceso a la Información Pública (AAIP)</Text>, Órgano de Control de la Ley N° 25.326, tiene la atribución de atender las denuncias y reclamos que se interpongan con relación al incumplimiento de las normas sobre protección de datos personales.
                </Text>
              </View>

              {/* Enlace oficial AAIP */}
              <View style={styles.linkCard}>
                <Text style={styles.linkCardTitle}>Canal de Atención Ciudadana</Text>
                <Text style={styles.linkCardSubtitle}>
                  Portal oficial de Protección de Datos Personales del Gobierno Argentino.
                </Text>
                <TouchableOpacity
                  style={styles.externalLinkBtn}
                  onPress={() => handleOpenWeb('https://www.argentina.gob.ar/aaip/datospersonales')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="globe-outline" size={16} color={Colors.primary} />
                  <Text style={styles.externalLinkText}>argentina.gob.ar/aaip/datospersonales</Text>
                  <Ionicons name="open-outline" size={14} color={Colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ============================================================== */}
          {/* PESTAÑA 3: PREFERENCIAS DE COOKIES Y ALMACENAMIENTO LOCAL     */}
          {/* ============================================================== */}
          {activeTab === 'cookies' && (
            <View>
              <View style={[styles.calloutCard, { backgroundColor: '#fffbeb', borderColor: '#fde68a' }]}>
                <Ionicons name="cube" size={20} color="#d97706" style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.calloutText, { color: '#92400e', fontWeight: Typography.weights.semiBold }]}>
                    Almacenamiento Local Seguro
                  </Text>
                  <Text style={[styles.calloutText, { color: '#b45309', marginTop: 4 }]}>
                    En la app móvil utilizamos almacenamiento cifrado en tu dispositivo (AsyncStorage / SecureStore) para mantener tu sesión activa, recordar tus comercios favoritos y garantizar transacciones seguras.
                  </Text>
                </View>
              </View>

              {savedCookiesToast && (
                <View style={styles.toastSuccess}>
                  <Ionicons name="checkmark-circle" size={18} color="#059669" />
                  <Text style={styles.toastSuccessText}>¡Tus preferencias se guardaron exitosamente!</Text>
                </View>
              )}

              {/* 1. Cookies Técnicas y Esenciales */}
              <View style={styles.cookieCard}>
                <View style={styles.cookieCardHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <Text style={styles.cookieTitle}>Almacenamiento Esencial</Text>
                      <View style={styles.alwaysActiveBadge}>
                        <Text style={styles.alwaysActiveBadgeText}>Siempre Activo</Text>
                      </View>
                    </View>
                    <Text style={styles.cookieDesc}>
                      Estrictamente necesario para autenticar tokens JWT, verificar permisos y prevenir ataques de falsificación entre sitios (CSRF). No puede desactivarse.
                    </Text>
                  </View>
                  <Switch
                    value={true}
                    disabled={true}
                    trackColor={{ false: Colors.border, true: '#a7f3d0' }}
                    thumbColor="#059669"
                  />
                </View>
              </View>

              {/* 2. Métricas y Rendimiento */}
              <View style={styles.cookieCard}>
                <View style={styles.cookieCardHeader}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.cookieTitle}>Métricas y Rendimiento</Text>
                    <Text style={styles.cookieDesc}>
                      Nos permite recopilar datos de telemetría de forma 100% anónima para detectar fallos de conexión, pantallas lentas y optimizar la velocidad del sistema.
                    </Text>
                  </View>
                  <Switch
                    value={analyticsCookies}
                    onValueChange={setAnalyticsCookies}
                    trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                    thumbColor={analyticsCookies ? Colors.primary : '#f4f3f4'}
                  />
                </View>
              </View>

              {/* 3. Personalización y Preferencias */}
              <View style={styles.cookieCard}>
                <View style={styles.cookieCardHeader}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.cookieTitle}>Preferencias y Favoritos</Text>
                    <Text style={styles.cookieDesc}>
                      Guarda tus filtros de búsqueda preferidos, comercios visitados recientemente y recordatorios configurados para ofrecerte una experiencia a medida.
                    </Text>
                  </View>
                  <Switch
                    value={preferencesCookies}
                    onValueChange={setPreferencesCookies}
                    trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                    thumbColor={preferencesCookies ? Colors.primary : '#f4f3f4'}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.saveCookiesBtn}
                onPress={handleSaveCookiePreferences}
                activeOpacity={0.8}
              >
                <Ionicons name="save-outline" size={18} color="#ffffff" />
                <Text style={styles.saveCookiesBtnText}>Guardar Preferencias Locales</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: Spacing.xxl }} />
        </ScrollView>

        {/* Barra Inferior Fija de Aceptación */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.primaryDismissBtn}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryDismissBtnText}>Entendido y de acuerdo</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'android' ? Spacing.lg : Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.md,
    gap: 12,
  },
  headerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconWrapGreen: {
    backgroundColor: '#ecfdf5',
  },
  headerIconWrapAmber: {
    backgroundColor: '#fffbeb',
  },
  headerTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
  },
  headerSubtitle: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 8,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.md,
    backgroundColor: 'transparent',
  },
  tabItemActive: {
    backgroundColor: Colors.primaryLight,
  },
  tabItemText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.textSecondary,
  },
  tabItemTextActive: {
    color: Colors.primary,
    fontWeight: Typography.weights.bold,
  },
  scrollArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  calloutCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  calloutCardGreen: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  calloutText: {
    flex: 1,
    fontSize: Typography.sizes.sm,
    color: '#0369a1',
    lineHeight: 20,
  },
  lastUpdatedText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textDisabled,
    marginBottom: Spacing.md,
  },
  sectionBlock: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.subtle,
  },
  sectionTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
    marginBottom: Spacing.xs,
  },
  paragraph: {
    fontSize: Typography.sizes.sm,
    color: Colors.textMain,
    lineHeight: 21,
  },
  bulletList: {
    marginTop: Spacing.sm,
    gap: 8,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bulletText: {
    flex: 1,
    fontSize: Typography.sizes.sm,
    color: Colors.textMain,
    lineHeight: 20,
  },
  badgeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: Spacing.md,
  },
  badgeBannerText: {
    flex: 1,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semiBold,
    color: '#065f46',
  },
  emailPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    marginTop: 8,
  },
  emailPillText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semiBold,
    color: Colors.primary,
  },
  linkCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  linkCardTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
    marginBottom: 4,
  },
  linkCardSubtitle: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  externalLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryLight,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.md,
    alignSelf: 'flex-start',
  },
  externalLinkText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semiBold,
    color: Colors.primary,
  },
  cookieCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.subtle,
  },
  cookieCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  cookieTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
  },
  cookieDesc: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginTop: 4,
  },
  alwaysActiveBadge: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  alwaysActiveBadgeText: {
    fontSize: 10,
    fontWeight: Typography.weights.bold,
    color: '#059669',
  },
  saveCookiesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
    ...Shadows.subtle,
  },
  saveCookiesBtnText: {
    color: '#ffffff',
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
  toastSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  toastSuccessText: {
    color: '#065f46',
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  bottomBar: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  primaryDismissBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.subtle,
  },
  primaryDismissBtnText: {
    color: '#ffffff',
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
});

