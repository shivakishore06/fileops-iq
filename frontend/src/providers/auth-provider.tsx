'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api } from '../lib/api';

interface User {
  userId: string;
  email: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions: string[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, passwordHash: string) => Promise<void>;
  register: (data: {
    tenantName: string;
    domain: string;
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
  }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchProfile = async () => {
    try {
      const res = await api.get('/api/v1/auth/me');
      setUser(res.data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, []);

  // Simple route guard check
  useEffect(() => {
    if (!loading) {
      const publicRoutes = ['/login', '/register'];
      const isPublicRoute = publicRoutes.includes(pathname);
      const isTokenPresent = !!localStorage.getItem('access_token');

      if (!isTokenPresent && !isPublicRoute) {
        router.push('/login');
      } else if (isTokenPresent && isPublicRoute) {
        router.push('/');
      }
    }
  }, [user, loading, pathname, router]);

  const login = async (email: string, passwordHash: string) => {
    setLoading(true);
    try {
      const res = await api.post('/api/v1/auth/login', { email, passwordHash });
      const { accessToken, refreshToken, tenantId } = res.data;

      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
      localStorage.setItem('tenant_id', tenantId);

      await fetchProfile();
      router.push('/');
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const register = async (data: any) => {
    setLoading(true);
    try {
      const res = await api.post('/api/v1/auth/register', data);
      const { accessToken, refreshToken, tenantId } = res.data;

      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
      localStorage.setItem('tenant_id', tenantId);

      await fetchProfile();
      router.push('/');
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('tenant_id');
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
