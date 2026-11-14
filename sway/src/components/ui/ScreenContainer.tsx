import React from 'react';
import { View, ScrollView, StyleSheet, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../../theme/tokens';

interface ScreenContainerProps {
  children: React.ReactNode;
  scrollable?: boolean;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  padding?: boolean;
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  scrollable = false,
  style,
  contentContainerStyle,
  padding = true,
}) => {
  const insets = useSafeAreaInsets();

  // Keep content clear of the status bar / notch on every platform
  const safeTop = { paddingTop: insets.top };

  const content = scrollable ? (
    <ScrollView
      style={[styles.container, safeTop, style]}
      contentContainerStyle={[padding && styles.padding, contentContainerStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.container, safeTop, padding && styles.padding, style]}>{children}</View>
  );

  return <View style={styles.safeArea}>{content}</View>;
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.light.surface,
  },
  container: {
    flex: 1,
    backgroundColor: colors.light.surface,
  },
  padding: {
    paddingHorizontal: spacing.marginMobile,
  },
});
