import { Ionicons } from '@expo/vector-icons';
import { Tabs, router } from 'expo-router';
import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ValuMark } from '@/components/ValuMark';
import { useTheme } from '@/theme/ThemeProvider';

function TabIcon({ name, focused }: { name: keyof typeof Ionicons.glyphMap; focused: boolean }) {
  const { colors } = useTheme();
  return <Ionicons name={name} size={22} color={focused ? colors.accentFrom : colors.textTertiary} />;
}

function VoiceFAB() {
  const { colors, radius } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Pressable
      accessibilityLabel="Registrar por voz"
      onPress={() => router.push('/capture')}
      style={[
        styles.fab,
        {
          bottom: (Platform.OS === 'ios' ? 58 : 54) + insets.bottom,
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
      <VoiceFAB />
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
