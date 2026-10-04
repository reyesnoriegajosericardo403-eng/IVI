// Configuración de Metro (empaquetador). Parte de la de Expo y agrega UNA cosa, solo para la versión web:
// react-native-reanimated (≈700 KB sin comprimir, ≈175 KB comprimido: ~19% de lo que se descarga al abrir la app)
// entra al paquete únicamente porque react-native-gesture-handler lo pide de forma OPCIONAL (un require dentro de un
// try/catch en handlers/gestures/reanimatedWrapper.js). La app no lo usa en ningún lado (sus animaciones son de
// react-native `Animated`), así que en web se le dice a Metro que ese módulo "no existe": gesture-handler ya sabe
// vivir sin él (cae a su ruta sin reanimated). En iOS/Android nativos no cambia nada.
// Si algún día una pantalla importa reanimated, quitar este bloque (o la app web se quedará sin esa animación).
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const upstreamResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && (moduleName === 'react-native-reanimated' || moduleName.startsWith('react-native-reanimated/'))) {
    throw new Error(`Módulo omitido a propósito en web (ver metro.config.js): ${moduleName}`);
  }
  return upstreamResolve ? upstreamResolve(context, moduleName, platform) : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
