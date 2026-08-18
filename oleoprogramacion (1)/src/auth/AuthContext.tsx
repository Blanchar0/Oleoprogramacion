import React, { createContext, useContext, useEffect, useState } from 'react';
import { ApiResponse, Role, User } from '../types';
import { supabase } from '../shared/supabase';

interface AuthContextType {
  user: User | null;
  login: (username: string, pin: string) => Promise<ApiResponse<User>>;
  logout: () => Promise<void>;
  isLoading: boolean;
  hasLongWait: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'oleoflores_auth_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLongWait, setHasLongWait] = useState(false);

  useEffect(() => {
    // Restore session from localStorage
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setUser(parsed);
      }
    } catch (e) {
      console.error('Error restoring session:', e);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (username: string, pin: string): Promise<ApiResponse<User>> => {
    try {
      const cleanUsername = username.trim().toLowerCase();
      const cleanPin = pin.trim();

      // Query user by username or phone from Supabase
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .or(`username_key.eq.${cleanUsername},phone_key.eq.${cleanUsername}`)
        .eq('active', true)
        .maybeSingle();

      if (error) {
        console.error('Error authenticating with Supabase:', error);
        return { ok: false, error: 'Error de conexión con la base de datos.' };
      }

      if (!data) {
        return { ok: false, error: 'Usuario no encontrado o inactivo.' };
      }

      if (data.pin !== cleanPin) {
        return { ok: false, error: 'PIN de acceso incorrecto.' };
      }

      const loggedUser: User = {
        id: data.id,
        username: data.username,
        name: data.name,
        role: data.role as Role,
        idSupervisor: data.id_supervisor,
        supervisorId: data.id_supervisor,
        phone: data.phone,
        active: data.active,
      };

      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(loggedUser));
      setUser(loggedUser);
      return { ok: true, data: loggedUser };
    } catch (error) {
      console.error('Error inesperado durante el inicio de sesión:', error);
      return { ok: false, error: 'No fue posible iniciar sesión.' };
    }
  };

  const logout = async () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, hasLongWait }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
