import { Tabs, useSegments } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { AppTabBar, MORE_TABS } from '@/components/AppTabBar';
import { TabSwipeArea } from '@/components/TabSwipeArea';

export default function TabsLayout() {
  // ['(tabs)'] en Inicio, ['(tabs)', 'movimientos'] en el resto. Los tipos
  // de expo-router lo declaran como tupla de un elemento, de ahí el ensanche.
  const segments = useSegments() as string[];
  const activeRoute = segments[1] ?? 'index';

  return (
    <TabSwipeArea activeRoute={activeRoute}>
      <View style={{ flex: 1 }}>
        <Tabs
          // La barra propia reemplaza por completo a la de serie: sin
          // etiquetas, con los íconos en círculos y el micrófono al centro.
          tabBar={() => <AppTabBar activeRoute={activeRoute} />}
          screenOptions={{
            headerShown: false,
            // Transparente para que el fondo del estilo visual (degradado o
            // color) se vea a través de las pantallas.
            sceneStyle: { backgroundColor: 'transparent' },
          }}
        >
          <Tabs.Screen name="index" />
          <Tabs.Screen name="movimientos" />
          <Tabs.Screen name="patrimonio" />
          {/* Estas tres siguen siendo pantallas normales, solo que se llega a
              ellas desde el "+" (o deslizando), no desde un botón fijo de la
              barra — así la barra se queda en 5 elementos. */}
          {MORE_TABS.map((tab) => (
            <Tabs.Screen key={tab.route} name={tab.route} />
          ))}
        </Tabs>
      </View>
    </TabSwipeArea>
  );
}
