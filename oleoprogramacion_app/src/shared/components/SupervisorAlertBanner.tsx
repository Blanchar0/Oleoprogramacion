import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Bell, Clock, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { repository } from '../AgronomicRepository';
import {
  evaluateSupervisorSchedule,
  getNotificationPermission,
  requestNotificationPermission,
  type AppNotification,
} from '../notificationService';
import { Button } from '@/src/components/ui';

const permissionDismissedKey = (supervisorId: string) => `oleo_notification_permission_dismissed_${supervisorId}`;

export default function SupervisorAlertBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const supervisorId = user?.role === 'SUPERVISOR' ? user.idSupervisor : undefined;
  const [programmings, setProgrammings] = useState<any[]>([]);
  const [programmingLoaded, setProgrammingLoaded] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>(getNotificationPermission());
  const [permissionPreferenceLoaded, setPermissionPreferenceLoaded] = useState(false);
  const [permissionDismissed, setPermissionDismissed] = useState(false);
  const [activeAlert, setActiveAlert] = useState<{
    type: AppNotification['type'];
    level: AppNotification['level'];
    title: string;
    message: string;
    targetDate: string;
    actionUrl: string;
  } | null>(null);

  useEffect(() => {
    if (!supervisorId) {
      setProgrammings([]);
      setProgrammingLoaded(false);
      return;
    }

    setProgrammingLoaded(false);
    const unsubscribe = repository.subscribeProgramming({}, (items) => {
      setProgrammings(items || []);
      setProgrammingLoaded(true);
    });
    return () => unsubscribe();
  }, [supervisorId]);

  useEffect(() => {
    if (!supervisorId) {
      setPermissionPreferenceLoaded(false);
      setPermissionDismissed(false);
      return;
    }

    const refreshPermission = () => setPermission(getNotificationPermission());
    refreshPermission();
    setPermissionDismissed(localStorage.getItem(permissionDismissedKey(supervisorId)) === 'true');
    setPermissionPreferenceLoaded(true);
    document.addEventListener('visibilitychange', refreshPermission);
    return () => document.removeEventListener('visibilitychange', refreshPermission);
  }, [supervisorId]);

  useEffect(() => {
    if (!supervisorId || !programmingLoaded) {
      setActiveAlert(null);
      return;
    }

    const checkStatus = () => {
      const { activeAlert: currentAlert } = evaluateSupervisorSchedule(
        supervisorId,
        user?.name || 'Supervisor',
        programmings,
      );
      setActiveAlert(currentAlert);
    };

    checkStatus();
    const interval = window.setInterval(checkStatus, 30000);
    return () => window.clearInterval(interval);
  }, [supervisorId, user?.name, programmings, programmingLoaded]);

  const handleRequestPermission = async () => {
    setPermission(await requestNotificationPermission());
  };

  const dismissPermissionPrompt = () => {
    if (!supervisorId) return;
    localStorage.setItem(permissionDismissedKey(supervisorId), 'true');
    setPermissionDismissed(true);
  };

  if (!supervisorId) return null;

  const showPermissionPrompt = permissionPreferenceLoaded && permission === 'default' && !permissionDismissed;
  if (!activeAlert && !showPermissionPrompt) return null;

  const isEmergency = activeAlert?.level === 'emergency';
  const isUrgent = activeAlert?.level === 'urgent';
  const isWarning = activeAlert?.level === 'warning';

  return (
    <div className="mb-4 space-y-3 transition-all animate-in fade-in slide-in-from-top-2 duration-300">
      {showPermissionPrompt && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 shadow-sm sm:p-4">
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-amber-200 p-2 text-amber-900"><Bell size={20} /></div>
              <div>
                <p className="text-sm font-extrabold text-amber-950">Activa las alertas de programación</p>
                <p className="mt-0.5 text-xs leading-relaxed text-amber-900">Recibirás recordatorios solo cuando todavía no tengas programación confirmada.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Button type="button" onClick={dismissPermissionPrompt} className="h-8 bg-transparent px-2.5 text-xs font-bold text-amber-900 hover:bg-amber-100">Ahora no</Button>
              <Button type="button" onClick={handleRequestPermission} className="h-8 bg-amber-700 px-3 text-xs font-bold text-white hover:bg-amber-800"><Bell size={13} /> Activar</Button>
            </div>
          </div>
        </div>
      )}

      {activeAlert && (
        <div className={`flex flex-col items-start justify-between gap-3 rounded-xl border p-3.5 text-sm shadow-md md:flex-row md:items-center sm:p-4 ${
          isEmergency ? 'border-red-700 bg-gradient-to-r from-red-600 to-rose-700 text-white ring-2 ring-red-400/50'
            : isUrgent ? 'border-orange-700 bg-gradient-to-r from-amber-600 to-orange-600 text-white ring-2 ring-orange-300/40'
              : isWarning ? 'border-amber-300 bg-amber-50 text-amber-950'
                : 'border-emerald-300 bg-emerald-50 text-emerald-950'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 rounded-lg p-2 ${isEmergency || isUrgent ? 'bg-white/20 text-white' : isWarning ? 'bg-amber-200 text-amber-900' : 'bg-emerald-200 text-emerald-900'}`}>
              {isEmergency ? <ShieldAlert size={20} /> : isUrgent ? <AlertTriangle size={20} /> : <Clock size={20} />}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wide">{activeAlert.title}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isEmergency || isUrgent ? 'bg-white/25 text-white' : 'bg-black/10 text-gray-800'}`}>Fecha: {activeAlert.targetDate}</span>
              </div>
              <p className={`text-xs leading-relaxed ${isEmergency || isUrgent ? 'text-white/95' : 'text-gray-700'}`}>{activeAlert.message}</p>
            </div>
          </div>
          <Button type="button" onClick={() => navigate(activeAlert.actionUrl)} className={`h-8.5 self-end px-3.5 text-xs font-black uppercase tracking-wider md:self-center ${isEmergency ? 'bg-white text-red-700 hover:bg-red-50' : isUrgent ? 'bg-white text-orange-800 hover:bg-orange-50' : 'bg-forest-900 text-white hover:bg-forest-950'}`}>
            Programar ahora <ArrowRight size={14} />
          </Button>
        </div>
      )}
    </div>
  );
}
