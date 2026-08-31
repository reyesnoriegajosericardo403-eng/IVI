import { Platform } from 'react-native';

import { useAppStore } from '@/store/useAppStore';

// Exporta todo lo que la app guarda de ti en un solo archivo JSON que
// puedes abrir, revisar o llevarte a otro lado — portabilidad de datos
// (spec: "cumpla con los reglamentos... empezando por Norteamérica").
// Solo web por ahora: no hay una forma de compartir archivos en nativo
// sin agregar una dependencia nueva (expo-sharing/expo-file-system).
export function exportAllDataAsJson(): { ok: boolean; message: string } {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return { ok: false, message: 'Por ahora, exportar tus datos solo está disponible en la versión web.' };
  }

  const state = useAppStore.getState();
  const payload = {
    exportadoEl: new Date().toISOString(),
    perfil: state.profile,
    cuentas: state.accounts,
    movimientos: state.transactions,
    presupuestos: state.budgets,
    metas: state.goals,
    inversiones: state.investments,
    deudas: state.liabilities,
    historialPatrimonioNeto: state.netWorthHistory,
    bitacoraDeAuditoria: state.auditLog,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `valu-mis-datos-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return { ok: true, message: 'Descarga iniciada.' };
}
