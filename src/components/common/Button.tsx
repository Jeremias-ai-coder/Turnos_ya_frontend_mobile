import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Colors, BorderRadius, Spacing, Typography } from '../../constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
}) => {
  const getContainerStyles = (): ViewStyle[] => {
    const list: ViewStyle[] = [styles.base];

    // Size
    if (size === 'sm') list.push(styles.sizeSm);
    else if (size === 'lg') list.push(styles.sizeLg);
    else list.push(styles.sizeMd);

    // Variant
    switch (variant) {
      case 'secondary':
        list.push(styles.variantSecondary);
        break;
      case 'outline':
        list.push(styles.variantOutline);
        break;
      case 'danger':
        list.push(styles.variantDanger);
        break;
      case 'primary':
      default:
        list.push(styles.variantPrimary);
        break;
    }

    if (disabled || loading) {
      list.push(styles.disabled);
    }

    if (style) list.push(style);
    return list;
  };

  const getTextStyles = (): TextStyle[] => {
    const list: TextStyle[] = [styles.baseText];

    if (size === 'sm') list.push(styles.textSm);
    else if (size === 'lg') list.push(styles.textLg);
    else list.push(styles.textMd);

    switch (variant) {
      case 'outline':
        list.push(styles.textOutline);
        break;
      case 'secondary':
        list.push(styles.textSecondary);
        break;
      case 'danger':
        list.push(styles.textDanger);
        break;
      case 'primary':
      default:
        list.push(styles.textPrimary);
        break;
    }

    if (textStyle) list.push(textStyle);
    return list;
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      style={getContainerStyles()}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' ? Colors.primary : Colors.white}
        />
      ) : (
        <>
          {icon ? icon : null}
          <Text style={getTextStyles()}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
  },
  sizeSm: {
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.sm + 4,
    borderRadius: BorderRadius.sm,
  },
  sizeMd: {
    paddingVertical: 12,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  sizeLg: {
    paddingVertical: 15,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
  },
  variantPrimary: {
    backgroundColor: Colors.primary,
  },
  variantSecondary: {
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  variantOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  variantDanger: {
    backgroundColor: Colors.danger,
  },
  disabled: {
    opacity: 0.5,
  },
  baseText: {
    fontWeight: Typography.weights.semiBold,
  },
  textSm: {
    fontSize: Typography.sizes.xs + 1,
  },
  textMd: {
    fontSize: Typography.sizes.md,
  },
  textLg: {
    fontSize: Typography.sizes.lg,
  },
  textPrimary: {
    color: Colors.white,
  },
  textSecondary: {
    color: Colors.textMain,
  },
  textOutline: {
    color: Colors.primary,
  },
  textDanger: {
    color: Colors.white,
  },
});
