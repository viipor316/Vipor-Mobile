// VIPOR Service — white-label theme provider.
// Fetches the tenant's branding once at boot. Swapping primaryColor + logoUrl
// is all it takes to rebrand for a new garage.

import React, { createContext, useContext, useEffect, useState } from 'react';
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

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const branding = await api.get('/tenant/branding');
        if (alive && branding) setTheme({ ...DEFAULT_THEME, ...branding });
      } catch {
        // fall back to default branding if the call fails
      }
    })();
    return () => { alive = false; };
  }, []);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}
