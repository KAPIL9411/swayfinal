import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing, typography, shadows } from '../../theme/tokens';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onDismiss?: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  duration = 3000,
  onDismiss,
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    // Slide in
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto dismiss
    if (duration > 0) {
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: -20,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onDismiss?.();
        });
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onDismiss, opacity, translateY]);

  return (
    <Animated.View
      style={[
        styles.container,
        typeStyles[type],
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <Text style={[styles.text, textColorStyles[type]]}>{message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: spacing.xl + 50, // Account for status bar
    left: spacing.md,
    right: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.default,
    ...shadows.lg,
    zIndex: 1000,
  },
  text: {
    fontFamily: typography.bodyMd.fontFamily,
    fontSize: typography.bodyMd.fontSize,
    fontWeight: '500',
    textAlign: 'center',
  },
});

const typeStyles = StyleSheet.create({
  success: {
    backgroundColor: colors.light.secondaryContainer,
  },
  error: {
    backgroundColor: colors.light.errorContainer,
  },
  info: {
    backgroundColor: colors.light.primaryFixed,
  },
  warning: {
    backgroundColor: '#FFF9C4',
  },
});

const textColorStyles = StyleSheet.create({
  success: {
    color: colors.light.onSecondaryContainer,
  },
  error: {
    color: colors.light.onErrorContainer,
  },
  info: {
    color: colors.light.onPrimaryFixed,
  },
  warning: {
    color: '#5D4037',
  },
});

// Toast manager for global toasts
class ToastManager {
  private listeners: ((toast: ToastProps) => void)[] = [];

  show(message: string, type: ToastType = 'info', duration = 3000) {
    this.listeners.forEach((listener) => listener({ message, type, duration }));
  }

  success(message: string, duration = 3000) {
    this.show(message, 'success', duration);
  }

  error(message: string, duration = 3000) {
    this.show(message, 'error', duration);
  }

  info(message: string, duration = 3000) {
    this.show(message, 'info', duration);
  }

  warning(message: string, duration = 3000) {
    this.show(message, 'warning', duration);
  }

  subscribe(listener: (toast: ToastProps) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }
}

export const toast = new ToastManager();
