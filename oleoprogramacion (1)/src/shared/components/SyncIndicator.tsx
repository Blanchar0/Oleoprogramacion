import React, { useState, useEffect } from 'react';
import { Cloud, CloudOff, CloudCog, CloudLightning } from 'lucide-react';

export default function SyncIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOnline) {
    return (
      <div className="flex items-center gap-1.5 text-[10px] text-red-400 font-medium bg-red-950/20 px-2 py-1 rounded-full">
        <CloudOff className="w-3 h-3" />
        <span>Sin conexión · pendiente</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-[10px] text-green-500 font-medium bg-green-950/20 px-2 py-1 rounded-full">
      <Cloud className="w-3 h-3" />
      <span>Sincronizado</span>
    </div>
  );
}
