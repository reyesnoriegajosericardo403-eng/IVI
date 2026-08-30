import { useEffect } from 'react';

import { refreshMarketData } from './marketDataRefresh';

const REFRESH_INTERVAL_MS = 15 * 60 * 1000;

// Se monta una sola vez en la raíz de la app (igual que useSyncEngine):
// pide precios al abrir y reprograma la siguiente actualización cada 15
// minutos (spec: "se reprograme la actualización de datos dentro de 15
// minutos"). No hace nada si no hay inversiones registradas o no hay un
// proveedor de mercado real conectado.
export function useMarketDataRefresh() {
  useEffect(() => {
    refreshMarketData();
    const interval = setInterval(() => refreshMarketData(), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);
}
