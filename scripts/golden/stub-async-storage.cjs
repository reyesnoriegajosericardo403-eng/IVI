// AsyncStorage en memoria para probar el store en Node.
const mem = new Map();
module.exports = {
  __esModule: true,
  default: {
    getItem: async (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: async (k, v) => { mem.set(k, v); },
    removeItem: async (k) => { mem.delete(k); },
    clear: async () => mem.clear(),
  },
};
