import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getHelpTopic, type HelpTopicId } from '@/help/helpTopics';
import { useTheme } from '@/theme/ThemeProvider';

// Botón ⓘ que abre la ayuda de la pantalla en una hoja, sin sacarte de lo que estabas haciendo.
export function HelpTopicBody({ topicId }: { topicId: HelpTopicId }) {
  const { colors, typography, spacing, radius } = useTheme();
  const topic = getHelpTopic(topicId);
  return (
    <View style={{ gap: spacing.md }}>
      <Text style={[typography.body, { color: colors.textSecondary }]}>{topic.summary}</Text>
      <View style={{ gap: spacing.sm }}>
        {topic.steps.map((step, i) => (
          <View key={i} style={styles.stepRow}>
            <Text style={{ color: colors.accentFrom, fontWeight: '700', width: 18 }}>•</Text>
            <Text style={[typography.body, { color: colors.textPrimary, flex: 1 }]}>{step}</Text>
          </View>
        ))}
      </View>
      {topic.tips && topic.tips.length > 0 && (
        <View style={{ backgroundColor: colors.accentSoft, borderRadius: radius.md, padding: spacing.md, gap: spacing.xs }}>
          {topic.tips.map((tip, i) => (
            <Text key={i} style={[typography.caption, { color: colors.textPrimary }]}>
              {tip}
            </Text>
          ))}
        </View>
      )}
      {topic.examples && topic.examples.length > 0 && (
        <View style={{ gap: spacing.xs }}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>PUEDES DECIRLE AL CHAT</Text>
          {topic.examples.map((ex, i) => (
            <Text key={i} style={[typography.body, { color: colors.textPrimary }]}>
              «{ex.text}»
            </Text>
          ))}
        </View>
      )}
      {topic.privacy && (
        <View style={styles.stepRow}>
          <Ionicons name="shield-checkmark-outline" size={16} color={colors.textSecondary} style={{ marginRight: 6, marginTop: 2 }} />
          <Text style={[typography.caption, { color: colors.textSecondary, flex: 1 }]}>{topic.privacy}</Text>
        </View>
      )}
    </View>
  );
}

export function HelpButton({ topic }: { topic: HelpTopicId }) {
  const { colors, typography, spacing, radius } = useTheme();
  const [open, setOpen] = useState(false);
  const data = getHelpTopic(topic);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Ayuda: ${data.title}`}
        onPress={() => setOpen(true)}
        hitSlop={8}
        style={styles.btn}
      >
        <Ionicons name="help-circle-outline" size={22} color={colors.textSecondary} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <Pressable accessibilityLabel="Cerrar ayuda" onPress={() => setOpen(false)} style={StyleSheet.absoluteFill} />
          <View
            style={[
              styles.sheet,
              { backgroundColor: colors.background, borderColor: colors.surfaceBorder, borderRadius: radius.lg, padding: spacing.lg },
            ]}
          >
            <View style={[styles.stepRow, { alignItems: 'center', marginBottom: spacing.md }]}>
              <Text style={[typography.title, { color: colors.textPrimary, flex: 1 }]}>{data.title}</Text>
              <Pressable accessibilityLabel="Cerrar" onPress={() => setOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <HelpTopicBody topicId={topic} />
              <Pressable
                accessibilityLabel="Ver toda la ayuda"
                onPress={() => {
                  setOpen(false);
                  router.push('/ayuda');
                }}
                style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}
              >
                <Text style={{ color: colors.accentFrom, fontWeight: '700' }}>Ver toda la ayuda →</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  btn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  sheet: { width: '100%', maxWidth: 520, maxHeight: '85%', borderWidth: 1 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start' },
});
