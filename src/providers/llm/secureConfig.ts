import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { LLMProviderConfig } from './types';

const STORAGE_KEY = 'valu-ai-provider-config';

// La clave del usuario NUNCA se sincroniza con Supabase ni sale de este
// dispositivo — vive solo aquí, en el almacenamiento seguro del sistema
// operativo (Keychain en iOS, Keystore en Android). En web no existe un
// equivalente de sistema operativo, así que se usa localStorage: es menos
// seguro (cualquiera con acceso físico al navegador podría inspeccionarlo),
// y eso se le advierte al usuario en la pantalla de conexión.
const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

export async function getLLMProviderConfig(): Promise<LLMProviderConfig | null> {
  const raw = isNative ? await SecureStore.getItemAsync(STORAGE_KEY) : await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LLMProviderConfig;
  } catch {
    return null;
  }
}

export async function setLLMProviderConfig(config: LLMProviderConfig): Promise<void> {
  const raw = JSON.stringify(config);
  if (isNative) {
    await SecureStore.setItemAsync(STORAGE_KEY, raw);
  } else {
    await AsyncStorage.setItem(STORAGE_KEY, raw);
  }
}

export async function clearLLMProviderConfig(): Promise<void> {
  if (isNative) {
    await SecureStore.deleteItemAsync(STORAGE_KEY);
  } else {
    await AsyncStorage.removeItem(STORAGE_KEY);
  }
}

export const isSecureStorageNative = isNative;
