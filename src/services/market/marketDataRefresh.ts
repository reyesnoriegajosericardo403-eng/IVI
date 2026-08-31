import { providers } from '@/providers/registry';
import { selectActiveInvestments } from '@/store/selectors';
import { useAppStore } from '@/store/useAppStore';
import { isUsMarketOpenNow } from '@/utils/marketHours';

// Pide los precios de las posiciones que el usuario tiene registradas.
// Salta la llamada cuando el mercado está cerrado y ya tenemos al menos
// un precio guardado — no tiene caso gastar la cuota del proveedor por un
// precio que no va a cambiar hasta que abra de nuevo (spec: "no tiene
// caso actualizar el precio de acciones cuando no está" abierto). La
// única excepción es la primera vez (para mostrar al menos el último
// cierre) o cuando el usuario pide actualizar a mano (`force`).
export async function refreshMarketData(force = false): Promise<void> {
  const { investments, liveQuotes, setLiveQuotes, setCetesRates } = useAppStore.getState();
  const active = selectActiveInvestments(investments);
  const tickers = Array.from(new Set(active.map((i) => i.ticker)));
  if (tickers.length === 0) return;

  const missingAny = tickers.some((t) => !liveQuotes[t]);
  if (!force && !isUsMarketOpenNow() && !missingAny) return;

  const hasCetes = active.some((i) => i.assetClass === 'cetes');
  const [quotes, cetesRates] = await Promise.all([
    providers.marketData.getQuotes(tickers),
    hasCetes ? providers.marketData.getCetesRates() : Promise.resolve(null),
  ]);
  setLiveQuotes(quotes);
  if (cetesRates) setCetesRates(cetesRates);
}
