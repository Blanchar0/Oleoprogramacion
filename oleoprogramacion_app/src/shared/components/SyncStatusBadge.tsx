import React, { useState } from 'react';
import { useSyncStatus } from '../syncManager';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

export const SyncStatusBadge: React.FC = () => {
  const {
    isOnline,
    pendingCount,
    isSyncing,
    lastSyncTime,
    lastError,
    syncNow,
    discardMachineryPendingItems,
  } = useSyncStatus();
  const [showDetails, setShowDetails] = useState(false);
  const [clearMessage, setClearMessage] = useState<string | null>(null);

  const handleManualSync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isSyncing && isOnline) {
      await syncNow();
    }
  };

  const handleDiscardMachinery = async () => {
    const confirmed = window.confirm(
      'Se eliminarán solo las operaciones de maquinaria pendientes en este dispositivo. No se modificarán programaciones, inasistencias ni registros ya guardados. ¿Deseas continuar?'
    );
    if (!confirmed) return;

    const removed = await discardMachineryPendingItems();
    setClearMessage(
      removed > 0
        ? `${removed} pendiente${removed === 1 ? '' : 's'} de maquinaria eliminado${removed === 1 ? '' : 's'} de este dispositivo.`
        : 'No había pendientes de maquinaria en este dispositivo.'
    );
  };

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black transition-all border shadow-xs select-none ${
          !isOnline
            ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-700'
            : isSyncing
            ? 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/80 dark:text-blue-200 dark:border-blue-700 animate-pulse'
            : pendingCount > 0
            ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-700'
            : 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-200 dark:border-emerald-700'
        }`}
        title="Estado de conexión y sincronización"
      >
        {!isOnline ? (
          <>
            <WifiOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="hidden sm:inline">SIN SEÑAL</span>
            {pendingCount > 0 && (
              <span className="bg-amber-600 text-white rounded-full px-1.5 py-0.2 text-[10px] font-black">
                {pendingCount}
              </span>
            )}
          </>
        ) : isSyncing ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 animate-spin shrink-0" />
            <span className="hidden sm:inline">SINCRONIZANDO</span>
          </>
        ) : pendingCount > 0 ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="hidden sm:inline">PENDIENTES</span>
            <span className="bg-amber-600 text-white rounded-full px-1.5 py-0.2 text-[10px] font-black">
              {pendingCount}
            </span>
          </>
        ) : (
          <>
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-ping" />
            <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0 -ml-3.5" />
            <Wifi className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="hidden md:inline">EN LÍNEA</span>
          </>
        )}
      </button>

      {/* Popover de Detalles y Sincronización Manual */}
      {showDetails && (
        <>
          {/* Backdrop en móvil para cerrar al tocar afuera */}
          <div 
            className="fixed inset-0 bg-black/40 z-40 sm:hidden" 
            onClick={() => setShowDetails(false)} 
          />
          <div 
            className="fixed left-3 right-3 top-16 sm:absolute sm:left-0 sm:right-auto sm:top-full sm:mt-2 w-auto sm:w-80 max-w-sm rounded-2xl bg-white dark:bg-zinc-900 shadow-2xl border border-zinc-200 dark:border-zinc-800 p-4 z-50 animate-in fade-in zoom-in-95 duration-150 mx-auto sm:mx-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <Wifi className="w-4 h-4 text-emerald-600" />
                ) : (
                  <WifiOff className="w-4 h-4 text-amber-600" />
                )}
                <span className="font-bold text-xs uppercase tracking-wide text-zinc-900 dark:text-zinc-100">
                  {isOnline ? 'Conexión Activa' : 'Modo Offline (Sin Señal)'}
                </span>
              </div>
              <button 
                type="button" 
                onClick={() => setShowDetails(false)}
                className="text-zinc-400 hover:text-zinc-600 text-xs font-bold px-1"
              >
                ✕
              </button>
            </div>

            <div className="py-3 space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
              <div className="flex justify-between items-center">
                <span>Reportes en celular:</span>
                <span className={`font-black px-2 py-0.5 rounded-md ${
                  pendingCount > 0 
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200' 
                    : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                }`}>
                  {pendingCount} pendientes
                </span>
              </div>

              {lastSyncTime && (
                <div className="flex justify-between items-center text-[11px] text-zinc-400">
                  <span>Última sincronización:</span>
                  <span>{lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              )}

              {lastError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-2.5 text-[11px] text-red-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <p>
                    <span className="font-black">No se pudo enviar un registro.</span>{' '}
                    {lastError}
                  </p>
                </div>
              )}

              {clearMessage && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-[11px] text-emerald-800 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                  <p>{clearMessage}</p>
                </div>
              )}

              {!isOnline && (
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl p-2.5 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                  <p>
                    Puedes seguir reportando programaciones, inasistencias y maquinaria normalmente. Se guardarán en el teléfono y se subirán al detectar señal.
                  </p>
                </div>
              )}
            </div>

            {isOnline && (
              <div className="space-y-2">
                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={handleManualSync}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black transition-all shadow-sm active:scale-98 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Sincronizando datos...' : 'Sincronizar ahora'}
                </button>
                {pendingCount > 0 && (
                  <button
                    type="button"
                    disabled={isSyncing}
                    onClick={handleDiscardMachinery}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50 rounded-xl text-xs font-black transition-all cursor-pointer"
                  >
                    Descartar pendientes de maquinaria
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
