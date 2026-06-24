// VIPOR Service — Live Tracking (WEB fallback).
// react-native-maps has no web implementation, so on web we show the same live
// status + ETA + coordinates without the interactive map. Metro picks this file
// for the web bundle; native uses LiveTrackingScreen.js (with the real map).

import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet, Linking, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { api } from '../api';

const DESTINATION = { latitude: 45.5019, longitude: -73.5674 };
const POLL_MS = 4000;

function etaMinutes(from, to) {
  const R = 6371;
  const dLat = ((to.latitude - from.latitude) * Math.PI) / 180;
  const dLng = ((to.longitude - from.longitude) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((from.latitude * Math.PI) / 180) * Math.cos((to.latitude * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  const km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.max(1, Math.round((km / 30) * 60));
}

export default function LiveTrackingScreen({ route, navigation }) {
  const { jobId, quoteId } = route.params;
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [techPos, setTechPos] = useState(null);
  const [status, setStatus] = useState('connecting');

  useEffect(() => {
    let alive = true;
    async function poll() {
      try {
        const loc = await api.get(`/jobs/${jobId}/location`);
        if (!alive) return;
        if (loc) { setTechPos({ latitude: loc.lat, longitude: loc.lng }); setStatus('tracking'); }
        else setStatus('waiting');
      } catch (e) {
        if (alive) setStatus(/unavailable/i.test(e.message) ? 'waiting' : 'error');
      }
    }
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => { alive = false; clearInterval(id); };
  }, [jobId]);

  const eta = techPos ? etaMinutes(techPos, DESTINATION) : null;
  const phone = (theme.phone || '').replace(/[^0-9+]/g, '');
  const contact = (scheme) => {
    if (!phone) return Alert.alert('No phone number', 'This shop hasn’t added a phone number yet.');
    Linking.openURL(`${scheme}:${phone}`).catch(() => {});
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 16 }]}>
      <View style={styles.body}>
        <StatusPill status={status} />

        <View style={[styles.mapCard, { borderColor: theme.primaryColor }]}>
          <Text style={styles.mapEmoji}>📍</Text>
          <Text style={styles.mapTitle}>{eta != null ? `ETA · ${eta} min` : 'Live tracking'}</Text>
          <Text style={styles.mapSub}>
            {techPos
              ? `Technician at ${techPos.latitude.toFixed(4)}, ${techPos.longitude.toFixed(4)}`
              : 'Waiting for the technician’s location…'}
          </Text>
          <Text style={styles.mapNote}>The live map is available in the mobile app.</Text>
        </View>

        <Text style={styles.title}>Marc Dubois</Text>
        <Text style={styles.sub}>Lead technician · Job {jobId}</Text>

        <View style={styles.row}>
          <Pressable style={[styles.btn, { backgroundColor: '#1b2434' }]} onPress={() => contact('sms')}><Text style={styles.btnText}>Message</Text></Pressable>
          <Pressable style={[styles.btn, { backgroundColor: theme.primaryColor }]} onPress={() => contact('tel')}><Text style={styles.btnText}>Call</Text></Pressable>
        </View>

        <Pressable
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.replace('QuoteApproval', { quoteId }))}
          hitSlop={8}
        >
          <Text style={styles.done}>Close</Text>
        </Pressable>
      </View>
    </View>
  );
}

function StatusPill({ status }) {
  const map = {
    connecting: { t: 'Connecting…', bg: '#eef1f5', fg: '#6b7280' },
    waiting: { t: 'Waiting for technician to depart', bg: '#fff4e5', fg: '#b26a00' },
    tracking: { t: 'En route', bg: '#e7f6ed', fg: '#1e6f43' },
    error: { t: 'Connection lost — retrying', bg: '#fdeaec', fg: '#c8102e' },
  }[status];
  return (
    <View style={[styles.pill, { backgroundColor: map.bg }]}>
      {status === 'connecting' && <ActivityIndicator size="small" color={map.fg} style={{ marginRight: 6 }} />}
      <Text style={[styles.pillText, { color: map.fg }]}>{map.t}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#eef1f5', alignItems: 'center' },
  body: { width: '100%', maxWidth: 480, padding: 24 },
  pill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  pillText: { fontWeight: '700', fontSize: 12 },
  mapCard: {
    backgroundColor: '#fff', borderRadius: 18, borderWidth: 2, padding: 28, marginTop: 16,
    alignItems: 'center',
  },
  mapEmoji: { fontSize: 40 },
  mapTitle: { color: '#1a2230', fontSize: 22, fontWeight: '700', marginTop: 8 },
  mapSub: { color: '#4b5563', fontSize: 14, marginTop: 8, textAlign: 'center' },
  mapNote: { color: '#8a93a0', fontSize: 12, marginTop: 10, textAlign: 'center' },
  title: { color: '#1a2230', fontSize: 22, fontWeight: '700', marginTop: 22 },
  sub: { color: '#8a93a0', fontSize: 13, marginTop: 4 },
  row: { flexDirection: 'row', gap: 12, marginTop: 18 },
  btn: { flex: 1, borderRadius: 12, height: 48, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  done: { color: '#8a93a0', fontSize: 14, fontWeight: '600', textAlign: 'center', marginTop: 16 },
});
