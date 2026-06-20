// VIPOR Service — garage onboarding (white-label signup).
// A new garage owner creates their tenant + admin account and picks a brand
// color. Tenant starts inactive; the paywall (shown next, since the account is
// now an inactive admin) collects payment.

import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../auth';

const COLORS = ['#c8102e', '#0066ff', '#16a34a', '#7c3aed', '#ea580c', '#0891b2'];

export default function OnboardingScreen({ navigation }) {
  const { onboard } = useAuth();
  const insets = useSafeAreaInsets();

  const [garageName, setGarageName] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function submit() {
    if (!garageName.trim() || !ownerName.trim() || !email.trim() || !password) {
      setError('Please fill in every field.');
      return;
    }
    setError(null); setBusy(true);
    try {
      // create + sign in; tier is chosen on the paywall next
      await onboard({
        garageName: garageName.trim(), primaryColor: color,
        ownerName: ownerName.trim(), email: email.trim(), password, tier: 'starter',
      });
      // success → AuthProvider sets the user; the app routes to the paywall
    } catch (e) {
      setError(e.message ?? 'Could not create your garage.');
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.inner, { paddingTop: insets.top + 40 }]} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.back}>‹  Back</Text>
        </Pressable>
        <Text style={styles.title}>Set up your garage</Text>
        <Text style={styles.tagline}>Your own branded app in minutes.</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Garage name</Text>
          <TextInput style={styles.input} placeholder="Joe's Auto" placeholderTextColor="#aab2bd"
            value={garageName} onChangeText={setGarageName} />

          <Text style={styles.label}>Brand color</Text>
          <View style={styles.swatches}>
            {COLORS.map((c) => (
              <Pressable key={c} onPress={() => setColor(c)}
                style={[styles.swatch, { backgroundColor: c }, color === c && styles.swatchOn]} />
            ))}
          </View>

          <Text style={styles.label}>Your name</Text>
          <TextInput style={styles.input} placeholder="Full name" placeholderTextColor="#aab2bd"
            value={ownerName} onChangeText={setOwnerName} autoCapitalize="words" />

          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} placeholder="you@garage.com" placeholderTextColor="#aab2bd"
            value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />

          <Text style={styles.label}>Password</Text>
          <TextInput style={styles.input} placeholder="Create a password" placeholderTextColor="#aab2bd"
            value={password} onChangeText={setPassword} secureTextEntry />

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable style={[styles.btn, { backgroundColor: color }, busy && styles.disabled]} disabled={busy} onPress={submit}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Create garage →</Text>}
          </Pressable>
        </View>
        <View style={{ height: insets.bottom + 24 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const NAVY = '#1b2434', INK = '#1a2230', MUTED = '#8a93a0';
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: NAVY },
  inner: { paddingHorizontal: 28 },
  back: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 18 },
  title: { color: '#fff', fontSize: 28, fontWeight: '700' },
  tagline: { color: '#aab4c4', fontSize: 14, marginTop: 6, marginBottom: 22 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 22 },
  label: { color: '#6b7280', fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#f6f7f9', borderRadius: 10, borderWidth: 1, borderColor: '#e3e7ed', paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: INK },
  swatches: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  swatch: { width: 40, height: 40, borderRadius: 20, borderWidth: 3, borderColor: 'transparent' },
  swatchOn: { borderColor: '#1a2230' },
  error: { color: '#c8102e', fontSize: 13, marginTop: 14 },
  btn: { borderRadius: 12, height: 50, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.6 },
});
