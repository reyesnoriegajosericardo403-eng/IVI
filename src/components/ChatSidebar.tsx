import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useRef, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';

import type { ChatConversation } from '@/ai/chatTypes';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { chatGlass, CHAT_PALETTE, type ChatPalette } from '@/theme/chatPalette';
import { useTheme } from '@/theme/ThemeProvider';

const SIDEBAR_WIDTH = 300;
const RAIL_WIDTH = 68;

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

// Barra lateral de conversaciones — fija en tablet/escritorio (contraíble a
// un riel de solo iconos con un botón), cajón deslizable en móvil. Paleta
// e iconos grandes a pedido explícito del usuario, con buscador arriba,
// fijados primero, y el resto del historial agrupado por fecha debajo.
export function ChatSidebar({
  conversations,
  activeConversationId,
  frequentPrompts,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation,
  onTogglePin,
  onClearAll,
  onOpenSettings,
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
  onRenameConversation: (id: string, title: string) => void;
  onTogglePin: (id: string) => void;
  onClearAll: () => void;
  onOpenSettings: () => void;
  onSelectFrequent: (text: string) => void;
  visible: boolean;
  onClose: () => void;
  palette: ChatPalette;
}) {
  const { isTablet } = useBreakpoint();
  const { spacing, typography } = useTheme();
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  const pinned = useMemo(() => conversations.filter((c) => c.pinned), [conversations]);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return conversations.filter((c) => !c.pinned);
    return conversations.filter((c) => !c.pinned && (normalize(c.title).includes(q) || normalize(c.lastPreview).includes(q)));
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

  const startRename = (c: ChatConversation) => {
    setRenamingId(c.id);
    setRenameValue(c.title);
  };
  const commitRename = () => {
    if (renamingId) onRenameConversation(renamingId, renameValue);
    setRenamingId(null);
  };

  const handleClearAll = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
      return;
    }
    setConfirmClear(false);
    onClearAll();
  };

  const renderConversationRow = (c: ChatConversation) => {
    const isActive = c.id === activeConversationId;
    const isRenaming = renamingId === c.id;
    return (
      <View key={c.id} style={[styles.conversationRow, { backgroundColor: isActive ? palette.surfaceActive : 'transparent' }]}>
        <Pressable onPress={() => onSelectConversation(c.id)} style={styles.conversationTap}>
          <Ionicons name="chatbubble-ellipses-outline" size={18} color={isActive ? palette.accent : palette.textTertiary} />
          {isRenaming ? (
            <TextInput
              value={renameValue}
              onChangeText={setRenameValue}
              onSubmitEditing={commitRename}
              onBlur={commitRename}
              autoFocus
              style={[styles.renameInput, { color: palette.textPrimary }]}
            />
          ) : (
            <Text
              style={[typography.body, { color: isActive ? palette.textPrimary : palette.textSecondary, flex: 1, fontWeight: isActive ? '700' : '400', marginLeft: spacing.sm }]}
              numberOfLines={1}
            >
              {c.title || 'Nueva conversación'}
            </Text>
          )}
        </Pressable>
        {!isRenaming && (
          <View style={styles.rowActions}>
            <Pressable accessibilityLabel={c.pinned ? `Dejar de fijar ${c.title}` : `Fijar ${c.title}`} onPress={() => onTogglePin(c.id)} hitSlop={8}>
              <Ionicons name={c.pinned ? 'star' : 'star-outline'} size={15} color={c.pinned ? palette.accent : palette.textTertiary} />
            </Pressable>
            <Pressable accessibilityLabel={`Renombrar conversación ${c.title}`} onPress={() => startRename(c)} hitSlop={8}>
              <Ionicons name="pencil-outline" size={15} color={palette.textTertiary} />
            </Pressable>
            <Pressable accessibilityLabel={`Borrar conversación ${c.title}`} onPress={() => onDeleteConversation(c.id)} hitSlop={8}>
              <Ionicons name="trash-outline" size={15} color={palette.textTertiary} />
            </Pressable>
          </View>
        )}
      </View>
    );
  };

  const content = (
    <>
      <View style={styles.topRow}>
        <Pressable accessibilityLabel="Nueva conversación" onPress={onNewConversation} style={[styles.newBtn, { backgroundColor: palette.accent }]}>
          <Ionicons name="add" size={22} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontWeight: '700', marginLeft: 8, fontSize: 15 }}>Nueva conversación</Text>
        </Pressable>
        {isTablet && (
          <Pressable accessibilityLabel="Contraer barra lateral" onPress={() => setCollapsed(true)} style={styles.collapseBtn}>
            <Ionicons name="chevron-back" size={18} color={palette.textSecondary} />
          </Pressable>
        )}
      </View>

      <View style={[styles.searchBox, chatGlass(), { marginTop: spacing.md }]}>
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

        {pinned.length > 0 && !query && (
          <View style={{ marginTop: spacing.lg }}>
            <Text style={[styles.sectionLabel, { color: palette.textTertiary }]}>FIJADAS</Text>
            {pinned.map(renderConversationRow)}
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
              {group.items.map(renderConversationRow)}
            </View>
          ))
        )}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: palette.surfaceBorder }]}>
        <Pressable accessibilityLabel="Ver conexión de IA" onPress={onOpenSettings} style={styles.footerBtn}>
          <Ionicons name="settings-outline" size={17} color={palette.textSecondary} />
          <Text style={[styles.footerBtnText, { color: palette.textSecondary }]}>Conectar IA</Text>
        </Pressable>
        {conversations.length > 0 && (
          <Pressable accessibilityLabel="Borrar todo el historial" onPress={handleClearAll} style={styles.footerBtn}>
            <Ionicons name="trash-outline" size={17} color={confirmClear ? palette.danger : palette.textSecondary} />
            <Text style={[styles.footerBtnText, { color: confirmClear ? palette.danger : palette.textSecondary }]} numberOfLines={1}>
              {confirmClear ? '¿Seguro? Toca de nuevo' : 'Borrar todo'}
            </Text>
          </Pressable>
        )}
      </View>
    </>
  );

  if (isTablet) {
    if (collapsed) {
      return (
        <View style={[styles.railColumn, { width: RAIL_WIDTH, backgroundColor: palette.background }]}>
          <Pressable accessibilityLabel="Expandir barra lateral" onPress={() => setCollapsed(false)} style={styles.railBtn}>
            <Ionicons name="chevron-forward" size={18} color={palette.textSecondary} />
          </Pressable>
          <Pressable accessibilityLabel="Nueva conversación" onPress={onNewConversation} style={[styles.railBtn, { backgroundColor: palette.accent, borderRadius: 20 }]}>
            <Ionicons name="add" size={20} color="#FFFFFF" />
          </Pressable>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center', gap: 10, paddingTop: 6 }}>
            {conversations.map((c) => {
              const isActive = c.id === activeConversationId;
              return (
                <Pressable
                  key={c.id}
                  accessibilityLabel={c.title}
                  onPress={() => onSelectConversation(c.id)}
                  style={[styles.railConversation, { backgroundColor: isActive ? palette.surfaceActive : 'transparent' }]}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={18} color={isActive ? palette.accent : palette.textTertiary} />
                  {c.pinned && <View style={[styles.railPinDot, { backgroundColor: palette.accent }]} />}
                </Pressable>
              );
            })}
          </ScrollView>
          <Pressable accessibilityLabel="Ver conexión de IA" onPress={onOpenSettings} style={styles.railBtn}>
            <Ionicons name="settings-outline" size={18} color={palette.textSecondary} />
          </Pressable>
        </View>
      );
    }
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
  railColumn: { height: '100%', alignItems: 'center', paddingVertical: 14, gap: 10 },
  railBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  railConversation: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  railPinDot: { position: 'absolute', top: 2, right: 2, width: 6, height: 6, borderRadius: 3 },
  drawer: { position: 'absolute', top: 0, left: 0, width: SIDEBAR_WIDTH, overflow: 'hidden' },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  newBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 16 },
  collapseBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: CHAT_PALETTE.glassBackground },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, paddingHorizontal: 12, height: 42 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 10 },
  frequentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  frequentIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  conversationRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 14 },
  conversationTap: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 6 },
  renameInput: { flex: 1, marginLeft: 8, fontSize: 15, paddingVertical: 2 },
  footer: { borderTopWidth: 1, paddingTop: 10, marginTop: 8, gap: 4 },
  footerBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 8 },
  footerBtnText: { fontSize: 13, fontWeight: '600' },
});
