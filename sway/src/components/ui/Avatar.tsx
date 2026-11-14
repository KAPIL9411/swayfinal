import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius } from '../../theme/tokens';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  avatarKey: string;
  size?: AvatarSize;
  style?: ViewStyle;
}

// Pre-defined avatar emoji/illustrations
const AVATAR_MAP: Record<string, string> = {
  otter: '🦦',
  panda: '🐼',
  fox: '🦊',
  owl: '🦉',
  koala: '🐨',
  tiger: '🐯',
  lynx: '🐱',
  gecko: '🦎',
  falcon: '🦅',
  llama: '🦙',
  unicorn: '🦄',
  butterfly: '🦋',
};

export const Avatar: React.FC<AvatarProps> = ({ avatarKey, size = 'md', style }) => {
  const emoji = AVATAR_MAP[avatarKey] || '🐱';

  return (
    <View style={[styles.base, sizeStyles[size], style]}>
      <Text style={sizeEmojiStyles[size]}>{emoji}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.light.primaryFixed,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.light.primaryFixedDim,
  },
});

const sizeStyles = StyleSheet.create({
  sm: {
    width: 32,
    height: 32,
  },
  md: {
    width: 48,
    height: 48,
  },
  lg: {
    width: 64,
    height: 64,
  },
  xl: {
    width: 96,
    height: 96,
  },
});

const sizeEmojiStyles = StyleSheet.create({
  sm: {
    fontSize: 18,
  },
  md: {
    fontSize: 24,
  },
  lg: {
    fontSize: 32,
  },
  xl: {
    fontSize: 48,
  },
});
