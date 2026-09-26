import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { usePressToTalk } from '@/hooks/usePressToTalk';
import type { ChatPalette } from '@/theme/chatPalette';

const MAX_MESSAGE_LENGTH = 500;

// Compositor tipo píldora (referencia: barra de entrada de un asistente de
// IA) con micrófono integrado — hablar y escribir mandan al mismo lugar
// (`onSend`). El micrófono reutiliza usePressToTalk (mantener presionado
// para hablar, soltar para transcribir y enviar de una vez, igual que la
// captura de voz de siempre) en vez de pedir confirmación de texto aparte
// — lo que SÍ pide confirmación explícita es cualquier acción sobre datos
// que la respuesta proponga (ChatActionCard), nunca el envío del mensaje.
export function ChatComposer({
  onSend,
  disabled,
  palette,
}: {
  onSend: (text: string) => void;
  disabled?: boolean;
  palette: ChatPalette;
}) {
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
    <View style={[styles.wrap, { backgroundColor: palette.surfaceSolid, borderColor: palette.surfaceBorder }]}>
      {isListening ? (
        <>
          <View style={styles.listeningDot} />
          <Text style={[styles.listeningText, { color: palette.textSecondary, flex: 1 }]} numberOfLines={1}>
            Te escucho… suelta para enviar
          </Text>
          <Pressable accessibilityLabel="Cancelar grabación" onPress={cancel} style={styles.iconBtn}>
            <Ionicons name="close" size={22} color={palette.textSecondary} />
          </Pressable>
        </>
      ) : (
        <>
          <TextInput
            value={value}
            onChangeText={setValue}
            onSubmitEditing={() => submit(value)}
            placeholder="Escríbele a VALU…"
            placeholderTextColor={palette.textTertiary}
            maxLength={MAX_MESSAGE_LENGTH}
            editable={!disabled}
            style={[styles.input, { color: palette.textPrimary }]}
          />
          {micAvailable && (
            <Pressable
              accessibilityLabel="Mantén presionado para hablar"
              onPressIn={pressIn}
              disabled={disabled}
              style={[styles.micBtn, { backgroundColor: 'rgba(255,255,255,0.08)', opacity: disabled ? 0.5 : 1 }]}
            >
              <Ionicons name="mic" size={20} color={palette.textPrimary} />
            </Pressable>
          )}
          <Pressable
            accessibilityLabel="Enviar mensaje"
            onPress={() => submit(value)}
            disabled={disabled || !value.trim()}
            style={[styles.sendBtn, { backgroundColor: palette.accent, opacity: disabled || !value.trim() ? 0.4 : 1 }]}
          >
            <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 28, paddingLeft: 22, paddingRight: 8, paddingVertical: 8, gap: 10 },
  input: { flex: 1, fontSize: 16, paddingVertical: 10 },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  micBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  sendBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  listeningDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
  listeningText: { fontSize: 14, fontWeight: '600', marginLeft: 8 },
});
