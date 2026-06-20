// VIPOR Service — Quote builder (technician / admin).
// Add parts/labour line items, set a shop markup, watch the total recalc live,
// then POST /quotes to send it to the customer. On success, returns to the
// dashboard (which refetches on focus, dropping the request from the inbox).

import React, { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, ActivityIndicator, StyleSheet, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { api } from '../api';

const fmt = (n) => `$${Number(n).toFixed(2)}`;
const fmtVehicle = (v) =>
  v && typeof v === 'object' ? `${v.year} ${v.make} ${v.model}` : (v || '');

export default function QuoteBuilderScreen({ route, navigation }) {
  const { request } = route.params;
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [items, setItems] = useState([]);
  const [label, setLabel] = useState('');
  const [price, setPrice] = useState('');
  const [markup, setMarkup] = useState(30);
  const [sending, setSending] = useState(false);

  const subtotal = items.reduce((s, i) => s + Number(i.unitPrice) * (Number(i.qty) || 1), 0);
  const total = subtotal * (1 + markup / 100);

  function addItem(kind) {
    const p = parseFloat(price);
    if (!label.trim() || isNaN(p)) {
      Alert.alert('Add a line', 'Enter an item name and a price first.');
      return;
    }
    setItems((xs) => [...xs, { label: label.trim(), unitPrice: p, qty: 1, kind }]);
    setLabel(''); setPrice('');
  }

  async function send() {
    if (items.length === 0) return;
    setSending(true);
    try {
      await api.post('/quotes', { requestId: request.id, markupPct: markup, lineItems: items });
      navigation.goBack();
    } catch (e) {
      Alert.alert('Could not send quote', e.message ?? 'Please try again.');
      setSending(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { backgroundColor: theme.primaryColor, paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.back}>‹  Cancel</Text>
        </Pressable>
        <Text style={styles.headerNote}>New quote</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{request.customerName}</Text>
        <Text style={styles.subtitle}>
          {fmtVehicle(request.vehicle)} · “{request.description}”
        </Text>

        <Text style={styles.section}>Line items</Text>
        <View style={styles.lines}>
          {items.length === 0 && <Text style={styles.emptyLine}>No items yet — add parts or labour below.</Text>}
          {items.map((it, i) => (
            <View key={i} style={[styles.lineRow, i === items.length - 1 && styles.noBorder]}>
              <View style={{ flexShrink: 1 }}>
                <Text style={styles.lineLabel}>{it.label}</Text>
                <Text style={styles.kind}>{it.kind}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <Text style={styles.lineValue}>{fmt(it.unitPrice)}</Text>
                <Pressable onPress={() => setItems((xs) => xs.filter((_, j) => j !== i))} hitSlop={8}>
                  <Text style={styles.remove}>✕</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.addRow}>
          <TextInput style={[styles.input, { flex: 2 }]} placeholder="Item" placeholderTextColor="#aab2bd"
            value={label} onChangeText={setLabel} />
          <TextInput style={[styles.input, { flex: 1 }]} placeholder="$" placeholderTextColor="#aab2bd"
            keyboardType="numeric" value={price} onChangeText={setPrice} />
        </View>
        <View style={styles.addBtns}>
          <Pressable style={styles.addBtn} onPress={() => addItem('part')}>
            <Text style={styles.addBtnText}>+ Part</Text>
          </Pressable>
          <Pressable style={styles.addBtn} onPress={() => addItem('labour')}>
            <Text style={styles.addBtnText}>+ Labour</Text>
          </Pressable>
        </View>

        <View style={styles.markupRow}>
          <Text style={styles.label}>Shop markup</Text>
          <View style={styles.stepper}>
            <Pressable style={styles.stepBtn} onPress={() => setMarkup((m) => Math.max(0, m - 5))}>
              <Text style={styles.stepBtnText}>–</Text>
            </Pressable>
            <Text style={styles.stepVal}>{markup}%</Text>
            <Pressable style={styles.stepBtn} onPress={() => setMarkup((m) => m + 5)}>
              <Text style={styles.stepBtnText}>+</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.totalCard}>
          <View>
            <Text style={styles.totalLabel}>Total estimate</Text>
            <Text style={styles.totalNote}>{items.length} items · {markup}% markup</Text>
          </View>
          <Text style={styles.totalValue}>{fmt(total)}</Text>
        </View>
      </ScrollView>

      <View style={[styles.actions, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          style={[styles.primary, { backgroundColor: theme.primaryColor }, (items.length === 0 || sending) && styles.disabled]}
          disabled={items.length === 0 || sending}
          onPress={send}
        >
          {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Send quote to customer</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const NAVY = '#1b2434', INK = '#1a2230', MUTED = '#8a93a0', LINE = '#eef1f5';

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#eef1f5' },

  header: {
    paddingBottom: 18, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
  },
  back: { color: '#fff', fontSize: 16, fontWeight: '600' },
  headerNote: { color: '#ffffffcc', fontSize: 12 },

  body: { padding: 20, paddingBottom: 40 },
  title: { color: INK, fontSize: 24, fontWeight: '700' },
  subtitle: { color: MUTED, fontSize: 13, marginTop: 4, marginBottom: 8 },
  section: { color: INK, fontSize: 15, fontWeight: '700', marginTop: 22, marginBottom: 10 },

  lines: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16 },
  emptyLine: { color: MUTED, fontSize: 13, fontStyle: 'italic', paddingVertical: 16 },
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

  actions: { paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#e3e7ed', backgroundColor: '#eef1f5' },
  primary: { borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.45 },
});
