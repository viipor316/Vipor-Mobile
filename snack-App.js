// VIPOR Service — full customer journey preview for Expo Snack (snack.expo.dev)
// Paste into App.js on Snack. No backend needed. Walks the whole flow:
//   Request  ->  Pending  ->  Quote  ->  Approve  ->  Booked
// (Photo + "garage sends quote" are simulated so it runs standalone.)

import React, { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, StyleSheet,
  SafeAreaView, StatusBar, KeyboardAvoidingView, Platform,
} from 'react-native';

const NAVY = '#1b2434', INK = '#1a2230', MUTED = '#8a93a0', LINE = '#eef1f5', RED = '#c8102e';
const fmt = (n) => `$${Number(n).toFixed(2)}`;

const QUOTE = {
  vehicle: '2019 Ford F-150',
  markupPct: 30,
  total: 225.0,
  lineItems: [
    { label: 'Brake pads & rotors', qty: 1, unitPrice: 150.0 },
    { label: 'Oil & air filter', qty: 1, unitPrice: 43.0 },
    { label: 'Labour', qty: 1.5, unitPrice: 80.0 },
  ],
};

export default function App() {
  const [step, setStep] = useState('login'); // login | request | pending | quote | booked
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      {step === 'login' && <LoginScreen onLogin={() => setStep('request')} />}
      {step === 'request' && <RequestScreen onSubmit={() => setStep('pending')} />}
      {step === 'pending' && <PendingScreen onQuoteReady={() => setStep('quote')} />}
      {step === 'quote' && <QuoteScreen onApprove={() => setStep('booked')} onDecline={() => setStep('request')} />}
      {step === 'booked' && <BookedScreen onRestart={() => setStep('request')} />}
    </SafeAreaView>
  );
}

/* ---------------- 0. Login ---------------- */
function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState('login');     // login | register
  const [email, setEmail] = useState('customer@demo.com');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState(null);

  function submit() {
    // demo validation only — the real app posts to /auth/login (see backend)
    if (mode === 'login' && !(email === 'customer@demo.com' && password === 'password')) {
      setError('Invalid email or password'); return;
    }
    if (!email || !password) { setError('Fill in all fields'); return; }
    onLogin();
  }

  return (
    <KeyboardAvoidingView style={styles.loginScreen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.loginInner}>
        <Text style={styles.loginBrand}>Vipor</Text>
        <Text style={styles.loginTag}>{mode === 'login' ? 'Welcome back' : 'Create your account'}</Text>
        <View style={styles.loginCard}>
          <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#aab2bd"
            value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <View style={{ height: 12 }} />
          <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#aab2bd"
            value={password} onChangeText={setPassword} secureTextEntry />
          {error && <Text style={styles.loginError}>{error}</Text>}
          <Pressable style={[styles.primary, { backgroundColor: RED, marginTop: 14 }]} onPress={submit}>
            <Text style={styles.primaryText}>{mode === 'login' ? 'Log in' : 'Sign up'}</Text>
          </Pressable>
          <Pressable onPress={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); }}>
            <Text style={styles.loginSwitch}>{mode === 'login' ? 'No account? Sign up' : 'Have an account? Log in'}</Text>
          </Pressable>
        </View>
        <Text style={styles.demoNote}>Demo: customer@demo.com / password</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

