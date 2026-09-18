import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import Login from './auth/Login';
import MainLayout from './shared/components/MainLayout';
import Dashboard from './dashboard/Dashboard';
import NewProgramming from './programming/NewProgramming';
import PendingProgramming from './programming/PendingProgramming';
import GeneralProgramming from './programming/GeneralProgramming';
import Absences from './absences/Absences';
import Machinery from './machinery/Machinery';
import Catalogs from './admin/Catalogs';
import Novedades from './admin/Novedades';
import Cycles from './cycles/Cycles';
import Productivity from './productivity/Productivity';
import { Leaf } from 'lucide-react';

import { motion, AnimatePresence } from 'motion/react';
import { Loader2 } from 'lucide-react';

// Simple role guard
function RoleGuard({ children, roles }: { children: React.ReactNode, roles: string[] }) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) {
    if (user?.role === 'SUPERVISOR' || user?.role === 'REVISOR') {
      return <Navigate to="/programming/all" replace />;
    }
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function HomeRoute() {
  const { user } = useAuth();
  if (user?.role === 'SUPERVISOR' || user?.role === 'REVISOR') {
    return <Navigate to="/programming/all" replace />;
  }
  return <Dashboard />;
}

function LoadingScreen({ hasLongWait }: { hasLongWait: boolean }) {
  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className="fixed inset-0 z-50 bg-gradient-to-br from-[#0B2F24] via-[#123C2E] to-[#315D43] flex flex-col items-center justify-center text-[#F5F6F1] overflow-hidden"
    >
      {/* Subtle organic background elements */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="topo" width="100" height="100" patternUnits="userSpaceOnUse">
              <path d="M0 100c25-25 50-25 75 0s50 25 75 0M0 50c25-25 50-25 75 0s50 25 75 0M0 0c25-25 50-25 75 0s50 25 75 0" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-[#B9CF58] opacity-50"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#topo)" />
        </svg>
      </div>

      <div className="relative flex flex-col items-center max-w-sm px-6 text-center z-10">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-20 h-20 rounded-2xl bg-[#123C2E]/60 border border-[#315D43]/30 backdrop-blur-sm flex items-center justify-center mb-6 shadow-2xl shadow-[#0B2F24]/50"
        >
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <Leaf className="w-10 h-10 text-[#B9CF58]" strokeWidth={1.5} />
          </motion.div>
        </motion.div>
        
        <motion.h1 
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-3xl font-bold tracking-tight mb-2 text-white"
        >
          Oleoflores
        </motion.h1>
        
        <motion.p 
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-[#B9CF58]/90 font-medium tracking-wide text-sm uppercase letter-spacing-1 mb-8"
        >
          Programación Agronómica
        </motion.p>
        
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="flex flex-col items-center w-full"
        >
          <div className="flex items-center gap-2 mb-4">
            <Loader2 className="w-4 h-4 animate-spin text-[#B9CF58]" />
            <p className="text-[#F5F6F1]/80 text-sm">Preparando tu jornada...</p>
          </div>
          
          <div className="w-48 h-1 bg-[#0B2F24] rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-[#B9CF58] rounded-full origin-left"
              animate={{ 
                x: ["-100%", "200%"]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "linear"
              }}
              style={{ width: "50%" }}
            />
          </div>
        </motion.div>
        
        <AnimatePresence>
          {hasLongWait && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-8"
            >
              <p className="text-sm text-[#F5F6F1]/90 mb-4">La conexión está tardando más de lo esperado.</p>
              <button 
                type="button"
                onClick={() => window.location.reload()} 
                className="px-6 py-3 bg-[#F5F6F1] text-[#123C2E] rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-white transition-all shadow-lg cursor-pointer"
              >
                Reintentar Conexión
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function AppContent() {
  const { isLoading, hasLongWait } = useAuth();
  const [showLoading, setShowLoading] = React.useState(true);

  React.useEffect(() => {
    // Ensure the loading screen shows for at least 800ms
    const timer = window.setTimeout(() => {
      if (!isLoading) {
        setShowLoading(false);
      }
    }, 800);
    
    return () => window.clearTimeout(timer);
  }, [isLoading]);
  
  React.useEffect(() => {
    if (!isLoading) {
      // If isLoading becomes false after 800ms, hide it
      const timer = window.setTimeout(() => {
        setShowLoading(false);
      }, 800); // we use 800 as the minimum total, if it's already past 800 it will just trigger almost immediately because the first effect handles the primary timeout. Actually, let's track start time.
    }
  }, [isLoading]);

  // Better approach for min loading time:
  const [isMinTimeMet, setIsMinTimeMet] = React.useState(false);
  
  React.useEffect(() => {
    const timer = window.setTimeout(() => setIsMinTimeMet(true), 800);
    return () => window.clearTimeout(timer);
  }, []);

  const displayLoading = isLoading || !isMinTimeMet;

  return (
    <>
      <AnimatePresence mode="wait">
        {displayLoading && <LoadingScreen hasLongWait={hasLongWait} />}
      </AnimatePresence>
      
      {!displayLoading && (
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<MainLayout />}>
              <Route path="/" element={<HomeRoute />} />
              
              {/* Supervisor Routes */}
              <Route path="/programming/new" element={
                <RoleGuard roles={['SUPERVISOR']}>
                  <NewProgramming />
                </RoleGuard>
              } />
              <Route path="/programming/pending" element={
                <RoleGuard roles={['SUPERVISOR']}>
                  <PendingProgramming />
                </RoleGuard>
              } />
              {/* General Programming Route (All roles) */}
              <Route path="/programming/all" element={
                <RoleGuard roles={['ADMIN', 'DIRECTIVO', 'SUPERVISOR', 'REVISOR']}>
                  <GeneralProgramming />
                </RoleGuard>
              } />

              <Route path="/cycles" element={
                <RoleGuard roles={['ADMIN', 'DIRECTIVO', 'SUPERVISOR']}>
                  <Cycles />
                </RoleGuard>
              } />
              <Route path="/productivity" element={
                <RoleGuard roles={['ADMIN', 'DIRECTIVO']}>
                  <Productivity />
                </RoleGuard>
              } />
              
              {/* Shared Operational Routes */}
              <Route path="/absences" element={
                <RoleGuard roles={['ADMIN', 'DIRECTIVO', 'SUPERVISOR']}>
                  <Absences />
                </RoleGuard>
              } />
              <Route path="/machinery" element={
                <RoleGuard roles={['ADMIN', 'DIRECTIVO', 'SUPERVISOR']}>
                  <Machinery />
                </RoleGuard>
              } />
              <Route path="/records" element={<Navigate to="/programming/all" replace />} />
              {/* Admin Only */}
              <Route path="/admin/catalogs" element={
                <RoleGuard roles={['ADMIN']}>
                  <Catalogs />
                </RoleGuard>
              } />
              
              <Route path="/novedades" element={
                <RoleGuard roles={['ADMIN', 'DIRECTIVO']}>
                  <Novedades />
                </RoleGuard>
              } />
              
              {/* Catch all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      )}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
