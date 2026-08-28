import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { CATEGORY_ICONS } from '@/data/iconMap';
import { useTheme } from '@/theme/ThemeProvider';

interface CategoryIconProps {
  categoryId: keyof typeof CATEGORY_ICONS | string;
  size?: number;
}

export function CategoryIcon({ categoryId, size = 20 }: CategoryIconProps) {
  const { colors, radius } = useTheme();
  const iconName = (CATEGORY_ICONS as Record<string, any>)[categoryId] ?? 'ellipse-outline';

  return (
    <View
      style={[
        styles.badge,
        {
          width: size * 2,
          height: size * 2,
          borderRadius: radius.md,
          backgroundColor: colors.accentSoft,
        },
      ]}
    >
      <Ionicons name={iconName} size={size} color={colors.accentFrom} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: 'center', justifyContent: 'center' },
});