/* ---------------- 1. Service request ---------------- */
function RequestScreen({ onSubmit }) {
  const [vehicle, setVehicle] = useState('2019 Ford F-150');
  const [issue, setIssue] = useState('');
  const [hasPhoto, setHasPhoto] = useState(false);

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Text style={styles.brand}>Vipor</Text>
        <Text style={styles.headerNote}>EN · FR</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>New request</Text>
        <Text style={styles.subtitle}>Tell us what's going on</Text>

        <Text style={styles.label}>Vehicle</Text>
        <TextInput style={styles.input} value={vehicle} onChangeText={setVehicle} placeholder="Year Make Model" placeholderTextColor="#aab2bd" />

        <Text style={styles.label}>Describe the issue</Text>
        <TextInput
          style={[styles.input, styles.textarea]} value={issue} onChangeText={setIssue}
          placeholder="e.g. grinding noise when braking" placeholderTextColor="#aab2bd"
          multiline
        />

        <Text style={styles.label}>Photo (optional)</Text>
        {hasPhoto ? (
          <View style={styles.thumb}>
            <Text style={{ fontSize: 26 }}>📷</Text>
            <Pressable onPress={() => setHasPhoto(false)} hitSlop={10}><Text style={styles.removePhoto}>Remove</Text></Pressable>
          </View>
        ) : (
          <View style={styles.photoRow}>
            <Pressable style={styles.photoBtn} onPress={() => setHasPhoto(true)}>
              <Text style={styles.photoIcon}>◎</Text><Text style={styles.photoText}>Take photo</Text>
            </Pressable>
            <Pressable style={styles.photoBtn} onPress={() => setHasPhoto(true)}>
              <Text style={styles.photoIcon}>⊞</Text><Text style={styles.photoText}>Gallery</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
      <View style={styles.actions}>
        <Pressable style={[styles.primary, { backgroundColor: RED }, !issue && styles.disabled]} disabled={!issue} onPress={onSubmit}>
          <Text style={styles.primaryText}>Submit request</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

/* ---------------- 2. Pending ---------------- */
function PendingScreen({ onQuoteReady }) {
  return (
    <View style={[styles.screen, styles.center]}>
      <View style={styles.pendingBadge}><Text style={styles.pendingBadgeText}>●  Quote pending</Text></View>
      <Text style={[styles.title, { marginTop: 16, textAlign: 'center' }]}>Request received</Text>
      <Text style={[styles.subtitle, { textAlign: 'center', paddingHorizontal: 40 }]}>
        The garage is preparing your estimate. You'll get a notification when it's ready.
      </Text>
      <Steps active={1} />
      <Pressable style={[styles.primary, { backgroundColor: NAVY, marginTop: 28, paddingHorizontal: 28 }]} onPress={onQuoteReady}>
        <Text style={styles.primaryText}>▶  Simulate: quote sent</Text>
      </Pressable>
      <Text style={styles.demoNote}>(in the real app this arrives as a push/SMS)</Text>
    </View>
  );
}

/* ---------------- 3. Quote / approve ---------------- */
function QuoteScreen({ onApprove, onDecline }) {
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.back}>‹  Quote</Text>
        <View style={styles.pill}><Text style={styles.pillText}>SENT</Text></View>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.title}>Estimate</Text>
        <Text style={styles.subtitle}>{QUOTE.vehicle}</Text>
        <View style={styles.lines}>
          {QUOTE.lineItems.map((li, i) => (
            <View key={i} style={[styles.lineRow, i === QUOTE.lineItems.length - 1 && styles.noBorder]}>
              <Text style={styles.lineLabel}>{li.label}{li.qty > 1 ? <Text style={styles.muted}>  ×{li.qty}</Text> : null}</Text>
              <Text style={styles.lineValue}>{fmt(li.qty * li.unitPrice)}</Text>
            </View>
          ))}
        </View>
        <View style={styles.markup}><Text style={styles.muted}>Shop markup</Text><Text style={styles.muted}>{QUOTE.markupPct}%</Text></View>
        <View style={styles.totalCard}>
          <View><Text style={styles.totalLabel}>Total estimate</Text><Text style={styles.totalNote}>Taxes included · valid 14 days</Text></View>
          <Text style={styles.totalValue}>{fmt(QUOTE.total)}</Text>
        </View>
        <Text style={styles.footnote}>Approving books the job and unlocks live tracking.</Text>
      </ScrollView>
      <View style={styles.actions}>
        <Pressable style={styles.primary} onPress={onApprove}><Text style={styles.primaryText}>Approve & book</Text></Pressable>
        <Pressable style={styles.secondary} onPress={onDecline}><Text style={styles.secondaryText}>Decline</Text></Pressable>
      </View>
    </View>
  );
}

/* ---------------- 4. Booked / tracking ---------------- */
function BookedScreen({ onRestart }) {
  return (
    <View style={[styles.screen, { backgroundColor: '#e8edf2' }]}>
      <View style={styles.mapArea}>
        <Text style={styles.mapText}>🗺️  Live tracking</Text>
        <Text style={styles.muted}>unlocks when the technician is en route</Text>
      </View>
      <View style={styles.sheet}>
        <View style={[styles.pill, { backgroundColor: '#e7f6ed', alignSelf: 'flex-start' }]}>
          <Text style={{ color: '#1e6f43', fontWeight: '700', fontSize: 12 }}>Job booked</Text>
        </View>
        <Text style={[styles.title, { marginTop: 12 }]}>You're all set</Text>
        <Text style={styles.subtitle}>Quote approved · job created. The garage will dispatch a technician.</Text>
        <Pressable style={[styles.primary, { backgroundColor: NAVY, marginTop: 12 }]} onPress={onRestart}>
          <Text style={styles.primaryText}>Start over</Text>
        </Pressable>
      </View>
    </View>
  );
}

