// Sustituto de los módulos nativos (expo-*, react-native) para probar la lógica en Node.
const crypto = require('crypto');
const handler = {
  get: (target, prop) => {
    if (prop === '__esModule') return true;
    if (prop === 'randomUUID') return () => crypto.randomUUID();
    if (prop === 'default') return proxy;
    return () => undefined;
  },
};
const proxy = new Proxy({}, handler);
module.exports = proxy;
