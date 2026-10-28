import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import api from '../../services/api';
import { Business, BusinessService, Review } from '../../types';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { AuthRequiredModal } from '../../components/common/AuthRequiredModal';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';

export const BusinessDetailScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { businessId } = route.params;
  const { user } = useAuth();

  const [business, setBusiness] = useState<Business | null>(null);
  const [services, setServices] = useState<BusinessService[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [pendingServiceId, setPendingServiceId] = useState<number | undefined>(undefined);

  useEffect(() => {
    const fetchBusinessData = async () => {
      try {
        const [bRes, sRes, rRes] = await Promise.all([
          api.get(`/businesses/${businessId}`),
          api.get(`/businesses/${businessId}/services`),
          api.get(`/reviews?businessId=${businessId}`).catch(() => ({ data: [] })),
        ]);

        setBusiness(bRes.data);
        const sData = sRes.data?.data ?? sRes.data ?? [];
        setServices(Array.isArray(sData) ? sData : []);

        const rData = rRes.data?.data ?? rRes.data ?? [];
        setReviews(Array.isArray(rData) ? rData : []);
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      {/* Navigation Header */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.textTitle} />
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>
          {business.name}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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
                  <Text style={styles.categoryPillText}>
                    {business.category || 'Servicios'}
                  </Text>
                </View>

                {business.rating ? (
                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={14} color={Colors.star} />
                    <Text style={styles.ratingValue}>
                      {Number(business.rating).toFixed(1)}
                    </Text>
                    {business.reviewCount ? (
                      <Text style={styles.ratingCount}>
                        ({business.reviewCount})
                      </Text>
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
            <Text style={styles.infoText}>{business.address}</Text>
          </View>

          {business.phone ? (
            <View style={styles.infoRow}>
              <Ionicons name="call" size={16} color={Colors.primary} />
              <Text style={styles.infoText}>{business.phone}</Text>
            </View>
          ) : null}
        </Card>

        {/* Services Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Servicios disponibles</Text>
          <Text style={styles.sectionSubtitle}>
            Elegí un servicio para iniciar tu reserva
          </Text>
        </View>

        {services.length === 0 ? (
          <Card style={styles.emptyServicesCard}>
            <Ionicons name="calendar-outline" size={36} color={Colors.textDisabled} />
            <Text style={styles.emptyServicesText}>
              Este comercio aún no tiene servicios cargados.
            </Text>
          </Card>
        ) : (
          services.map((service) => (
            <Card key={service.id} style={styles.serviceCard}>
              <View style={styles.serviceMain}>
                <Text style={styles.serviceName}>{service.name}</Text>
                {service.description ? (
                  <Text style={styles.serviceDescription}>
                    {service.description}
                  </Text>
                ) : null}

                <View style={styles.serviceMeta}>
                  <View style={styles.metaBadge}>
                    <Ionicons name="time-outline" size={14} color={Colors.textSecondary} />
                    <Text style={styles.metaBadgeText}>
                      {service.durationMinutes || 30} min
                    </Text>
                  </View>

                  {service.price !== undefined && service.price !== null ? (
                    <Text style={styles.servicePrice}>
                      ${Number(service.price).toLocaleString('es-AR')}
                    </Text>
                  ) : null}
                </View>
              </View>

              <Button
                title="Reservar"
                size="sm"
                onPress={() => handleBookingPress(service.id)}
              />
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
                  <Text style={styles.reviewerName}>
                    {rev.user?.name || 'Usuario'}
                  </Text>
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
                {rev.comment ? (
                  <Text style={styles.reviewComment}>{rev.comment}</Text>
                ) : null}
              </Card>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Floating CTA if services exist */}
      {services.length > 0 && (
        <View style={styles.bottomBar}>
          <Button
            title="Reservar Turno"
            size="lg"
            onPress={() => handleBookingPress()}
          />
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
    fontSize: Typography.sizes.md + 1,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
    flex: 1,
    textAlign: 'center',
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },
  heroCard: {
    marginBottom: Spacing.lg,
  },
  heroTop: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  heroIconBox: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  heroMain: {
    flex: 1,
  },
  businessName: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.extraBold,
    color: Colors.textTitle,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryPill: {
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  categoryPillText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.weights.medium,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  ratingValue: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    color: '#b45309',
  },
  ratingCount: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
  },
  description: {
    fontSize: Typography.sizes.sm + 1,
    color: Colors.textMain,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  infoText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    flex: 1,
  },
  sectionHeader: {
    marginBottom: Spacing.md,
    marginTop: Spacing.xs,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
  },
  sectionSubtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
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
    marginBottom: 3,
  },
  serviceDescription: {
    fontSize: Typography.sizes.xs + 1,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  serviceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  emptyServicesCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyServicesText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
  },
  reviewsSection: {
    marginTop: Spacing.lg,
  },
  reviewCard: {
    marginTop: Spacing.sm,
    padding: Spacing.md,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  reviewerName: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewComment: {
    fontSize: Typography.sizes.sm,
    color: Colors.textMain,
    lineHeight: 18,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  errorTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
    marginTop: Spacing.sm,
  },
});
