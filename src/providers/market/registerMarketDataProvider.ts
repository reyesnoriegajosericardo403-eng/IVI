import { isSupabaseConfigured } from '@/services/supabase/client';
import { unavailableMarketDataProvider } from '../local/unavailableMarketDataProvider';
import { setMarketDataProvider } from '../registry';
import { relayMarketDataProvider } from './relayMarketDataProvider';

// A diferencia de la IA (BYOK, una clave por usuario), los precios de
// mercado son un recurso compartido del dueño de la app — no depende de
// que el usuario configure nada, solo de que Supabase esté conectado
// (para tener dónde esconder la clave del proveedor de precios).
export function registerMarketDataProvider(): void {
  setMarketDataProvider(isSupabaseConfigured ? relayMarketDataProvider : unavailableMarketDataProvider);
}
