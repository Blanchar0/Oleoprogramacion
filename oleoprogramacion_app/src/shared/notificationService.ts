// src/shared/notificationService.ts
// Servicio centralizado de Notificaciones Web Push (sistema/dispositivo) e In-App para Oleoprogramación

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  date: string; // ISO string
  type: 'RECORDATORIO_12PM' | 'RECORDATORIO_5PM' | 'ADVERTENCIA_5AM' | 'ADVERTENCIA_6AM' | 'EMERGENCIA_7AM' | 'EMERGENCIA_ADMIN';
  targetDate: string; // YYYY-MM-DD
  read: boolean;
  actionUrl: string;
  level: 'info' | 'warning' | 'urgent' | 'emergency';
}

const STORAGE_KEY = 'oleo_app_notifications_v1';
const SENT_SLOTS_KEY = 'oleo_sent_notification_slots_v1';

// Obtener fecha y hora en zona horaria de Colombia
export function getColombiaDate(): Date {
  const now = new Date();
  const colombiaStr = now.toLocaleString('en-US', { timeZone: 'America/Bogota' });
  return new Date(colombiaStr);
}

// Formato YYYY-MM-DD en Colombia
export function getColombiaDateString(offsetDays: number = 0): string {
  const d = getColombiaDate();
  if (offsetDays !== 0) {
    d.setDate(d.getDate() + offsetDays);
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Verificar permiso de notificaciones nativas
export function getNotificationPermission(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

// Solicitar permiso al usuario para notificaciones nativas del dispositivo
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.error('Error solicitando permiso de notificaciones:', err);
    return 'denied';
  }
}

// Emitir notificación nativa del sistema (fuera de la app)
export async function triggerSystemNotification(title: string, options?: NotificationOptions & { actionUrl?: string }) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const defaultOptions: any = {
    icon: '/logo.png',
    badge: '/favicon.png',
    vibrate: [200, 100, 200, 100, 200],
    requireInteraction: true, // Mantener visible hasta que el usuario interactúe
    tag: 'oleoprogramacion-reporte',
    data: {
      url: options?.actionUrl || '/programming/new'
    },
    ...options
  };

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && registration.showNotification) {
        await registration.showNotification(title, defaultOptions);
        return;
      }
    }
    // Fallback nativo
    new Notification(title, defaultOptions);
  } catch (e) {
    console.warn('Fallback a Notification nativo:', e);
    try {
      new Notification(title, defaultOptions);
    } catch {
      // Ignorar si el navegador bloquea en modo estricto
    }
  }
}

// Almacenamiento local de notificaciones in-app
export function getStoredNotifications(): AppNotification[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveNotification(notification: AppNotification) {
  if (typeof window === 'undefined') return;
  try {
    const list = getStoredNotifications();
    // Evitar duplicados recientes del mismo tipo y fecha
    const exists = list.some(n => n.type === notification.type && n.targetDate === notification.targetDate);
    if (!exists) {
      const updated = [notification, ...list].slice(0, 50); // Guardar últimas 50
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('oleo-notifications-updated'));
    }
  } catch (e) {
    console.error('Error guardando notificación:', e);
  }
}

export function markAllNotificationsAsRead() {
  if (typeof window === 'undefined') return;
  try {
    const list = getStoredNotifications().map(n => ({ ...n, read: true }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('oleo-notifications-updated'));
  } catch (e) {
    console.error('Error marcando notificaciones como leídas:', e);
  }
}

// Comprobar si ya se envió notificación en un slot de hora hoy
function wasSlotSentToday(slotKey: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const today = getColombiaDateString();
    const raw = localStorage.getItem(SENT_SLOTS_KEY);
    const sentMap = raw ? JSON.parse(raw) : {};
    return sentMap[slotKey] === today;
  } catch {
    return false;
  }
}

function markSlotSentToday(slotKey: string) {
  if (typeof window === 'undefined') return;
  try {
    const today = getColombiaDateString();
    const raw = localStorage.getItem(SENT_SLOTS_KEY);
    const sentMap = raw ? JSON.parse(raw) : {};
    sentMap[slotKey] = today;
    localStorage.setItem(SENT_SLOTS_KEY, JSON.stringify(sentMap));
  } catch (e) {
    console.error('Error marcando slot enviado:', e);
  }
}

