import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, spacing, typography, shadows } from '../../theme/tokens';

type ButtonVariant = 'primary' | 'vibe-gradient' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  style,
  textStyle,
}) => {
  const isDisabled = disabled || loading;

  const containerStyle: ViewStyle[] = [
    styles.base,
    sizeStyles[size],
    ...(fullWidth ? [styles.fullWidth] : []),
    ...(style ? [style] : []),
  ];

  const content = (
    <View style={styles.content}>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'ghost' || variant === 'secondary' ? colors.light.primary : colors.light.onPrimary}
        />
      ) : (
        <>
          {icon && <View style={styles.icon}>{icon}</View>}
          <Text style={[styles.text, textStyles[variant], sizeTextStyles[size], textStyle]}>{children}</Text>
        </>
      )}
    </View>
  );

  // Vibe gradient button
  if (variant === 'vibe-gradient' && !isDisabled) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.8}
        style={containerStyle}
      >
        <LinearGradient
          colors={['#9700cd', '#c1f100']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradient, sizeStyles[size]]}
        >
          {content}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      style={[containerStyle, variantStyles[variant], isDisabled && styles.disabled]}
    >
      {content}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.default,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  gradient: {
    borderRadius: radius.default,
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: typography.headlineSm.fontFamily,
    fontWeight: typography.headlineSm.fontWeight,
  },
  icon: {
    marginRight: spacing.xs,
  },
  disabled: {
    opacity: 0.5,
  },
});

const sizeStyles = StyleSheet.create({
  sm: {
    height: 36,
    paddingHorizontal: spacing.md,
  },
  md: {
    height: 48,
    paddingHorizontal: spacing.lg,
  },
  lg: {
    height: 52,
    paddingHorizontal: spacing.xl,
  },
});

const sizeTextStyles = StyleSheet.create({
  sm: {
    fontSize: 14,
  },
  md: {
    fontSize: 16,
  },
  lg: {
    fontSize: 18,
  },
});

const variantStyles = StyleSheet.create({
  primary: {
    backgroundColor: colors.light.primary,
    ...shadows.md,
  },
  'vibe-gradient': {
    // Gradient is handled separately
  },
  secondary: {
    backgroundColor: colors.light.secondaryContainer,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.light.outline,
  },
  danger: {
    backgroundColor: colors.light.error,
    ...shadows.md,
  },
});

const textStyles = StyleSheet.create({
  primary: {
    color: colors.light.onPrimary,
  },
  'vibe-gradient': {
    color: colors.light.onPrimary,
  },
  secondary: {
    color: colors.light.onSecondaryContainer,
  },
  ghost: {
    color: colors.light.primary,
  },
  danger: {
    color: colors.light.onError,
  },
});
