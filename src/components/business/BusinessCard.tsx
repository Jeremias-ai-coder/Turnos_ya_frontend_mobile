import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../common/Card';
import { Colors, Typography, BorderRadius, Spacing } from '../../constants/theme';
import { Business } from '../../types';
import { formatDistance } from '../../utils/locationHelper';

interface BusinessCardProps {
  business: Business;
  onPress: () => void;
}

export const BusinessCard: React.FC<BusinessCardProps> = ({ business, onPress }) => {
  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.avatarPlaceholder}>
          <Ionicons name="business" size={24} color={Colors.primary} />
        </View>

        <View style={styles.headerInfo}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>
              {business.name}
            </Text>
            {business.rating ? (
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={13} color={Colors.star} />
                <Text style={styles.ratingText}>
                  {Number(business.rating).toFixed(1)}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.badgeRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>
                {business.category || 'General'}
              </Text>
            </View>

            {business.distanceKm !== undefined ? (
              <View style={styles.distanceBadge}>
                <Ionicons name="navigate-outline" size={11} color={Colors.primary} />
                <Text style={styles.distanceText}>
                  {formatDistance(business.distanceKm)}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      <View style={styles.addressRow}>
        <Ionicons name="location-outline" size={15} color={Colors.textSecondary} />
        <Text style={styles.addressText} numberOfLines={1}>
          {business.address}
        </Text>
      </View>

      {business.description ? (
        <Text style={styles.descriptionText} numberOfLines={2}>
          {business.description}
        </Text>
      ) : null}

      <View style={styles.footerRow}>
        <Text style={styles.servicesInfo}>
          {business.services && business.services.length > 0
            ? `${business.services.length} ${
                business.services.length === 1 ? 'servicio' : 'servicios'
              } disponibles`
            : 'Ver servicios y horarios'}
        </Text>
        <View style={styles.actionLink}>
          <Text style={styles.actionText}>Reservar</Text>
          <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  avatarPlaceholder: {
    width: 46,
    height: 46,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  headerInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: Typography.sizes.md + 1,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
    flex: 1,
    marginRight: Spacing.sm,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    gap: 3,
  },
  ratingText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    color: '#b45309',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  categoryBadge: {
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
  },
  categoryText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.weights.medium,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    gap: 3,
  },
  distanceText: {
    fontSize: Typography.sizes.xs,
    color: '#0284c7',
    fontWeight: Typography.weights.bold,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    marginBottom: 6,
  },
  addressText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    flex: 1,
  },
  descriptionText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textMain,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: 4,
  },
  servicesInfo: {
    fontSize: Typography.sizes.xs + 1,
    color: Colors.textSecondary,
  },
  actionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  actionText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
  },
});
