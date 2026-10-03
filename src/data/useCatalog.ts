import { useEffect, useState } from 'react';

import { getCatalogRevision } from './categories';
import { loadExtendedCatalog, onCatalogStatus } from './catalogLoader';

// Pantallas que muestran/buscan palabras del catálogo (búsqueda de categoría): piden el vocabulario
// ampliado al abrirse y se vuelven a pintar cuando llega. Devuelve la revisión del catálogo para usarla
// como dependencia de useMemo (`[..., revision]`).
export function useCatalogRevision(): number {
  const [revision, setRevision] = useState(getCatalogRevision());
  useEffect(() => {
    const off = onCatalogStatus(() => setRevision(getCatalogRevision()));
    setRevision(getCatalogRevision());
    void loadExtendedCatalog();
    return off;
  }, []);
  return revision;
}
