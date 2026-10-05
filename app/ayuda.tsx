import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassCard } from '@/components/GlassCard';
import { HelpTopicBody } from '@/components/HelpButton';
import { searchHelp, type HelpTopicId } from '@/help/helpTopics';
import { useTheme } from '@/theme/ThemeProvider';

export default function Ayuda() {
  const { colors, typography, spacing, radius } = useTheme();
  const params = useLocalSearchParams<{ tema?: string }>();
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(typeof params.tema === 'string' ? params.tema : null);
  const topics = searchHelp(query);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
        <Pressable accessibilityLabel="Regresar" onPress={() => router.back()} style={{ marginRight: spacing.md }}>
          <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
        </Pressable>
        <Text style={[typography.title, { color: colors.textPrimary }]}>Ayuda</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: 100 }} keyboardShouldPersistTaps="handled">
        <TextInput
          accessibilityLabel="Buscar en la ayuda"
          value={query}
          onChangeText={setQuery}
          placeholder="Busca: tarjeta, recordatorio, privacidad…"
          placeholderTextColor={colors.textTertiary}
          style={{
            color: colors.textPrimary,
            borderWidth: 1,
            borderColor: colors.surfaceBorder,
            borderRadius: radius.pill,
            paddingHorizontal: spacing.lg,
            paddingVertical: 12,
          }}
        />
        {topics.length === 0 && (
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            No encontré nada con esa palabra. Prueba con otra, o pregúntale al chat.
          </Text>
        )}
        {topics.map((t) => {
          const open = openId === t.id;
          return (
            <GlassCard key={t.id} style={{ gap: spacing.md }}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
                accessibilityLabel={t.title}
                onPress={() => setOpenId(open ? null : t.id)}
                style={{ flexDirection: 'row', alignItems: 'center' }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[typography.headline, { color: colors.textPrimary }]}>{t.title}</Text>
                  {!open && <Text style={[typography.caption, { color: colors.textSecondary }]}>{t.summary}</Text>}
                </View>
                <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
              </Pressable>
              {open && <HelpTopicBody topicId={t.id as HelpTopicId} />}
            </GlassCard>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
