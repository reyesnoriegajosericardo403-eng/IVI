import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ValuMark } from '@/components/ValuMark';
import { signInWithEmail, signInWithOAuth, signUpWithEmail } from '@/services/auth/actions';
import { translateAuthError } from '@/services/auth/errorMessages';
import { useTheme } from '@/theme/ThemeProvider';

type Mode = 'signIn' | 'signUp';

export default function Auth() {
  const { colors, typography, spacing, radius } = useTheme();
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError('');
    setConfirmPassword('');
  };

  const handleSubmit = async () => {
    setError('');
    if (!email.includes('@') || password.length < 6) {
      setError('Escribe un correo válido y una contraseña de al menos 6 caracteres.');
      return;
    }
    if (mode === 'signUp' && password !== confirmPassword) {
      setError('Las contraseñas no coinciden. Revísalas e intenta de nuevo.');
      return;
    }
    setLoading(true);
    const result = mode === 'signIn' ? await signInWithEmail(email.trim(), password) : await signUpWithEmail(email.trim(), password);
    setLoading(false);
    if (!result.ok) {
      setError(translateAuthError(result.error));
      return;
    }
    if (mode === 'signUp') {
      setError('Cuenta creada. Revisa tu correo si te pedimos confirmarlo, luego inicia sesión.');
      switchMode('signIn');
      return;
    }
    router.replace('/');
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    setError('');
    setOauthLoading(provider);
    const result = await signInWithOAuth(provider);
    setOauthLoading(null);
    // Si funciona, Supabase redirige el navegador a Google/Apple — nunca
    // llegamos a esta línea en ese caso. Si truena, es casi siempre porque
    // el proveedor todavía no está habilitado en el proyecto de Supabase.
    if (!result.ok) {
      setError(translateAuthError(result.error));
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: spacing.xl, justifyContent: 'center', gap: spacing.xl }}>
          <View style={styles.header}>
            <ValuMark size={56} variant="ai" />
            <Text style={[typography.title, { color: colors.textPrimary, marginTop: spacing.md }]}>
              {mode === 'signIn' ? 'Bienvenido de vuelta' : 'Crea tu cuenta'}
            </Text>
            <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: 4 }]}>
              Tus datos se sincronizan entre tus dispositivos de forma privada.
            </Text>
          </View>

          <View style={{ gap: spacing.sm }}>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Correo electrónico"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              keyboardType="email-address"
              style={[
                styles.input,
                { color: colors.textPrimary, borderColor: colors.surfaceBorder, borderRadius: radius.md, backgroundColor: colors.surfaceSolid },
              ]}
            />

            <View style={styles.passwordRow}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Contraseña"
                placeholderTextColor={colors.textTertiary}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                style={[
                  styles.input,
                  styles.passwordInput,
                  { color: colors.textPrimary, borderColor: colors.surfaceBorder, borderRadius: radius.md, backgroundColor: colors.surfaceSolid },
                ]}
              />
              <Pressable
                onPress={() => setShowPassword((v) => !v)}
                style={styles.eyeButton}
                accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            {mode === 'signUp' && (
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirmar contraseña"
                placeholderTextColor={colors.textTertiary}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                style={[
                  styles.input,
                  { color: colors.textPrimary, borderColor: colors.surfaceBorder, borderRadius: radius.md, backgroundColor: colors.surfaceSolid },
                ]}
              />
            )}
          </View>

          {mode === 'signIn' && (
            <Pressable accessibilityLabel="Olvidé mi contraseña" onPress={() => router.push('/forgot-password')} style={{ alignSelf: 'flex-end' }}>
              <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '600' }]}>¿Olvidaste tu contraseña?</Text>
            </Pressable>
          )}

          {error.length > 0 && (
            <Text style={[typography.caption, { color: colors.danger, textAlign: 'center' }]}>{error}</Text>
          )}

          <Pressable
            onPress={handleSubmit}
            disabled={loading}
            style={[styles.cta, { borderRadius: radius.pill, backgroundColor: colors.accentFrom, opacity: loading ? 0.6 : 1 }]}
          >
            <Text style={[typography.headline, { color: '#FFFFFF' }]}>
              {loading ? 'Un momento...' : mode === 'signIn' ? 'Iniciar sesión' : 'Crear cuenta'}
            </Text>
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: colors.surfaceBorder }]} />
            <Text style={[typography.caption, { color: colors.textTertiary, marginHorizontal: spacing.sm }]}>o continúa con</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.surfaceBorder }]} />
          </View>

          <View style={{ gap: spacing.sm }}>
            <Pressable
              accessibilityLabel="Continuar con Google"
              onPress={() => handleOAuth('google')}
              disabled={oauthLoading !== null}
              style={[styles.oauthBtn, { borderRadius: radius.pill, borderColor: colors.surfaceBorder, backgroundColor: colors.surfaceSolid, opacity: oauthLoading ? 0.6 : 1 }]}
            >
              <Ionicons name="logo-google" size={20} color={colors.textPrimary} />
              <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '600', marginLeft: spacing.sm }]}>
                {oauthLoading === 'google' ? 'Un momento...' : 'Continuar con Google'}
              </Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Continuar con Apple"
              onPress={() => handleOAuth('apple')}
              disabled={oauthLoading !== null}
              style={[styles.oauthBtn, { borderRadius: radius.pill, borderColor: colors.surfaceBorder, backgroundColor: colors.surfaceSolid, opacity: oauthLoading ? 0.6 : 1 }]}
            >
              <Ionicons name="logo-apple" size={20} color={colors.textPrimary} />
              <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '600', marginLeft: spacing.sm }]}>
                {oauthLoading === 'apple' ? 'Un momento...' : 'Continuar con Apple'}
              </Text>
            </Pressable>
          </View>

          <Pressable onPress={() => switchMode(mode === 'signIn' ? 'signUp' : 'signIn')} style={{ alignItems: 'center' }}>
            <Text style={[typography.caption, { color: colors.accentFrom, fontWeight: '700' }]}>
              {mode === 'signIn' ? '¿Primera vez? Crea tu cuenta' : '¿Ya tienes cuenta? Inicia sesión'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center' },
  input: { borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16 },
  passwordRow: { position: 'relative', justifyContent: 'center' },
  passwordInput: { paddingRight: 48 },
  eyeButton: { position: 'absolute', right: 4, height: '100%', paddingHorizontal: 12, justifyContent: 'center' },
  cta: { paddingVertical: 16, alignItems: 'center' },
  dividerRow: { flexDirection: 'row', alignItems: 'center' },
  dividerLine: { flex: 1, height: 1 },
  oauthBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, paddingVertical: 14 },
});
