// src/shared/components/NotificationCenter.tsx
// Campanita de Notificaciones In-App y Centro de Avisos para la cabecera

import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, CheckCheck, Clock, AlertTriangle, ShieldAlert, Sparkles, Smartphone, Check, ExternalLink, Trash2 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { 
  getStoredNotifications, 
  markAllNotificationsAsRead, 
  getNotificationPermission, 
  requestNotificationPermission,
  AppNotification 
} from '../notificationService';

export default function NotificationCenter() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>(getNotificationPermission());
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const loadNotifications = () => {
    setNotifications(getStoredNotifications());
  };

  useEffect(() => {
    loadNotifications();

    const handleUpdate = () => loadNotifications();
    window.addEventListener('oleo-notifications-updated', handleUpdate);
    
    // Cerrar al hacer clic afuera
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('oleo-notifications-updated', handleUpdate);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleRequestPermission = async () => {
    const res = await requestNotificationPermission();
    setPermission(res);
  };

  const handleNotificationClick = (notif: AppNotification) => {
    setIsOpen(false);
    if (notif.actionUrl) {
      navigate(notif.actionUrl);
    }
  };

  if (user?.role === 'DIRECTIVO') return null;
  const isSupervisor = user?.role === 'SUPERVISOR';

  return (
    <div className="relative" ref={panelRef}>
      {/* Botón Campana */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-white/90 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 md:text-forest-800 md:hover:text-forest-950 md:bg-transparent md:hover:bg-forest-100/70 md:border-forest-200 transition-all cursor-pointer flex items-center justify-center shadow-2xs"
        title="Centro de notificaciones y avisos"
        aria-label="Notificaciones"
      >
        <Bell size={20} className={unreadCount > 0 ? 'text-amber-300 md:text-forest-900 animate-bounce' : 'text-white md:text-forest-700'} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white font-black text-[10px] w-4.5 h-4.5 rounded-full flex items-center justify-center shadow-xs ring-2 ring-white">
            {unreadCount > 9 ? '+9' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel Desplegable */}
      {isOpen && (
        <>
          {/* Backdrop en móvil para cerrar al tocar afuera */}
          <div 
            className="fixed inset-0 bg-black/40 z-40 sm:hidden" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="fixed left-3 right-3 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-96 max-w-sm mx-auto sm:mx-0 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[82vh]">
            {/* Cabecera del Centro de Notificaciones */}
            <div className="p-3.5 bg-forest-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-emerald-300" />
                <h3 className="font-bold text-xs uppercase tracking-wider">Avisos y Notificaciones</h3>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => markAllNotificationsAsRead()}
                    className="text-[11px] text-emerald-200 hover:text-white flex items-center gap-1 font-medium cursor-pointer transition-colors"
                    title="Marcar todas como leídas"
                  >
                    <CheckCheck size={13} />
                    <span>Marcar leídas</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="sm:hidden text-gray-300 hover:text-white p-1 text-xs font-bold"
                  title="Cerrar"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Banner de Permiso de Notificaciones del Teléfono si no está activado */}
            {isSupervisor && permission === 'default' && (
              <div className="p-3 bg-amber-50 border-b border-amber-200 flex items-center justify-between gap-2 text-xs shrink-0">
                <div className="flex items-center gap-2 text-amber-900 font-medium">
                  <Smartphone size={16} className="shrink-0 text-amber-700" />
                  <span>Recibir alertas fuera de la app</span>
                </div>
                <button
                  type="button"
                  onClick={handleRequestPermission}
                  className="px-2.5 py-1 bg-amber-700 hover:bg-amber-800 text-white font-bold text-[10px] rounded-lg cursor-pointer transition-all shrink-0"
                >
                  Activar
                </button>
              </div>
            )}

            {/* Lista de Notificaciones */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {notifications.length === 0 ? (
                <div className="py-10 text-center text-gray-400 text-xs px-4">
                  <Bell size={28} className="mx-auto mb-2 opacity-30 text-gray-400" />
                  <p className="font-medium text-gray-600">No hay notificaciones recientes</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Los recordatorios de horarios (12pm, 5pm, 5am, 6am, 7am) aparecerán aquí.</p>
                </div>
              ) : (
                notifications.map((notif) => {
                  const isEmergency = notif.level === 'emergency';
                  const isUrgent = notif.level === 'urgent';
                  const isWarning = notif.level === 'warning';

                  return (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`p-3 hover:bg-gray-50 transition-colors cursor-pointer flex items-start gap-2.5 ${
                        !notif.read ? 'bg-forest-50/40' : ''
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                        isEmergency 
                          ? 'bg-red-100 text-red-700' 
                          : isUrgent 
                          ? 'bg-orange-100 text-orange-700' 
                          : isWarning 
                          ? 'bg-amber-100 text-amber-800' 
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {isEmergency ? (
                          <ShieldAlert size={16} />
                        ) : isUrgent || isWarning ? (
                          <AlertTriangle size={16} />
                        ) : (
                          <Clock size={16} />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className={`text-[11px] font-black uppercase truncate ${
                            isEmergency ? 'text-red-800' : isUrgent ? 'text-orange-900' : 'text-forest-950'
                          }`}>
                            {notif.title}
                          </span>
                          {!notif.read && (
                            <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" title="No leída"></span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                          {notif.body}
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1.5 font-medium">
                          <span>{new Date(notif.date).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
                          <span className="text-forest-800 font-bold hover:underline flex items-center gap-0.5">
                            Ir a programar ➔
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pie de Panel */}
            {notifications.length > 0 && (
              <div className="p-2.5 bg-gray-50 border-t border-gray-100 text-center shrink-0">
                <span className="text-[11px] text-gray-500 font-medium">
                  Recordatorios programados: 12:00 PM • 05:00 PM • 05:00 AM • 06:00 AM • 07:00 AM
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
