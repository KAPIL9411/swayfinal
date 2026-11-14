import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { colors, spacing, typography } from '../theme/tokens';

type IconName = keyof typeof Ionicons.glyphMap;

/**
 * Tab bar
 * A flat, hairline-topped navigation bar: icon in a tinted capsule when active,
 * mono label underneath. No emoji, no default chrome.
 */

const TABS: Record<string, { icon: IconName; activeIcon: IconName }> = {
  wall: { icon: 'newspaper-outline', activeIcon: 'newspaper' },
  discover: { icon: 'compass-outline', activeIcon: 'compass' },
  vibes: { icon: 'heart-outline', activeIcon: 'heart' },
  chats: { icon: 'chatbubble-ellipses-outline', activeIcon: 'chatbubble-ellipses' },
  me: { icon: 'person-outline', activeIcon: 'person' },
};

export function TabBar({ state, descriptors, navigateToTab, insets }: BottomTabBarProps) {
  const bottomInset = insets?.bottom ?? 0;

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(bottomInset, 8) }]}>
      <View style={styles.row}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const options = descriptors[route.key]?.options ?? {};
          const title =
            typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : (options.title ?? route.name);

          const meta = TABS[route.name] ?? {
            icon: 'ellipse-outline' as IconName,
            activeIcon: 'ellipse' as IconName,
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={title}
              onPress={() => {
                if (!focused) navigateToTab(route.key);
              }}
              style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
            >
              <View style={styles.iconWell}>
                <Ionicons
                  name={focused ? meta.activeIcon : meta.icon}
                  size={22}
                  color={focused ? colors.light.primary : colors.light.onSurfaceVariant}
                />
              </View>
              <Text style={[styles.label, focused && styles.labelActive]} numberOfLines={1}>
                {String(title).toUpperCase()}
              </Text>
              <View style={[styles.indicator, focused && styles.indicatorActive]} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.light.surfaceContainerLowest,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.light.outlineVariant,
    paddingTop: spacing.xs + 2,
    ...Platform.select({
      ios: {
        shadowColor: colors.light.onSurface,
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
      default: {
        boxShadow: `0 -2px 12px rgba(26, 28, 28, 0.06)`,
      } as object,
    }),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingVertical: spacing.xs,
  },
  itemPressed: {
    opacity: 0.6,
  },
  iconWell: {
    width: 44,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: typography.labelSm.fontFamily,
    fontSize: 10,
    letterSpacing: 0.6,
    color: colors.light.onSurfaceVariant,
  },
  indicator: {
    width: 16,
    height: 3,
    borderRadius: 2,
    marginTop: 4,
    backgroundColor: 'transparent',
  },
  indicatorActive: {
    backgroundColor: colors.light.primary,
  },
  labelActive: {
    color: colors.light.primary,
    fontWeight: '700',
  },
});
