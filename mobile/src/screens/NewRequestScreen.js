// VIPOR Service — Customer: submit a service request.
// Captures the vehicle (incl. optional VIN, which helps the shop source parts)
// and the issue, then POSTs it — it lands in the technician's inbox for a quote.

import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet, ScrollView, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { api } from '../api';

export default function NewRequestScreen({ navigation }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [year, setYear] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [vin, setVin] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(null);     // preferred booking date (YYYY-MM-DD)
  const [slot, setSlot] = useState('Morning');
  const [busy, setBusy] = useState(false);

  // next 14 days for the booking calendar
  const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const today = new Date();
  const days = Array.from({ length: 14 }, (_, i) => { const d = new Date(today); d.setDate(today.getDate() + i); return d; });
  const SLOTS = ['Morning', 'Afternoon', 'Evening'];

  async function submit() {
    if (!make.trim() || !model.trim() || !description.trim()) {
      Alert.alert('Missing info', 'Add at least the make, model and a description of the issue.');
      return;
    }
    setBusy(true);
    try {
      await api.post('/requests', {
        vehicle: {
          year: year.trim() ? Number(year.trim()) : null,
          make: make.trim(), model: model.trim(),
          vin: vin.trim().toUpperCase() || null,
        },
        description: description.trim(),
        preferredDate: date,
        preferredSlot: date ? slot : null,
      });
      navigation.goBack(); // home refetches on focus
    } catch (e) {
      Alert.alert('Could not submit', e.message ?? 'Please try again.');
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { backgroundColor: theme.primaryColor, paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.back}>‹  Cancel</Text>
        </Pressable>
        <Text style={styles.headerNote}>New request</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>What's going on?</Text>
        <Text style={styles.subtitle}>Tell the shop about your vehicle and the issue.</Text>

        <Text style={styles.label}>Vehicle</Text>
        <View style={styles.row}>
          <TextInput style={[styles.input, { flex: 1 }]} placeholder="Year" placeholderTextColor="#aab2bd"
            value={year} onChangeText={setYear} keyboardType="number-pad" maxLength={4} />
          <TextInput style={[styles.input, { flex: 1.4 }]} placeholder="Make" placeholderTextColor="#aab2bd"
            value={make} onChangeText={setMake} autoCapitalize="words" />
          <TextInput style={[styles.input, { flex: 1.4 }]} placeholder="Model" placeholderTextColor="#aab2bd"
            value={model} onChangeText={setModel} autoCapitalize="words" />
        </View>

        <Text style={styles.label}>VIN <Text style={styles.optional}>(optional — helps source parts)</Text></Text>
        <TextInput style={[styles.input, styles.vinInput]} placeholder="e.g. 19XFC2F59JE000111" placeholderTextColor="#aab2bd"
          value={vin} onChangeText={setVin} autoCapitalize="characters" autoCorrect={false} maxLength={17} />

        <Text style={styles.label}>Describe the issue</Text>
        <TextInput style={[styles.input, styles.textarea]} placeholder="e.g. grinding noise when braking"
          placeholderTextColor="#aab2bd" value={description} onChangeText={setDescription}
          multiline textAlignVertical="top" />

        <Text style={styles.label}>Preferred date <Text style={styles.optional}>(optional)</Text></Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
          {days.map((d) => {
            const key = iso(d);
            const on = date === key;
            return (
              <Pressable key={key} onPress={() => setDate(on ? null : key)}
                style={[styles.day, on && { backgroundColor: theme.primaryColor, borderColor: theme.primaryColor }]}>
                <Text style={[styles.dayWd, on && styles.dayOnText]}>{WD[d.getDay()]}</Text>
                <Text style={[styles.dayNum, on && styles.dayOnText]}>{d.getDate()}</Text>
                <Text style={[styles.dayMo, on && styles.dayOnText]}>{MO[d.getMonth()]}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {date && (
          <View style={styles.slots}>
            {SLOTS.map((s) => {
              const on = slot === s;
              return (
                <Pressable key={s} onPress={() => setSlot(s)}
                  style={[styles.slot, on && { backgroundColor: theme.primaryColor, borderColor: theme.primaryColor }]}>
                  <Text style={[styles.slotText, on && { color: '#fff' }]}>{s}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      <View style={[styles.actions, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable style={[styles.primary, { backgroundColor: theme.primaryColor }, busy && styles.disabled]}
          disabled={busy} onPress={submit}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Submit request</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
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
  back: { color: '#fff', fontSize: 16, fontWeight: '600' },
  headerNote: { color: '#ffffffcc', fontSize: 12 },
  body: { padding: 20, paddingBottom: 40 },
  title: { color: INK, fontSize: 24, fontWeight: '700' },
  subtitle: { color: MUTED, fontSize: 13, marginTop: 4, marginBottom: 8 },
  label: { color: '#6b7280', fontSize: 13, fontWeight: '600', marginTop: 18, marginBottom: 8 },
  optional: { color: MUTED, fontSize: 12, fontWeight: '400' },
  row: { flexDirection: 'row', gap: 10 },
  input: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e3e7ed', paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: INK },
  vinInput: { fontVariant: ['tabular-nums'], letterSpacing: 1 },
  textarea: { height: 110 },
  day: { width: 58, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#e3e7ed', backgroundColor: '#fff', alignItems: 'center' },
  dayWd: { color: MUTED, fontSize: 11, fontWeight: '600' },
  dayNum: { color: INK, fontSize: 18, fontWeight: '800', marginVertical: 1 },
  dayMo: { color: MUTED, fontSize: 11 },
  dayOnText: { color: '#fff' },
  slots: { flexDirection: 'row', gap: 10, marginTop: 12 },
  slot: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e3e7ed', backgroundColor: '#fff', alignItems: 'center' },
  slotText: { color: INK, fontSize: 13, fontWeight: '700' },
  actions: { paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#e3e7ed', backgroundColor: '#eef1f5' },
  primary: { borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.6 },
});
