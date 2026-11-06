import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Business } from '../../types';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { Button } from '../common/Button';

interface BusinessDossierModalProps {
  visible: boolean;
  business: Business | null;
  onClose: () => void;
  onEdit?: () => void;
}

export const BusinessDossierModal: React.FC<BusinessDossierModalProps> = ({
  visible,
  business,
  onClose,
  onEdit,
}) => {
  const [copiedCuit, setCopiedCuit] = useState(false);

  if (!business) return null;

  const handleCopyCuit = async () => {
    if (!business.cuit) return;
    await Clipboard.setStringAsync(business.cuit);
    setCopiedCuit(true);
    setTimeout(() => setCopiedCuit(false), 2000);
  };

  const handleOpenUrl = async (url?: string) => {
    if (!url) return;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(url.startsWith('http') ? url : `https://${url}`);
      }
    } catch {
      Alert.alert('Error', 'No se pudo abrir el enlace seleccionado.');
    }
  };

  const bStatus = business.status || 'approved';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <View
                style={[
                  styles.avatarInitial,
                  bStatus === 'pending_approval' && styles.avatarPending,
                  bStatus === 'rejected' && styles.avatarRejected,
                ]}
              >
                <Text style={styles.avatarInitialText}>
                  {(business.name || 'B')[0].toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.businessTitle} numberOfLines={1}>
                  {business.name}
                </Text>
                <View style={styles.badgeRow}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>
                      {business.category || 'General'}
                    </Text>
                  </View>
                  {bStatus === 'pending_approval' && (
                    <View style={styles.statusBadgeWarning}>
                      <Text style={styles.statusBadgeWarningText}>⏳ En Revisión</Text>
                    </View>
                  )}
                  {bStatus === 'approved' && (
                    <View style={styles.statusBadgeSuccess}>
                      <Text style={styles.statusBadgeSuccessText}>✓ Activo</Text>
                    </View>
                  )}
                  {bStatus === 'rejected' && (
                    <View style={styles.statusBadgeDanger}>
                      <Text style={styles.statusBadgeDangerText}>✕ Observado</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Rejection Alert */}
            {bStatus === 'rejected' && (
              <View style={styles.rejectionCard}>
                <Ionicons name="alert-circle" size={20} color={Colors.danger} style={{ marginTop: 2 }} />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.rejectionTitle}>Motivo de la Observación Registrada:</Text>
                  <Text style={styles.rejectionText}>
                    {business.rejectionReason || 'Se requiere verificar la información o evidencias del comercio.'}
                  </Text>
                </View>
              </View>
            )}

            {/* Description */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionLabel}>Descripción del Negocio</Text>
              <Text style={styles.descriptionText}>
                {business.description || 'Sin descripción comercial ingresada.'}
              </Text>
              {business.email ? (
                <View style={styles.emailRow}>
                  <Ionicons name="mail-outline" size={14} color={Colors.primary} />
                  <Text style={styles.emailText}>{business.email}</Text>
                </View>
              ) : null}
            </View>

            {/* Location & Contact */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionLabel}>Ubicación y Contacto</Text>
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={16} color={Colors.primary} />
                <View style={{ flex: 1, marginLeft: 6 }}>
                  <Text style={styles.infoMainText}>{business.address}</Text>
                  {(business.city || business.province) && (
                    <Text style={styles.infoSubText}>
                      {[business.city, business.province].filter(Boolean).join(', ')}
                    </Text>
                  )}
                </View>
              </View>
              {business.phone ? (
                <View style={[styles.infoRow, { marginTop: 8 }]}>
                  <Ionicons name="call-outline" size={16} color={Colors.primary} />
                  <Text style={[styles.infoMainText, { marginLeft: 6 }]}>{business.phone}</Text>
                </View>
              ) : null}
            </View>

            {/* Evidences & Veracity */}
            <View style={styles.evidenceSection}>
              <View style={styles.evidenceHeaderRow}>
                <Text style={styles.evidenceSectionTitle}>Evidencias de Veracidad</Text>
                <View style={styles.verifiedPill}>
                  <Text style={styles.verifiedPillText}>Auditoría</Text>
                </View>
              </View>

              {/* Instagram */}
              <View style={styles.evidenceItem}>
                <View style={styles.evidenceItemTop}>
                  <View style={styles.evidenceItemIconName}>
                    <Ionicons name="logo-instagram" size={16} color="#e1306c" />
                    <Text style={[styles.evidenceName, { color: '#e1306c' }]}>Instagram</Text>
                  </View>
                  {business.instagramUrl ? (
                    <TouchableOpacity
                      onPress={() => handleOpenUrl(business.instagramUrl)}
                      style={styles.openLinkBtn}
                    >
                      <Text style={[styles.openLinkText, { color: '#e1306c' }]}>Abrir ↗</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                <Text style={styles.evidenceValue} numberOfLines={1}>
                  {business.instagramUrl || 'No adjuntado'}
                </Text>
              </View>

              {/* Facebook */}
              <View style={styles.evidenceItem}>
                <View style={styles.evidenceItemTop}>
                  <View style={styles.evidenceItemIconName}>
                    <Ionicons name="logo-facebook" size={16} color="#1877f2" />
                    <Text style={[styles.evidenceName, { color: '#1877f2' }]}>Facebook</Text>
                  </View>
                  {business.facebookUrl ? (
                    <TouchableOpacity
                      onPress={() => handleOpenUrl(business.facebookUrl)}
                      style={styles.openLinkBtn}
                    >
                      <Text style={[styles.openLinkText, { color: '#1877f2' }]}>Abrir ↗</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                <Text style={styles.evidenceValue} numberOfLines={1}>
                  {business.facebookUrl || 'No adjuntado'}
                </Text>
              </View>

              {/* Google Maps */}
              <View style={styles.evidenceItem}>
                <View style={styles.evidenceItemTop}>
                  <View style={styles.evidenceItemIconName}>
                    <Ionicons name="map-outline" size={16} color="#dc2626" />
                    <Text style={[styles.evidenceName, { color: '#dc2626' }]}>Google Maps</Text>
                  </View>
                  {business.googleMapsUrl ? (
                    <TouchableOpacity
                      onPress={() => handleOpenUrl(business.googleMapsUrl)}
                      style={styles.openLinkBtn}
                    >
                      <Text style={[styles.openLinkText, { color: '#dc2626' }]}>Abrir ↗</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                <Text style={styles.evidenceValue} numberOfLines={1}>
                  {business.googleMapsUrl || 'No adjuntado'}
                </Text>
              </View>

              {/* Sitio Web */}
              <View style={styles.evidenceItem}>
                <View style={styles.evidenceItemTop}>
                  <View style={styles.evidenceItemIconName}>
                    <Ionicons name="globe-outline" size={16} color="#0284c7" />
                    <Text style={[styles.evidenceName, { color: '#0284c7' }]}>Sitio Web Oficial</Text>
                  </View>
                  {business.websiteUrl ? (
                    <TouchableOpacity
                      onPress={() => handleOpenUrl(business.websiteUrl)}
                      style={styles.openLinkBtn}
                    >
                      <Text style={[styles.openLinkText, { color: '#0284c7' }]}>Abrir ↗</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                <Text style={styles.evidenceValue} numberOfLines={1}>
                  {business.websiteUrl || 'No adjuntado'}
                </Text>
              </View>

              {/* CUIT */}
              <View style={styles.evidenceItem}>
                <View style={styles.evidenceItemTop}>
                  <View style={styles.evidenceItemIconName}>
                    <Ionicons name="document-text-outline" size={16} color="#475569" />
                    <Text style={[styles.evidenceName, { color: '#334155' }]}>CUIT Tributario</Text>
                  </View>
                  {business.cuit ? (
                    <TouchableOpacity onPress={handleCopyCuit} style={styles.openLinkBtn}>
                      <Text style={[styles.openLinkText, { color: Colors.primary }]}>
                        {copiedCuit ? '✓ Copiado' : 'Copiar'}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                <Text style={[styles.evidenceValue, { fontFamily: 'monospace' }]}>
                  {business.cuit || 'No declarado'}
                </Text>
              </View>
            </View>

            {/* Services */}
            {business.services && business.services.length > 0 && (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionLabel}>
                  Servicios Disponibles ({business.services.length})
                </Text>
                {business.services.map((s) => (
                  <View key={s.id} style={styles.serviceItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.serviceItemName}>{s.name}</Text>
                      <Text style={styles.serviceItemDuration}>⏱ {s.durationMinutes || 30} min</Text>
                    </View>
                    <Text style={styles.serviceItemPrice}>${s.price || 0}</Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.modalFooter}>
            <Button title="Cerrar" variant="outline" onPress={onClose} style={{ flex: 1 }} />
            {onEdit && (
              <Button
                title="Editar Información"
                onPress={() => {
                  onClose();
                  onEdit();
                }}
                style={{ flex: 1, marginLeft: Spacing.sm }}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '90%',
    paddingBottom: Spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.sm,
  },
  avatarInitial: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  avatarPending: {
    backgroundColor: '#fef3c7',
  },
  avatarRejected: {
    backgroundColor: '#fee2e2',
  },
  avatarInitialText: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
  },
  businessTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  categoryBadge: {
    backgroundColor: Colors.background,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  categoryBadgeText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.weights.semiBold,
  },
  statusBadgeWarning: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  statusBadgeWarningText: {
    fontSize: Typography.sizes.xs,
    color: '#b45309',
    fontWeight: Typography.weights.bold,
  },
  statusBadgeSuccess: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  statusBadgeSuccessText: {
    fontSize: Typography.sizes.xs,
    color: '#15803d',
    fontWeight: Typography.weights.bold,
  },
  statusBadgeDanger: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  statusBadgeDangerText: {
    fontSize: Typography.sizes.xs,
    color: '#b91c1c',
    fontWeight: Typography.weights.bold,
  },
  scrollContent: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  rejectionCard: {
    flexDirection: 'row',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
  },
  rejectionTitle: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    color: '#991b1b',
  },
  rejectionText: {
    fontSize: Typography.sizes.xs,
    color: '#b91c1c',
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
  },
  sectionLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textTitle,
    lineHeight: 20,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  emailText: {
    fontSize: Typography.sizes.xs,
    color: Colors.primary,
    fontWeight: Typography.weights.semiBold,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoMainText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semiBold,
    color: Colors.textTitle,
  },
  infoSubText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
  },
  evidenceSection: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  evidenceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  evidenceSectionTitle: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    color: '#1e40af',
    textTransform: 'uppercase',
  },
  verifiedPill: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: BorderRadius.xs,
  },
  verifiedPillText: {
    fontSize: 10,
    color: '#1d4ed8',
    fontWeight: Typography.weights.bold,
  },
  evidenceItem: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    padding: 8,
  },
  evidenceItemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  evidenceItemIconName: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  evidenceName: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
  },
  openLinkBtn: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  openLinkText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
  },
  evidenceValue: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  serviceItemName: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semiBold,
    color: Colors.textTitle,
  },
  serviceItemDuration: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
  },
  serviceItemPrice: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});
