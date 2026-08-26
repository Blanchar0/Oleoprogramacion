import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // Detectar iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    
    if (isIosDevice && !isStandalone) {
      setIsIOS(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    
    if (choiceResult.outcome === 'accepted') {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  if (isDismissed) return null;
  if (!isInstallable && !isIOS) return null;

  return (
    <>
      <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white rounded-2xl p-3 shadow-lg border border-emerald-700/50 flex items-center justify-between gap-3 my-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 bg-white/10 rounded-xl shrink-0">
            <Smartphone className="w-5 h-5 text-emerald-300" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-100 truncate">
              Instalar Oleoprogramación
            </h4>
            <p className="text-[11px] text-emerald-200/90 leading-tight">
              Úsala sin internet directo desde tu pantalla de inicio.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleInstallClick}
            className="flex items-center gap-1 bg-white text-emerald-950 hover:bg-emerald-50 px-3 py-1.5 rounded-xl text-xs font-black transition-all shadow-xs active:scale-95 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Instalar</span>
          </button>
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="p-1 hover:bg-white/10 rounded-lg text-emerald-300 transition-colors"
            title="Cerrar aviso"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Modal Guía iOS */}
      {showIOSGuide && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
                Instalar en iPhone / iPad
              </h3>
              <button 
                type="button" 
                onClick={() => setShowIOSGuide(false)}
                className="text-zinc-400 hover:text-zinc-600 font-bold"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Para instalar esta app en tu pantalla de inicio desde Safari:
            </p>
            <ol className="text-xs text-zinc-700 dark:text-zinc-300 space-y-2 list-decimal list-inside font-medium">
              <li>Toca el botón <strong>Compartir</strong> (ícono de cuadro con flecha hacia arriba ⎋) en la barra inferior de Safari.</li>
              <li>Desliza hacia abajo y selecciona <strong>"Agregar a pantalla de inicio"</strong>.</li>
              <li>Toca <strong>"Agregar"</strong> en la esquina superior derecha.</li>
            </ol>
            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-wider"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};
