// VIPOR Service — Team management (admin only).
// Lists the garage's staff and lets the admin add a technician account.

import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet, ScrollView, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { api } from '../api';

export default function TeamScreen({ navigation }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setStaff(await api.get('/staff')); }
    catch { /* leave list as-is */ }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function add() {
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert('Missing info', 'Enter a name, email and password.');
      return;
    }
    setBusy(true);
    try {
      await api.post('/staff', { name: name.trim(), email: email.trim(), password, role: 'technician' });
      setName(''); setEmail(''); setPassword('');
      await load();
    } catch (e) {
      Alert.alert('Could not add technician', e.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { backgroundColor: theme.primaryColor, paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.back}>‹  Dashboard</Text>
        </Pressable>
        <Text style={styles.headerNote}>Team</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.section}>Staff</Text>
        {loading ? <ActivityIndicator color={theme.primaryColor} />
          : staff.map((u) => (
            <View key={u.id} style={styles.row}>
              <View style={[styles.avatar, { backgroundColor: theme.primaryColor }]}>
                <Text style={styles.avatarText}>{(u.name || '?').slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName}>{u.name}</Text>
                <Text style={styles.rowSub}>{u.email}</Text>
              </View>
              <Text style={styles.roleTag}>{u.role}</Text>
            </View>
          ))}

        <Text style={styles.section}>Add a technician</Text>
        <View style={styles.card}>
          <TextInput style={styles.input} placeholder="Full name" placeholderTextColor="#aab2bd"
            value={name} onChangeText={setName} autoCapitalize="words" />
          <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#aab2bd"
            value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <TextInput style={styles.input} placeholder="Temporary password" placeholderTextColor="#aab2bd"
            value={password} onChangeText={setPassword} secureTextEntry />
          <Pressable style={[styles.btn, { backgroundColor: theme.primaryColor }, busy && styles.disabled]}
            disabled={busy} onPress={add}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Add technician</Text>}
          </Pressable>
          <Text style={styles.hint}>They log in with your garage code, this email, and this password.</Text>
        </View>
      </ScrollView>
    </View>
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
  section: { color: INK, fontSize: 15, fontWeight: '700', marginTop: 18, marginBottom: 10 },
  row: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700' },
  rowName: { color: INK, fontSize: 15, fontWeight: '600' },
  rowSub: { color: MUTED, fontSize: 12, marginTop: 2 },
  roleTag: { color: MUTED, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 18 },
  input: { backgroundColor: '#f6f7f9', borderRadius: 10, borderWidth: 1, borderColor: '#e3e7ed', paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: INK, marginBottom: 12 },
  btn: { borderRadius: 12, height: 48, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.6 },
  hint: { color: MUTED, fontSize: 12, marginTop: 12, textAlign: 'center' },
});
