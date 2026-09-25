import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, View } from 'react-native';

import type { Currency } from '@/data/types';
import { useTheme } from '@/theme/ThemeProvider';

import { AccountCardVisual } from './AccountCard';

const CARD_HEIGHT = 150;
const CARD_HEIGHT_COMPACT = 110;
// Cuánto asoma cada tarjeta detrás de la que tiene enfrente — lo justo
// para ver ícono, nombre y tipo, sin el saldo (spec: "que estas se
// sobrepongan la una sobre otra", como en la imagen de referencia estilo
// Wallet).
const PEEK = 92;
const PEEK_COMPACT = 64;
const TAP_THRESHOLD = 10;
const DRAG_CYCLE_THRESHOLD = 60;

export interface AccountStackItem {
  id: string;
  name: string;
  typeLabel: string;
  balance: number;
  currency: Currency;
  color: string;
  iconName: string;
}

// Una tarjeta dentro de la pila: su propio PanResponder distingue toque
// de arrastre (igual que ya hace `TemplateDragHandle` para las fichas de
// presupuesto) — un ref "más reciente" evita el bug de closures obsoletas
// que ya se corrigió ahí, ya que el PanResponder se crea una sola vez por
// tarjeta pero sus datos (si es la de enfrente, cuánto se ha arrastrado)
// cambian en cada render.
function StackedCard({
  item,
  isFront,
  dragX,
  dragY,
  onTap,
  onDragCycle,
  onDelete,
  accessibilityLabel,
  compact,
}: {
  item: AccountStackItem;
  isFront: boolean;
  dragX: Animated.Value;
  dragY: Animated.Value;
  onTap: () => void;
  onDragCycle: () => void;
  onDelete?: () => void;
  accessibilityLabel: string;
  compact: boolean;
}) {
  const { radius } = useTheme();
  const latest = useRef({ isFront, onTap, onDragCycle });
  latest.current = { isFront, onTap, onDragCycle };
  // Qué tan "horizontal" se siente el arrastre en curso — se usa para
  // decidir si esta tarjeta se defiende de que alguien más (ej. el
  // deslizamiento entre TABs) le quite el gesto a medio camino (spec: "hay
  // fichas las cuales tengo que deslizar de izquierda a derecha y la app
  // lo confunde como si me quisiera desplazar dentro de la app").
  const gestureAxis = useRef<'none' | 'horizontal' | 'vertical'>('none');

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > TAP_THRESHOLD || Math.abs(gesture.dx) > TAP_THRESHOLD,
      onPanResponderMove: (_, gesture) => {
        if (!latest.current.isFront) return;
        gestureAxis.current = Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.2 ? 'horizontal' : 'vertical';
        dragX.setValue(gesture.dx);
        dragY.setValue(gesture.dy);
      },
      // Mientras el arrastre en curso sea claramente horizontal, esta
      // tarjeta NUNCA cede el gesto — así un deslizamiento entre TABs que
      // pase por encima no se lo puede robar a medias. Un arrastre
      // vertical (o sin definir aún) sí puede cederse, para no romper el
      // scroll normal de la pantalla.
      onPanResponderTerminationRequest: () => gestureAxis.current !== 'horizontal',
      onPanResponderRelease: (_, gesture) => {
        if (latest.current.isFront) {
          Animated.spring(dragX, { toValue: 0, useNativeDriver: false, friction: 9 }).start();
          Animated.spring(dragY, { toValue: 0, useNativeDriver: false, friction: 9 }).start();
        }
        const dragged = Math.abs(gesture.dy) > TAP_THRESHOLD || Math.abs(gesture.dx) > TAP_THRESHOLD;
        const cyclePassed = Math.abs(gesture.dy) > DRAG_CYCLE_THRESHOLD || Math.abs(gesture.dx) > DRAG_CYCLE_THRESHOLD;
        if (latest.current.isFront && dragged && cyclePassed) {
          latest.current.onDragCycle();
        } else if (!dragged) {
          latest.current.onTap();
        }
        // Un arrastre que no llegó al umbral simplemente se queda —
        // dragX/dragY ya regresaron a 0 arriba.
        gestureAxis.current = 'none';
      },
      onPanResponderTerminate: () => {
        if (latest.current.isFront) {
          Animated.spring(dragX, { toValue: 0, useNativeDriver: false }).start();
          Animated.spring(dragY, { toValue: 0, useNativeDriver: false }).start();
        }
        gestureAxis.current = 'none';
      },
    })
  ).current;

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={[styles.clip, { borderRadius: compact ? radius.md : radius.lg }]}
      {...panResponder.panHandlers}
    >
      <AccountCardVisual
        name={item.name}
        typeLabel={item.typeLabel}
        balance={item.balance}
        currency={item.currency}
        color={item.color}
        iconName={item.iconName}
        onDelete={isFront ? onDelete : undefined}
        compact={compact}
      />
    </View>
  );
}

