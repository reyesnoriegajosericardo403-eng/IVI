import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassCard } from '@/components/GlassCard';
import { useTheme } from '@/theme/ThemeProvider';

// Términos básicos para una app personal/beta, compartida con conocidos
// para probarla y dar retroalimentación — no es un producto comercial con
// garantías. Se enlaza desde la configuración de OAuth de Google (requiere
// una URL de Términos de Servicio para publicar la app).
export default function Terminos() {
  const { colors, typography, spacing, radius } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: spacing.md }}>
          <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
        </Pressable>
        <Text style={[typography.title, { color: colors.textPrimary }]}>Términos de servicio</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: 140 }}>
        <GlassCard style={{ gap: spacing.sm }}>
          <Text style={[typography.headline, { color: colors.textPrimary }]}>Qué es VALU Finance</Text>
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            VALU Finance es una app personal en fase de prueba (beta), hecha para llevar control de tus finanzas —
            gastos, ingresos, presupuesto, patrimonio e inversiones. Se comparte con conocidos para probarla y recibir
            comentarios; no es un producto comercial ni ofrece asesoría financiera profesional.
          </Text>
        </GlassCard>

        <GlassCard style={{ gap: spacing.sm }}>
          <Text style={[typography.headline, { color: colors.textPrimary }]}>Tu responsabilidad</Text>
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            Los datos que registras (montos, categorías, cuentas) son responsabilidad tuya — la app no verifica esa
            información contra tus cuentas bancarias reales. Úsala como una herramienta de apoyo, no como tu único
            registro financiero.
          </Text>
        </GlassCard>

        <GlassCard style={{ gap: spacing.sm }}>
          <Text style={[typography.headline, { color: colors.textPrimary }]}>Sin garantías</Text>
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            Al ser una app en fase beta, puede tener errores o cambiar sin previo aviso. Se ofrece "tal cual", sin
            garantía de disponibilidad continua ni de que esté libre de fallas.
          </Text>
        </GlassCard>

        <GlassCard style={{ gap: spacing.sm }}>
          <Text style={[typography.headline, { color: colors.textPrimary }]}>Tus datos</Text>
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            Cómo se guardan y protegen tus datos se explica a detalle en la sección de Privacidad y datos, dentro de
            Ajustes en la app.
          </Text>
        </GlassCard>

        <GlassCard style={{ gap: spacing.sm }}>
          <Text style={[typography.headline, { color: colors.textPrimary }]}>Contacto</Text>
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            Si tienes dudas, comentarios o quieres reportar un problema, contacta directamente a quien te compartió
            esta app.
          </Text>
        </GlassCard>
      </ScrollView>
    </SafeAreaView>
  );
}
