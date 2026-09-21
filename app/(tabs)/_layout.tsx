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
          screenOptions={({ route }) => ({
            headerShown: false,
            sceneStyle: {
              // Transparente para que el fondo del estilo visual (degradado
              // o color) se vea a través de las pantallas.
              backgroundColor: 'transparent',
              // CRÍTICO: en la versión web, react-native-screens no está
              // disponible, así que el navegador de tabs cae a un <View>
              // normal para cada pantalla y las apila con posición absoluta
              // (zIndex) en vez de ocultarlas de verdad. Antes de este
              // "display", una pantalla transparente dejaba ver TODAS las
              // pantallas ya visitadas apiladas debajo de ella. Ocultando
              // aquí explícitamente cada escena que no es la activa, solo
              // se pinta una a la vez (y su estado se conserva igual).
              display: route.name === activeRoute ? 'flex' : 'none',
            },
          })}
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
