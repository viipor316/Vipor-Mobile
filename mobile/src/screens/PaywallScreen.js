// VIPOR Service — paywall / plan selection (garage admin).
// Shown whenever the tenant's subscription isn't active (new signup or payment
// lapsed). Lists tiers and starts a subscription. In mock-billing mode it
// activates directly; with real Stripe it opens the checkout URL.

import React, { useEffect, useState } from 'react';
import {
  View, Text, Pressable, ActivityIndicator, StyleSheet, ScrollView, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { useAuth } from '../auth';
import { api } from '../api';

export default function PaywallScreen({ onActivated }) {
  const theme = useTheme();
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();

  const [tiers, setTiers] = useState([]);
  const [selected, setSelected] = useState('pro');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try { setTiers(await api.get('/billing/tiers')); }
      catch (e) { setError(e.message ?? 'Could not load plans.'); }
      finally { setLoading(false); }
    })();
  }, []);

  async function start() {
    setBusy(true); setError(null);
    try {
      const res = await api.post('/billing/checkout', { tier: selected });
      if (res.mock) {
        // dev mode: no real Stripe — activate directly
        await api.post('/billing/activate-mock', { tier: selected });
      } else if (res.url) {
        await Linking.openURL(res.url); // real Stripe checkout
      }
      onActivated?.();
    } catch (e) {
      setError(e.message ?? 'Could not start the subscription.');
      setBusy(false);
    }
  }

  if (loading) {
    return <View style={[styles.screen, styles.center]}><ActivityIndicator color={theme.primaryColor} /></View>;
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { backgroundColor: theme.primaryColor, paddingTop: insets.top + 16 }]}>
        <View>
          <Text style={styles.brand}>{theme.name || 'Your garage'}</Text>
          <Text style={styles.headerNote}>Choose a plan to go live</Text>
        </View>
        <Pressable onPress={logout} hitSlop={12}><Text style={styles.logout}>Log out</Text></Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.lead}>
          Hi {user?.name?.split(' ')[0] || 'there'} — pick a plan to activate your garage.
          You can change or cancel anytime.
        </Text>

        {tiers.map((t) => {
          const on = selected === t.id;
          return (
            <Pressable key={t.id} onPress={() => setSelected(t.id)}
              style={[styles.tier, on && { borderColor: theme.primaryColor, borderWidth: 2 }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.tierName}>{t.name}</Text>
                <Text style={styles.tierFeat}>
                  {t.features?.tracking ? 'Live tracking · ' : ''}
                  {t.features?.maxTechs >= 999 ? 'Unlimited techs' : `${t.features?.maxTechs ?? 1} tech${(t.features?.maxTechs ?? 1) > 1 ? 's' : ''}`}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.tierPrice}>${t.price}</Text>
                <Text style={styles.tierMo}>/mo</Text>
              </View>
              <View style={[styles.radio, on && { borderColor: theme.primaryColor }]}>
                {on && <View style={[styles.radioDot, { backgroundColor: theme.primaryColor }]} />}
              </View>
            </Pressable>
          );
        })}

        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>

      <View style={[styles.actions, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable style={[styles.primary, { backgroundColor: theme.primaryColor }, busy && styles.disabled]}
          disabled={busy} onPress={start}>
          {busy ? <ActivityIndicator color="#fff" />
            : <Text style={styles.primaryText}>Start {tiers.find((t) => t.id === selected)?.name || ''}</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const INK = '#1a2230', MUTED = '#8a93a0';
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#eef1f5' },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    paddingBottom: 18, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
  },
  brand: { color: '#fff', fontSize: 20, fontWeight: '700' },
  headerNote: { color: '#ffffffcc', fontSize: 12, marginTop: 2 },
  logout: { color: '#fff', fontSize: 14, fontWeight: '600' },
  body: { padding: 20 },
  lead: { color: '#4b5563', fontSize: 14, lineHeight: 21, marginBottom: 18 },
  tier: {
    backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 12,
    flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#eef1f5',
  },
  tierName: { color: INK, fontSize: 17, fontWeight: '700' },
  tierFeat: { color: MUTED, fontSize: 12, marginTop: 4 },
  tierPrice: { color: INK, fontSize: 22, fontWeight: '700' },
  tierMo: { color: MUTED, fontSize: 11 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#cfd6df', alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  error: { color: '#c8102e', fontSize: 13, marginTop: 10 },
  actions: { paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#e3e7ed', backgroundColor: '#eef1f5' },
  primary: { borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.6 },
});
