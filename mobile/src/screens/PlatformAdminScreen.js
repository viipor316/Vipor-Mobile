// VIPOR Service — Platform super-admin.
// The platform owner (role: superadmin) manages every garage and edits the
// subscription pricing that all garages see.

import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, ActivityIndicator, StyleSheet, Alert, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../auth';
import { api } from '../api';
import { ui } from '../ui';

export default function PlatformAdminScreen() {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();

  const [tiers, setTiers] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [ts, tn] = await Promise.all([api.get('/platform/tiers'), api.get('/platform/tenants')]);
      setTiers(ts); setTenants(tn);
      setPrices(Object.fromEntries(ts.map((t) => [t.id, String(t.price)])));
    } catch { /* keep */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function savePrice(id) {
    const price = Number(prices[id]);
    if (isNaN(price)) return Alert.alert('Invalid price', 'Enter a number.');
    try { await api.patch(`/platform/tiers/${id}`, { price }); await load(); Alert.alert('Saved', `${id} is now $${price}/mo.`); }
    catch (e) { Alert.alert('Could not save', e.message ?? ''); }
  }

  async function toggleGarage(g) {
    const next = g.status === 'active' ? 'past_due' : 'active';
    setTenants((xs) => xs.map((x) => (x.id === g.id ? { ...x, status: next } : x)));
    try { await api.patch(`/platform/tenants/${g.id}`, { status: next }); }
    catch (e) { setTenants((xs) => xs.map((x) => (x.id === g.id ? { ...x, status: g.status } : x))); Alert.alert('Failed', e.message ?? ''); }
  }

  if (loading) return <View style={[styles.screen, styles.center]}><ActivityIndicator color={ui.navy} /></View>;

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <View>
          <Text style={styles.brand}>VIPOR Platform</Text>
          <Text style={styles.headerNote}>Super-admin · {user?.name}</Text>
        </View>
        <Pressable onPress={logout} hitSlop={12}><Text style={styles.logout}>Log out</Text></Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>

        <View style={styles.kpis}>
          <Kpi n={tenants.length} label="Garages" />
          <Kpi n={tenants.filter((t) => t.status === 'active').length} label="Active" />
          <Kpi n={tenants.reduce((s, t) => s + t.jobs, 0)} label="Total jobs" />
        </View>

        <Text style={styles.section}>Subscription pricing</Text>
        {tiers.map((t) => (
          <View key={t.id} style={ui.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.tierName}>{t.name}</Text>
              <Text style={styles.tierSub}>{t.features?.maxTechs >= 999 ? 'Unlimited techs' : `${t.features?.maxTechs} tech(s)`}{t.features?.tracking ? ' · tracking' : ''}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.dollar}>$</Text>
              <TextInput style={styles.priceInput} keyboardType="number-pad"
                value={prices[t.id]} onChangeText={(v) => setPrices((p) => ({ ...p, [t.id]: v }))} />
              <Text style={styles.mo}>/mo</Text>
              <Pressable style={styles.save} onPress={() => savePrice(t.id)}><Text style={styles.saveText}>Save</Text></Pressable>
            </View>
          </View>
        ))}

        <Text style={styles.section}>Garages</Text>
        {tenants.length === 0 && <Text style={styles.empty}>No garages onboarded yet.</Text>}
        {tenants.map((g) => {
          const active = g.status === 'active';
          return (
            <View key={g.id} style={ui.card}>
              <View style={[styles.dot, { backgroundColor: g.primaryColor }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.gName}>{g.name}</Text>
                <Text style={styles.gSub}>{g.tier} · {g.users} users · {g.jobs} jobs · {g.phone || 'no phone'}</Text>
              </View>
              <Pressable style={[styles.statusBtn, { backgroundColor: active ? '#e7f6ed' : '#fdeaec' }]} onPress={() => toggleGarage(g)}>
                <Text style={[styles.statusText, { color: active ? '#1e6f43' : '#c8102e' }]}>{active ? 'Active' : 'Suspended'}</Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function Kpi({ n, label }) {
  return <View style={styles.kpi}><Text style={styles.kpiN}>{n}</Text><Text style={styles.kpiL}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: ui.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: { backgroundColor: ui.navy, paddingBottom: 18, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  brand: { color: '#fff', fontSize: 20, fontWeight: '800' },
  headerNote: { color: '#ffffffcc', fontSize: 12, marginTop: 2 },
  logout: { color: '#fff', fontSize: 14, fontWeight: '600' },
  body: { padding: 20, paddingBottom: 40 },
  kpis: { flexDirection: 'row', gap: 12 },
  kpi: { flex: 1, backgroundColor: '#fff', borderRadius: 14, paddingVertical: 16, alignItems: 'center', ...ui.shadow },
  kpiN: { fontSize: 24, fontWeight: '800', color: ui.navy },
  kpiL: { color: ui.muted, fontSize: 11, marginTop: 4 },
  section: { color: ui.ink, fontSize: 15, fontWeight: '800', marginTop: 24, marginBottom: 8 },
  empty: { color: ui.muted, fontStyle: 'italic', fontSize: 13 },
  tierName: { color: ui.ink, fontSize: 16, fontWeight: '700' },
  tierSub: { color: ui.muted, fontSize: 12, marginTop: 3 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dollar: { color: ui.ink, fontSize: 16, fontWeight: '700' },
  priceInput: { minWidth: 52, borderBottomWidth: 2, borderColor: ui.navy, fontSize: 16, fontWeight: '700', color: ui.ink, paddingVertical: 2, textAlign: 'center' },
  mo: { color: ui.muted, fontSize: 12, marginRight: 6 },
  save: { backgroundColor: ui.navy, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  gName: { color: ui.ink, fontSize: 15, fontWeight: '700' },
  gSub: { color: ui.muted, fontSize: 12, marginTop: 3 },
  statusBtn: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  statusText: { fontSize: 12, fontWeight: '700' },
});
