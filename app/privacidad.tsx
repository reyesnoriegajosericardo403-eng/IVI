import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassCard } from '@/components/GlassCard';
import { signOut } from '@/services/auth/actions';
import { deleteAccountPermanently } from '@/services/auth/deleteAccount';
import { useAuthSession } from '@/services/auth/useAuthSession';
import { isSupabaseConfigured } from '@/services/supabase/client';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { exportAllDataAsJson } from '@/utils/exportData';

export default function Privacidad() {
  const { colors, typography, spacing, radius } = useTheme();
  const { userId } = useAuthSession();
  const resetAll = useAppStore((s) => s.resetAll);
  const [exportMsg, setExportMsg] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleExport = () => {
    const result = exportAllDataAsJson();
    setExportMsg(result.message);
  };

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      if (isSupabaseConfigured && userId) {
        const result = await deleteAccountPermanently();
        if (!result.success) {
          setDeleteError(result.error ?? 'No se pudo eliminar la cuenta.');
          return;
        }
        await signOut();
      }
      resetAll();
      router.replace(isSupabaseConfigured ? '/auth' : '/onboarding');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: spacing.md }}>
          <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
        </Pressable>
        <Text style={[typography.title, { color: colors.textPrimary }]}>Privacidad y datos</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: 140 }}>
        <GlassCard style={{ gap: spacing.sm }}>
          <Text style={[typography.headline, { color: colors.textPrimary }]}>Qué guardamos y dónde</Text>
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            Guardamos exactamente lo que tú ingresas: cuentas, movimientos, presupuestos, metas, inversiones y
            deudas. {isSupabaseConfigured
              ? 'Vive en tu propio proyecto de Supabase, protegido para que solo tu cuenta pueda leerlo o modificarlo.'
              : 'Ahora mismo vive solo en este dispositivo — todavía no conectas una cuenta en la nube.'}
            {' '}No vendemos ni compartimos tu información con anunciantes ni con nadie más.
          </Text>
        </GlassCard>

        <GlassCard style={{ gap: spacing.sm }}>
          <Text style={[typography.headline, { color: colors.textPrimary }]}>Inteligencia artificial y datos de mercado</Text>
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            El copiloto de IA es opcional: solo se activa si tú conectas tu propia clave de Claude, ChatGPT, Gemini o
            Grok, y solo entonces tus preguntas viajan al proveedor que elegiste. Los precios de mercado (acciones,
            FIBRAs, tasa de CETES) se consultan de proveedores públicos únicamente para mostrarte ese precio — no se
            les envía tu información personal ni financiera.
          </Text>
        </GlassCard>

        <GlassCard style={{ gap: spacing.sm }}>
          <Text style={[typography.headline, { color: colors.textPrimary }]}>Tus derechos sobre tus datos</Text>
          <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
            Puedes pedir una copia de todo lo que guardamos de ti, o eliminarlo por completo, cuando quieras.
          </Text>

          <Pressable
            onPress={handleExport}
            style={[styles.actionBtn, { borderColor: colors.surfaceBorder, borderRadius: radius.pill }]}
          >
            <Ionicons name="download-outline" size={18} color={colors.accentFrom} />
            <Text style={{ color: colors.accentFrom, fontWeight: '700', marginLeft: 8 }}>Exportar mis datos</Text>
          </Pressable>
          {exportMsg && (
            <Text style={[typography.caption, { color: colors.textTertiary }]}>{exportMsg}</Text>
          )}
          {Platform.OS !== 'web' && (
            <Text style={[typography.caption, { color: colors.textTertiary }]}>
              (Disponible por ahora solo en la versión web de la app.)
            </Text>
          )}

          <View style={{ height: spacing.sm }} />

          {!confirmingDelete ? (
            <Pressable
              onPress={() => setConfirmingDelete(true)}
              style={[styles.actionBtn, { borderColor: colors.danger, borderRadius: radius.pill }]}
            >
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
              <Text style={{ color: colors.danger, fontWeight: '700', marginLeft: 8 }}>Eliminar mi cuenta y todos mis datos</Text>
            </Pressable>
          ) : (
            <View style={{ gap: spacing.sm }}>
              <Text style={[typography.body, { color: colors.danger, fontWeight: '600' }]}>
                Esto elimina para siempre tus cuentas, movimientos, presupuestos, metas, inversiones y deudas — no se
                puede deshacer.
              </Text>
              {deleteError && (
                <Text style={[typography.caption, { color: colors.danger }]}>{deleteError}</Text>
              )}
              <View style={styles.rowGap}>
                <Pressable
                  onPress={() => {
                    setConfirmingDelete(false);
                    setDeleteError(null);
                  }}
                  style={[styles.secondaryBtn, { borderRadius: radius.pill, borderColor: colors.surfaceBorder }]}
                >
                  <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>Cancelar</Text>
                </Pressable>
                <Pressable
                  onPress={handleDelete}
                  disabled={deleting}
                  style={[styles.secondaryBtn, { borderRadius: radius.pill, backgroundColor: colors.danger, opacity: deleting ? 0.6 : 1 }]}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>{deleting ? 'Eliminando…' : 'Sí, eliminar todo'}</Text>
                </Pressable>
              </View>
            </View>
          )}
        </GlassCard>

        <Text style={[typography.caption, { color: colors.textTertiary, paddingHorizontal: 4 }]}>
          VALU Finance AI es una herramienta personal de seguimiento financiero. No es un banco, una institución
          financiera regulada ni un asesor de inversiones registrado — las decisiones financieras, fiscales y de
          inversión son siempre tuyas.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, paddingVertical: 12 },
  secondaryBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderWidth: 1 },
  rowGap: { flexDirection: 'row', gap: 10 },
});
