import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ValuMark } from '@/components/ValuMark';
import { establishSessionFromUrl, updatePassword } from '@/services/auth/actions';
import { translateAuthError } from '@/services/auth/errorMessages';
import { useTheme } from '@/theme/ThemeProvider';

type Status = 'checking' | 'ready' | 'invalid' | 'done';

export default function ResetPassword() {
  const { colors, typography, spacing, radius } = useTheme();
  const [status, setStatus] = useState<Status>('checking');
  const [linkError, setLinkError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const result = await establishSessionFromUrl();
      if (result.ok) {
        setStatus('ready');
      } else {
        setLinkError(translateAuthError(result.error));
        setStatus('invalid');
      }
    })();
  }, []);

  const handleSubmit = async () => {
    setError('');
    if (password.length < 6) {
      setError('Tu contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setLoading(true);
    const result = await updatePassword(password);
    setLoading(false);
    if (!result.ok) {
      setError(translateAuthError(result.error));
      return;
    }
    setStatus('done');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: spacing.xl, justifyContent: 'center', gap: spacing.lg }}>
          <View style={{ alignItems: 'center' }}>
            <ValuMark size={48} variant="ai" />
          </View>

          {status === 'checking' && (
            <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>Verificando tu enlace...</Text>
          )}

          {status === 'invalid' && (
            <View style={{ gap: spacing.sm, alignItems: 'center' }}>
              <Ionicons name="alert-circle-outline" size={40} color={colors.danger} />
              <Text style={[typography.headline, { color: colors.textPrimary, textAlign: 'center' }]}>Este enlace ya no sirve</Text>
              <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>{linkError}</Text>
              <Pressable onPress={() => router.replace('/forgot-password')} style={{ marginTop: spacing.md }}>
                <Text style={[typography.caption, { color: colors.accentFrom, fontWeight: '700' }]}>Pedir un enlace nuevo</Text>
              </Pressable>
            </View>
          )}

          {status === 'done' && (
            <View style={{ gap: spacing.sm, alignItems: 'center' }}>
              <Ionicons name="checkmark-circle-outline" size={40} color={colors.success} />
              <Text style={[typography.headline, { color: colors.textPrimary, textAlign: 'center' }]}>Contraseña actualizada</Text>
              <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
                Ya puedes seguir usando la app con tu nueva contraseña.
              </Text>
              <Pressable onPress={() => router.replace('/')} style={{ marginTop: spacing.md }}>
                <Text style={[typography.caption, { color: colors.accentFrom, fontWeight: '700' }]}>Continuar</Text>
              </Pressable>
            </View>
          )}

          {status === 'ready' && (
            <>
              <Text style={[typography.headline, { color: colors.textPrimary, textAlign: 'center' }]}>Elige tu nueva contraseña</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Nueva contraseña"
                placeholderTextColor={colors.textTertiary}
                secureTextEntry
                autoCapitalize="none"
                style={[
                  styles.input,
                  { color: colors.textPrimary, borderColor: colors.surfaceBorder, borderRadius: radius.md, backgroundColor: colors.surfaceSolid },
                ]}
              />
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirmar contraseña"
                placeholderTextColor={colors.textTertiary}
                secureTextEntry
                autoCapitalize="none"
                style={[
                  styles.input,
                  { color: colors.textPrimary, borderColor: colors.surfaceBorder, borderRadius: radius.md, backgroundColor: colors.surfaceSolid },
                ]}
              />
              {error.length > 0 && <Text style={[typography.caption, { color: colors.danger, textAlign: 'center' }]}>{error}</Text>}
              <Pressable
                onPress={handleSubmit}
                disabled={loading}
                style={[styles.cta, { borderRadius: radius.pill, backgroundColor: colors.accentFrom, opacity: loading ? 0.6 : 1 }]}
              >
                <Text style={[typography.headline, { color: '#FFFFFF' }]}>{loading ? 'Un momento...' : 'Guardar nueva contraseña'}</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16 },
  cta: { paddingVertical: 16, alignItems: 'center' },
});
