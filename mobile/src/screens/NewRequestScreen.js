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
  const [busy, setBusy] = useState(false);

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
  actions: { paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#e3e7ed', backgroundColor: '#eef1f5' },
  primary: { borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.6 },
});
