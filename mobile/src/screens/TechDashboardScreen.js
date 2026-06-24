// VIPOR Service — Technician / Admin dashboard.
// Inbox of open service requests → build & send a quote; list of active jobs →
// advance the dispatch lifecycle. Talks to the real backend (requests/quotes/jobs).

import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet, Alert, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { useAuth } from '../auth';
import { useLocationPublisher } from '../useLocationPublisher';
import { api } from '../api';

const fmt = (n) => (n == null ? '—' : `$${Number(n).toFixed(2)}`);
const fmtVehicle = (v) =>
  v && typeof v === 'object' ? `${v.year} ${v.make} ${v.model}` : (v || '—');

// dispatch lifecycle: which transition button to show per status
const STATUS = {
  pending:     { label: 'Pending',     bg: '#fff4e5', fg: '#b26a00', next: 'en_route',    cta: 'Dispatch' },
  en_route:    { label: 'En route',    bg: '#fdeaec', fg: '#c8102e', next: 'in_progress', cta: 'Start job' },
  in_progress: { label: 'In progress', bg: '#eaf3fb', fg: '#2563eb', next: 'completed',   cta: 'Complete' },
  completed:   { label: 'Completed',   bg: '#e7f6ed', fg: '#1e6f43', next: null,          cta: null },
  canceled:    { label: 'Canceled',    bg: '#f1f1f3', fg: '#6b7280', next: null,          cta: null },
};

export default function TechDashboardScreen({ navigation }) {
  const theme = useTheme();
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();

  const [requests, setRequests] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [reqs, jbs] = await Promise.all([api.get('/requests'), api.get('/jobs')]);
      setRequests(reqs);
      setJobs(jbs);
    } catch (e) {
      setError(e.message ?? 'Could not load the dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // refetch whenever the screen regains focus (e.g. after sending a quote)
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function advance(job) {
    const next = STATUS[job.status]?.next;
    if (!next) return;
    // optimistic update
    setJobs((js) => js.map((j) => (j.id === job.id ? { ...j, status: next } : j)));
    try {
      await api.patch(`/jobs/${job.id}/status`, { status: next });
    } catch (e) {
      setJobs((js) => js.map((j) => (j.id === job.id ? { ...j, status: job.status } : j)));
      Alert.alert('Could not update job', e.message ?? 'Please try again.');
    }
  }

  const activeCount = jobs.filter((j) => !['completed', 'canceled'].includes(j.status)).length;

  // Stream this device's GPS for whichever job is currently being driven, so the
  // customer's map updates. Server only accepts pings while en_route/in_progress.
  const driving = jobs.find((j) => ['en_route', 'in_progress'].includes(j.status));
  useLocationPublisher(driving?.id, !!driving);

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={theme.primaryColor} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { backgroundColor: theme.primaryColor, paddingTop: insets.top + 12 }]}>
        <View>
          <Text style={styles.brand}>{theme.name || 'Vipor'}</Text>
          <Text style={styles.headerNote}>{user?.role === 'admin' ? 'Admin' : 'Technician'} · {user?.name}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
          {user?.role === 'admin' && (
            <Pressable onPress={() => navigation.navigate('Admin')} hitSlop={12}>
              <Text style={styles.logout}>Manage</Text>
            </Pressable>
          )}
          <Pressable onPress={logout} hitSlop={12}>
            <Text style={styles.logout}>Log out</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        {error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.tiles}>
          <Tile n={activeCount} label="Active jobs" color={theme.primaryColor} />
          <Tile n={requests.length} label="New requests" color="#1b2434" />
        </View>

        <Text style={styles.section}>New requests</Text>
        {requests.length === 0 && <Text style={styles.empty}>All caught up 🎉</Text>}
        {requests.map((r) => (
          <View key={r.id} style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.cardName}>{r.customerName}</Text>
              <View style={[styles.pill, { backgroundColor: '#fff4e5' }]}>
                <Text style={[styles.pillText, { color: '#b26a00' }]}>Awaiting quote</Text>
              </View>
            </View>
            <Text style={styles.cardSub}>{fmtVehicle(r.vehicle)}</Text>
            {r.vehicle?.vin ? <Text style={styles.vin}>VIN {r.vehicle.vin}</Text> : null}
            <Text style={styles.cardIssue}>“{r.description}”</Text>
            <Pressable
              style={[styles.cardCta, { backgroundColor: theme.primaryColor }]}
              onPress={() => navigation.navigate('QuoteBuilder', { request: r })}
            >
              <Text style={styles.cardCtaText}>Build & send quote →</Text>
            </Pressable>
          </View>
        ))}

        <Text style={styles.section}>Active jobs</Text>
        {jobs.length === 0 && <Text style={styles.empty}>No jobs yet.</Text>}
        {jobs.map((j) => {
          const s = STATUS[j.status] || STATUS.pending;
          return (
            <View key={j.id} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.cardName}>{j.customerName}</Text>
                <View style={[styles.pill, { backgroundColor: s.bg }]}>
                  <Text style={[styles.pillText, { color: s.fg }]}>{s.label}</Text>
                </View>
              </View>
              <Text style={styles.cardSub}>{j.vehicle} · {j.service}{j.total != null ? ` · ${fmt(j.total)}` : ''}</Text>
              {s.next ? (
                <Pressable style={[styles.cardCta, { backgroundColor: '#1b2434' }]} onPress={() => advance(j)}>
                  <Text style={styles.cardCtaText}>{s.cta} →</Text>
                </Pressable>
              ) : (
                <Text style={styles.doneNote}>✓ {s.label}</Text>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function Tile({ n, label, color }) {
  return (
    <View style={styles.tile}>
      <Text style={[styles.tileN, { color }]}>{n}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

const NAVY = '#1b2434', INK = '#1a2230', MUTED = '#8a93a0';

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

  body: { padding: 20, paddingBottom: 40 },
  error: { color: '#b00020', fontSize: 13, marginBottom: 12 },
  section: { color: INK, fontSize: 15, fontWeight: '700', marginTop: 22, marginBottom: 10 },
  empty: { color: MUTED, fontSize: 13, fontStyle: 'italic' },

  tiles: { flexDirection: 'row', gap: 12 },
  tile: { flex: 1, backgroundColor: '#fff', borderRadius: 14, paddingVertical: 16, paddingHorizontal: 14 },
  tileN: { fontSize: 24, fontWeight: '700' },
  tileLabel: { color: MUTED, fontSize: 11, marginTop: 4 },

  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardName: { color: INK, fontSize: 15, fontWeight: '700' },
  cardSub: { color: '#4b5563', fontSize: 13, marginTop: 4 },
  vin: { color: '#94a0ad', fontSize: 11, marginTop: 2, fontVariant: ['tabular-nums'] },
  cardIssue: { color: MUTED, fontSize: 13, marginTop: 4, fontStyle: 'italic' },
  cardCta: { marginTop: 14, borderRadius: 10, height: 42, alignItems: 'center', justifyContent: 'center' },
  cardCtaText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  doneNote: { color: '#1e6f43', fontWeight: '700', fontSize: 13, marginTop: 12 },

  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  pillText: { fontSize: 11, fontWeight: '700' },
});
