// VIPOR Service — white-label theme provider.
// Fetches the tenant's branding once at boot. Swapping primaryColor + logoUrl
// is all it takes to rebrand for a new garage.

import React, { createContext, useContext, useState, useCallback } from 'react';
import { api } from './api';

const DEFAULT_THEME = {
  primaryColor: '#c8102e',
  logoUrl: null,
  name: 'Vipor',
  locales: ['en', 'fr'],
  features: { tracking: true, payments: false },
};

const ThemeContext = createContext(DEFAULT_THEME);
export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(DEFAULT_THEME);

  // After login: load the signed-in tenant's full branding (authenticated).
  const refresh = useCallback(async () => {
    try {
      const branding = await api.get('/tenant/branding');
      if (branding) setTheme({ ...DEFAULT_THEME, ...branding });
    } catch { /* keep current theme */ }
  }, []);

  // Before login: preview a garage's brand from its code (public, unauthenticated).
  const previewTenant = useCallback(async (slug) => {
    if (!slug) return setTheme(DEFAULT_THEME);
    try {
      const b = await api.get(`/public/tenant/${slug}`);
      if (b) setTheme((t) => ({ ...t, name: b.name, primaryColor: b.primaryColor, logoUrl: b.logoUrl }));
    } catch { setTheme(DEFAULT_THEME); }
  }, []);

  return (
    <ThemeContext.Provider value={{ ...theme, refresh, previewTenant }}>
      {children}
    </ThemeContext.Provider>
  );
}
