// VIPOR Service — LIVE TRACKING preview for Expo Snack (snack.expo.dev)
// Pure React Native — NO external deps (no react-native-svg/maps), so it runs in
// Snack's web preview with zero "unable to resolve module" errors.
// Simulates the technician driving toward you with a live ETA.

import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, SafeAreaView, StatusBar } from 'react-native';

const NAVY = '#1b2434', INK = '#1a2230', MUTED = '#8a93a0', RED = '#c8102e';

// route in normalized 0..1 map space (last point = your address)
const ROUTE = [
  [0.12, 0.58], [0.22, 0.52], [0.34, 0.46], [0.44, 0.40],
  [0.52, 0.33], [0.64, 0.26], [0.74, 0.18], [0.86, 0.10],
];
const STEP_MS = 1100;
const MIN_PER_LEG = 2;

export default function App() {
  const [i, setI] = useState(0);
  const [size, setSize] = useState(null); // map area px, from onLayout
  const arrived = i >= ROUTE.length - 1;

  useEffect(() => {
    if (arrived) return;
    const t = setTimeout(() => setI((x) => x + 1), STEP_MS);
    return () => clearTimeout(t);
  }, [i, arrived]);

  const eta = Math.max(0, (ROUTE.length - 1 - i) * MIN_PER_LEG);
  const remaining = ROUTE.slice(i);
  const tech = ROUTE[i];
  const dest = ROUTE[ROUTE.length - 1];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.screen}>
        {/* map */}
        <View style={styles.map} onLayout={(e) => setSize(e.nativeEvent.layout)}>
          {/* streets */}
          {[0.18, 0.36, 0.54, 0.72, 0.9].map((y) => (
            <View key={'h' + y} style={[styles.street, { top: `${y * 100}%`, left: 0, right: 0, height: 3 }]} />
          ))}
          {[0.2, 0.4, 0.6, 0.8].map((x) => (
            <View key={'v' + x} style={[styles.street, { left: `${x * 100}%`, top: 0, bottom: 0, width: 3 }]} />
          ))}

          {size && (
            <>
              {/* remaining route (accent) */}
              {remaining.slice(0, -1).map((p, k) => (
                <Segment key={k} a={p} b={remaining[k + 1]} size={size} color={RED} thickness={4} />
              ))}
              {/* destination + technician markers */}
              <Dot pt={dest} size={size} color={RED} r={7} />
              <Dot pt={tech} size={size} color={NAVY} r={10} />
            </>
          )}
        </View>

        {/* ETA badge */}
        <View style={styles.etaBadge}>
          <Text style={styles.etaText}>{arrived ? 'Arriving now' : `ETA · ${eta} min`}</Text>
        </View>

        {/* sheet */}
        <View style={styles.sheet}>
          <View style={[styles.pill, arrived ? styles.pillArrived : styles.pillEnroute]}>
            <Text style={[styles.pillText, { color: arrived ? '#1e6f43' : '#b26a00' }]}>
              {arrived ? '● Arrived' : '● En route'}
            </Text>
          </View>
          <Text style={styles.title}>Marc Dubois</Text>
          <Text style={styles.sub}>Lead technician · Job #30 · Brake service</Text>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${(i / (ROUTE.length - 1)) * 100}%` }]} />
          </View>

          <View style={styles.row}>
            <Pressable style={[styles.btn, { backgroundColor: NAVY }]}><Text style={styles.btnText}>Message</Text></Pressable>
            <Pressable style={[styles.btn, { backgroundColor: RED }]}><Text style={styles.btnText}>Call</Text></Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

// a route leg drawn as a rotated View (no SVG needed)
function Segment({ a, b, size, color, thickness }) {
  const ax = a[0] * size.width, ay = a[1] * size.height;
  const bx = b[0] * size.width, by = b[1] * size.height;
  const dx = bx - ax, dy = by - ay;
  const len = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx); // radians
  return (
    <View
      style={{
        position: 'absolute',
        left: (ax + bx) / 2 - len / 2,
        top: (ay + by) / 2 - thickness / 2,
        width: len,
        height: thickness,
        borderRadius: thickness / 2,
        backgroundColor: color,
        transform: [{ rotate: `${angle}rad` }],
      }}
    />
  );
}

function Dot({ pt, size, color, r }) {
  return (
    <View
      style={{
        position: 'absolute',
        left: pt[0] * size.width - r,
        top: pt[1] * size.height - r,
        width: r * 2, height: r * 2, borderRadius: r,
        backgroundColor: color, borderWidth: 2, borderColor: '#fff',
      }}
    />
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#e8edf2' },
  screen: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject, backgroundColor: '#e8edf2', overflow: 'hidden' },
  street: { position: 'absolute', backgroundColor: '#dde4ec' },

  etaBadge: {
    position: 'absolute', top: 18, alignSelf: 'center', backgroundColor: '#fff',
    paddingHorizontal: 18, paddingVertical: 9, borderRadius: 22,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
  etaText: { color: INK, fontWeight: '700', fontSize: 14 },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff',
    padding: 24, paddingBottom: 34, borderTopLeftRadius: 26, borderTopRightRadius: 26,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: -4 }, elevation: 14,
  },
  pill: { alignSelf: 'flex-start', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  pillEnroute: { backgroundColor: '#fff4e5' },
  pillArrived: { backgroundColor: '#e7f6ed' },
  pillText: { fontWeight: '700', fontSize: 12 },
  title: { color: INK, fontSize: 22, fontWeight: '700', marginTop: 14 },
  sub: { color: MUTED, fontSize: 13, marginTop: 4 },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: '#eef1f5', marginTop: 18, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: RED },
  row: { flexDirection: 'row', gap: 12, marginTop: 20 },
  btn: { flex: 1, borderRadius: 12, height: 50, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
