import { Ionicons } from '@expo/vector-icons';
import React, { useRef } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import type { ChatConversation } from '@/ai/chatTypes';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { surfaceShadow } from '@/theme/surfaceStyle';
import { useTheme } from '@/theme/ThemeProvider';

import { GlassSheen } from './GlassSheen';

const SIDEBAR_WIDTH = 280;

// Barra lateral de conversaciones — fija en tablet/escritorio (como
// cualquier chat de escritorio), y un cajón que se desliza desde la
// izquierda en móvil (mismo patrón de Modal + fondo para cerrar +
// animación que ya usa AccountDropdown.tsx, pero anclado a la izquierda y
// de alto completo en vez de un menú junto a un botón).
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
}) {
  const { isTablet } = useBreakpoint();
  const { colors, typography, spacing, radius, surface } = useTheme();

  const content = (
    <>
      <Pressable
        accessibilityLabel="Nueva conversación"
        onPress={onNewConversation}
        style={[styles.newBtn, { backgroundColor: colors.accentFrom, borderRadius: radius.pill }]}
      >
        <Ionicons name="add" size={18} color="#FFFFFF" />
        <Text style={{ color: '#FFFFFF', fontWeight: '700', marginLeft: 6 }}>Nueva conversación</Text>
      </Pressable>

      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        {frequentPrompts.length > 0 && (
          <View style={{ marginTop: spacing.lg }}>
            <Text style={[typography.caption, { color: colors.textTertiary, fontWeight: '700', marginBottom: spacing.sm }]}>FRECUENTES</Text>
            {frequentPrompts.map((prompt, i) => (
              <Pressable key={i} onPress={() => onSelectFrequent(prompt)} style={styles.frequentRow}>
                <Ionicons name="flash-outline" size={14} color={colors.accentFrom} />
                <Text style={[typography.caption, { color: colors.textPrimary, marginLeft: spacing.sm, flex: 1 }]} numberOfLines={1}>
                  {prompt}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        <View style={{ marginTop: spacing.lg }}>
          <Text style={[typography.caption, { color: colors.textTertiary, fontWeight: '700', marginBottom: spacing.sm }]}>HISTORIAL</Text>
          {conversations.length === 0 && (
            <Text style={[typography.caption, { color: colors.textTertiary }]}>Todavía no tienes conversaciones.</Text>
          )}
          {conversations.map((c) => {
            const isActive = c.id === activeConversationId;
            return (
              <Pressable
                key={c.id}
                onPress={() => onSelectConversation(c.id)}
                style={[styles.conversationRow, { backgroundColor: isActive ? colors.accentSoft : 'transparent', borderRadius: radius.md }]}
              >
                <Text
                  style={[typography.body, { color: isActive ? colors.accentFrom : colors.textPrimary, flex: 1, fontWeight: isActive ? '700' : '400' }]}
                  numberOfLines={1}
                >
                  {c.title || 'Nueva conversación'}
                </Text>
                <Pressable accessibilityLabel={`Borrar conversación ${c.title}`} onPress={() => onDeleteConversation(c.id)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={15} color={colors.textTertiary} />
                </Pressable>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </>
  );

  if (isTablet) {
    return (
      <View
        style={[
          styles.fixedColumn,
          { width: SIDEBAR_WIDTH, borderRightWidth: surface.borderWidth, borderRightColor: colors.surfaceBorder, padding: spacing.md },
        ]}
      >
        {content}
      </View>
    );
  }

  return <MobileDrawer visible={visible} onClose={onClose}>{content}</MobileDrawer>;
}

function MobileDrawer({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: React.ReactNode }) {
  const { colors, spacing, radius, surface } = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const anim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(anim, { toValue: visible ? 1 : 0, duration: 180, useNativeDriver: false }).start();
  }, [visible, anim]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable accessibilityLabel="Cerrar barra lateral" onPress={onClose} style={StyleSheet.absoluteFill} />
      <Animated.View
        style={[
          styles.drawer,
          {
            height: windowHeight,
            backgroundColor: colors.surfaceSolid,
            borderColor: colors.surfaceBorder,
            borderRightWidth: surface.borderWidth,
            borderTopRightRadius: radius.lg,
            borderBottomRightRadius: radius.lg,
            padding: spacing.md,
            opacity: anim,
            transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [-SIDEBAR_WIDTH, 0] }) }],
          },
          surfaceShadow(surface),
        ]}
      >
        {surface.blur > 0 && <GlassSheen radius={radius.lg} />}
        {children}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fixedColumn: { height: '100%' },
  drawer: { position: 'absolute', top: 0, left: 0, width: SIDEBAR_WIDTH, overflow: 'hidden' },
  newBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  frequentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  conversationRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8 },
});
