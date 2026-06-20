// VIPOR Service — TECH / ADMIN side, preview for Expo Snack (snack.expo.dev)
// Paste into App.js on Snack (separate project from the customer app).
// Flow: Dashboard -> tap a new request -> build quote -> send ->
//        request becomes an active job -> advance status to completion.

import React, { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, StyleSheet,
  SafeAreaView, StatusBar,
} from 'react-native';

const NAVY = '#1b2434', INK = '#1a2230', MUTED = '#8a93a0', LINE = '#eef1f5', RED = '#c8102e', GREEN = '#16a34a';
const fmt = (n) => `$${Number(n).toFixed(2)}`;

const STATUS = {
  pending:     { label: 'Pending',     bg: '#fff4e5', fg: '#b26a00', next: 'en_route',    cta: 'Dispatch' },
  en_route:    { label: 'En route',    bg: '#fdeaec', fg: RED,       next: 'in_progress', cta: 'Start job' },
  in_progress: { label: 'In progress', bg: '#eaf3fb', fg: '#2563eb', next: 'completed',   cta: 'Complete' },
  completed:   { label: 'Completed',   bg: '#e7f6ed', fg: '#1e6f43', next: null,          cta: null },
};

export default function App() {
  const [view, setView] = useState('dashboard'); // dashboard | builder
  const [active, setActive] = useState(null);     // request being quoted

  const [requests, setRequests] = useState([
    { id: 'r1', customer: 'J. Tremblay', vehicle: '2019 Ford F-150', issue: 'Grinding noise when braking' },
    { id: 'r2', customer: 'A. Côté', vehicle: '2015 Civic', issue: 'Oil change + inspection' },
  ]);
  const [jobs, setJobs] = useState([
    { id: 'j28', customer: 'M. Roy', vehicle: '2020 RAV4', service: 'Diagnostic', status: 'in_progress' },
  ]);

  function openBuilder(req) { setActive(req); setView('builder'); }

  function sendQuote(req, total) {
    setRequests((rs) => rs.filter((r) => r.id !== req.id));
    setJobs((js) => [
      { id: 'j' + (30 + js.length), customer: req.customer, vehicle: req.vehicle, service: req.issue, status: 'pending', total },
      ...js,
    ]);
    setView('dashboard');
  }

  function advance(job) {
    const nxt = STATUS[job.status].next;
    if (!nxt) return;
    setJobs((js) => js.map((j) => (j.id === job.id ? { ...j, status: nxt } : j)));
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      {view === 'dashboard'
        ? <Dashboard requests={requests} jobs={jobs} onQuote={openBuilder} onAdvance={advance} />
        : <Builder request={active} onCancel={() => setView('dashboard')} onSend={sendQuote} />}
    </SafeAreaView>
  );
}

