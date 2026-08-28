import { router } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ValuMark } from '@/components/ValuMark';
import { signInWithEmail, signUpWithEmail } from '@/services/auth/actions';
import { useTheme } from '@/theme/ThemeProvider';

type Mode = 'signIn' | 'signUp';

export default function Auth() {
  const { colors, typography, spacing, radius } = useTheme();
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!email.includes('@') || password.length < 6) {
      setError('Escribe un correo válido y una contraseña de al menos 6 caracteres.');
      return;
    }
    setLoading(true);
    const result = mode === 'signIn' ? await signInWithEmail(email.trim(), password) : await signUpWithEmail(email.trim(), password);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? 'Algo salió mal. Intenta de nuevo.');
      return;
    }
    if (mode === 'signUp') {
      setError('Cuenta creada. Revisa tu correo si te pedimos confirmarlo, luego inicia sesión.');
      setMode('signIn');
      return;
    }
    router.replace('/');
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
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Contraseña"
              placeholderTextColor={colors.textTertiary}
              secureTextEntry
              style={[
                styles.input,
                { color: colors.textPrimary, borderColor: colors.surfaceBorder, borderRadius: radius.md, backgroundColor: colors.surfaceSolid },
              ]}
            />
          </View>

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

          <Pressable onPress={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')} style={{ alignItems: 'center' }}>
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
  cta: { paddingVertical: 16, alignItems: 'center' },
});
