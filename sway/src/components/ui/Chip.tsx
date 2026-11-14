import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme/tokens';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  variant?: 'filled' | 'outlined';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  selected = false,
  onPress,
  disabled = false,
  variant = 'filled',
  style,
  textStyle,
}) => {
  const containerStyle = [
    styles.base,
    variant === 'filled' ? styles.filled : styles.outlined,
    selected && (variant === 'filled' ? styles.selectedFilled : styles.selectedOutlined),
    disabled && styles.disabled,
    style,
  ];

  const labelStyle = [
    styles.text,
    variant === 'filled' ? styles.textFilled : styles.textOutlined,
    selected && (variant === 'filled' ? styles.textSelectedFilled : styles.textSelectedOutlined),
    textStyle,
  ];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || !onPress}
      activeOpacity={0.7}
      style={containerStyle}
    >
      <Text style={labelStyle}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filled: {
    backgroundColor: colors.light.surfaceContainerLow,
  },
  outlined: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.light.outline,
  },
  selectedFilled: {
    backgroundColor: colors.light.secondaryContainer,
  },
  selectedOutlined: {
    backgroundColor: colors.light.primaryFixedDim,
    borderColor: colors.light.primary,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontFamily: typography.labelMd.fontFamily,
    fontSize: typography.labelMd.fontSize,
    fontWeight: typography.labelMd.fontWeight,
    letterSpacing: typography.labelMd.letterSpacing,
    textTransform: 'uppercase',
  },
  textFilled: {
    color: colors.light.onSurfaceVariant,
  },
  textOutlined: {
    color: colors.light.onSurface,
  },
  textSelectedFilled: {
    color: colors.light.onSecondaryContainer,
  },
  textSelectedOutlined: {
    color: colors.light.primary,
  },
});
