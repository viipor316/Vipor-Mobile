// VIPOR Service — Admin portal hub (admin only).
// Entry point to manage the garage: business profile + branding, subscription,
// and team. Shows a quick snapshot of the current setup.

import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { useAuth } from '../auth';
import { api } from '../api';

export default function AdminScreen({ navigation }) {
  const theme = useTheme();
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();

  const [t, setT] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { setT(await api.get('/tenant/profile')); }
    catch { /* keep */ }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const p = t?.profile || {};
  const missing = [];
  if (!p.phone) missing.push('phone');
  if (!p.address) missing.push('address');
  if (!t?.branding?.logoUrl) missing.push('logo');

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { backgroundColor: theme.primaryColor, paddingTop: insets.top + 12 }]}>
        <View>
          <Text style={styles.brand}>Manage</Text>
          <Text style={styles.headerNote}>{t?.name || 'Your garage'}</Text>
        </View>
        <Pressable onPress={logout} hitSlop={12}><Text style={styles.logout}>Log out</Text></Pressable>
      </View>

      {loading ? <ActivityIndicator color={theme.primaryColor} style={{ marginTop: 30 }} /> : (
        <ScrollView contentContainerStyle={styles.body}>
          {/* identity snapshot */}
          <View style={styles.snap}>
            <View style={[styles.logoBox, { borderColor: theme.primaryColor }]}>
              {t?.branding?.logoUrl
                ? <Image source={{ uri: t.branding.logoUrl }} style={styles.logo} resizeMode="contain" />
                : <Text style={[styles.logoLetter, { color: theme.primaryColor }]}>{(t?.name || '?').slice(0, 1)}</Text>}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.snapName}>{t?.name}</Text>
              <Text style={styles.snapSub}>{p.phone || 'No phone set'}</Text>
              <Text style={styles.snapSub}>{p.address || 'No address set'}</Text>
            </View>
          </View>

          {missing.length > 0 && (
            <View style={styles.warn}>
              <Text style={styles.warnText}>Finish your profile: add {missing.join(', ')}.</Text>
            </View>
          )}

          <Row title="Business profile & branding"
            sub="Name, phone, email, address, hours, color, logo"
            color={theme.primaryColor} onPress={() => navigation.navigate('BusinessProfile')} />
          <Row title="Subscription & plan"
            sub={`${(t?.tier || 'starter')[0].toUpperCase()}${(t?.tier || 'starter').slice(1)} · ${t?.status}`}
            color={theme.primaryColor} onPress={() => navigation.navigate('Subscription')} />
          <Row title="Team"
            sub="Add or view technicians"
            color={theme.primaryColor} onPress={() => navigation.navigate('Team')} />

          <Pressable style={styles.dashLink} onPress={() => navigation.navigate('TechDashboard')}>
            <Text style={[styles.dashLinkText, { color: theme.primaryColor }]}>← Back to dashboard</Text>
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}

function Row({ title, sub, color, onPress }) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{sub}</Text>
      </View>
      <Text style={[styles.chev, { color }]}>›</Text>
    </Pressable>
  );
}

const INK = '#1a2230', MUTED = '#8a93a0';
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#eef1f5' },
  header: {
    paddingBottom: 18, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
  },
  brand: { color: '#fff', fontSize: 20, fontWeight: '700' },
  headerNote: { color: '#ffffffcc', fontSize: 12, marginTop: 2 },
  logout: { color: '#fff', fontSize: 14, fontWeight: '600' },
  body: { padding: 20, paddingBottom: 40 },
  snap: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  logoBox: { width: 60, height: 60, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  logo: { width: '100%', height: '100%' },
  logoLetter: { fontSize: 26, fontWeight: '800' },
  snapName: { color: INK, fontSize: 17, fontWeight: '700' },
  snapSub: { color: MUTED, fontSize: 12, marginTop: 2 },
  warn: { backgroundColor: '#fff4e5', borderRadius: 12, padding: 12, marginTop: 12 },
  warnText: { color: '#b26a00', fontSize: 13, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 18, marginTop: 12 },
  rowTitle: { color: INK, fontSize: 15, fontWeight: '700' },
  rowSub: { color: MUTED, fontSize: 12, marginTop: 3 },
  chev: { fontSize: 26, fontWeight: '700' },
  dashLink: { marginTop: 22, alignItems: 'center' },
  dashLinkText: { fontSize: 14, fontWeight: '700' },
});
