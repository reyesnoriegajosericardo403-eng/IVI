import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassCard } from '@/components/GlassCard';
import { useTheme } from '@/theme/ThemeProvider';

function Step({ number, text, colors, typography, spacing, radius }: any) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: radius.pill,
          backgroundColor: colors.accentSoft,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: spacing.sm,
        }}
      >
        <Text style={[typography.micro, { color: colors.accentFrom, fontWeight: '700' }]}>{number}</Text>
      </View>
      <Text style={[typography.body, { color: colors.textPrimary, flex: 1 }]}>{text}</Text>
    </View>
  );
}

// Guía para instalar VALU como app en la pantalla de inicio — spec: "que
// la puedan tener mis amigos... desde un inicio en su pantalla y no en su
// navegador". No requiere tienda de apps: es la misma página web, solo que
// el teléfono la deja "instalar" como si fuera una app normal.
export default function Instalar() {
  const { colors, typography, spacing, radius } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: spacing.md }}>
          <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
        </Pressable>
        <Text style={[typography.title, { color: colors.textPrimary }]}>Instalar VALU</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: 140 }}>
        <GlassCard style={{ gap: spacing.sm }}>
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            VALU no está en la tienda de apps, pero tu teléfono la puede "instalar" igual — te queda un ícono en tu
            pantalla de inicio y abre directo, sin pasar por el navegador. Comparte este link con tus amigos:{' '}
            <Text style={{ fontWeight: '700', color: colors.accentFrom }}>https://ivi-beta.vercel.app</Text>
          </Text>
        </GlassCard>

        <GlassCard style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="logo-apple" size={20} color={colors.textPrimary} />
            <Text style={[typography.headline, { color: colors.textPrimary, marginLeft: spacing.sm }]}>iPhone / iPad</Text>
          </View>
          <View style={{ gap: spacing.sm }}>
            <Step number="1" text='Abre el link en Safari (tiene que ser Safari, no funciona igual en Chrome).' colors={colors} typography={typography} spacing={spacing} radius={radius} />
            <Step number="2" text='Toca el ícono de "Compartir" — el cuadrito con la flecha hacia arriba, abajo al centro de la pantalla.' colors={colors} typography={typography} spacing={spacing} radius={radius} />
            <Step number="3" text='Baja el menú y toca "Agregar a inicio".' colors={colors} typography={typography} spacing={spacing} radius={radius} />
            <Step number="4" text='Toca "Agregar" arriba a la derecha. Listo — ya tienes el ícono de VALU en tu pantalla.' colors={colors} typography={typography} spacing={spacing} radius={radius} />
          </View>
        </GlassCard>

        <GlassCard style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="logo-android" size={20} color={colors.textPrimary} />
            <Text style={[typography.headline, { color: colors.textPrimary, marginLeft: spacing.sm }]}>Android</Text>
          </View>
          <View style={{ gap: spacing.sm }}>
            <Step number="1" text="Abre el link en Chrome." colors={colors} typography={typography} spacing={spacing} radius={radius} />
            <Step number="2" text="Toca los tres puntitos (⋮) arriba a la derecha." colors={colors} typography={typography} spacing={spacing} radius={radius} />
            <Step number="3" text='Toca "Instalar app" o "Agregar a pantalla de inicio".' colors={colors} typography={typography} spacing={spacing} radius={radius} />
            <Step number="4" text="Confirma. Listo — ya tienes el ícono de VALU en tu pantalla, igual que cualquier otra app." colors={colors} typography={typography} spacing={spacing} radius={radius} />
          </View>
        </GlassCard>

        <GlassCard style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="mic-outline" size={18} color={colors.accentFrom} />
            <Text style={[typography.headline, { color: colors.textPrimary, marginLeft: spacing.sm }]}>
              Grabar por voz más rápido
            </Text>
          </View>
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            En Android, si mantienes presionado el ícono de VALU en tu pantalla, aparece un acceso directo de{' '}
            <Text style={{ fontWeight: '700' }}>"Grabar por voz"</Text> — te abre la app ya escuchando, sin tener que
            tocar nada más adentro.
          </Text>
          <Text style={[typography.caption, { color: colors.textTertiary }]}>
            En iPhone, Apple no deja mostrar ese acceso directo desde el ícono — ahí toca el ícono normal y luego el
            botón del micrófono, como siempre.
          </Text>
        </GlassCard>
      </ScrollView>
    </SafeAreaView>
  );
}
