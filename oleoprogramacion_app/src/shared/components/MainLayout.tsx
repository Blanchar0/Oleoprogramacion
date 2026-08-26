import SyncIndicator from './SyncIndicator';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { 
  Menu, X, Home, CalendarPlus, CheckSquare, 
  Clock, UserX, Tractor, Users, Settings, LogOut, Activity, CalendarDays
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
    { name: 'Dashboard', shortName: 'Dashboard', href: '/', icon: Home, roles: ['ADMIN', 'DIRECTIVO'] },
    { name: 'Nueva Programación', shortName: 'Nueva Prog.', href: '/programming/new', icon: CalendarPlus, roles: ['SUPERVISOR'] },
    { name: 'Pendientes', shortName: 'Pendientes', href: '/programming/pending', icon: CheckSquare, roles: ['SUPERVISOR'] },
    { name: 'Programación General', shortName: 'Prog. General', href: '/programming/all', icon: Clock, roles: ['ADMIN', 'DIRECTIVO', 'SUPERVISOR'] },
    { name: 'Inasistencias', shortName: 'Inasistencias', href: '/absences', icon: UserX, roles: ['ADMIN', 'DIRECTIVO', 'SUPERVISOR'] },
    { name: 'Novedades', shortName: 'Novedades', href: '/novedades', icon: CalendarDays, roles: ['ADMIN', 'DIRECTIVO'] },
    { name: 'Maquinaria', shortName: 'Maquinaria', href: '/machinery', icon: Tractor, roles: ['ADMIN', 'DIRECTIVO', 'SUPERVISOR'] },
    { name: 'Catálogos', shortName: 'Catálogos', href: '/admin/catalogs', icon: Settings, roles: ['ADMIN'] },
  ];

  const filteredNav = navigation.filter(item => item.roles.includes(user.role));
  const homePath = user.role === 'SUPERVISOR' ? '/programming/all' : '/';

  return (
    <div className="min-h-screen bg-bg-light flex flex-col md:flex-row pb-16 md:pb-0">
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
        <button onClick={() => logout()} className="text-gray-300 hover:text-white p-1 cursor-pointer" title="Cerrar sesión">
          <LogOut size={20} />
        </button>
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
          <div className="text-sm text-gray-500">
            {new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Bogota' })}
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation - All sections compressed without "Más" button */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200/80 z-50 flex items-stretch h-16 safe-bottom shadow-lg px-1">
        {filteredNav.map((item) => {
          const isActive = location.pathname === item.href || 
                          (item.href !== '/' && location.pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-0.5 transition-all text-center rounded-lg my-1 mx-0.5",
                isActive 
                  ? "text-forest-900 font-bold bg-forest-50/80 border border-forest-200/60 shadow-2xs" 
                  : "text-gray-500 hover:text-forest-800 hover:bg-gray-50"
              )}
            >
              <item.icon size={18} className={cn("shrink-0 mb-0.5", isActive ? "stroke-[2.5px] text-forest-900" : "text-gray-500")} />
              <span className={cn(
                "text-[9px] sm:text-[10px] tracking-tight leading-none truncate w-full text-center block",
                isActive ? "font-bold text-forest-950" : "font-medium text-gray-600"
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