// Evaluación periódica de recordatorios y advertencias para el supervisor
export function evaluateSupervisorSchedule(
  supervisorId: string,
  supervisorName: string,
  programmings: any[]
): {
  activeAlert: {
    type: AppNotification['type'];
    level: AppNotification['level'];
    title: string;
    message: string;
    targetDate: string;
    actionUrl: string;
  } | null;
} {
  const colDate = getColombiaDate();
  const currentHour = colDate.getHours();
  const todayStr = getColombiaDateString(0);
  const tomorrowStr = getColombiaDateString(1);

  // ¿El supervisor ya tiene programaciones para hoy?
  const hasProgrammingToday = programmings.some(
    p => p.idSupervisor === supervisorId && p.date === todayStr && p.status !== 'CANCELADA'
  );

  // ¿El supervisor ya tiene programaciones para mañana?
  const hasProgrammingTomorrow = programmings.some(
    p => p.idSupervisor === supervisorId && p.date === tomorrowStr && p.status !== 'CANCELADA'
  );

  let activeAlert: {
    type: AppNotification['type'];
    level: AppNotification['level'];
    title: string;
    message: string;
    targetDate: string;
    actionUrl: string;
  } | null = null;

  // 1. REGLAS DEL MISMO DÍA (Hoy) si NO ha reportado para hoy:
  if (!hasProgrammingToday) {
    if (currentHour >= 7) {
      // 7:00 AM en adelante: Advertencia de Emergencia (límite superado)
      activeAlert = {
        type: 'EMERGENCIA_7AM',
        level: 'emergency',
        title: '🚨 EMERGENCIA: Horario Límite de Reporte Superado',
        message: `Atención ${supervisorName}: Son más de las 7:00 AM y aún no registras la programación diaria de tu cuadrilla para hoy. Por favor reporta de inmediato para no retrasar las labores en campo.`,
        targetDate: todayStr,
        actionUrl: '/programming/new'
      };
    } else if (currentHour >= 6) {
      // 6:00 AM a 6:59 AM: 2da Advertencia urgente
      activeAlert = {
        type: 'ADVERTENCIA_6AM',
        level: 'urgent',
        title: '⚠️ URGENTE (06:00 AM): Programación Diaria Pendiente',
        message: `Hola ${supervisorName}, tu cuadrilla aún no está programada para hoy. Es indispensable reportar antes de las 7:00 AM para la salida a campo.`,
        targetDate: todayStr,
        actionUrl: '/programming/new'
      };
    } else if (currentHour >= 5) {
      // 5:00 AM a 5:59 AM: 1ra Advertencia matutina
      activeAlert = {
        type: 'ADVERTENCIA_5AM',
        level: 'warning',
        title: '⚠️ AVISO (05:00 AM): Recordatorio de Programación Hoy',
        message: `Buenos días ${supervisorName}. Recuerda que la programación de campo es información relevante que se debe actualizar a diario. Por favor registra la programación de tu cuadrilla.`,
        targetDate: todayStr,
        actionUrl: '/programming/new'
      };
    }
  }

  // 2. REGLAS DEL DÍA ANTERIOR (Tarde) si NO ha reportado para mañana:
  if (!activeAlert && !hasProgrammingTomorrow) {
    if (currentHour >= 17) {
      // 5:00 PM en adelante: Recordatorio de Cierre
      activeAlert = {
        type: 'RECORDATORIO_5PM',
        level: 'warning',
        title: '📋 RECORDATORIO (05:00 PM): Programación para Mañana',
        message: `Hola ${supervisorName}, recuerda registrar la programación de tu cuadrilla para mañana antes de finalizar tu jornada laboral.`,
        targetDate: tomorrowStr,
        actionUrl: '/programming/new'
      };
    } else if (currentHour >= 12 && currentHour < 17) {
      // 12:00 PM a 4:59 PM: Recordatorio preventivo sugerido
      activeAlert = {
        type: 'RECORDATORIO_12PM',
        level: 'info',
        title: '💡 SUGERENCIA (12:00 PM): Planificación de Mañana',
        message: `Hola ${supervisorName}, te sugerimos planificar y registrar con anticipación la programación de tu cuadrilla para mañana.`,
        targetDate: tomorrowStr,
        actionUrl: '/programming/new'
      };
    }
  }

  // Disparar notificación nativa del sistema (fuera de la app) si no se ha enviado en este slot
  if (activeAlert) {
    const slotKey = `${supervisorId}_${activeAlert.type}_${activeAlert.targetDate}`;
    if (!wasSlotSentToday(slotKey)) {
      markSlotSentToday(slotKey);
      
      // Guardar in-app
      saveNotification({
        id: `${slotKey}_${Date.now()}`,
        title: activeAlert.title,
        body: activeAlert.message,
        date: new Date().toISOString(),
        type: activeAlert.type,
        targetDate: activeAlert.targetDate,
        read: false,
        actionUrl: activeAlert.actionUrl,
        level: activeAlert.level
      });

      // Disparar en dispositivo
      triggerSystemNotification(activeAlert.title, {
        body: activeAlert.message,
        actionUrl: activeAlert.actionUrl
      });
    }
  }

  return { activeAlert };
}

