// src/shared/components/SupervisorAlertBanner.tsx
// Banner in-app de alta visibilidad para recordar y advertir al supervisor en sus horarios clave

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { repository } from '../AgronomicRepository';
import { useNavigate } from 'react-router-dom';
import { 
  evaluateSupervisorSchedule, 
  getNotificationPermission, 
  requestNotificationPermission, 
  AppNotification 
} from '../notificationService';
import { AlertTriangle, Clock, Bell, ArrowRight, ShieldAlert, Sparkles, Check } from 'lucide-react';
import { Button } from '@/src/components/ui';

export default function SupervisorAlertBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [programmings, setProgrammings] = useState<any[]>([]);
  const [permission, setPermission] = useState<NotificationPermission>(getNotificationPermission());
  const [activeAlert, setActiveAlert] = useState<{
    type: AppNotification['type'];
    level: AppNotification['level'];
    title: string;
    message: string;
    targetDate: string;
    actionUrl: string;
  } | null>(null);

  // Solo aplica para supervisores
  if (user?.role !== 'SUPERVISOR' || !user?.idSupervisor) {
    return null;
  }

  // Suscripción a programaciones de hoy y mañana
  useEffect(() => {
    const unsub = repository.subscribeProgramming({}, (progs) => {
      setProgrammings(progs || []);
    });
    return () => unsub();
  }, []);

  // Evaluar estado periódicamente cada 30 segundos o al cargar
  useEffect(() => {
    const checkStatus = () => {
      const { activeAlert: currentAlert } = evaluateSupervisorSchedule(
        user.idSupervisor!,
        user.name || 'Supervisor',
        programmings
      );
      setActiveAlert(currentAlert);
    };

    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, [user, programmings]);

  const handleRequestPermission = async () => {
    const res = await requestNotificationPermission();
    setPermission(res);
  };

  if (!activeAlert) {
    return null;
  }

  const isEmergency = activeAlert.level === 'emergency';
  const isUrgent = activeAlert.level === 'urgent';
  const isWarning = activeAlert.level === 'warning';

  return (
    <div className="mb-4 transition-all animate-in fade-in slide-in-from-top-2 duration-300">
      <div 
        className={`p-3.5 sm:p-4 rounded-xl shadow-md border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-sm ${
          isEmergency 
            ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white border-red-700 ring-2 ring-red-400/50' 
            : isUrgent 
            ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white border-orange-700 ring-2 ring-orange-300/40' 
            : isWarning 
            ? 'bg-amber-50 text-amber-950 border-amber-300' 
            : 'bg-emerald-50 text-emerald-950 border-emerald-300'
        }`}
      >
        <div className="flex items-start gap-3 flex-1">
          <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
            isEmergency 
              ? 'bg-white/20 text-white animate-pulse' 
              : isUrgent 
              ? 'bg-white/20 text-white' 
              : isWarning 
              ? 'bg-amber-200 text-amber-900' 
              : 'bg-emerald-200 text-emerald-900'
          }`}>
            {isEmergency ? (
              <ShieldAlert size={20} />
            ) : isUrgent ? (
              <AlertTriangle size={20} />
            ) : (
              <Clock size={20} />
            )}
          </div>
          
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-extrabold tracking-wide uppercase text-xs">
                {activeAlert.title}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                isEmergency || isUrgent 
                  ? 'bg-white/25 text-white' 
                  : 'bg-black/10 text-gray-800'
              }`}>
                Fecha: {activeAlert.targetDate}
              </span>
            </div>
            <p className={`text-xs leading-relaxed ${isEmergency || isUrgent ? 'text-white/95' : 'text-gray-700'}`}>
              {activeAlert.message}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-center shrink-0">
          {permission !== 'granted' && (
            <Button
              type="button"
              onClick={handleRequestPermission}
              className="text-xs h-8 px-2.5 bg-black/20 hover:bg-black/35 text-white border border-white/25 flex items-center gap-1.5 cursor-pointer rounded-lg"
              title="Activar avisos en mi celular o navegador"
            >
              <Bell size={13} />
              <span>Activar avisos en móvil</span>
            </Button>
          )}

          <Button
            type="button"
            onClick={() => navigate(activeAlert.actionUrl)}
            className={`text-xs font-black uppercase tracking-wider h-8.5 px-3.5 rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer transition-transform hover:scale-102 ${
              isEmergency 
                ? 'bg-white text-red-700 hover:bg-red-50' 
                : isUrgent 
                ? 'bg-white text-orange-800 hover:bg-orange-50' 
                : 'bg-forest-900 text-white hover:bg-forest-950'
            }`}
          >
            <span>Programar Ahora</span>
            <ArrowRight size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}
