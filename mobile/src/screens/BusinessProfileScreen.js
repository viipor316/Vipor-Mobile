// VIPOR Service — Business profile & branding editor (admin only).
// Edits the garage's public info (name, phone, email, address, website, hours)
// and white-label branding (primary color, logo URL). Saving refreshes the
// app's theme so the new brand applies immediately.

import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, Pressable, Image, ActivityIndicator, StyleSheet, ScrollView, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { api } from '../api';

const COLORS = ['#c8102e', '#0066ff', '#16a34a', '#7c3aed', '#ea580c', '#0891b2', '#1b2434'];

export default function BusinessProfileScreen({ navigation }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [form, setForm] = useState(null);
  const [color, setColor] = useState(theme.primaryColor);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const t = await api.get('/tenant/profile');
        setForm({
          name: t.name || '',
          logoUrl: t.branding?.logoUrl || '',
          phone: t.profile?.phone || '',
          email: t.profile?.email || '',
          address: t.profile?.address || '',
          website: t.profile?.website || '',
          hours: t.profile?.hours || '',
        });
        setColor(t.branding?.primaryColor || theme.primaryColor);
      } catch (e) {
        Alert.alert('Could not load profile', e.message ?? '');
      }
    })();
  }, []);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    if (!form.name.trim()) { Alert.alert('Name required', 'Your garage needs a name.'); return; }
    setSaving(true);
    try {
      await api.patch('/tenant/profile', { ...form, primaryColor: color });
      theme.refresh?.();          // apply new brand immediately
      navigation.goBack();
    } catch (e) {
      Alert.alert('Could not save', e.message ?? 'Please try again.');
      setSaving(false);
    }
  }

  if (!form) {
    return <View style={[styles.screen, styles.center]}><ActivityIndicator color={theme.primaryColor} /></View>;
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { backgroundColor: color, paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}><Text style={styles.back}>‹  Manage</Text></Pressable>
        <Text style={styles.headerNote}>Business profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Field label="Garage name" value={form.name} onChangeText={set('name')} autoCapitalize="words" />

        <Text style={styles.label}>Brand color</Text>
        <View style={styles.swatches}>
          {COLORS.map((c) => (
            <Pressable key={c} onPress={() => setColor(c)}
              style={[styles.swatch, { backgroundColor: c }, color === c && styles.swatchOn]} />
          ))}
        </View>

        <Text style={styles.label}>Logo URL <Text style={styles.opt}>(paste an image link)</Text></Text>
        <View style={styles.logoRow}>
          <View style={[styles.logoBox, { borderColor: color }]}>
            {form.logoUrl
              ? <Image source={{ uri: form.logoUrl }} style={styles.logo} resizeMode="contain" />
              : <Text style={[styles.logoLetter, { color }]}>{(form.name || '?').slice(0, 1)}</Text>}
          </View>
          <TextInput style={[styles.input, { flex: 1 }]} placeholder="https://…/logo.png" placeholderTextColor="#aab2bd"
            value={form.logoUrl} onChangeText={set('logoUrl')} autoCapitalize="none" autoCorrect={false} />
        </View>

        <Text style={styles.section}>Contact</Text>
        <Field label="Phone" value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" />
        <Field label="Email" value={form.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" />
        <Field label="Address" value={form.address} onChangeText={set('address')} />
        <Field label="Website" value={form.website} onChangeText={set('website')} autoCapitalize="none" />
        <Field label="Hours" value={form.hours} onChangeText={set('hours')} placeholder="Mon–Fri 8am–6pm" />
      </ScrollView>

      <View style={[styles.actions, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable style={[styles.primary, { backgroundColor: color }, saving && styles.disabled]} disabled={saving} onPress={save}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Save changes</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function Field({ label, ...props }) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} placeholderTextColor="#aab2bd" {...props} />
    </View>
  );
}

const INK = '#1a2230', MUTED = '#8a93a0';
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#eef1f5' },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    paddingBottom: 18, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
  },
  back: { color: '#fff', fontSize: 16, fontWeight: '600' },
  headerNote: { color: '#ffffffcc', fontSize: 12 },
  body: { padding: 20, paddingBottom: 40 },
  section: { color: INK, fontSize: 15, fontWeight: '700', marginTop: 22 },
  label: { color: '#6b7280', fontSize: 13, fontWeight: '600', marginTop: 16, marginBottom: 7 },
  opt: { color: MUTED, fontSize: 12, fontWeight: '400' },
  input: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e3e7ed', paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: INK },
  swatches: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  swatch: { width: 38, height: 38, borderRadius: 19, borderWidth: 3, borderColor: 'transparent' },
  swatchOn: { borderColor: '#1a2230' },
  logoRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  logoBox: { width: 56, height: 56, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#fff' },
  logo: { width: '100%', height: '100%' },
  logoLetter: { fontSize: 24, fontWeight: '800' },
  actions: { paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#e3e7ed', backgroundColor: '#eef1f5' },
  primary: { borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.6 },
});
