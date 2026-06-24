// VIPOR Service — Live Tracking (real map).
// Polls the backend for the technician's latest GPS and draws it on a map with
// a route line + live ETA. Tracking is server-gated: GET returns 403 until the
// job is en_route/in_progress, so the map only animates once dispatched.

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet, Platform, Linking, Alert } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

// iOS Expo Go → Apple Maps (default); Android → Google Maps. Forcing Google on
// iOS needs a custom dev build, so we leave it undefined there.
const MAP_PROVIDER = Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined;
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { api } from '../api';

// The customer's address (destination). In the real app this comes from the job.
const DESTINATION = { latitude: 45.5019, longitude: -73.5674 }; // Montreal, demo
const POLL_MS = 4000;

// rough straight-line ETA from distance; good enough for an estimate badge
function etaMinutes(from, to) {
  const R = 6371; // km
  const dLat = ((to.latitude - from.latitude) * Math.PI) / 180;
  const dLng = ((to.longitude - from.longitude) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((from.latitude * Math.PI) / 180) * Math.cos((to.latitude * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  const km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.max(1, Math.round((km / 30) * 60)); // assume ~30 km/h city avg
}

export default function LiveTrackingScreen({ route, navigation }) {
  const { jobId, quoteId } = route.params;
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);

  const [techPos, setTechPos] = useState(null);
  const [status, setStatus] = useState('connecting'); // connecting | tracking | waiting | error

  useEffect(() => {
    let alive = true;
    async function poll() {
      try {
        const loc = await api.get(`/jobs/${jobId}/location`);
        if (!alive) return;
        if (loc) {
          const pos = { latitude: loc.lat, longitude: loc.lng };
          setTechPos(pos);
          setStatus('tracking');
          mapRef.current?.fitToCoordinates([pos, DESTINATION], {
            edgePadding: { top: 80, right: 60, bottom: 260, left: 60 }, animated: true,
          });
        } else {
          setStatus('waiting'); // job active but no GPS yet
        }
      } catch (e) {
        // 403 = tracking not active yet (job not dispatched); anything else = error
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
    Linking.openURL(`${scheme}:${phone}`).catch(() => Alert.alert('Unable to open', `Couldn’t start a ${scheme === 'tel' ? 'call' : 'message'}.`));
  };

  return (
    <View style={styles.screen}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={MAP_PROVIDER}
        initialRegion={{ ...DESTINATION, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
      >
        <Marker coordinate={DESTINATION} title="You" pinColor={theme.primaryColor} />
        {techPos && (
          <>
            <Marker coordinate={techPos} title="Technician" pinColor="#1b2434" />
            <Polyline coordinates={[techPos, DESTINATION]} strokeColor={theme.primaryColor} strokeWidth={4} />
          </>
        )}
      </MapView>

      {eta != null && (
        <View style={[styles.etaBadge, { top: insets.top + 12 }]}>
          <Text style={styles.etaText}>ETA · {eta} min</Text>
        </View>
      )}

      <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
        <StatusPill status={status} />
        <Text style={styles.title}>Marc Dubois</Text>
        <Text style={styles.sub}>Lead technician · Job {jobId}</Text>

        <View style={styles.row}>
          <Pressable style={[styles.btn, { backgroundColor: '#1b2434' }]} onPress={() => contact('sms')}>
            <Text style={styles.btnText}>Message</Text>
          </Pressable>
          <Pressable style={[styles.btn, { backgroundColor: theme.primaryColor }]} onPress={() => contact('tel')}>
            <Text style={styles.btnText}>Call</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() =>
            navigation.canGoBack()
              ? navigation.goBack()
              : navigation.replace('QuoteApproval', { quoteId })
          }
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
  screen: { flex: 1, backgroundColor: '#e8edf2' },
  etaBadge: {
    position: 'absolute', alignSelf: 'center', backgroundColor: '#fff',
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
  etaText: { color: '#1a2230', fontWeight: '700', fontSize: 13 },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: '#fff', padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: -4 }, elevation: 12,
  },
  pill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  pillText: { fontWeight: '700', fontSize: 12 },
  title: { color: '#1a2230', fontSize: 22, fontWeight: '700', marginTop: 14 },
  sub: { color: '#8a93a0', fontSize: 13, marginTop: 4 },
  row: { flexDirection: 'row', gap: 12, marginTop: 18 },
  btn: { flex: 1, borderRadius: 12, height: 48, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  done: { color: '#8a93a0', fontSize: 14, fontWeight: '600', textAlign: 'center', marginTop: 16 },
});
