import { Redirect } from 'expo-router';
import React from 'react';

import { useAppStore } from '@/store/useAppStore';

export default function Index() {
  const onboardingComplete = useAppStore((s) => s.profile.onboardingComplete);
  return <Redirect href={onboardingComplete ? '/(tabs)' : '/onboarding'} />;
}
