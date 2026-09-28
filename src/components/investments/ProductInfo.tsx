import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { GlassCard } from '@/components/GlassCard';
import { PRODUCT_MODEL_LABELS, type InstitutionProduct } from '@/data/institutions';
import { useTheme } from '@/theme/ThemeProvider';

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export function formatAsOf(asOf: string | null): string | null {
  if (!asOf) return null;
  const [y, m] = asOf.split('-').map(Number);
  return m ? `${MONTHS[m - 1]} ${y}` : String(y);
}

// "Cómo funciona" de cada producto, plegable. Siempre muestra de dónde
// salió cada dato y cuándo se revisó — son referencias, no promesas.
export function ProductInfo({ product, initiallyOpen = false }: { product: InstitutionProduct; initiallyOpen?: boolean }) {
  const { colors, typography, spacing } = useTheme();
  const [open, setOpen] = useState(initiallyOpen);
  const asOf = formatAsOf(product.asOf);

  return (
    <GlassCard style={{ gap: spacing.sm }}>
      <Pressable accessibilityLabel="Cómo funciona este producto" onPress={() => setOpen((v) => !v)} style={styles.row}>
        <Ionicons name="information-circle-outline" size={18} color={colors.accentFrom} />
        <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '700', flex: 1, marginLeft: spacing.sm }]}>
          Cómo funciona y cuánto cobra
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textTertiary} />
      </Pressable>
      {open && (
        <View style={{ gap: spacing.sm }}>
          <Text style={[typography.micro, { color: colors.textTertiary }]}>{PRODUCT_MODEL_LABELS[product.model].toUpperCase()}</Text>
          {product.howItWorks.map((line) => (
            <View key={line} style={styles.bullet}>
              <Text style={{ color: colors.accentFrom, marginRight: 6 }}>•</Text>
              <Text style={[typography.caption, { color: colors.textPrimary, flex: 1 }]}>{line}</Text>
            </View>
          ))}
          <InfoLine label="Comisión" value={product.commission.description} />
          {product.rateNotes && <InfoLine label="Tasa" value={product.rateNotes} />}
          {product.capAmount ? <InfoLine label="Tope" value={`$${product.capAmount.toLocaleString('es-MX')} MXN`} /> : null}
          <InfoLine label="Protección" value={product.protection} />
          {product.source ? (
            <Pressable accessibilityLabel="Abrir fuente oficial" onPress={() => Linking.openURL(product.source).catch(() => {})}>
              <Text style={[typography.micro, { color: colors.accentFrom }]}>
                Fuente oficial{asOf ? ` · revisado en ${asOf}` : ''} — confirma en la app de la institución →
              </Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </GlassCard>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  const { colors, typography } = useTheme();
  return (
    <View style={{ gap: 2 }}>
      <Text style={[typography.micro, { color: colors.textTertiary, fontWeight: '700' }]}>{label.toUpperCase()}</Text>
      <Text style={[typography.caption, { color: colors.textSecondary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  bullet: { flexDirection: 'row', alignItems: 'flex-start' },
});
