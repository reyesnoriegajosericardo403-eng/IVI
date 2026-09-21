import { useEffect } from 'react';

import { supabase } from '@/services/supabase/client';
import { useAppStore } from '@/store/useAppStore';
import { parseRemoteVisualStyle } from '@/theme/themeRegistry';
import type { VisualStyleDefinition } from '@/theme/visualStyles';

// Devuelve null cuando la consulta FALLÓ (sin red, sin sesión, error del
// servidor) y una lista cuando funcionó — aunque venga vacía. La diferencia
// importa: ante un fallo se conserva el catálogo que ya se había guardado, y
// solo una respuesta buena lo reemplaza.
export async function fetchRemoteVisualStyles(): Promise<VisualStyleDefinition[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('ui_themes').select('*');
    if (error || !data) return null;
    // Cada fila es información externa: si viene mal formada se descarta sin
    // tumbar la app ni la pantalla de Ajustes.
    return data
      .map((row: unknown) => parseRemoteVisualStyle(row))
      .filter((style): style is VisualStyleDefinition => style !== null);
  } catch {
    return null;
  }
}

// Descarga el catálogo al abrir la app y cuando cambia la sesión. Lo guardado
// se conserva para que el estilo elegido siga aplicándose sin conexión.
export function useRemoteVisualStyles(userId: string | null | undefined) {
  const setRemoteVisualStyles = useAppStore((s) => s.setRemoteVisualStyles);

  useEffect(() => {
    let cancelled = false;
    fetchRemoteVisualStyles().then((styles) => {
      if (cancelled || styles === null) return;
      setRemoteVisualStyles(styles);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, setRemoteVisualStyles]);
}
