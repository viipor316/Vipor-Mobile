// VIPOR Service — Subscription management (admin only).
// Shows the current plan/status and lets the admin switch plans. Mock billing
// activates directly; real Stripe opens the checkout/portal URL.

import React, { useState, useEffect } from 'react';
import {
  View, Text, Pressable, ActivityIndicator, StyleSheet, ScrollView, Linking, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { api } from '../api';

export default function SubscriptionScreen({ navigation }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [tiers, setTiers] = useState([]);
  const [tenant, setTenant] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const [ts, t] = await Promise.all([api.get('/billing/tiers'), api.get('/tenant/profile')]);
      setTiers(ts); setTenant(t); setSelected(t.tier);
    } catch (e) { Alert.alert('Could not load', e.message ?? ''); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function apply() {
    if (!selected) return;
    setBusy(true);
    try {
      const res = await api.post('/billing/checkout', { tier: selected });
      if (res.mock) await api.post('/billing/activate-mock', { tier: selected });
      else if (res.url) { await Linking.openURL(res.url); }
      await load();
      Alert.alert('Subscription updated', `You're on the ${selected} plan.`);
    } catch (e) {
      Alert.alert('Could not update', e.message ?? 'Please try again.');
    } finally { setBusy(false); }
  }

  if (loading) return <View style={[styles.screen, styles.center]}><ActivityIndicator color={theme.primaryColor} /></View>;

  const active = ['active', 'trialing'].includes(tenant?.status);

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { backgroundColor: theme.primaryColor, paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}><Text style={styles.back}>‹  Manage</Text></Pressable>
        <Text style={styles.headerNote}>Subscription</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={[styles.statusCard, { borderColor: active ? '#1e6f43' : '#b26a00' }]}>
          <Text style={styles.statusLabel}>Current plan</Text>
          <Text style={styles.statusPlan}>{cap(tenant?.tier)} · <Text style={{ color: active ? '#1e6f43' : '#b26a00' }}>{tenant?.status}</Text></Text>
        </View>

        <Text style={styles.section}>Change plan</Text>
        {tiers.map((t) => {
          const on = selected === t.id;
          const current = tenant?.tier === t.id;
          return (
            <Pressable key={t.id} onPress={() => setSelected(t.id)}
              style={[styles.tier, on && { borderColor: theme.primaryColor, borderWidth: 2 }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.tierName}>{t.name}{current ? '  · current' : ''}</Text>
                <Text style={styles.tierFeat}>
                  {t.features?.tracking ? 'Live tracking · ' : ''}
                  {t.features?.maxTechs >= 999 ? 'Unlimited techs' : `${t.features?.maxTechs ?? 1} tech(s)`}
                </Text>
              </View>
              <Text style={styles.tierPrice}>${t.price}<Text style={styles.tierMo}>/mo</Text></Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={[styles.actions, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          style={[styles.primary, { backgroundColor: theme.primaryColor }, (busy || (selected === tenant?.tier && active)) && styles.disabled]}
          disabled={busy || (selected === tenant?.tier && active)}
          onPress={apply}>
          {busy ? <ActivityIndicator color="#fff" />
            : <Text style={styles.primaryText}>{active ? `Switch to ${cap(selected)}` : `Activate ${cap(selected)}`}</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : '');

const INK = '#1a2230', MUTED = '#8a93a0';
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#eef1f5' },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    paddingBottom: 18, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
  },
  back: { color: '#fff', fontSize: 16, fontWeight: '600' },
  headerNote: { color: '#ffffffcc', fontSize: 12 },
  body: { padding: 20, paddingBottom: 40 },
  statusCard: { backgroundColor: '#fff', borderRadius: 16, padding: 18, borderWidth: 2 },
  statusLabel: { color: MUTED, fontSize: 12 },
  statusPlan: { color: INK, fontSize: 20, fontWeight: '700', marginTop: 4 },
  section: { color: INK, fontSize: 15, fontWeight: '700', marginTop: 22, marginBottom: 6 },
  tier: { backgroundColor: '#fff', borderRadius: 14, padding: 18, marginTop: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#eef1f5' },
  tierName: { color: INK, fontSize: 16, fontWeight: '700' },
  tierFeat: { color: MUTED, fontSize: 12, marginTop: 4 },
  tierPrice: { color: INK, fontSize: 20, fontWeight: '700' },
  tierMo: { color: MUTED, fontSize: 11, fontWeight: '400' },
  actions: { paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#e3e7ed', backgroundColor: '#eef1f5' },
  primary: { borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.5 },
});
