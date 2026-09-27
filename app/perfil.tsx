import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassCard } from '@/components/GlassCard';
import { ACCOUNT_COLOR_SWATCHES } from '@/data/accountColors';
import type { UserProfile } from '@/data/types';
import { translateAuthError } from '@/services/auth/errorMessages';
import { updateEmail } from '@/services/auth/actions';
import { useAuthSession } from '@/services/auth/useAuthSession';
import { runSync } from '@/services/sync/SyncEngine';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';

const AGE_OPTIONS: number[] = Array.from({ length: 101 }, (_, i) => i);
const SEX_OPTIONS: Array<{ value: NonNullable<UserProfile['sex']>; label: string }> = [
  { value: 'hombre', label: 'Hombre' },
  { value: 'mujer', label: 'Mujer' },
  { value: 'prefiero_no_decirlo', label: 'Prefiero no decirlo' },
];

// Pantalla de Perfil — spec: "en este account dropdown debe estar la
// opción de 'Perfil' donde encuentres todos tus datos y puedas editar
// como Nombre, edad, cuenta de recuperación entre otros como el icono de
// su perfil". El correo de recuperación se mueve aquí desde Ajustes (ya
// no vive ahí — spec original: "para que ajustes no se vean tan
// cargado").
export default function Perfil() {
  const { colors, typography, spacing, radius } = useTheme();
  const profile = useAppStore((s) => s.profile);
  const profileDirty = useAppStore((s) => s.profileDirty);
  const updateProfileDraft = useAppStore((s) => s.updateProfileDraft);
  const { userId, email } = useAuthSession();

  const [name, setName] = useState(profile.name ?? '');
  const [ageDropdownOpen, setAgeDropdownOpen] = useState(false);
  const [savingNow, setSavingNow] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const [editingRecoveryEmail, setEditingRecoveryEmail] = useState(false);
  const [recoveryEmailInput, setRecoveryEmailInput] = useState('');
  const [recoveryEmailMsg, setRecoveryEmailMsg] = useState('');
  const [savingRecoveryEmail, setSavingRecoveryEmail] = useState(false);

  const initial = (name.trim()?.[0] ?? email?.trim()?.[0] ?? '?').toUpperCase();
  const avatarColor = profile.avatarColor ?? colors.accentFrom;

  const commitName = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== profile.name) updateProfileDraft({ name: trimmed });
    else if (!trimmed) setName(profile.name);
  };

  // Cada campo de esta pantalla ya se guarda solo al tocarlo
  // (updateProfileDraft marca profileDirty, y runSync lo sube con
  // reintentos cada 60s) — este botón es la confirmación EXPLÍCITA que
  // pidió el usuario tras el bug donde un cambio de nombre se perdía en
  // silencio: fuerza el intento de subida de inmediato y muestra si de
  // verdad se confirmó en el servidor, en vez de asumirlo.
  const handleSaveNow = async () => {
    commitName();
    setSavingNow(true);
    setJustSaved(false);
    if (userId) await runSync();
    setSavingNow(false);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2500);
  };

  const saveStatusLabel = !userId
    ? 'Se guarda en este dispositivo'
    : savingNow
      ? 'Guardando...'
      : justSaved
        ? 'Guardado en tu cuenta'
        : profileDirty
          ? 'Cambios pendientes de subir'
          : 'Guardado en tu cuenta';

  const handleSaveRecoveryEmail = async () => {
    const value = recoveryEmailInput.trim();
    if (!value.includes('@')) {
      setRecoveryEmailMsg('Escribe un correo válido.');
      return;
    }
    setSavingRecoveryEmail(true);
    setRecoveryEmailMsg('');
    const result = await updateEmail(value);
    setSavingRecoveryEmail(false);
    if (!result.ok) {
      setRecoveryEmailMsg(translateAuthError(result.error));
      return;
    }
    setRecoveryEmailMsg(`Te mandamos un correo de confirmación a ${value}. Ábrelo para terminar el cambio.`);
    setEditingRecoveryEmail(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: spacing.md }}>
          <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
        </Pressable>
        <Text style={[typography.title, { color: colors.textPrimary }]}>Perfil</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120, gap: spacing.lg }}>
        <GlassCard style={{ alignItems: 'center', gap: spacing.sm }}>
          <View style={[styles.avatar, { backgroundColor: avatarColor, borderRadius: 40 }]}>
            <Text style={styles.avatarInitial}>{initial}</Text>
          </View>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>Color de tu ícono</Text>
          <View style={styles.swatchRow}>
            {ACCOUNT_COLOR_SWATCHES.map((c) => (
              <Pressable
                key={c}
                accessibilityLabel={`Elegir color ${c}`}
                onPress={() => updateProfileDraft({ avatarColor: c })}
                style={[
                  styles.swatch,
                  {
                    backgroundColor: c,
                    borderRadius: 16,
                    borderWidth: avatarColor === c ? 3 : 0,
                    borderColor: colors.textPrimary,
                  },
                ]}
              />
            ))}
          </View>
        </GlassCard>

        <View style={{ gap: spacing.sm }}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>NOMBRE</Text>
          <GlassCard>
            <TextInput
              value={name}
              onChangeText={setName}
              onBlur={commitName}
              placeholder="Tu nombre"
              placeholderTextColor={colors.textTertiary}
              style={[typography.body, { color: colors.textPrimary }]}
            />
          </GlassCard>
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>SEXO</Text>
          <View style={styles.rowWrap}>
            {SEX_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => updateProfileDraft({ sex: opt.value })}
                style={[
                  styles.pill,
                  {
                    borderRadius: radius.pill,
                    borderColor: profile.sex === opt.value ? colors.accentFrom : colors.surfaceBorder,
                    backgroundColor: profile.sex === opt.value ? colors.accentSoft : colors.surfaceSolid,
                  },
                ]}
              >
                <Text style={{ color: profile.sex === opt.value ? colors.accentFrom : colors.textSecondary, fontWeight: '600' }}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>EDAD</Text>
          <Pressable
            accessibilityLabel="Elegir edad"
            onPress={() => setAgeDropdownOpen((v) => !v)}
            style={[styles.dropdownHeader, { borderColor: colors.surfaceBorder, borderRadius: radius.md, backgroundColor: colors.surfaceSolid }]}
          >
            <Text style={[typography.body, { color: profile.age !== undefined ? colors.textPrimary : colors.textTertiary, flex: 1 }]}>
              {profile.age !== undefined ? `${profile.age} años` : 'Elegir edad'}
            </Text>
            <Ionicons name={ageDropdownOpen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textTertiary} />
          </Pressable>
          {ageDropdownOpen && (
            <ScrollView style={[styles.dropdownList, { borderColor: colors.surfaceBorder, borderRadius: radius.md }]} nestedScrollEnabled>
              {AGE_OPTIONS.map((value) => (
                <Pressable
                  key={value}
                  accessibilityLabel={`Edad ${value}`}
                  onPress={() => {
                    updateProfileDraft({ age: value });
                    setAgeDropdownOpen(false);
                  }}
                  style={[styles.dropdownItem, { borderBottomColor: colors.surfaceBorder }]}
                >
                  <Text style={[typography.body, { color: colors.textPrimary }]}>{value} años</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>

        {userId && (
          <View style={{ gap: spacing.sm }}>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>CORREO DE RECUPERACIÓN</Text>
            <GlassCard style={{ gap: spacing.sm }}>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                Si olvidas tu contraseña, el enlace para recuperarla llega a este correo.
              </Text>
              {editingRecoveryEmail ? (
                <>
                  <TextInput
                    autoFocus
                    value={recoveryEmailInput}
                    onChangeText={setRecoveryEmailInput}
                    placeholder="tu@correo.com"
                    placeholderTextColor={colors.textTertiary}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    style={[styles.input, { color: colors.textPrimary, borderColor: colors.surfaceBorder, borderRadius: radius.md }]}
                  />
                  {!!recoveryEmailMsg && (
                    <Text style={[typography.caption, { color: colors.danger }]}>{recoveryEmailMsg}</Text>
                  )}
                  <View style={styles.rowGap}>
                    <Pressable
                      onPress={() => {
                        setEditingRecoveryEmail(false);
                        setRecoveryEmailMsg('');
                      }}
                      style={[styles.secondaryBtn, { borderRadius: radius.pill, borderColor: colors.surfaceBorder }]}
                    >
                      <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>Cancelar</Text>
                    </Pressable>
                    <Pressable
                      onPress={handleSaveRecoveryEmail}
                      disabled={savingRecoveryEmail}
                      style={[styles.secondaryBtn, { borderRadius: radius.pill, borderColor: colors.accentFrom, opacity: savingRecoveryEmail ? 0.6 : 1 }]}
                    >
                      <Text style={{ color: colors.accentFrom, fontWeight: '700' }}>
                        {savingRecoveryEmail ? 'Guardando...' : 'Guardar'}
                      </Text>
                    </Pressable>
                  </View>
                </>
              ) : (
                <View style={styles.row}>
                  <Text style={[typography.body, { color: colors.textPrimary, flex: 1 }]}>{email}</Text>
                  <Pressable
                    accessibilityLabel="Cambiar correo de recuperación"
                    onPress={() => {
                      setRecoveryEmailInput(email ?? '');
                      setRecoveryEmailMsg('');
                      setEditingRecoveryEmail(true);
                    }}
                  >
                    <Text style={{ color: colors.accentFrom, fontWeight: '700' }}>Cambiar</Text>
                  </Pressable>
                </View>
              )}
              {!!recoveryEmailMsg && !editingRecoveryEmail && (
                <Text style={[typography.caption, { color: colors.success }]}>{recoveryEmailMsg}</Text>
              )}
            </GlassCard>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.divider }]}>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>{saveStatusLabel}</Text>
        <Pressable
          onPress={handleSaveNow}
          disabled={savingNow}
          style={[styles.saveBtn, { backgroundColor: colors.accentFrom, borderRadius: radius.pill, opacity: savingNow ? 0.6 : 1 }]}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>{savingNow ? 'Guardando...' : 'Guardar cambios'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: '#FFFFFF', fontWeight: '800', fontSize: 30 },
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  swatch: { width: 32, height: 32 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rowGap: { flexDirection: 'row', gap: 10, marginTop: 4 },
  pill: { paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1 },
  secondaryBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderWidth: 1 },
  input: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15 },
  dropdownHeader: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14 },
  dropdownList: { borderWidth: 1, maxHeight: 220 },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    borderTopWidth: 1,
    gap: 8,
  },
  saveBtn: { paddingVertical: 14, alignItems: 'center' },
});
