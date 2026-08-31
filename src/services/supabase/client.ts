import 'react-native-url-polyfill/auto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { secureSessionStorage } from './secureSessionStorage';

// Lee las credenciales desde variables de entorno EXPO_PUBLIC_* (Expo las
// incrusta en el bundle del cliente en tiempo de build — ver .env.example
// en la raíz del proyecto). Nunca se hardcodean claves en el código.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// La app debe seguir funcionando en modo local si todavía no se conectó
// un proyecto Supabase real (spec sección 20: "la interfaz no debe
// romperse si no existe integración directa").
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const supabaseProjectUrl = supabaseUrl;
export const supabaseAnonPublicKey = supabaseAnonKey;

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string, {
      auth: {
        storage: secureSessionStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;
