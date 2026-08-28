import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import type { BudgetStatus } from '@/utils/finance';

interface ProgressBarProps {
  percent: number;
  status?: BudgetStatus;
  height?: number;
}

export function ProgressBar({ percent, status = 'normal', height = 8 }: ProgressBarProps) {
  const { colors, radius } = useTheme();
  const clamped = Math.max(0, Math.min(100, percent));

  const color = {
    normal: colors.accentTo,
    attention: colors.warning,
    warning: colors.warning,
    exceeded: colors.danger,
  }[status];

  return (
    <View style={[styles.track, { backgroundColor: colors.divider, height, borderRadius: radius.pill }]}>
      <View
        style={[
          styles.fill,
          { width: `${clamped}%`, backgroundColor: color, height, borderRadius: radius.pill },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden' },
  fill: {},
});
