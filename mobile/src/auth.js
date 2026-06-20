// VIPOR Service — auth context.
// Holds the logged-in user + JWT, persists the token securely, and restores the
// session on app launch. Wraps the app so any screen can call useAuth().

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api, setAuthToken, setUnauthorizedHandler } from './api';

const TOKEN_KEY = 'vipor.token';
const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  const logout = useCallback(async () => {
    setAuthToken(null);
    setUser(null);
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }, []);

  // an expired/invalid token anywhere → drop the session
  useEffect(() => { setUnauthorizedHandler(() => { logout(); }); }, [logout]);

  // restore session on launch
  useEffect(() => {
    (async () => {
      try {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        if (token) {
          setAuthToken(token);
          setUser(await api.get('/me'));   // verifies the token is still valid
        }
      } catch {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      } finally {
        setBooting(false);
      }
    })();
  }, []);

  async function persist(token, u) {
    setAuthToken(token);
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    setUser(u);
  }

  const login = async (email, password) => {
    const { token, user: u } = await api.post('/auth/login', { email, password });
    await persist(token, u);
  };

  const register = async (name, email, password, role = 'customer') => {
    const { token, user: u } = await api.post('/auth/register', { name, email, password, role });
    await persist(token, u);
  };

  return (
    <AuthContext.Provider value={{ user, booting, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
