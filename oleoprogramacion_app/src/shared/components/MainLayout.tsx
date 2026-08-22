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

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home, roles: ['ADMIN', 'DIRECTIVO'] },
    { name: 'Nueva Programación', href: '/programming/new', icon: CalendarPlus, roles: ['SUPERVISOR'] },
    { name: 'Pendientes', href: '/programming/pending', icon: CheckSquare, roles: ['SUPERVISOR'] },
    { name: 'Programación General', href: '/programming/all', icon: Clock, roles: ['ADMIN', 'DIRECTIVO', 'SUPERVISOR'] },
    { name: 'Inasistencias', href: '/absences', icon: UserX, roles: ['ADMIN', 'DIRECTIVO', 'SUPERVISOR'] },
    { name: 'Novedades', href: '/novedades', icon: CalendarDays, roles: ['ADMIN', 'DIRECTIVO'] },
    { name: 'Maquinaria', href: '/machinery', icon: Tractor, roles: ['ADMIN', 'DIRECTIVO', 'SUPERVISOR'] },
    { name: 'Registros Recientes', href: '/records', icon: Activity, roles: ['ADMIN', 'SUPERVISOR'] },
    { name: 'Catálogos', href: '/admin/catalogs', icon: Settings, roles: ['ADMIN'] },
    { name: 'Auditoría', href: '/admin/audit', icon: Users, roles: ['ADMIN'] },
  ];

  const filteredNav = navigation.filter(item => item.roles.includes(user.role));
  const homePath = user.role === 'SUPERVISOR' ? '/programming/all' : '/';

  return (
    <div className="min-h-screen bg-bg-light flex flex-col md:flex-row pb-16 md:pb-0">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between bg-primary text-white p-4">
        <div className="flex items-center gap-3">
          <Link 
            to={homePath} 
            className="font-bold text-white hover:text-accent transition-colors flex items-center gap-2 cursor-pointer"
            title="Ir a Inicio"
          >
            Oleoflores
          </Link>
          <SyncIndicator />
        </div>
        <button onClick={() => logout()} className="text-gray-300 hover:text-white">
          <LogOut size={20} />
        </button>
      </div>

      {/* Sidebar (Desktop) */}
      <div className={cn(
        "hidden md:flex inset-y-0 left-0 z-50 w-64 bg-primary text-white flex-col"
      )}>
        <div className="p-4 border-b border-primary-dark/30 flex justify-between items-center hidden md:flex">
          <Link 
            to={homePath} 
            className="font-bold text-lg text-white hover:text-accent transition-colors flex items-center gap-2 cursor-pointer"
            title="Ir a Inicio"
          >
            Oleoflores
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
                      isActive ? "bg-secondary text-white" : "text-gray-300 hover:bg-secondary/50 hover:text-white"
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

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 flex justify-around items-center h-16 safe-bottom">
        {filteredNav.slice(0, 4).map((item) => {
          const isActive = location.pathname === item.href || 
                          (item.href !== '/' && location.pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
                isActive ? "text-primary" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <item.icon size={20} className={isActive ? "fill-primary/20" : ""} />
              <span className="text-[10px] font-medium truncate max-w-[80px] px-1">{item.name}</span>
            </Link>
          );
        })}
        {filteredNav.length > 4 && (
          <Link
            to={filteredNav[4].href}
            className={cn(
              "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors text-gray-400 hover:text-gray-600"
            )}
          >
            <Menu size={20} />
            <span className="text-[10px] font-medium truncate max-w-[80px] px-1">Más</span>
          </Link>
        )}
      </div>
    </div>
  );
}
