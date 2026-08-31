import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ValuMark } from '@/components/ValuMark';
import { requestPasswordReset } from '@/services/auth/actions';
import { translateAuthError } from '@/services/auth/errorMessages';
import { useTheme } from '@/theme/ThemeProvider';

export default function ForgotPassword() {
  const { colors, typography, spacing, radius } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!email.includes('@')) {
      setError('Escribe un correo válido.');
      return;
    }
    setLoading(true);
    const result = await requestPasswordReset(email.trim());
    setLoading(false);
    if (!result.ok) {
      setError(translateAuthError(result.error));
      return;
    }
    setSent(true);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, flexDirection: 'row', alignItems: 'center' }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: spacing.md }}>
          <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
        </Pressable>
        <Text style={[typography.title, { color: colors.textPrimary }]}>Recuperar contraseña</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: spacing.xl, justifyContent: 'center', gap: spacing.lg }}>
          <View style={{ alignItems: 'center' }}>
            <ValuMark size={48} variant="ai" />
          </View>

          {sent ? (
            <View style={{ gap: spacing.sm, alignItems: 'center' }}>
              <Ionicons name="mail-outline" size={40} color={colors.accentFrom} />
              <Text style={[typography.headline, { color: colors.textPrimary, textAlign: 'center' }]}>Listo, revisa tu correo</Text>
              <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
                Te mandamos un enlace a {email.trim()} para que elijas una nueva contraseña. Si no lo ves en unos minutos, revisa la carpeta de spam.
              </Text>
              <Pressable onPress={() => router.replace('/auth')} style={{ marginTop: spacing.md }}>
                <Text style={[typography.caption, { color: colors.accentFrom, fontWeight: '700' }]}>Volver a iniciar sesión</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
                Escribe el correo con el que te registraste y te mandamos un enlace para elegir una nueva contraseña.
              </Text>
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
              {error.length > 0 && <Text style={[typography.caption, { color: colors.danger, textAlign: 'center' }]}>{error}</Text>}
              <Pressable
                onPress={handleSubmit}
                disabled={loading}
                style={[styles.cta, { borderRadius: radius.pill, backgroundColor: colors.accentFrom, opacity: loading ? 0.6 : 1 }]}
              >
                <Text style={[typography.headline, { color: '#FFFFFF' }]}>{loading ? 'Un momento...' : 'Enviar enlace'}</Text>
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
