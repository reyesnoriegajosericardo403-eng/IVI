import AsyncStorage from '@react-native-async-storage/async-storage';

// Envoltura mínima sobre AsyncStorage para persistencia local (Fase 1).
// En Fase 2 esta misma interfaz se respalda además contra Supabase.
export const localStorage = {
  async get<T>(key: string): Promise<T | null> {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },
  async set<T>(key: string, value: T): Promise<void> {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  },
  async remove(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  },
};
