import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ValuMark } from '@/components/ValuMark';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';
import type { Currency } from '@/data/types';

const CURRENCIES: Currency[] = ['MXN', 'USD'];

export default function Onboarding() {
  const { colors, typography, spacing, radius } = useTheme();
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const loadDemoData = useAppStore((s) => s.loadDemoData);

  const [name, setName] = useState('');
  const [currency, setCurrency] = useState<Currency>('MXN');
  const [wantsDemo, setWantsDemo] = useState(true);

  const handleFinish = () => {
    completeOnboarding({ name: name.trim() || 'Tú', primaryCurrency: currency });
    if (wantsDemo) loadDemoData();
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.xl }}>
        <View style={styles.header}>
          <ValuMark size={56} variant="ai" />
          <Text style={[typography.title, { color: colors.textPrimary, marginTop: spacing.md }]}>
            Bienvenido a VALU
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: 4 }]}>
            Habla una vez. VALU entiende el resto.
          </Text>
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text style={[typography.headline, { color: colors.textPrimary }]}>¿Cómo te llamas?</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Tu nombre"
            placeholderTextColor={colors.textTertiary}
            style={[
              styles.input,
              { color: colors.textPrimary, borderColor: colors.surfaceBorder, borderRadius: radius.md, backgroundColor: colors.surfaceSolid },
            ]}
          />
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text style={[typography.headline, { color: colors.textPrimary }]}>Moneda principal</Text>
          <View style={styles.row}>
            {CURRENCIES.map((c) => (
              <Pressable
                key={c}
                onPress={() => setCurrency(c)}
                style={[
                  styles.pill,
                  {
                    borderRadius: radius.pill,
                    borderColor: currency === c ? colors.accentFrom : colors.surfaceBorder,
                    backgroundColor: currency === c ? colors.accentSoft : colors.surfaceSolid,
                  },
                ]}
              >
                <Text style={{ color: currency === c ? colors.accentFrom : colors.textSecondary, fontWeight: '600' }}>
                  {c}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Pressable
          onPress={() => setWantsDemo((v) => !v)}
          style={[
            styles.demoToggle,
            { borderRadius: radius.md, borderColor: colors.surfaceBorder, backgroundColor: colors.surfaceSolid },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[typography.headline, { color: colors.textPrimary }]}>Explorar con datos de ejemplo</Text>
            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
              Verás movimientos y cifras ficticias, claramente marcadas como demo, para conocer la app.
            </Text>
          </View>
          <View
            style={[
              styles.checkbox,
              {
                borderRadius: radius.sm,
                borderColor: colors.accentFrom,
                backgroundColor: wantsDemo ? colors.accentFrom : 'transparent',
              },
            ]}
          />
        </Pressable>

        <Pressable onPress={handleFinish} style={[styles.cta, { borderRadius: radius.pill, backgroundColor: colors.accentFrom }]}>
          <Text style={[typography.headline, { color: '#FFFFFF' }]}>Listo</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { alignItems: 'center', marginTop: 24 },
  input: { borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16 },
  row: { flexDirection: 'row', gap: 10 },
  pill: { paddingHorizontal: 20, paddingVertical: 10, borderWidth: 1 },
  demoToggle: { flexDirection: 'row', alignItems: 'center', padding: 16, borderWidth: 1, gap: 12 },
  checkbox: { width: 24, height: 24, borderWidth: 2 },
  cta: { paddingVertical: 16, alignItems: 'center', marginTop: 8 },
});
