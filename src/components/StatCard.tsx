import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { GlassCard } from './GlassCard';

interface StatCardProps {
  label: string;
  value: string;
  trendLabel?: string;
  trendPositive?: boolean;
  sub?: string;
}

export function StatCard({ label, value, trendLabel, trendPositive, sub }: StatCardProps) {
  const { colors, typography, spacing } = useTheme();

  return (
    <GlassCard style={{ gap: spacing.xs }}>
      <Text style={[typography.caption, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[typography.display, { color: colors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {(trendLabel || sub) && (
        <View style={styles.row}>
          {trendLabel && (
            <View style={styles.row}>
              <Ionicons
                name={trendPositive ? 'trending-up' : 'trending-down'}
                size={14}
                color={trendPositive ? colors.success : colors.danger}
              />
              <Text
                style={[
                  typography.caption,
                  { color: trendPositive ? colors.success : colors.danger, marginLeft: 4 },
                ]}
              >
                {trendLabel}
              </Text>
            </View>
          )}
          {sub && (
            <Text style={[typography.caption, { color: colors.textTertiary, marginLeft: trendLabel ? 8 : 0 }]}>
              {sub}
            </Text>
          )}
        </View>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