/* progress dots */
function Steps({ active }) {
  const labels = ['Request', 'Quote', 'Approve', 'Track'];
  return (
    <View style={styles.steps}>
      {labels.map((l, i) => (
        <View key={l} style={styles.stepItem}>
          <View style={[styles.dot, i <= active ? styles.dotOn : styles.dotOff]} />
          <Text style={[styles.stepLabel, i <= active && { color: INK }]}>{l}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: NAVY },
  screen: { flex: 1, backgroundColor: '#eef1f5' },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },

  header: { backgroundColor: NAVY, paddingVertical: 16, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerNote: { color: '#aab4c4', fontSize: 12 },
  back: { color: '#fff', fontSize: 16, fontWeight: '600' },
  pill: { backgroundColor: '#1e6f43', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  pillText: { color: '#d9f5e4', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },

  body: { padding: 20, paddingBottom: 40 },
  title: { color: INK, fontSize: 26, fontWeight: '700' },
  subtitle: { color: MUTED, fontSize: 13, marginTop: 4, marginBottom: 16, lineHeight: 19 },
  label: { color: '#6b7280', fontSize: 12, fontWeight: '600', marginTop: 14, marginBottom: 6 },
  input: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e3e7ed', paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: INK },
  textarea: { height: 90, textAlignVertical: 'top' },

  photoRow: { flexDirection: 'row', gap: 12 },
  photoBtn: { flex: 1, height: 64, borderRadius: 10, borderWidth: 1, borderColor: '#d7dde5', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  photoIcon: { fontSize: 18, color: '#9aa3af' },
  photoText: { fontSize: 11, color: '#9aa3af', marginTop: 2 },
  thumb: { height: 64, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e3e7ed', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  removePhoto: { color: RED, fontWeight: '600', fontSize: 13 },

  lines: { backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 16 },
  lineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: LINE },
  noBorder: { borderBottomWidth: 0 },
  lineLabel: { color: '#4b5563', fontSize: 14 },
  lineValue: { color: INK, fontSize: 14, fontWeight: '600' },
  markup: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },

  totalCard: { backgroundColor: '#fff', borderRadius: 16, padding: 18, marginTop: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { color: '#6b7280', fontSize: 13 },
  totalNote: { color: MUTED, fontSize: 11, marginTop: 3 },
  totalValue: { color: INK, fontSize: 28, fontWeight: '700' },
  footnote: { color: MUTED, fontSize: 12, textAlign: 'center', marginTop: 18 },

  actions: { padding: 20, borderTopWidth: 1, borderTopColor: '#e3e7ed', gap: 12 },
  primary: { backgroundColor: '#16a34a', borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondary: { backgroundColor: '#fff', borderRadius: 14, height: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e3e7ed' },
  secondaryText: { color: '#6b7280', fontSize: 14, fontWeight: '600' },
  disabled: { opacity: 0.45 },
  muted: { color: MUTED, fontSize: 13 },

  pendingBadge: { backgroundColor: '#fff4e5', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  pendingBadgeText: { color: '#b26a00', fontWeight: '700', fontSize: 13 },
  demoNote: { color: '#aab2bd', fontSize: 11, marginTop: 10 },

  steps: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 30, width: '88%' },
  stepItem: { alignItems: 'center', flex: 1 },
  dot: { width: 12, height: 12, borderRadius: 6, marginBottom: 6 },
  dotOn: { backgroundColor: '#16a34a' },
  dotOff: { backgroundColor: '#cdd4de' },
  stepLabel: { fontSize: 11, color: MUTED },

  mapArea: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  mapText: { color: INK, fontSize: 18, fontWeight: '700' },
  sheet: { backgroundColor: '#fff', padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24 },

  loginScreen: { flex: 1, backgroundColor: NAVY },
  loginInner: { flex: 1, paddingHorizontal: 28, paddingTop: 70 },
  loginBrand: { color: '#fff', fontSize: 34, fontWeight: '700', textAlign: 'center' },
  loginTag: { color: '#aab4c4', fontSize: 14, textAlign: 'center', marginTop: 6, marginBottom: 28 },
  loginCard: { backgroundColor: '#fff', borderRadius: 20, padding: 22 },
  loginError: { color: RED, fontSize: 13, marginTop: 10 },
  loginSwitch: { color: MUTED, fontSize: 13, textAlign: 'center', marginTop: 16 },
});
