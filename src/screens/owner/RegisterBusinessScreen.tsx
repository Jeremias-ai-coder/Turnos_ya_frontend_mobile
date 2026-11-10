import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import api from '../../services/api';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import { useOwner } from '../../context/OwnerContext';

const CATEGORIES = [
  { name: 'Peluquería', icon: 'cut-outline' },
  { name: 'Estética', icon: 'sparkles-outline' },
  { name: 'Salud', icon: 'medkit-outline' },
  { name: 'Deportes', icon: 'football-outline' },
  { name: 'Trámites', icon: 'document-text-outline' },
  { name: 'Mascotas', icon: 'paw-outline' },
  { name: 'Gastronomía', icon: 'restaurant-outline' },
  { name: 'Educación', icon: 'school-outline' },
  { name: 'Automotor', icon: 'car-outline' },
  { name: 'Otros', icon: 'briefcase-outline' },
];

export const RegisterBusinessScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const { refreshBusinesses } = useOwner();

  const editingBusiness = route.params?.business;
  const isEditing = !!editingBusiness;

  // Wizard state
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Identidad
  const [name, setName] = useState(editingBusiness?.name || '');
  const [category, setCategory] = useState(editingBusiness?.category || 'Peluquería');
  const [email, setEmail] = useState(editingBusiness?.email || user?.email || '');
  const [description, setDescription] = useState(editingBusiness?.description || '');

  // Step 2: Ubicación & Contacto
  const [address, setAddress] = useState(editingBusiness?.address || '');
  const [city, setCity] = useState(editingBusiness?.city || '');
  const [province, setProvince] = useState(editingBusiness?.province || '');
  const [phone, setPhone] = useState(editingBusiness?.phone || user?.phone || '');

  // Step 3: Evidencias de Veracidad
  const [instagram, setInstagram] = useState(editingBusiness?.instagramUrl || '');
  const [facebook, setFacebook] = useState(editingBusiness?.facebookUrl || '');
  const [googleMaps, setGoogleMaps] = useState(editingBusiness?.googleMapsUrl || '');
  const [website, setWebsite] = useState(editingBusiness?.websiteUrl || '');
  const [cuit, setCuit] = useState(editingBusiness?.cuit || '');

  const formatInstagramUrl = (val: string): string => {
    const clean = val.trim();
    if (!clean) return '';
    if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;
    const handle = clean.replace(/^@/, '');
    return `https://instagram.com/${handle}`;
  };

  const handleTestUrl = async (url: string) => {
    if (!url.trim()) return;
    try {
      const target = url.startsWith('http') ? url : `https://${url}`;
      await Linking.openURL(target);
    } catch {
      Alert.alert('Enlace inválido', 'No se pudo abrir el enlace ingresado.');
    }
  };

  const validateStep1 = () => {
    if (!name.trim()) {
      Alert.alert('Campo requerido', 'Por favor ingresá el nombre del negocio.');
      return false;
    }
    if (!category.trim()) {
      Alert.alert('Campo requerido', 'Por favor seleccioná una categoría.');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!address.trim()) {
      Alert.alert('Campo requerido', 'Por favor ingresá la dirección física.');
      return false;
    }
    if (!phone.trim()) {
      Alert.alert('Campo requerido', 'Por favor ingresá un teléfono o WhatsApp de contacto.');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        category: category.trim(),
        description: description.trim() || undefined,
        address: address.trim(),
        city: city.trim() || undefined,
        province: province.trim() || undefined,
        phone: phone.trim(),
        email: email.trim() || undefined,
        instagramUrl: formatInstagramUrl(instagram) || undefined,
        facebookUrl: facebook.trim() || undefined,
        googleMapsUrl: googleMaps.trim() || undefined,
        websiteUrl: website.trim() || undefined,
        cuit: cuit.trim() || undefined,
      };

      if (isEditing) {
        await api.put(`/businesses/${editingBusiness.id}`, payload);
        Alert.alert(
          'Solicitud Actualizada',
          'Tu negocio fue modificado y reenviado para la revisión de administración.',
          [{ text: 'Entendido', onPress: () => navigation.goBack() }]
        );
      } else {
        await api.post('/businesses', payload);
        Alert.alert(
          '¡Solicitud Enviada con Éxito!',
          'Tu negocio fue registrado y ha ingresado al proceso de revisión por parte del equipo de Turnos Ya. Podrás ver su estado en tu panel.',
          [{ text: 'Entendido', onPress: () => navigation.goBack() }]
        );
      }

      await refreshBusinesses();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Ocurrió un error al procesar tu solicitud.';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* Navigation Bar */}
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.textTitle} />
          </TouchableOpacity>
          <Text style={styles.navTitle}>
            {isEditing ? 'Editar Negocio' : 'Registrar mi Negocio'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Progress Bar Fluida */}
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${(step / 4) * 100}%` }]} />
        </View>

        {/* Step Indicator Header Moderno */}
        <View style={styles.stepHeaderBar}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>PASO {step} DE 4</Text>
          </View>
          <Text style={styles.stepCurrentTitle}>
            {step === 1 ? 'Identidad Comercial' : step === 2 ? 'Ubicación & Contacto' : step === 3 ? 'Evidencias Oficiales' : 'Ficha de Previsualización'}
          </Text>
          <View style={styles.stepDotsRow}>
            {[1, 2, 3, 4].map((s) => (
              <View
                key={s}
                style={[
                  styles.stepDot,
                  step === s && styles.stepDotActive,
                  step > s && styles.stepDotCompleted,
                ]}
              />
            ))}
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* PASO 1: IDENTIDAD */}
          {step === 1 && (
            <View style={styles.stepContainer}>
              <View style={styles.stepHeaderGroup}>
                <View style={styles.stepHeaderIconBox}>
                  <Ionicons name="business" size={20} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepHeading}>Identidad de tu Negocio</Text>
                  <Text style={styles.stepSubheading}>
                    Completá el nombre, rubro oficial y cómo presentás tu comercio ante los clientes.
                  </Text>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Nombre Comercial *</Text>
                <View style={styles.inputWithIcon}>
                  <Ionicons name="business-outline" size={18} color={Colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.inputInside}
                    placeholder="Ej: Barbería Premium, Estética Glow..."
                    placeholderTextColor={Colors.textDisabled}
                    value={name}
                    onChangeText={setName}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Categoría Oficial *</Text>
                <View style={styles.categoryGrid}>
                  {CATEGORIES.map((cat) => {
                    const isSelected = category === cat.name;
                    return (
                      <TouchableOpacity
                        key={cat.name}
                        style={[
                          styles.categoryCard,
                          isSelected && styles.categoryCardSelected,
                        ]}
                        onPress={() => setCategory(cat.name)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={cat.icon as any}
                          size={16}
                          color={isSelected ? Colors.primary : Colors.textSecondary}
                        />
                        <Text
                          style={[
                            styles.categoryCardText,
                            isSelected && styles.categoryCardTextSelected,
                          ]}
                        >
                          {isSelected ? `✓ ${cat.name}` : cat.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Email Comercial</Text>
                <View style={styles.inputWithIcon}>
                  <Ionicons name="mail-outline" size={18} color={Colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.inputInside}
                    placeholder="contacto@tunegocio.com"
                    placeholderTextColor={Colors.textDisabled}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.label}>Descripción de Servicios</Text>
                  <Text style={styles.charCountText}>{description.length}/500</Text>
                </View>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Describí los servicios principales, comodidades y especialidad de tu local..."
                  placeholderTextColor={Colors.textDisabled}
                  multiline
                  numberOfLines={4}
                  maxLength={500}
                  value={description}
                  onChangeText={setDescription}
                />
              </View>

              <Button
                title="Siguiente: Ubicación →"
                size="lg"
                onPress={() => {
                  if (validateStep1()) setStep(2);
                }}
                style={{ marginTop: Spacing.md }}
              />
            </View>
          )}

          {/* PASO 2: UBICACIÓN Y CONTACTO */}
          {step === 2 && (
            <View style={styles.stepContainer}>
              <View style={styles.stepHeaderGroup}>
                <View style={[styles.stepHeaderIconBox, { backgroundColor: '#dcfce7' }]}>
                  <Ionicons name="location" size={20} color="#16a34a" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepHeading}>Ubicación y Contacto</Text>
                  <Text style={styles.stepSubheading}>
                    Donde concurren tus clientes y el teléfono para coordinar reservas y avisos.
                  </Text>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Dirección Física Completa *</Text>
                <View style={styles.inputWithIcon}>
                  <Ionicons name="location-outline" size={18} color={Colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.inputInside}
                    placeholder="Ej: Av. Santa Fe 3250, Piso 1 Local 4"
                    placeholderTextColor={Colors.textDisabled}
                    value={address}
                    onChangeText={setAddress}
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1, marginRight: Spacing.sm }]}>
                  <Text style={styles.label}>Ciudad / Localidad</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ej: CABA, Crespo..."
                    placeholderTextColor={Colors.textDisabled}
                    value={city}
                    onChangeText={setCity}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Provincia</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ej: Buenos Aires, Entre Ríos"
                    placeholderTextColor={Colors.textDisabled}
                    value={province}
                    onChangeText={setProvince}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Teléfono o WhatsApp de Contacto *</Text>
                <View style={styles.inputWithIcon}>
                  <Ionicons name="logo-whatsapp" size={18} color="#16a34a" style={styles.inputIcon} />
                  <TextInput
                    style={styles.inputInside}
                    placeholder="Ej: +54 9 11 1234-5678"
                    placeholderTextColor={Colors.textDisabled}
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                  />
                </View>
              </View>

              <View style={styles.buttonRow}>
                <Button
                  title="← Volver"
                  variant="outline"
                  onPress={() => setStep(1)}
                  style={{ flex: 1, marginRight: Spacing.sm }}
                />
                <Button
                  title="Siguiente: Evidencias →"
                  onPress={() => {
                    if (validateStep2()) setStep(3);
                  }}
                  style={{ flex: 1.5 }}
                />
              </View>
            </View>
          )}

          {/* PASO 3: EVIDENCIAS DE VERACIDAD */}
          {step === 3 && (
            <View style={styles.stepContainer}>
              <View style={styles.stepHeaderGroup}>
                <View style={[styles.stepHeaderIconBox, { backgroundColor: '#fef3c7' }]}>
                  <Ionicons name="shield-checkmark" size={20} color="#b45309" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepHeading}>Evidencias de Veracidad</Text>
                  <Text style={styles.stepSubheading}>
                    Para garantizar la seguridad de la comunidad, la administración corrobora las redes o ficha de cada local antes de activarlo.
                  </Text>
                </View>
              </View>

              {/* Instagram Card con Estado */}
              <View style={styles.evidenceInputCard}>
                <View style={styles.evidenceCardHeader}>
                  <View style={styles.evidenceIconTitle}>
                    <View style={[styles.evidenceIconCircle, { backgroundColor: '#fce7f3' }]}>
                      <Ionicons name="logo-instagram" size={15} color="#e1306c" />
                    </View>
                    <Text style={[styles.evidenceCardTitle, { color: '#e1306c' }]}>Instagram</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {instagram.trim().length > 0 ? (
                      <>
                        <TouchableOpacity onPress={() => handleTestUrl(formatInstagramUrl(instagram))}>
                          <Text style={[styles.testLinkText, { color: '#e1306c' }]}>Probar link ↗</Text>
                        </TouchableOpacity>
                        <View style={styles.statusChipSuccess}>
                          <Text style={styles.statusChipSuccessText}>✓ Cargado</Text>
                        </View>
                      </>
                    ) : (
                      <View style={styles.statusChipPending}>
                        <Text style={styles.statusChipPendingText}>Opcional</Text>
                      </View>
                    )}
                  </View>
                </View>
                <TextInput
                  style={styles.inputClean}
                  placeholder="@tu_comercio o https://instagram.com/tu_comercio"
                  placeholderTextColor={Colors.textDisabled}
                  autoCapitalize="none"
                  value={instagram}
                  onChangeText={setInstagram}
                />
              </View>

              {/* Facebook Card con Estado */}
              <View style={styles.evidenceInputCard}>
                <View style={styles.evidenceCardHeader}>
                  <View style={styles.evidenceIconTitle}>
                    <View style={[styles.evidenceIconCircle, { backgroundColor: '#eff6ff' }]}>
                      <Ionicons name="logo-facebook" size={15} color="#1877f2" />
                    </View>
                    <Text style={[styles.evidenceCardTitle, { color: '#1877f2' }]}>Facebook</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {facebook.trim().length > 0 ? (
                      <>
                        <TouchableOpacity onPress={() => handleTestUrl(facebook)}>
                          <Text style={[styles.testLinkText, { color: '#1877f2' }]}>Probar link ↗</Text>
                        </TouchableOpacity>
                        <View style={styles.statusChipSuccess}>
                          <Text style={styles.statusChipSuccessText}>✓ Cargado</Text>
                        </View>
                      </>
                    ) : (
                      <View style={styles.statusChipPending}>
                        <Text style={styles.statusChipPendingText}>Opcional</Text>
                      </View>
                    )}
                  </View>
                </View>
                <TextInput
                  style={styles.inputClean}
                  placeholder="https://facebook.com/tu_negocio"
                  placeholderTextColor={Colors.textDisabled}
                  autoCapitalize="none"
                  value={facebook}
                  onChangeText={setFacebook}
                />
              </View>

              {/* Google Maps Card con Estado */}
              <View style={styles.evidenceInputCard}>
                <View style={styles.evidenceCardHeader}>
                  <View style={styles.evidenceIconTitle}>
                    <View style={[styles.evidenceIconCircle, { backgroundColor: '#fee2e2' }]}>
                      <Ionicons name="map" size={15} color="#dc2626" />
                    </View>
                    <Text style={[styles.evidenceCardTitle, { color: '#dc2626' }]}>Google Maps</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {googleMaps.trim().length > 0 ? (
                      <>
                        <TouchableOpacity onPress={() => handleTestUrl(googleMaps)}>
                          <Text style={[styles.testLinkText, { color: '#dc2626' }]}>Probar link ↗</Text>
                        </TouchableOpacity>
                        <View style={styles.statusChipSuccess}>
                          <Text style={styles.statusChipSuccessText}>✓ Cargado</Text>
                        </View>
                      </>
                    ) : (
                      <View style={styles.statusChipPending}>
                        <Text style={styles.statusChipPendingText}>Opcional</Text>
                      </View>
                    )}
                  </View>
                </View>
                <TextInput
                  style={styles.inputClean}
                  placeholder="https://maps.app.goo.gl/... o enlace del local"
                  placeholderTextColor={Colors.textDisabled}
                  autoCapitalize="none"
                  value={googleMaps}
                  onChangeText={setGoogleMaps}
                />
              </View>

              {/* Sitio Web Oficial Card con Estado */}
              <View style={styles.evidenceInputCard}>
                <View style={styles.evidenceCardHeader}>
                  <View style={styles.evidenceIconTitle}>
                    <View style={[styles.evidenceIconCircle, { backgroundColor: '#e0f2fe' }]}>
                      <Ionicons name="globe" size={15} color="#0284c7" />
                    </View>
                    <Text style={[styles.evidenceCardTitle, { color: '#0284c7' }]}>Sitio Web Oficial</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {website.trim().length > 0 ? (
                      <>
                        <TouchableOpacity onPress={() => handleTestUrl(website)}>
                          <Text style={[styles.testLinkText, { color: '#0284c7' }]}>Probar link ↗</Text>
                        </TouchableOpacity>
                        <View style={styles.statusChipSuccess}>
                          <Text style={styles.statusChipSuccessText}>✓ Cargado</Text>
                        </View>
                      </>
                    ) : (
                      <View style={styles.statusChipPending}>
                        <Text style={styles.statusChipPendingText}>Opcional</Text>
                      </View>
                    )}
                  </View>
                </View>
                <TextInput
                  style={styles.inputClean}
                  placeholder="https://www.tunegocio.com"
                  placeholderTextColor={Colors.textDisabled}
                  autoCapitalize="none"
                  value={website}
                  onChangeText={setWebsite}
                />
              </View>

              {/* CUIT */}
              <View style={styles.evidenceInputCard}>
                <View style={styles.evidenceCardHeader}>
                  <View style={styles.evidenceIconTitle}>
                    <View style={[styles.evidenceIconCircle, { backgroundColor: '#f1f5f9' }]}>
                      <Ionicons name="document-text" size={15} color="#475569" />
                    </View>
                    <Text style={[styles.evidenceCardTitle, { color: '#334155' }]}>CUIT Tributario (Opcional)</Text>
                  </View>
                  {cuit.trim().length > 0 ? (
                    <View style={styles.statusChipSuccess}>
                      <Text style={styles.statusChipSuccessText}>✓ Ingresado</Text>
                    </View>
                  ) : (
                    <View style={styles.statusChipPending}>
                      <Text style={styles.statusChipPendingText}>Opcional</Text>
                    </View>
                  )}
                </View>
                <TextInput
                  style={styles.inputClean}
                  placeholder="Ej: 20-12345678-9 o 11 dígitos numéricos"
                  placeholderTextColor={Colors.textDisabled}
                  keyboardType="numeric"
                  value={cuit}
                  onChangeText={setCuit}
                />
              </View>

              <View style={styles.buttonRow}>
                <Button
                  title="← Volver"
                  variant="outline"
                  onPress={() => setStep(2)}
                  style={{ flex: 1, marginRight: Spacing.sm }}
                />
                <Button
                  title="Siguiente: Previsualizar →"
                  onPress={() => setStep(4)}
                  style={{ flex: 1.5 }}
                />
              </View>
            </View>
          )}

          {/* PASO 4: FICHA DE PREVISUALIZACIÓN OFICIAL */}
          {step === 4 && (
            <View style={styles.stepContainer}>
              <View style={styles.stepHeaderGroup}>
                <View style={[styles.stepHeaderIconBox, { backgroundColor: '#eff6ff' }]}>
                  <Ionicons name="eye" size={20} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepHeading}>Previsualización del Comercio</Text>
                  <Text style={styles.stepSubheading}>
                    Revisá cómo se presentará tu negocio ante los clientes y el equipo de auditoría.
                  </Text>
                </View>
              </View>

              {/* Credencial Oficial del Comercio */}
              <View style={styles.previewCard}>
                <View style={styles.previewHeader}>
                  <View style={styles.previewAvatar}>
                    <Text style={styles.previewAvatarText}>
                      {(name || 'N').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.previewName}>{name || 'Nombre del Negocio'}</Text>
                    <View style={styles.previewCategoryBadge}>
                      <Text style={styles.previewCategoryBadgeText}>{category}</Text>
                    </View>
                  </View>
                </View>

                {description ? (
                  <Text style={styles.previewDescription}>{description}</Text>
                ) : null}

                <View style={styles.previewDivider} />

                {/* Datos de Contacto y Ubicación */}
                <View style={styles.previewRow}>
                  <Ionicons name="location" size={16} color={Colors.primary} />
                  <Text style={styles.previewRowText}>
                    {address} {city ? `• ${city}` : ''} {province ? `(${province})` : ''}
                  </Text>
                </View>

                <View style={styles.previewRow}>
                  <Ionicons name="logo-whatsapp" size={16} color="#16a34a" />
                  <Text style={styles.previewRowText}>{phone}</Text>
                </View>

                {email ? (
                  <View style={styles.previewRow}>
                    <Ionicons name="mail" size={16} color="#0284c7" />
                    <Text style={styles.previewRowText}>{email}</Text>
                  </View>
                ) : null}

                {/* Evidencias Oficiales Vinculadas */}
                <View style={styles.previewDivider} />
                <Text style={styles.previewEvidenceHeading}>Canales & Evidencias Vinculadas:</Text>
                <View style={styles.evidenceSummaryList}>
                  {instagram ? (
                    <View style={[styles.evidenceChip, { backgroundColor: '#fce7f3' }]}>
                      <Ionicons name="logo-instagram" size={12} color="#e1306c" />
                      <Text style={[styles.evidenceChipText, { color: '#e1306c' }]}>Instagram</Text>
                    </View>
                  ) : null}
                  {facebook ? (
                    <View style={[styles.evidenceChip, { backgroundColor: '#eff6ff' }]}>
                      <Ionicons name="logo-facebook" size={12} color="#1877f2" />
                      <Text style={[styles.evidenceChipText, { color: '#1877f2' }]}>Facebook</Text>
                    </View>
                  ) : null}
                  {googleMaps ? (
                    <View style={[styles.evidenceChip, { backgroundColor: '#fee2e2' }]}>
                      <Ionicons name="map" size={12} color="#dc2626" />
                      <Text style={[styles.evidenceChipText, { color: '#dc2626' }]}>Google Maps</Text>
                    </View>
                  ) : null}
                  {website ? (
                    <View style={[styles.evidenceChip, { backgroundColor: '#e0f2fe' }]}>
                      <Ionicons name="globe" size={12} color="#0284c7" />
                      <Text style={[styles.evidenceChipText, { color: '#0284c7' }]}>Web Oficial</Text>
                    </View>
                  ) : null}
                  {cuit ? (
                    <View style={[styles.evidenceChip, { backgroundColor: '#f1f5f9' }]}>
                      <Ionicons name="document-text" size={12} color="#475569" />
                      <Text style={[styles.evidenceChipText, { color: '#475569' }]}>CUIT: {cuit}</Text>
                    </View>
                  ) : null}
                  {!instagram && !facebook && !googleMaps && !website && !cuit ? (
                    <Text style={styles.noEvidenceText}>Sin enlaces adjuntos</Text>
                  ) : null}
                </View>
              </View>

              {/* Disclaimer de Veracidad Legal */}
              <View style={styles.disclaimerBox}>
                <Ionicons name="shield-checkmark" size={20} color="#0284c7" />
                <Text style={styles.disclaimerText}>
                  Declaro que la información ingresada es fidedigna y corresponde al comercio real del cual soy titular o responsable habilitado.
                </Text>
              </View>

              {/* Botones de Envío */}
              <View style={styles.buttonRow}>
                <Button
                  title="← Modificar"
                  variant="outline"
                  onPress={() => setStep(3)}
                  disabled={submitting}
                  style={{ flex: 1, marginRight: Spacing.sm }}
                />
                <Button
                  title={submitting ? 'Enviando...' : isEditing ? 'Guardar y Reenviar' : 'Enviar a Auditoría Oficial'}
                  onPress={handleSubmit}
                  disabled={submitting}
                  style={{ flex: 1.8 }}
                />
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
  },
  stepsHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    justifyContent: 'space-around',
  },
  stepIndicatorItem: {
    alignItems: 'center',
    gap: 4,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  stepCircleCompleted: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  stepNumberText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    color: Colors.textSecondary,
  },
  stepNumberTextActive: {
    color: Colors.primary,
  },
  stepLabelText: {
    fontSize: 10,
    fontWeight: Typography.weights.semiBold,
    color: Colors.textSecondary,
  },
  stepLabelTextActive: {
    color: Colors.primary,
    fontWeight: Typography.weights.bold,
  },
  scrollContent: {
    padding: Spacing.md,
  },
  stepContainer: {
    gap: Spacing.md,
  },
  stepHeading: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
  },
  stepSubheading: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.xs,
  },
  formGroup: {
    gap: 6,
  },
  formRow: {
    flexDirection: 'row',
  },
  label: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: Typography.sizes.sm,
    color: Colors.textTitle,
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  categoryCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  categoryCardText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.weights.semiBold,
  },
  categoryCardTextSelected: {
    color: Colors.primary,
    fontWeight: Typography.weights.bold,
  },
  evidenceInputCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    gap: 8,
  },
  evidenceCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  evidenceIconTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  evidenceCardTitle: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
  },
  testLinkText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
  },
  summaryCard: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.weights.semiBold,
  },
  summaryValue: {
    fontSize: Typography.sizes.xs,
    color: Colors.textTitle,
    fontWeight: Typography.weights.bold,
    maxWidth: '65%',
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  summaryEvidenceTitle: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    color: Colors.textTitle,
  },
  evidenceSummaryList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  evidenceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
  },
  evidenceChipText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textTitle,
    fontWeight: Typography.weights.semiBold,
  },
  noEvidenceText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textDisabled,
    fontStyle: 'italic',
  },
  disclaimerBox: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  disclaimerText: {
    flex: 1,
    fontSize: Typography.sizes.xs,
    color: '#1e40af',
    lineHeight: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: Spacing.md,
  },
});

