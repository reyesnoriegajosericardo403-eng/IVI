import { Ionicons } from '@expo/vector-icons';
import { Tabs, router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ValuMark } from '@/components/ValuMark';
import { useTheme } from '@/theme/ThemeProvider';

function TabIcon({ name, focused }: { name: keyof typeof Ionicons.glyphMap; focused: boolean }) {
  const { colors } = useTheme();
  return <Ionicons name={name} size={22} color={focused ? colors.accentFrom : colors.textTertiary} />;
}

// Alto extra del tab bar, por encima de lo que ya agrega el safe-area
// inset — sube toda la barra un poco del borde físico de la pantalla
// (spec: "el TAB... la mitad desaparece") y, de paso, deja espacio de
// sobra para que el FAB del micrófono (que flota a una distancia fija del
// borde) nunca quede encima de una pestaña (spec: "el ícono del
// micrófono está por encima del TAB... dificulta elegir la pestaña").
const TAB_BAR_EXTRA_HEIGHT = 14;
const FAB_CLEARANCE_ABOVE_TAB_BAR = 20;

function VoiceFAB({ tabBarHeight }: { tabBarHeight: number }) {
  const { colors, radius } = useTheme();

  return (
    <Pressable
      accessibilityLabel="Registrar por voz"
      onPress={() => router.push('/capture')}
      style={[
        styles.fab,
        {
          bottom: tabBarHeight + FAB_CLEARANCE_ABOVE_TAB_BAR,
          borderRadius: radius.pill,
          backgroundColor: colors.accentFrom,
        },
      ]}
    >
      <Ionicons name="mic" size={26} color="#FFFFFF" />
    </Pressable>
  );
}

export default function TabsLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = 49 + insets.bottom + TAB_BAR_EXTRA_HEIGHT;

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.accentFrom,
          tabBarInactiveTintColor: colors.textTertiary,
          tabBarStyle: {
            backgroundColor: colors.tabBarBackground,
            borderTopColor: colors.divider,
            height: tabBarHeight,
            paddingBottom: insets.bottom + TAB_BAR_EXTRA_HEIGHT,
            paddingTop: 6,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{ title: 'Inicio', tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} /> }}
        />
        <Tabs.Screen
          name="movimientos"
          options={{ title: 'Movimientos', tabBarIcon: ({ focused }) => <TabIcon name="list" focused={focused} /> }}
        />
        <Tabs.Screen
          name="patrimonio"
          options={{ title: 'Patrimonio', tabBarIcon: ({ focused }) => <TabIcon name="pie-chart" focused={focused} /> }}
        />
        <Tabs.Screen
          name="inversiones"
          options={{ title: 'Inversiones', tabBarIcon: ({ focused }) => <TabIcon name="bar-chart" focused={focused} /> }}
        />
        <Tabs.Screen
          name="metas"
          options={{ title: 'Metas', tabBarIcon: ({ focused }) => <TabIcon name="flag" focused={focused} /> }}
        />
        <Tabs.Screen
          name="ia"
          options={{
            title: 'IA',
            tabBarIcon: () => <ValuMark size={22} variant="ai" />,
          }}
        />
      </Tabs>
      <VoiceFAB tabBarHeight={tabBarHeight} />
    </View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    alignSelf: 'center',
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F46E5',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
});
