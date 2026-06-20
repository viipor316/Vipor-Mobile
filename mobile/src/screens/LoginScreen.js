// VIPOR Service — login / register screen.
import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../auth';
import { useTheme } from '../theme';

export default function LoginScreen({ navigation }) {
  const { login, register } = useAuth();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState('login');     // 'login' | 'register'
  const [garage, setGarage] = useState('vipor'); // tenant code (prefilled for the demo)
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const normGarage = () => garage.trim().toLowerCase();

  // brand the screen for the entered garage as soon as the field loses focus
  function previewGarage() {
    theme.previewTenant?.(normGarage());
  }

  async function submit() {
    setError(null); setBusy(true);
    try {
      const g = normGarage();
      if (mode === 'login') await login(g, email.trim(), password);
      else await register(g, name.trim(), email.trim(), password);
    } catch (e) {
      setError(e.message ?? 'Something went wrong');
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.inner, { paddingTop: insets.top + 60 }]}>
        <Text style={[styles.brand, { color: theme.primaryColor }]}>{theme.name || 'Vipor'}</Text>
        <Text style={styles.tagline}>{mode === 'login' ? 'Welcome back' : 'Create your account'}</Text>

        <View style={styles.card}>
          <TextInput style={styles.input} placeholder="Garage code (e.g. vipor)" placeholderTextColor="#aab2bd"
            value={garage} onChangeText={setGarage} onBlur={previewGarage}
            autoCapitalize="none" autoCorrect={false} />
          {mode === 'register' && (
            <TextInput style={styles.input} placeholder="Full name" placeholderTextColor="#aab2bd"
              value={name} onChangeText={setName} autoCapitalize="words" />
          )}
          <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#aab2bd"
            value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#aab2bd"
            value={password} onChangeText={setPassword} secureTextEntry />

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable style={[styles.btn, { backgroundColor: theme.primaryColor }, busy && styles.disabled]}
            disabled={busy} onPress={submit}>
            {busy ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>{mode === 'login' ? 'Log in' : 'Sign up'}</Text>}
          </Pressable>

          <Pressable onPress={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); }} hitSlop={8}>
            <Text style={styles.switch}>
              {mode === 'login' ? "No account? Sign up" : 'Have an account? Log in'}
            </Text>
          </Pressable>
        </View>

        <Pressable onPress={() => navigation?.navigate('Onboarding')} hitSlop={8}>
          <Text style={styles.onboard}>Own a garage? <Text style={styles.onboardLink}>Set up your garage →</Text></Text>
        </Pressable>

        <Text style={styles.demo}>Demo garage code: vipor · customer@demo.com / password</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const NAVY = '#1b2434', INK = '#1a2230', MUTED = '#8a93a0';
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: NAVY },
  inner: { flex: 1, paddingHorizontal: 28 },
  brand: { color: '#fff', fontSize: 34, fontWeight: '700', textAlign: 'center' },
  tagline: { color: '#aab4c4', fontSize: 14, textAlign: 'center', marginTop: 6, marginBottom: 28 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 22 },
  input: { backgroundColor: '#f6f7f9', borderRadius: 10, borderWidth: 1, borderColor: '#e3e7ed', paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: INK, marginBottom: 12 },
  error: { color: '#c8102e', fontSize: 13, marginBottom: 10 },
  btn: { borderRadius: 12, height: 50, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.6 },
  switch: { color: MUTED, fontSize: 13, textAlign: 'center', marginTop: 16 },
  onboard: { color: '#aab4c4', fontSize: 13, textAlign: 'center', marginTop: 24 },
  onboardLink: { color: '#fff', fontWeight: '700' },
  demo: { color: '#6b7280', fontSize: 12, textAlign: 'center', marginTop: 18 },
});
