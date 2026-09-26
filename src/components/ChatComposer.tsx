import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type ViewStyle } from 'react-native';

import { usePressToTalk } from '@/hooks/usePressToTalk';
import { useTheme } from '@/theme/ThemeProvider';

const MAX_MESSAGE_LENGTH = 500;

// Compositor tipo píldora (referencia: barra de entrada de Framer AI) con
// micrófono integrado — hablar y escribir mandan al mismo lugar
// (`onSend`). El micrófono reutiliza usePressToTalk (mantener presionado
// para hablar, soltar para transcribir y enviar de una vez, igual que la
// captura de voz de siempre) en vez de pedir confirmación de texto aparte
// — lo que SÍ pide confirmación explícita es cualquier acción sobre datos
// que la respuesta proponga (ChatActionCard), nunca el envío del mensaje.
export function ChatComposer({
  onSend,
  disabled,
  cardColor,
  borderColor,
  extraStyle,
}: {
  onSend: (text: string) => void;
  disabled?: boolean;
  cardColor: string;
  borderColor: string;
  // Desenfoque/sombra "líquidos" del vidrio de esta pantalla
  // (theme/intensifyGlass.ts) — se pasan ya resueltos en vez de que este
  // componente conozca la pantalla que lo usa.
  extraStyle?: ViewStyle;
}) {
  const { colors, radius } = useTheme();
  const [value, setValue] = useState('');

  const submit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
  };

  const { status: micStatus, isAvailable: micAvailable, pressIn, cancel } = usePressToTalk((transcript) => submit(transcript));
  const isListening = micStatus === 'listening';

  return (
    <View style={[styles.wrap, { backgroundColor: cardColor, borderColor, borderRadius: radius.pill }, extraStyle]}>
      {isListening ? (
        <>
          <View style={styles.listeningDot} />
          <Text style={[styles.listeningText, { color: colors.textSecondary, flex: 1 }]} numberOfLines={1}>
            Te escucho… suelta para enviar
          </Text>
          <Pressable accessibilityLabel="Cancelar grabación" onPress={cancel} style={styles.iconBtn}>
            <Ionicons name="close" size={20} color={colors.textSecondary} />
          </Pressable>
        </>
      ) : (
        <>
          <TextInput
            value={value}
            onChangeText={setValue}
            onSubmitEditing={() => submit(value)}
            placeholder="Pregunta algo o pide un cambio…"
            placeholderTextColor={colors.textTertiary}
            maxLength={MAX_MESSAGE_LENGTH}
            editable={!disabled}
            style={[styles.input, { color: colors.textPrimary }]}
          />
          {micAvailable && (
            <Pressable
              accessibilityLabel="Mantén presionado para hablar"
              onPressIn={pressIn}
              disabled={disabled}
              style={[styles.iconBtn, { opacity: disabled ? 0.5 : 1 }]}
            >
              <Ionicons name="mic-outline" size={20} color={colors.textSecondary} />
            </Pressable>
          )}
          <Pressable
            accessibilityLabel="Enviar mensaje"
            onPress={() => submit(value)}
            disabled={disabled || !value.trim()}
            style={[styles.sendBtn, { backgroundColor: colors.accentFrom, borderRadius: radius.pill, opacity: disabled || !value.trim() ? 0.5 : 1 }]}
          >
            <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingLeft: 18, paddingRight: 6, paddingVertical: 6, gap: 8 },
  input: { flex: 1, fontSize: 15, paddingVertical: 8 },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  sendBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  listeningDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
  listeningText: { fontSize: 14, fontWeight: '600', marginLeft: 8 },
});
