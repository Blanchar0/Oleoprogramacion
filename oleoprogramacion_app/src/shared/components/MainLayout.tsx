import SyncIndicator from './SyncIndicator';
import { SyncStatusBadge } from './SyncStatusBadge';
import { InstallPrompt } from './InstallPrompt';
import NotificationCenter from './NotificationCenter';
import SupervisorAlertBanner from './SupervisorAlertBanner';
import { TeamStreakIndicator } from './TeamStreakIndicator';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { canAccessProductivity } from '../../auth/access';
import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { 
  Menu, X, Home, CalendarPlus, CheckSquare, 
  Clock, UserX, Tractor, Users, Settings, LogOut, Activity, CalendarDays, TrendingUp
} from 'lucide-react';
import { cn } from '@/src/components/ui';

export default function MainLayout() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  useEffect(() => {
    let lastActivityTime = Date.now();
    let intervalId: ReturnType<typeof setInterval>;

    const updateActivityTime = () => {
      lastActivityTime = Date.now();
    };

    // Verifica cada 30 segundos si pasaron 15 minutos (15 * 60 * 1000 ms)
    intervalId = setInterval(() => {
      if (Date.now() - lastActivityTime >= 15 * 60 * 1000) {
        logout();
      }
    }, 30000);

    // Lista de eventos que demuestran actividad
    const events = ['mousemove', 'mousedown', 'keypress', 'touchmove', 'scroll'];
    
    events.forEach(event => {
      window.addEventListener(event, updateActivityTime, { passive: true });
    });

    return () => {
      clearInterval(intervalId);
      events.forEach(event => {
        window.removeEventListener(event, updateActivityTime);
      });
    };
  }, [logout]);

  const isEnlargedSupervisor = user?.role === 'SUPERVISOR' && (user?.username || '').trim().toLowerCase() !== 'luisb';

  useEffect(() => {
    if (isEnlargedSupervisor) {
      document.documentElement.style.fontSize = '135%';
      document.documentElement.classList.add('supervisor-enlarged');
    } else {
      document.documentElement.style.fontSize = '';
      document.documentElement.classList.remove('supervisor-enlarged');
    }

    return () => {
      document.documentElement.style.fontSize = '';
      document.documentElement.classList.remove('supervisor-enlarged');
    };
  }, [isEnlargedSupervisor]);

  const navigation = [
    { 
      name: 'Dashboard', 
      shortName: 'Dashboard', 
      href: '/', 
      icon: Home, 
      roles: ['ADMIN', 'DIRECTIVO'],
      activeBg: 'bg-forest-900 text-white shadow-md',
      activeText: 'text-forest-950 font-bold',
      iconColor: 'text-forest-800'
    },
    {
      name: 'Ciclos',
      shortName: 'Ciclos',
      href: '/cycles',
      icon: Activity,
      roles: ['ADMIN', 'DIRECTIVO', 'SUPERVISOR'],
      activeBg: 'bg-emerald-700 text-white shadow-md',
      activeText: 'text-emerald-950 font-bold',
      iconColor: 'text-emerald-700'
    },
    {
      name: 'Productividad',
      shortName: 'Productiv.',
      href: '/productivity',
      icon: TrendingUp,
      roles: ['ADMIN', 'DIRECTIVO'],
      activeBg: 'bg-lime-700 text-white shadow-md',
      activeText: 'text-lime-900 font-bold',
      iconColor: 'text-lime-700'
    },
    { 
      name: 'Nueva Programación', 
      shortName: 'Nueva Prog.', 
      href: '/programming/new', 
      icon: CalendarPlus, 
      roles: ['SUPERVISOR'],
      activeBg: 'bg-emerald-600 text-white shadow-md',
      activeText: 'text-emerald-950 font-bold',
      iconColor: 'text-emerald-700'
    },
    { 
      name: 'Pendientes', 
      shortName: 'Pendientes', 
      href: '/programming/pending', 
      icon: CheckSquare, 
      roles: ['SUPERVISOR'],
      activeBg: 'bg-amber-600 text-white shadow-md',
      activeText: 'text-amber-950 font-bold',
      iconColor: 'text-amber-700'
    },
    { 
      name: 'Programación General', 
      shortName: 'Prog. General', 
      href: '/programming/all', 
      icon: Clock, 
      roles: ['ADMIN', 'DIRECTIVO', 'SUPERVISOR', 'REVISOR'],
      activeBg: 'bg-blue-600 text-white shadow-md',
      activeText: 'text-blue-950 font-bold',
      iconColor: 'text-blue-700'
    },
    { 
      name: 'Inasistencias', 
      shortName: 'Inasistencias', 
      href: '/absences', 
      icon: UserX, 
      roles: ['ADMIN', 'DIRECTIVO', 'SUPERVISOR'],
      activeBg: 'bg-red-600 text-white shadow-md',
      activeText: 'text-red-950 font-bold',
      iconColor: 'text-red-700'
    },
    { 
      name: 'Novedades', 
      shortName: 'Novedades', 
      href: '/novedades', 
      icon: CalendarDays, 
      roles: ['ADMIN', 'DIRECTIVO'],
      activeBg: 'bg-orange-600 text-white shadow-md',
      activeText: 'text-orange-950 font-bold',
      iconColor: 'text-orange-700'
    },
    { 
      name: 'Maquinaria', 
      shortName: 'Maquinaria', 
      href: '/machinery', 
      icon: Tractor, 
      roles: ['ADMIN', 'DIRECTIVO', 'SUPERVISOR'],
      activeBg: 'bg-purple-600 text-white shadow-md',
      activeText: 'text-purple-950 font-bold',
      iconColor: 'text-purple-700'
    },
    { 
      name: 'Catálogos', 
      shortName: 'Catálogos', 
      href: '/admin/catalogs', 
      icon: Settings, 
      roles: ['ADMIN'],
      activeBg: 'bg-teal-700 text-white shadow-md',
      activeText: 'text-teal-950 font-bold',
      iconColor: 'text-teal-700'
    },
  ];

  const filteredNav = navigation.filter(item => item.roles.includes(user.role) && (item.href !== '/productivity' || canAccessProductivity(user)));
  const homePath = user.role === 'SUPERVISOR' || user.role === 'REVISOR' ? '/programming/all' : '/';

  return (
    <div className="min-h-screen bg-bg-light flex flex-col md:flex-row pb-20 md:pb-0">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between bg-primary text-white p-3.5 px-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Link 
            to={homePath} 
            className="flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"
            title="Ir a Inicio"
          >
            <img 
              src="/logo.png" 
              alt="Inicio" 
              className="w-10 h-10 rounded-full object-contain bg-white/10 p-0.5 border border-white/20 shadow-xs" 
            />
          </Link>
          <SyncIndicator />
        </div>
        <div className="flex items-center gap-2">
          <TeamStreakIndicator />
          {['ADMIN', 'SUPERVISOR'].includes(user.role) && <NotificationCenter />}
          <button onClick={() => logout()} className="text-gray-300 hover:text-white p-1 cursor-pointer" title="Cerrar sesión">
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* Sidebar (Desktop) */}
      <div className={cn(
        "hidden md:flex inset-y-0 left-0 z-50 w-64 bg-primary text-white flex-col"
      )}>
        <div className="p-4 border-b border-primary-dark/30 flex justify-center items-center hidden md:flex">
          <Link 
            to={homePath} 
            className="flex items-center justify-center cursor-pointer hover:opacity-90 transition-transform hover:scale-105"
            title="Ir a Inicio"
          >
            <img 
              src="/logo.png" 
              alt="Inicio" 
              className="w-16 h-16 rounded-full object-contain bg-white/10 p-1 border border-white/20 shadow-md" 
            />
          </Link>
        </div>
        
        {user.role === 'ADMIN' && (
          <div className="bg-warning text-warning-foreground text-[10px] text-center py-1 font-bold tracking-wider text-black">
            ESTADO DEL SISTEMA: ALMACENAMIENTO LOCAL
          </div>
        )}

        <div className="p-4 border-b border-primary-dark/30">
          <div className="font-medium truncate">{user.name}</div>
          <div className="text-xs text-accent mt-1">{user.role} {user.supervisorId ? `(${user.supervisorId})` : ''}</div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {filteredNav.map((item) => {
              const isActive = location.pathname === item.href || 
                              (item.href !== '/' && location.pathname.startsWith(item.href));
              return (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={cn(
                      "flex items-center space-x-3 px-3 py-2.5 rounded-md transition-colors text-sm font-medium",
                      isActive ? "bg-secondary text-white font-bold" : "text-gray-300 hover:bg-secondary/50 hover:text-white"
                    )}
                  >
                    <item.icon size={18} />
                    <span>{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-primary-dark/30">
          <button 
            type="button"
            onClick={() => logout()}
            className="flex items-center space-x-3 px-3 py-2.5 w-full text-left rounded-md transition-all text-xs font-bold uppercase tracking-wider text-gray-200 hover:bg-negative/80 hover:text-white cursor-pointer"
          >
            <LogOut size={18} />
            <span>CERRAR SESIÓN</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-[calc(100vh-64px)] md:h-screen overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center hidden md:flex">
          <h1 className="text-xl font-semibold text-text-main">
            {filteredNav.find(n => n.href === location.pathname)?.name || 'Oleoflores'}
          </h1>
          <div className="flex items-center gap-3">
            <TeamStreakIndicator />
            {['ADMIN', 'SUPERVISOR'].includes(user.role) && <NotificationCenter />}
            <SyncStatusBadge />
            <div className="text-sm text-gray-500">
              {new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Bogota' })}
            </div>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-32 md:pb-6">
          <div className="max-w-7xl mx-auto">
            <SupervisorAlertBanner />
            <InstallPrompt />
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation - High Contrast, Large Icons with Distinct Strong Colors */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t-2 border-gray-300 z-50 flex items-stretch h-18 safe-bottom shadow-2xl px-1">
        {filteredNav.map((item) => {
          const isActive = location.pathname === item.href || 
                          (item.href !== '/' && location.pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex-1 min-w-0 flex flex-col items-center justify-center py-1.5 px-0.5 transition-all text-center rounded-xl my-1 mx-0.5",
                isActive 
                  ? "bg-gray-100/90 shadow-inner" 
                  : "hover:bg-gray-50 active:scale-95"
              )}
            >
              {/* Icon Container with Solid Vibrant Color Badge when active */}
              <div className={cn(
                "w-11 h-8 rounded-lg flex items-center justify-center transition-all",
                isActive 
                  ? item.activeBg 
                  : cn("bg-gray-100/80", item.iconColor)
              )}>
                <item.icon 
                  size={22} 
                  className={cn(
                    "shrink-0",
                    isActive ? "text-white stroke-[2.5px]" : "stroke-[2.2px]"
                  )} 
                />
              </div>
              <span className={cn(
                "text-[10px] tracking-tight leading-none truncate w-full text-center block mt-1",
                isActive ? item.activeText : "font-semibold text-gray-600"
              )}>
                {item.shortName || item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
