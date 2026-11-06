import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';

export interface BrandLogoProps {
  /**
   * 'white': For primary blue / dark headers (e.g. #009ee3).
   * 'color': For light surfaces (Login, Register).
   */
  variant?: 'white' | 'color';
  /**
   * 'sm': Compact for smaller bars (fontSize ~18px)
   * 'md': Standard navbar (fontSize ~24px)
   * 'lg': Hero / auth screens (fontSize ~32px)
   */
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'white',
  size = 'md',
  style,
}) => {
  const isWhite = variant === 'white';

  const textTurnosColor = isWhite ? '#ffffff' : '#0f172a';
  const badgeBg = isWhite ? '#ffffff' : Colors.primary;
  const badgeTextColor = isWhite ? Colors.primary : '#ffffff';

  const fontSizes = {
    sm: 18,
    md: 24,
    lg: 32,
  };

  const fs = fontSizes[size];
  const badgeFs = Math.round(fs * 0.82);
  const badgePaddingY = Math.round(fs * 0.12);
  const badgePaddingX = Math.round(fs * 0.36);
  const badgeRadius = Math.round(fs * 0.28);
  const checkSize = Math.round(badgeFs * 0.76);

  return (
    <View style={[styles.container, style]}>
      {/* "Turnos" */}
      <Text
        style={[
          styles.textTurnos,
          {
            fontSize: fs,
            color: textTurnosColor,
          },
        ]}
      >
        Turnos
      </Text>

      {/* Speed-Badge "Ya ✓" */}
      <View
        style={[
          styles.badge,
          {
            backgroundColor: badgeBg,
            paddingVertical: badgePaddingY,
            paddingHorizontal: badgePaddingX,
            borderRadius: badgeRadius,
            transform: [{ skewX: '-10deg' }],
          },
          isWhite ? styles.badgeShadowWhite : styles.badgeShadowColor,
        ]}
      >
        <View style={[styles.badgeInner, { transform: [{ skewX: '10deg' }] }]}>
          <Text
            style={[
              styles.textYa,
              {
                fontSize: badgeFs,
                color: badgeTextColor,
              },
            ]}
          >
            Ya
          </Text>
          <Ionicons
            name="checkmark"
            size={checkSize}
            color={badgeTextColor}
            style={{ marginLeft: 2 }}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  textTurnos: {
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textYa: {
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  badgeShadowWhite: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 4,
    elevation: 3,
  },
  badgeShadowColor: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 3,
  },
});

