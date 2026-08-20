'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { getStoredUser, setStoredUser, setToken } from './api';

export type CurrentUser = {
  id: string;
  storeName: string;
  ownerName: string;
  phoneNumber: string;
  role: 'CUSTOMER' | 'ADMIN';
};

type AuthContextValue = {
  user: CurrentUser | null;
  ready: boolean;
  login: (token: string, user: CurrentUser) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  ready: false,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setUser(getStoredUser<CurrentUser>());
    setReady(true);
  }, []);

  const login = (token: string, u: CurrentUser) => {
    setToken(token);
    setStoredUser(u);
    setUser(u);
  };

  const logout = () => {
    setToken(null);
    setStoredUser(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, ready, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
