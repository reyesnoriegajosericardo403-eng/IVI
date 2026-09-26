import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useRef, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';

import type { ChatConversation } from '@/ai/chatTypes';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import type { ChatPalette } from '@/theme/chatPalette';
import { useTheme } from '@/theme/ThemeProvider';

const SIDEBAR_WIDTH = 300;

const GROUP_ORDER = ['Hoy', 'Ayer', 'Últimos 7 días', 'Anteriores'] as const;

function dateGroup(iso: string): (typeof GROUP_ORDER)[number] {
  const startOfDay = (ms: number) => {
    const d = new Date(ms);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  };
  const diffDays = Math.round((startOfDay(Date.now()) - startOfDay(new Date(iso).getTime())) / 86400000);
  if (diffDays <= 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays <= 7) return 'Últimos 7 días';
  return 'Anteriores';
}

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

// Barra lateral de conversaciones — fija en tablet/escritorio, cajón
// deslizable en móvil. Paleta e iconos grandes a pedido explícito del
// usuario, calcada de su referencia (buscador arriba, historial agrupado
// por fecha debajo).
export function ChatSidebar({
  conversations,
  activeConversationId,
  frequentPrompts,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onSelectFrequent,
  visible,
  onClose,
  palette,
}: {
  conversations: ChatConversation[];
  activeConversationId: string | null;
  frequentPrompts: string[];
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onSelectFrequent: (text: string) => void;
  visible: boolean;
  onClose: () => void;
  palette: ChatPalette;
}) {
  const { isTablet } = useBreakpoint();
  const { spacing, typography } = useTheme();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return conversations;
    return conversations.filter((c) => normalize(c.title).includes(q) || normalize(c.lastPreview).includes(q));
  }, [conversations, query]);

  const grouped = useMemo(() => {
    const buckets = new Map<string, ChatConversation[]>();
    for (const c of filtered) {
      const g = dateGroup(c.updatedAt);
      if (!buckets.has(g)) buckets.set(g, []);
      buckets.get(g)!.push(c);
    }
    return GROUP_ORDER.map((g) => ({ label: g, items: buckets.get(g) ?? [] })).filter((g) => g.items.length > 0);
  }, [filtered]);

  const content = (
    <>
      <Pressable accessibilityLabel="Nueva conversación" onPress={onNewConversation} style={[styles.newBtn, { backgroundColor: palette.accent }]}>
        <Ionicons name="add" size={22} color="#FFFFFF" />
        <Text style={{ color: '#FFFFFF', fontWeight: '700', marginLeft: 8, fontSize: 15 }}>Nueva conversación</Text>
      </Pressable>

      <View style={[styles.searchBox, { backgroundColor: palette.surface, borderColor: palette.surfaceBorder, marginTop: spacing.md }]}>
        <Ionicons name="search" size={18} color={palette.textTertiary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar conversaciones"
          placeholderTextColor={palette.textTertiary}
          style={[styles.searchInput, { color: palette.textPrimary }]}
        />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }} showsVerticalScrollIndicator={false}>
        {frequentPrompts.length > 0 && !query && (
          <View style={{ marginTop: spacing.lg }}>
            <Text style={[styles.sectionLabel, { color: palette.textTertiary }]}>FRECUENTES</Text>
            {frequentPrompts.map((prompt, i) => (
              <Pressable key={i} onPress={() => onSelectFrequent(prompt)} style={styles.frequentRow}>
                <View style={[styles.frequentIcon, { backgroundColor: palette.accentSoft }]}>
                  <Ionicons name="flash" size={16} color={palette.accent} />
                </View>
                <Text style={[typography.body, { color: palette.textPrimary, marginLeft: spacing.sm, flex: 1, fontSize: 14 }]} numberOfLines={1}>
                  {prompt}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {grouped.length === 0 ? (
          <Text style={[styles.sectionLabel, { color: palette.textTertiary, marginTop: spacing.lg }]}>
            {query ? 'Sin resultados.' : 'Todavía no tienes conversaciones.'}
          </Text>
        ) : (
          grouped.map((group) => (
            <View key={group.label} style={{ marginTop: spacing.lg }}>
              <Text style={[styles.sectionLabel, { color: palette.textTertiary }]}>{group.label.toUpperCase()}</Text>
              {group.items.map((c) => {
                const isActive = c.id === activeConversationId;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => onSelectConversation(c.id)}
                    style={[styles.conversationRow, { backgroundColor: isActive ? palette.surfaceActive : 'transparent' }]}
                  >
                    <Ionicons name="chatbubble-ellipses-outline" size={18} color={isActive ? palette.accent : palette.textTertiary} />
                    <Text
                      style={[
                        typography.body,
                        { color: isActive ? palette.textPrimary : palette.textSecondary, flex: 1, fontWeight: isActive ? '700' : '400', marginLeft: spacing.sm },
                      ]}
                      numberOfLines={1}
                    >
                      {c.title || 'Nueva conversación'}
                    </Text>
                    <Pressable accessibilityLabel={`Borrar conversación ${c.title}`} onPress={() => onDeleteConversation(c.id)} hitSlop={10}>
                      <Ionicons name="trash-outline" size={17} color={palette.textTertiary} />
                    </Pressable>
                  </Pressable>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>
    </>
  );

  if (isTablet) {
    return <View style={[styles.fixedColumn, { width: SIDEBAR_WIDTH, backgroundColor: palette.background, padding: spacing.md }]}>{content}</View>;
  }

  return (
    <MobileDrawer visible={visible} onClose={onClose} palette={palette}>
      {content}
    </MobileDrawer>
  );
}

function MobileDrawer({
  visible,
  onClose,
  children,
  palette,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  palette: ChatPalette;
}) {
  const { spacing } = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const anim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(anim, { toValue: visible ? 1 : 0, duration: 200, useNativeDriver: false }).start();
  }, [visible, anim]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable accessibilityLabel="Cerrar barra lateral" onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)' }]} />
      <Animated.View
        style={[
          styles.drawer,
          {
            height: windowHeight,
            backgroundColor: palette.background,
            padding: spacing.md,
            opacity: anim,
            transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [-SIDEBAR_WIDTH, 0] }) }],
          },
        ]}
      >
        {children}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fixedColumn: { height: '100%' },
  drawer: { position: 'absolute', top: 0, left: 0, width: SIDEBAR_WIDTH, overflow: 'hidden' },
  newBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 16 },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, height: 42 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 10 },
  frequentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  frequentIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  conversationRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 10, borderRadius: 12, gap: 4 },
});