// Pila de tarjetas superpuestas, con dimensiones de tarjeta real — no
// fichas planas de lista (spec: "las quiero ver y mover como tarjetas...
// que estas se sobrepongan la una sobre otra para que yo solo las
// deslice y pueda agarrar la que quiera"). Dos formas de "agarrar"
// cualquiera: tocar una que asoma atrás la trae al frente; arrastrar la
// de enfrente (vertical U horizontal, lo que se sienta más natural) la
// manda hasta atrás, revelando la siguiente — spec: "hay fichas las
// cuales tengo que deslizar de izquierda a derecha".
export function AccountCardStack({
  items,
  onFrontPress,
  onDelete,
  frontLabelPrefix = 'Editar',
  compact = false,
}: {
  items: AccountStackItem[];
  onFrontPress?: (id: string) => void;
  onDelete?: (id: string) => void;
  frontLabelPrefix?: string;
  // La de Inicio es de solo lectura y más chica (spec: "deben ser mas
  // pequeñas a los lados"); Patrimonio usa el tamaño normal.
  compact?: boolean;
}) {
  const { radius } = useTheme();
  const cardHeight = compact ? CARD_HEIGHT_COMPACT : CARD_HEIGHT;
  const peek = compact ? PEEK_COMPACT : PEEK;
  const cardRadius = compact ? radius.md : radius.lg;
  const [order, setOrder] = useState<string[]>(() => items.map((i) => i.id));
  const positions = useRef<Map<string, Animated.Value>>(new Map());
  const dragX = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const idsKey = items.map((i) => i.id).join(',');

  // Mantener `order` sincronizado si se agregan o quitan cuentas — las
  // nuevas entran hasta atrás, sin desordenar las que ya estaban.
  useEffect(() => {
    setOrder((prev) => {
      const ids = idsKey ? idsKey.split(',') : [];
      const idSet = new Set(ids);
      const kept = prev.filter((id) => idSet.has(id));
      const added = ids.filter((id) => !kept.includes(id));
      return [...added, ...kept];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  order.forEach((id, index) => {
    if (!positions.current.has(id)) positions.current.set(id, new Animated.Value(index));
  });

  useEffect(() => {
    order.forEach((id, index) => {
      const anim = positions.current.get(id);
      if (!anim) return;
      Animated.spring(anim, { toValue: index, useNativeDriver: false, friction: 9, tension: 60 }).start();
    });
  }, [order]);

  const bringToFront = (id: string) => {
    setOrder((prev) => (prev[prev.length - 1] === id ? prev : [...prev.filter((x) => x !== id), id]));
  };

  const sendToBack = (id: string) => {
    setOrder((prev) => [id, ...prev.filter((x) => x !== id)]);
  };

  const frontId = order[order.length - 1];

  if (items.length === 0) return null;

  const containerHeight = (order.length - 1) * peek + cardHeight;

  return (
    <View style={{ height: containerHeight }}>
      {order.map((id) => {
        const item = itemById.get(id);
        const anim = positions.current.get(id);
        if (!item || !anim) return null;
        const isFront = id === frontId;
        const translateY = Animated.add(Animated.multiply(anim, peek), isFront ? dragY : 0);
        const translateX = isFront ? dragX : 0;

        return (
          <Animated.View
            key={id}
            style={[
              styles.slotShadow,
              { borderRadius: cardRadius, transform: [{ translateY }, { translateX }], zIndex: order.indexOf(id) },
            ]}
          >
            <StackedCard
              item={item}
              isFront={isFront}
              dragX={dragX}
              dragY={dragY}
              accessibilityLabel={isFront ? `${frontLabelPrefix} ${item.name}` : `Traer ${item.name} al frente`}
              onTap={() => (isFront ? onFrontPress?.(id) : bringToFront(id))}
              onDragCycle={() => sendToBack(id)}
              onDelete={onDelete ? () => onDelete(id) : undefined}
              compact={compact}
            />
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  slotShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
  clip: { width: '100%', overflow: 'hidden' },
});