/* ---------------- Dashboard ---------------- */
function Dashboard({ requests, jobs, onQuote, onAdvance }) {
  const activeCount = jobs.filter((j) => j.status !== 'completed').length;
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>Vipor</Text>
          <Text style={styles.headerNote}>Technician · Admin</Text>
        </View>
        <View style={styles.avatar}><Text style={{ color: '#fff', fontWeight: '700' }}>MD</Text></View>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.tiles}>
          <Tile n={activeCount} label="Active jobs" color={RED} />
          <Tile n={requests.length} label="New requests" color={NAVY} />
          <Tile n="$1.2k" label="Today" color={GREEN} />
        </View>

        <Text style={styles.section}>New requests</Text>
        {requests.length === 0 && <Text style={styles.empty}>All caught up 🎉</Text>}
        {requests.map((r) => (
          <View key={r.id} style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.cardName}>{r.customer}</Text>
              <View style={[styles.pill, { backgroundColor: '#fff4e5' }]}><Text style={[styles.pillText, { color: '#b26a00' }]}>Awaiting quote</Text></View>
            </View>
            <Text style={styles.cardSub}>{r.vehicle}</Text>
            <Text style={styles.cardIssue}>“{r.issue}”</Text>
            <Pressable style={styles.cardCta} onPress={() => onQuote(r)}>
              <Text style={styles.cardCtaText}>Build & send quote →</Text>
            </Pressable>
          </View>
        ))}

        <Text style={styles.section}>Active jobs</Text>
        {jobs.map((j) => {
          const s = STATUS[j.status];
          return (
            <View key={j.id} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.cardName}>{j.customer}</Text>
                <View style={[styles.pill, { backgroundColor: s.bg }]}><Text style={[styles.pillText, { color: s.fg }]}>{s.label}</Text></View>
              </View>
              <Text style={styles.cardSub}>{j.vehicle} · {j.service}</Text>
              {s.next ? (
                <Pressable style={[styles.cardCta, { backgroundColor: NAVY }]} onPress={() => onAdvance(j)}>
                  <Text style={[styles.cardCtaText, { color: '#fff' }]}>{s.cta} →</Text>
                </Pressable>
              ) : (
                <Text style={styles.doneNote}>✓ Job complete</Text>
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

/* ---------------- Quote builder ---------------- */
function Builder({ request, onCancel, onSend }) {
  const [items, setItems] = useState([
    { label: 'Brake pads & rotors', price: 150, kind: 'part' },
    { label: 'Labour', price: 120, kind: 'labour' },
  ]);
  const [label, setLabel] = useState('');
  const [price, setPrice] = useState('');
  const [markup, setMarkup] = useState(30);

  const subtotal = items.reduce((s, i) => s + Number(i.price), 0);
  const total = subtotal * (1 + markup / 100);

  function addItem(kind) {
    const p = parseFloat(price);
    if (!label || isNaN(p)) return;
    setItems((xs) => [...xs, { label, price: p, kind }]);
    setLabel(''); setPrice('');
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={onCancel} hitSlop={12}><Text style={styles.back}>‹  Cancel</Text></Pressable>
        <Text style={styles.headerNote}>New quote</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{request.customer}</Text>
        <Text style={styles.subtitle}>{request.vehicle} · “{request.issue}”</Text>

        <Text style={styles.section}>Line items</Text>
        <View style={styles.lines}>
          {items.map((it, i) => (
            <View key={i} style={[styles.lineRow, i === items.length - 1 && styles.noBorder]}>
              <View style={{ flexShrink: 1 }}>
                <Text style={styles.lineLabel}>{it.label}</Text>
                <Text style={styles.kind}>{it.kind}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <Text style={styles.lineValue}>{fmt(it.price)}</Text>
                <Pressable onPress={() => setItems((xs) => xs.filter((_, j) => j !== i))} hitSlop={8}>
                  <Text style={styles.remove}>✕</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>

        {/* add row */}
        <View style={styles.addRow}>
          <TextInput style={[styles.input, { flex: 2 }]} placeholder="Item" placeholderTextColor="#aab2bd" value={label} onChangeText={setLabel} />
          <TextInput style={[styles.input, { flex: 1 }]} placeholder="$" placeholderTextColor="#aab2bd" keyboardType="numeric" value={price} onChangeText={setPrice} />
        </View>
        <View style={styles.addBtns}>
          <Pressable style={styles.addBtn} onPress={() => addItem('part')}><Text style={styles.addBtnText}>+ Part</Text></Pressable>
          <Pressable style={styles.addBtn} onPress={() => addItem('labour')}><Text style={styles.addBtnText}>+ Labour</Text></Pressable>
        </View>

        {/* markup */}
        <View style={styles.markupRow}>
          <Text style={styles.label}>Shop markup</Text>
          <View style={styles.stepper}>
            <Pressable style={styles.stepBtn} onPress={() => setMarkup((m) => Math.max(0, m - 5))}><Text style={styles.stepBtnText}>–</Text></Pressable>
            <Text style={styles.stepVal}>{markup}%</Text>
            <Pressable style={styles.stepBtn} onPress={() => setMarkup((m) => m + 5)}><Text style={styles.stepBtnText}>+</Text></Pressable>
          </View>
        </View>

        <View style={styles.totalCard}>
          <View><Text style={styles.totalLabel}>Total estimate</Text><Text style={styles.totalNote}>{items.length} items · {markup}% markup</Text></View>
          <Text style={styles.totalValue}>{fmt(total)}</Text>
        </View>
      </ScrollView>

      <View style={styles.actions}>
        <Pressable style={[styles.primary, items.length === 0 && styles.disabled]} disabled={items.length === 0} onPress={() => onSend(request, total)}>
          <Text style={styles.primaryText}>Send quote to customer</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: NAVY },
  screen: { flex: 1, backgroundColor: '#eef1f5' },

  header: { backgroundColor: NAVY, paddingVertical: 16, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerNote: { color: '#aab4c4', fontSize: 12, marginTop: 2 },
  back: { color: '#fff', fontSize: 16, fontWeight: '600' },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#39424f', alignItems: 'center', justifyContent: 'center' },

  body: { padding: 20, paddingBottom: 40 },
  title: { color: INK, fontSize: 24, fontWeight: '700' },
  subtitle: { color: MUTED, fontSize: 13, marginTop: 4, marginBottom: 8 },
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
  cardIssue: { color: MUTED, fontSize: 13, marginTop: 2, fontStyle: 'italic' },
  cardCta: { marginTop: 14, backgroundColor: RED, borderRadius: 10, height: 42, alignItems: 'center', justifyContent: 'center' },
  cardCtaText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  doneNote: { color: '#1e6f43', fontWeight: '700', fontSize: 13, marginTop: 12 },

  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  pillText: { fontSize: 11, fontWeight: '700' },

  lines: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16 },
  lineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: LINE },
  noBorder: { borderBottomWidth: 0 },
  lineLabel: { color: INK, fontSize: 14, fontWeight: '500' },
  kind: { color: MUTED, fontSize: 11, marginTop: 1 },
  lineValue: { color: INK, fontSize: 14, fontWeight: '600' },
  remove: { color: '#c0c7d0', fontSize: 14, fontWeight: '700' },

  addRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  input: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e3e7ed', paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: INK },
  addBtns: { flexDirection: 'row', gap: 10, marginTop: 10 },
  addBtn: { flex: 1, borderRadius: 10, borderWidth: 1, borderColor: NAVY, paddingVertical: 10, alignItems: 'center' },
  addBtnText: { color: NAVY, fontWeight: '700', fontSize: 13 },

  markupRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 22 },
  label: { color: '#6b7280', fontSize: 13, fontWeight: '600' },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e3e7ed' },
  stepBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { fontSize: 20, color: NAVY, fontWeight: '700' },
  stepVal: { width: 52, textAlign: 'center', color: INK, fontWeight: '700' },

  totalCard: { backgroundColor: '#fff', borderRadius: 16, padding: 18, marginTop: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { color: '#6b7280', fontSize: 13 },
  totalNote: { color: MUTED, fontSize: 11, marginTop: 3 },
  totalValue: { color: INK, fontSize: 26, fontWeight: '700' },

  actions: { padding: 20, borderTopWidth: 1, borderTopColor: '#e3e7ed' },
  primary: { backgroundColor: NAVY, borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.45 },
});
