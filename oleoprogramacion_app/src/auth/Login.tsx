import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Leaf, Eye, EyeOff, User, Lock, Sprout, Tractor, Sun } from 'lucide-react';
import { motion } from 'motion/react';
import { Input, Label } from '@/src/components/ui';

export default function Login() {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const userRef = useRef<HTMLInputElement>(null);
  const pinRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (userRef.current) userRef.current.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Por favor ingresa tu usuario.');
      userRef.current?.focus();
      return;
    }
    if (!pin.trim()) {
      setError('Por favor ingresa tu PIN.');
      pinRef.current?.focus();
      return;
    }
    
    setError('');
    setIsLoading(true);
    
    const res = await login(username, pin);
    if (res.ok) {
      navigate('/');
    } else {
      setError(res.error || res.mensaje || 'Credenciales incorrectas');
      setPin(''); // Only clear PIN on error for better UX
      setIsLoading(false);
      pinRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-[#F5F6F1] overflow-hidden">
      {/* Visual Area (Header on Mobile, Left Side on Desktop) */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="relative flex-shrink-0 md:w-[45%] lg:w-1/2 bg-gradient-to-br from-[#0B2F24] via-[#123C2E] to-[#315D43] flex flex-col justify-center items-center p-8 overflow-hidden z-0"
      >
        {/* Subtle animated background shapes */}
        <motion.div 
          animate={{ rotate: 360, scale: [1, 1.1, 1] }} 
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#315D43]/20 blur-3xl pointer-events-none"
        />
        <motion.div 
          animate={{ rotate: -360, scale: [1, 1.2, 1] }} 
          transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-32 -right-32 w-[30rem] h-[30rem] rounded-full bg-[#B9CF58]/10 blur-3xl pointer-events-none"
        />

        <div className="relative z-10 flex flex-col items-center md:items-start text-center md:text-left max-w-md w-full">
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="flex items-center gap-3 mb-6 md:mb-10"
          >
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-[#123C2E]/60 border border-[#315D43]/50 backdrop-blur-md flex items-center justify-center shadow-xl shadow-[#0B2F24]/40">
              <Leaf className="w-7 h-7 md:w-8 md:h-8 text-[#B9CF58]" strokeWidth={1.5} />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white hidden md:block">Oleoflores</h1>
          </motion.div>
          
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="hidden md:block"
          >
            <h2 className="text-2xl lg:text-3xl font-semibold text-white mb-4 leading-snug">
              Programación Agronómica
            </h2>
            <p className="text-[#F5F6F1]/80 text-lg leading-relaxed mb-10 max-w-sm">
              Organiza la jornada agronómica de manera clara, ágil y conectada.
            </p>

            <div className="flex flex-col gap-5 text-[#B9CF58]/90">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[#0B2F24]/50 flex items-center justify-center">
                  <Sun className="w-5 h-5" />
                </div>
                <span className="font-medium">Planificación diaria</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[#0B2F24]/50 flex items-center justify-center">
                  <Sprout className="w-5 h-5" />
                </div>
                <span className="font-medium">Control de labores</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[#0B2F24]/50 flex items-center justify-center">
                  <Tractor className="w-5 h-5" />
                </div>
                <span className="font-medium">Gestión de maquinaria</span>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Form Area */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-12 relative z-10 bg-white rounded-t-3xl md:rounded-none -mt-6 md:mt-0 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] md:shadow-none min-h-[400px]">
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="w-full max-w-sm"
        >
          <div className="text-center md:text-left mb-8 md:mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-[#102A22] mb-2">Bienvenido a Oleoflores</h2>
            <p className="text-[#123C2E]/70 md:hidden text-sm">Organiza la jornada agronómica de manera clara, ágil y conectada.</p>
            <p className="text-[#123C2E]/70 hidden md:block text-sm">Ingresa tus credenciales para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 w-full">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-[#102A22] font-semibold">Usuario</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#123C2E]/40">
                    <User className="h-5 w-5" />
                  </div>
                  <Input 
                    ref={userRef}
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ej. mribon"
                    className="pl-11 h-12 bg-[#F5F6F1] border-transparent focus:border-[#B9CF58] focus:ring-[#B9CF58]/20 transition-all text-[#102A22]"
                    disabled={isLoading}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="pin" className="text-[#102A22] font-semibold">PIN de acceso</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#123C2E]/40">
                    <Lock className="h-5 w-5" />
                  </div>
                  <Input 
                    ref={pinRef}
                    id="pin"
                    name="pin"
                    type={showPin ? "text" : "password"}
                    inputMode="numeric"
                    maxLength={4}
                    autoComplete="current-password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} // Numeric only
                    onKeyDown={handleKeyDown}
                    placeholder="****"
                    className="pl-11 pr-11 h-12 bg-[#F5F6F1] border-transparent focus:border-[#B9CF58] focus:ring-[#B9CF58]/20 transition-all text-[#102A22] tracking-widest font-mono text-lg placeholder:tracking-normal placeholder:font-sans placeholder:text-base"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#123C2E]/40 hover:text-[#315D43] transition-colors focus:outline-none"
                    tabIndex={-1}
                    aria-label={showPin ? "Ocultar PIN" : "Mostrar PIN"}
                  >
                    {showPin ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </div>
            
            {/* Error Message with aria-live for screen readers */}
            <div aria-live="polite" className="min-h-[40px]">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl font-medium flex items-center"
                >
                  {error}
                </motion.div>
              )}
            </div>
            
            <motion.button 
              type="submit" 
              whileTap={{ scale: isLoading ? 1 : 0.98 }}
              className="w-full h-12 md:h-14 bg-[#123C2E] hover:bg-[#0B2F24] text-white rounded-xl font-semibold shadow-lg shadow-[#123C2E]/20 transition-all flex items-center justify-center mt-2 disabled:opacity-70 disabled:cursor-not-allowed" 
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verificando acceso...</span>
                </div>
              ) : (
                'Ingresar'
              )}
            </motion.button>
            
            <p className="text-center text-xs text-[#123C2E]/50 mt-8 font-medium">
              Información sincronizada y protegida
            </p>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