// Obtener resumen de estado de reporte de todos los supervisores (para el Administrador)
export function getSupervisorsReportingStatus(
  supervisors: any[],
  programmings: any[]
): Array<{
  id: string;
  name: string;
  hasProgrammedToday: boolean;
  hasProgrammedTomorrow: boolean;
  todayCount: number;
  statusLabel: string;
  statusLevel: 'success' | 'info' | 'warning' | 'urgent' | 'emergency';
  lastAlertTitle: string;
}> {
  const colDate = getColombiaDate();
  const currentHour = colDate.getHours();
  const todayStr = getColombiaDateString(0);
  const tomorrowStr = getColombiaDateString(1);

  return (supervisors || []).map(sup => {
    const supId = sup.id || sup.idSupervisor;
    const todayProgs = programmings.filter(p => p.idSupervisor === supId && p.date === todayStr && p.status !== 'CANCELADA');
    const tomorrowProgs = programmings.filter(p => p.idSupervisor === supId && p.date === tomorrowStr && p.status !== 'CANCELADA');

    const hasToday = todayProgs.length > 0;
    const hasTomorrow = tomorrowProgs.length > 0;

    let totalPeopleToday = 0;
    todayProgs.forEach(p => {
      totalPeopleToday += (p.personnelIds || []).length;
    });

    let statusLabel = 'Al Día';
    let statusLevel: 'success' | 'info' | 'warning' | 'urgent' | 'emergency' = 'success';
    let lastAlertTitle = 'Programación confirmada para hoy';

    if (!hasToday) {
      if (currentHour >= 7) {
        statusLabel = 'Emergencia (Límite Superado)';
        statusLevel = 'emergency';
        lastAlertTitle = 'Más de las 7:00 AM sin reportar';
      } else if (currentHour >= 6) {
        statusLabel = 'Alerta Urgente (06:00 AM)';
        statusLevel = 'urgent';
        lastAlertTitle = 'Pendiente antes de las 7:00 AM';
      } else if (currentHour >= 5) {
        statusLabel = 'Advertencia (05:00 AM)';
        statusLevel = 'warning';
        lastAlertTitle = 'Pendiente matutino';
      } else {
        statusLabel = 'Sin Programar';
        statusLevel = 'warning';
        lastAlertTitle = 'Pendiente para la jornada';
      }
    } else if (!hasTomorrow && currentHour >= 17) {
      statusLabel = 'Pendiente Mañana (17:00)';
      statusLevel = 'warning';
      lastAlertTitle = 'Falta programación de mañana';
    } else if (!hasTomorrow && currentHour >= 12) {
      statusLabel = 'Sugerencia Mañana (12:00)';
      statusLevel = 'info';
      lastAlertTitle = 'Planificación sugerida para mañana';
    }

    return {
      id: supId,
      name: sup.name || 'Supervisor',
      hasProgrammedToday: hasToday,
      hasProgrammedTomorrow: hasTomorrow,
      todayCount: totalPeopleToday,
      statusLabel,
      statusLevel,
      lastAlertTitle
    };
  });
}
