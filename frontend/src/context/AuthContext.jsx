import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    return localStorage.getItem('paas_token');
  });

  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('paas_user');

    if (!storedUser) {
      return null;
    }

    try {
      return JSON.parse(storedUser);
    } catch {
      localStorage.removeItem('paas_user');
      return null;
    }
  });

  useEffect(() => {
    if (!token) {
      setUser(null);
      localStorage.removeItem('paas_user');
    }
  }, [token]);

  const login = async (email, password) => {
    const data = await authService.login(email, password);

    setToken(data.access_token);
    setUser(data.user);

    localStorage.setItem(
      'paas_user',
      JSON.stringify(data.user)
    );

    return data;
  };

  const logout = () => {
    authService.logout();

    localStorage.removeItem('paas_user');

    setToken(null);
    setUser(null);
  };

  const value = {
    token,
    user,
    isAuthenticated: Boolean(token),
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth debe utilizarse dentro de un AuthProvider'
    );
  }

  return context;
}