interface ContadorCuotaIAProps {
  usadas: number;
  cuotaMensualIa: number;
  className?: string;
}

/**
 * Contador de cuota mensual de Carga con IA (docs/SITEMAP.md "Componente de
 * contador de cuota de IA", Criterio de Aceptación 1: "34/40" en `font-mono`,
 * sin tecnicismos). Componente puramente presentacional — la resolución de
 * sesión, rol, tenant y módulo activo vive en `page.tsx`, mismo criterio ya
 * usado por `MensajeError`/`ModalBloqueoSku`.
 */
export function ContadorCuotaIA({ usadas, cuotaMensualIa, className = "" }: ContadorCuotaIAProps) {
  return (
    <div className={`flex flex-col gap-1 rounded-md border border-slate-700 bg-slate-800 p-6 ${className}`}>
      <span className="text-xs text-slate-400">Cargas con IA usadas este mes</span>
      <span className="font-mono text-2xl text-slate-50">
        {usadas.toLocaleString("es-AR")}/{cuotaMensualIa.toLocaleString("es-AR")}
      </span>
    </div>
  );
}
