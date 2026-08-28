import { Redirect } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useAuthSession } from '@/services/auth/useAuthSession';
import { isSupabaseConfigured } from '@/services/supabase/client';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';

export default function Index() {
  const { colors } = useTheme();
  const { loading, userId } = useAuthSession();
  const onboardingComplete = useAppStore((s) => s.profile.onboardingComplete);

  if (isSupabaseConfigured && loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.accentFrom} />
      </View>
    );
  }

  if (isSupabaseConfigured && !userId) {
    return <Redirect href="/auth" />;
  }

  return <Redirect href={onboardingComplete ? '/(tabs)' : '/onboarding'} />;
}
