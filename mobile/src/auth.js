// VIPOR Service — auth context.
// Holds the logged-in user + JWT, persists the token securely, and restores the
// session on app launch. Wraps the app so any screen can call useAuth().

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { api, setAuthToken, setUnauthorizedHandler } from './api';
import { useTheme } from './theme';

const TOKEN_KEY = 'vipor.token';

// expo-secure-store has no web implementation, so on web we fall back to
// localStorage; native keeps using the OS secure store.
const isWeb = Platform.OS === 'web';
const store = {
  get: () => (isWeb ? Promise.resolve(globalThis.localStorage?.getItem(TOKEN_KEY) ?? null) : SecureStore.getItemAsync(TOKEN_KEY)),
  set: (v) => (isWeb ? Promise.resolve(globalThis.localStorage?.setItem(TOKEN_KEY, v)) : SecureStore.setItemAsync(TOKEN_KEY, v)),
  del: () => (isWeb ? Promise.resolve(globalThis.localStorage?.removeItem(TOKEN_KEY)) : SecureStore.deleteItemAsync(TOKEN_KEY)),
};
const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);
  const { refresh: refreshTheme } = useTheme();

  const logout = useCallback(async () => {
    setAuthToken(null);
    setUser(null);
    await store.del();
  }, []);

  // an expired/invalid token anywhere → drop the session
  useEffect(() => { setUnauthorizedHandler(() => { logout(); }); }, [logout]);

  // restore session on launch
  useEffect(() => {
    (async () => {
      try {
        const token = await store.get();
        if (token) {
          setAuthToken(token);
          setUser(await api.get('/me'));   // verifies the token is still valid
          refreshTheme();                  // re-load the tenant's branding
        }
      } catch {
        await store.del();
      } finally {
        setBooting(false);
      }
    })();
  }, [refreshTheme]);

  async function persist(token, u) {
    setAuthToken(token);
    await store.set(token);
    setUser(u);
    refreshTheme();
  }

  const login = async (tenant, email, password) => {
    const { token, user: u } = await api.post('/auth/login', { tenant, email, password });
    await persist(token, u);
  };

  const register = async (tenant, name, email, password) => {
    const { token, user: u } = await api.post('/auth/register', { tenant, name, email, password });
    await persist(token, u);
  };

  // create a new garage (tenant + admin) and sign the owner in. The tenant starts
  // inactive; the app's paywall handles payment. Returns the onboard response
  // (tenant + checkoutUrl) for the caller to continue to billing.
  const onboard = async (payload) => {
    const res = await api.post('/onboard', payload);
    setAuthToken(res.token);
    await store.set(res.token);
    setUser(await api.get('/me'));
    refreshTheme();
    return res;
  };

  return (
    <AuthContext.Provider value={{ user, booting, login, register, onboard, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
