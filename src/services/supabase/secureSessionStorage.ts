import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// La sesión de Supabase (el JWT de acceso y el refresh token) se guarda
// en el almacenamiento seguro del sistema operativo — Keychain en iOS,
// Keystore/EncryptedSharedPreferences en Android — en vez del
// AsyncStorage plano que usa por defecto el SDK. Mismo patrón que ya se
// usa para la clave de IA del usuario (secureConfig.ts). En web no existe
// un equivalente de sistema operativo, así que se usa localStorage (vía
// AsyncStorage) — es la misma limitación que ya se le advierte al
// usuario para la clave de IA.
const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

export const secureSessionStorage = {
  getItem: (key: string) => (isNative ? SecureStore.getItemAsync(key) : AsyncStorage.getItem(key)),
  setItem: (key: string, value: string) => (isNative ? SecureStore.setItemAsync(key, value) : AsyncStorage.setItem(key, value)),
  removeItem: (key: string) => (isNative ? SecureStore.deleteItemAsync(key) : AsyncStorage.removeItem(key)),
};
