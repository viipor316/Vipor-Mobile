// VIPOR Service — login / register.
import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, Image, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../auth';
import { useTheme } from '../theme';
import { ui } from '../ui';
import Button from '../components/Button';

export default function LoginScreen({ navigation }) {
  const { login, register } = useAuth();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState('login');     // 'login' | 'register'
  const [garage, setGarage] = useState('vipor');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const normGarage = () => garage.trim().toLowerCase();
  const previewGarage = () => theme.previewTenant?.(normGarage());

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
      <ScrollView contentContainerStyle={[styles.inner, { paddingTop: insets.top + 56 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.brandWrap}>
          {theme.logoUrl
            ? <Image source={{ uri: theme.logoUrl }} style={styles.logo} resizeMode="contain" />
            : <View style={[styles.logoMark, { backgroundColor: theme.primaryColor }]}>
                <Text style={styles.logoMarkText}>{(theme.name || 'V').slice(0, 1).toUpperCase()}</Text>
              </View>}
          <Text style={styles.brand}>{theme.name || 'Vipor'}</Text>
          <Text style={styles.tagline}>Service that comes to you</Text>
        </View>

        <View style={styles.card}>
          {/* segmented login / signup */}
          <View style={styles.segment}>
            {['login', 'register'].map((m) => {
              const on = mode === m;
              return (
                <Pressable key={m} style={[styles.segBtn, on && styles.segBtnOn]} onPress={() => { setMode(m); setError(null); }}>
                  <Text style={[styles.segText, on && { color: ui.ink }]}>{m === 'login' ? 'Log in' : 'Sign up'}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.lbl}>Garage code</Text>
          <TextInput style={ui.input} placeholder="e.g. vipor" placeholderTextColor={ui.muted}
            value={garage} onChangeText={setGarage} onBlur={previewGarage} autoCapitalize="none" autoCorrect={false} />

          {mode === 'register' && (
            <>
              <Text style={styles.lbl}>Full name</Text>
              <TextInput style={ui.input} placeholder="Your name" placeholderTextColor={ui.muted}
                value={name} onChangeText={setName} autoCapitalize="words" />
            </>
          )}

          <Text style={styles.lbl}>Email</Text>
          <TextInput style={ui.input} placeholder="you@email.com" placeholderTextColor={ui.muted}
            value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />

          <Text style={styles.lbl}>Password</Text>
          <TextInput style={ui.input} placeholder="••••••••" placeholderTextColor={ui.muted}
            value={password} onChangeText={setPassword} secureTextEntry />

          {error && <Text style={styles.error}>{error}</Text>}

          <Button title={mode === 'login' ? 'Log in' : 'Create account'} onPress={submit}
            color={theme.primaryColor} loading={busy} style={{ marginTop: 18 }} />
        </View>

        <Pressable onPress={() => navigation?.navigate('Onboarding')} hitSlop={8} style={styles.onboard}>
          <Text style={styles.onboardText}>Own a garage?  <Text style={styles.onboardLink}>Set up your garage →</Text></Text>
        </Pressable>

        <Text style={styles.demo}>Demo · code: vipor · customer@demo.com / password</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: ui.navy },
  inner: { paddingHorizontal: 24, paddingBottom: 40 },
  brandWrap: { alignItems: 'center', marginBottom: 26 },
  logo: { width: 84, height: 84, marginBottom: 14 },
  logoMark: { width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  logoMarkText: { color: '#fff', fontSize: 34, fontWeight: '800' },
  brand: { color: '#fff', fontSize: 30, fontWeight: '800', letterSpacing: -0.4 },
  tagline: { color: '#9aa6bd', fontSize: 14, marginTop: 6 },

  card: { backgroundColor: ui.surface, borderRadius: ui.rLg, padding: 22, ...ui.shadow },
  segment: { flexDirection: 'row', backgroundColor: ui.field, borderRadius: 12, padding: 4, marginBottom: 8 },
  segBtn: { flex: 1, height: 38, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  segBtnOn: { backgroundColor: '#fff', ...ui.shadowSm },
  segText: { fontSize: 14, fontWeight: '700', color: ui.muted },

  lbl: { ...ui.label, marginTop: 14, marginBottom: 7 },
  error: { color: ui.red, fontSize: 13, marginTop: 12, fontWeight: '600' },

  onboard: { alignItems: 'center', marginTop: 22 },
  onboardText: { color: '#9aa6bd', fontSize: 14 },
  onboardLink: { color: '#fff', fontWeight: '700' },
  demo: { color: '#5d6678', fontSize: 12, textAlign: 'center', marginTop: 18 },
});
