import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import api from '../../services/api';
import { Business, BusinessService, Review, Schedule } from '../../types';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { AuthRequiredModal } from '../../components/common/AuthRequiredModal';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { formatTimeToHHMM } from '../../utils/timeHelper';

const DAY_NAMES = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export const BusinessDetailScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { businessId } = route.params;
  const { user } = useAuth();

  const [business, setBusiness] = useState<Business | null>(null);
  const [services, setServices] = useState<BusinessService[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [pendingServiceId, setPendingServiceId] = useState<number | undefined>(undefined);
  const [copiedCuit, setCopiedCuit] = useState(false);

  useEffect(() => {
    const fetchBusinessData = async () => {
      try {
        const [bRes, sRes, rRes, schRes] = await Promise.all([
          api.get(`/businesses/${businessId}`),
          api.get(`/businesses/${businessId}/services`),
          api.get(`/reviews?businessId=${businessId}`).catch(() => ({ data: [] })),
          api.get(`/businesses/${businessId}/schedules`).catch(() => ({ data: [] })),
        ]);

        setBusiness(bRes.data);
        const sData = sRes.data?.data ?? sRes.data ?? [];
        setServices(Array.isArray(sData) ? sData : []);

        const rData = rRes.data?.data ?? rRes.data ?? [];
        setReviews(Array.isArray(rData) ? rData : []);

        const schData = schRes.data?.data ?? schRes.data ?? [];
        setSchedules(Array.isArray(schData) ? schData : []);
      } catch (err) {
        console.error('Error fetching business detail:', err);
      } finally {
        setLoading(false);
      }
    };

    if (businessId) {
      fetchBusinessData();
    }
  }, [businessId]);

  // Cálculo de si el comercio está abierto en este momento
  const isOpenNow = useMemo(() => {
    if (!schedules || schedules.length === 0) return null;
    const now = new Date();
    const jsDay = now.getDay();
    const todayDayOfWeek = jsDay === 0 ? 7 : jsDay;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const todaySchedules = schedules.filter((s) => s.dayOfWeek === todayDayOfWeek);
    if (todaySchedules.length === 0) return false;

    return todaySchedules.some((s) => {
      const [startH, startM] = formatTimeToHHMM(s.startTime).split(':').map(Number);
      const [endH, endM] = formatTimeToHHMM(s.endTime).split(':').map(Number);
      const startMin = startH * 60 + startM;
      const endMin = endH * 60 + endM;
      return currentMinutes >= startMin && currentMinutes <= endMin;
    });
  }, [schedules]);

  const handleOpenUrl = async (url?: string) => {
    if (!url) return;
    try {
      const target = url.startsWith('http') ? url : `https://${url}`;
      await Linking.openURL(target);
    } catch {
      Alert.alert('Error', 'No se pudo abrir el enlace seleccionado.');
    }
  };

  const handleCopyCuit = async () => {
    if (!business?.cuit) return;
    await Clipboard.setStringAsync(business.cuit);
    setCopiedCuit(true);
    setTimeout(() => setCopiedCuit(false), 2000);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Cargando información del comercio...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!business) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.danger} />
          <Text style={styles.errorTitle}>Comercio no encontrado</Text>
          <Button
            title="Volver"
            variant="outline"
            onPress={() => navigation.goBack()}
            style={{ marginTop: Spacing.md }}
          />
        </View>
      </SafeAreaView>
    );
  }

  const handleBookingPress = (serviceId?: number) => {
    if (!user) {
      setPendingServiceId(serviceId);
      setShowAuthModal(true);
      return;
    }
    navigation.navigate('BookingWizard', {
      businessId: business.id,
      businessName: business.name,
      businessAddress: business.address,
      preselectedServiceId: serviceId,
    });
  };

  const handleModalLogin = () => {
    setShowAuthModal(false);
    navigation.navigate('Login');
  };

  const handleModalRegister = () => {
    setShowAuthModal(false);
    navigation.navigate('Register');
  };

  const nowDay = new Date().getDay();
  const todayDayOfWeek = nowDay === 0 ? 7 : nowDay;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      {/* Navigation Header */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={Colors.textTitle} />
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>
          {business.name}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Business Hero Card */}
        <Card style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroIconBox}>
              <Ionicons name="storefront" size={32} color={Colors.primary} />
            </View>
            <View style={styles.heroMain}>
              <Text style={styles.businessName}>{business.name}</Text>
              <View style={styles.metaRow}>
                <View style={styles.categoryPill}>
                  <Text style={styles.categoryPillText}>{business.category || 'Servicios'}</Text>
                </View>

                {business.rating ? (
                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={14} color={Colors.star} />
                    <Text style={styles.ratingValue}>{Number(business.rating).toFixed(1)}</Text>
                    {business.reviewCount ? (
                      <Text style={styles.ratingCount}>({business.reviewCount})</Text>
                    ) : null}
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          {business.description ? (
            <Text style={styles.description}>{business.description}</Text>
          ) : null}

          <View style={styles.infoRow}>
            <Ionicons name="location" size={16} color={Colors.primary} />
            <Text style={styles.infoText}>
              {business.address}
              {business.city ? `, ${business.city}` : ''}
              {business.province ? `, ${business.province}` : ''}
            </Text>
          </View>

          {business.phone ? (
            <View style={styles.infoRow}>
              <Ionicons name="call" size={16} color={Colors.primary} />
              <Text style={styles.infoText}>{business.phone}</Text>
            </View>
          ) : null}
        </Card>

        {/* Social Proof & Evidences Bar */}
        {(business.instagramUrl ||
          business.facebookUrl ||
          business.googleMapsUrl ||
          business.websiteUrl ||
          business.phone ||
          business.cuit) && (
          <Card style={styles.evidenceCard}>
            <Text style={styles.cardHeaderSmall}>Canales y Redes Oficiales</Text>
            <View style={styles.evidencePillsRow}>
              {business.phone ? (
                <TouchableOpacity
                  style={[styles.evidenceBtn, { backgroundColor: '#dcfce7', borderColor: '#bbf7d0' }]}
                  onPress={() =>
                    handleOpenUrl(
                      `https://wa.me/${business.phone.replace(/\D/g, '')}?text=Hola,%20quisiera%20consultar%20por%20turnos%20en%20${encodeURIComponent(business.name)}`
                    )
                  }
                  activeOpacity={0.7}
                >
                  <Ionicons name="logo-whatsapp" size={14} color="#15803d" />
                  <Text style={[styles.evidenceBtnText, { color: '#15803d' }]}>WhatsApp</Text>
                </TouchableOpacity>
              ) : null}

              {business.instagramUrl ? (
                <TouchableOpacity
                  style={[styles.evidenceBtn, { backgroundColor: '#fff1f2', borderColor: '#fecdd3' }]}
                  onPress={() => handleOpenUrl(business.instagramUrl)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="logo-instagram" size={14} color="#e1306c" />
                  <Text style={[styles.evidenceBtnText, { color: '#e1306c' }]}>Instagram</Text>
                </TouchableOpacity>
              ) : null}

              {business.facebookUrl ? (
                <TouchableOpacity
                  style={[styles.evidenceBtn, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]}
                  onPress={() => handleOpenUrl(business.facebookUrl)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="logo-facebook" size={14} color="#1877f2" />
                  <Text style={[styles.evidenceBtnText, { color: '#1877f2' }]}>Facebook</Text>
                </TouchableOpacity>
              ) : null}

              {business.googleMapsUrl ? (
                <TouchableOpacity
                  style={[styles.evidenceBtn, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}
                  onPress={() => handleOpenUrl(business.googleMapsUrl)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="map-outline" size={14} color="#dc2626" />
                  <Text style={[styles.evidenceBtnText, { color: '#dc2626' }]}>Maps</Text>
                </TouchableOpacity>
              ) : null}

              {business.websiteUrl ? (
                <TouchableOpacity
                  style={[styles.evidenceBtn, { backgroundColor: '#f0f9ff', borderColor: '#bae6fd' }]}
                  onPress={() => handleOpenUrl(business.websiteUrl)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="globe-outline" size={14} color="#0284c7" />
                  <Text style={[styles.evidenceBtnText, { color: '#0284c7' }]}>Web</Text>
                </TouchableOpacity>
              ) : null}

              {business.cuit ? (
                <TouchableOpacity
                  style={[styles.evidenceBtn, { backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }]}
                  onPress={handleCopyCuit}
                  activeOpacity={0.7}
                >
                  <Ionicons name="document-text-outline" size={14} color="#475569" />
                  <Text style={[styles.evidenceBtnText, { color: '#334155' }]}>
                    {copiedCuit ? '✓ CUIT Copiado' : `CUIT: ${business.cuit}`}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </Card>
        )}

        {/* Schedules Card */}
        <Card style={styles.schedulesCard}>
          <View style={styles.schedulesHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="time-outline" size={18} color={Colors.primary} />
              <Text style={styles.cardHeaderTitle}>Horarios de Atención</Text>
            </View>
            {isOpenNow === true && (
              <View style={styles.openNowBadge}>
                <View style={styles.openDot} />
                <Text style={styles.openNowText}>Abierto ahora</Text>
              </View>
            )}
            {isOpenNow === false && (
              <View style={styles.closedNowBadge}>
                <Text style={styles.closedNowText}>Cerrado hoy</Text>
              </View>
            )}
          </View>

          {schedules.length === 0 ? (
            <Text style={styles.noSchedulesText}>
              Este comercio aún no ha cargado sus horarios de atención semanales.
            </Text>
          ) : (
            <View style={styles.daysGrid}>
              {[1, 2, 3, 4, 5, 6, 7].map((d) => {
                const daySchedules = schedules
                  .filter((s) => s.dayOfWeek === d)
                  .sort((a, b) => (a.startTime > b.startTime ? 1 : -1));
                const isTodayDay = d === todayDayOfWeek;

                return (
                  <View
                    key={d}
                    style={[styles.dayCard, isTodayDay && styles.dayCardToday]}
                  >
                    <Text style={[styles.dayCardTitle, isTodayDay && styles.dayCardTitleToday]}>
                      {DAY_NAMES[d]}
                    </Text>
                    {daySchedules.length > 0 ? (
                      daySchedules.map((sch, idx) => (
                        <Text key={idx} style={styles.dayRangeText}>
                          {formatTimeToHHMM(sch.startTime)} - {formatTimeToHHMM(sch.endTime)}
                        </Text>
                      ))
                    ) : (
                      <Text style={styles.dayClosedText}>Cerrado</Text>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </Card>

        {/* Services Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Servicios disponibles</Text>
          <Text style={styles.sectionSubtitle}>Elegí un servicio para iniciar tu reserva</Text>
        </View>

        {services.length === 0 ? (
          <Card style={styles.emptyServicesCard}>
            <Ionicons name="calendar-outline" size={36} color={Colors.textDisabled} />
            <Text style={styles.emptyServicesText}>Este comercio aún no tiene servicios cargados.</Text>
          </Card>
        ) : (
          services.map((service) => (
            <Card key={service.id} style={styles.serviceCard}>
              <View style={styles.serviceMain}>
                <Text style={styles.serviceName}>{service.name}</Text>
                {service.description ? (
                  <Text style={styles.serviceDescription}>{service.description}</Text>
                ) : null}

                <View style={styles.serviceMeta}>
                  <View style={styles.metaBadge}>
                    <Ionicons name="time-outline" size={14} color={Colors.textSecondary} />
                    <Text style={styles.metaBadgeText}>{service.durationMinutes || 30} min</Text>
                  </View>

                  {service.price !== undefined && service.price !== null ? (
                    <Text style={styles.servicePrice}>
                      ${Number(service.price).toLocaleString('es-AR')}
                    </Text>
                  ) : null}
                </View>
              </View>

              <Button title="Reservar" size="sm" onPress={() => handleBookingPress(service.id)} />
            </Card>
          ))
        )}

        {/* Reviews Section */}
        {reviews.length > 0 && (
          <View style={styles.reviewsSection}>
            <Text style={styles.sectionTitle}>Opiniones de clientes</Text>
            {reviews.slice(0, 5).map((rev) => (
              <Card key={rev.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewerName}>{rev.user?.name || 'Usuario'}</Text>
                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Ionicons
                        key={i}
                        name={i <= rev.rating ? 'star' : 'star-outline'}
                        size={13}
                        color={Colors.star}
                      />
                    ))}
                  </View>
                </View>
                {rev.comment ? <Text style={styles.reviewComment}>{rev.comment}</Text> : null}
              </Card>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Floating CTA if services exist */}
      {services.length > 0 && (
        <View style={styles.bottomBar}>
          <Button title="Reservar Turno" size="lg" onPress={() => handleBookingPress()} />
        </View>
      )}

      {/* Modal Requerir Inicio de Sesión */}
      <AuthRequiredModal
        visible={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLogin={handleModalLogin}
        onRegister={handleModalRegister}
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
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
    flex: 1,
    textAlign: 'center',
  },
  scrollContent: {
    padding: Spacing.md,
    gap: Spacing.md,
    paddingBottom: 90,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  loadingText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  errorTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
    marginTop: Spacing.sm,
  },
  heroCard: {
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  heroIconBox: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  heroMain: {
    flex: 1,
  },
  businessName: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: 4,
  },
  categoryPill: {
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  categoryPillText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semiBold,
    color: Colors.textSecondary,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingValue: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
  },
  ratingCount: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
  },
  description: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginTop: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  infoText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textTitle,
    flex: 1,
  },
  evidenceCard: {
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  cardHeaderSmall: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  evidencePillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  evidenceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
  },
  evidenceBtnText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
  },
  schedulesCard: {
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  schedulesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardHeaderTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
  },
  openNowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  openDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16a34a',
  },
  openNowText: {
    fontSize: 10,
    fontWeight: Typography.weights.bold,
    color: '#15803d',
  },
  closedNowBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  closedNowText: {
    fontSize: 10,
    fontWeight: Typography.weights.bold,
    color: '#b91c1c',
  },
  noSchedulesText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textDisabled,
    fontStyle: 'italic',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  dayCard: {
    flex: 1,
    minWidth: '22%',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.xs,
    padding: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dayCardToday: {
    backgroundColor: Colors.surface,
    borderColor: Colors.primary,
  },
  dayCardTitle: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  dayCardTitleToday: {
    color: Colors.primary,
  },
  dayRangeText: {
    fontSize: 9,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
  },
  dayClosedText: {
    fontSize: 9,
    color: Colors.textDisabled,
  },
  sectionHeader: {
    marginTop: Spacing.xs,
  },
  sectionTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
  },
  sectionSubtitle: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  emptyServicesCard: {
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyServicesText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  serviceMain: {
    flex: 1,
    marginRight: Spacing.md,
  },
  serviceName: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
  },
  serviceDescription: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  serviceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaBadgeText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
  },
  servicePrice: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
  },
  reviewsSection: {
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  reviewCard: {
    padding: Spacing.sm,
    gap: 4,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewerName: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewComment: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});
