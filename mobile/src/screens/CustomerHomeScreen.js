// VIPOR Service — Customer home.
// Lists the customer's service requests with their quote status and a button to
// submit a new request. Tapping a quoted/approved request opens the estimate.

import React, { useState, useCallback } from 'react';
import {
  View, Text, Image, ScrollView, Pressable, ActivityIndicator, StyleSheet, RefreshControl, Linking,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { useAuth } from '../auth';
import { api } from '../api';

const fmtVehicle = (v) =>
  v && typeof v === 'object' ? `${v.year} ${v.make} ${v.model}` : (v || 'Vehicle');

// derive a customer-facing status from the request + its quote
function statusOf(r) {
  const q = r.quote;
  if (!q) return { label: 'Awaiting quote', bg: '#fff4e5', fg: '#b26a00', tappable: false };
  if (q.status === 'sent') return { label: 'Quote ready', bg: '#e7f6ed', fg: '#1e6f43', tappable: true };
  if (q.status === 'approved') return { label: 'Booked · track', bg: '#eaf3fb', fg: '#2563eb', tappable: true };
  if (q.status === 'rejected') return { label: 'Declined', bg: '#f1f1f3', fg: '#6b7280', tappable: false };
  return { label: q.status, bg: '#f1f1f3', fg: '#6b7280', tappable: true };
}

export default function CustomerHomeScreen({ navigation }) {
  const theme = useTheme();
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setRequests(await api.get('/my/requests')); }
    catch { /* keep current */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { backgroundColor: theme.primaryColor, paddingTop: insets.top + 12 }]}>
        <View>
          <Text style={styles.brand}>{theme.name || 'Vipor'}</Text>
          <Text style={styles.headerNote}>Hi {user?.name?.split(' ')[0] || 'there'}</Text>
        </View>
        <Pressable onPress={logout} hitSlop={12}><Text style={styles.logout}>Log out</Text></Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        {theme.bannerUrl ? (
          <Image source={{ uri: theme.bannerUrl }} style={styles.banner} resizeMode="cover" />
        ) : null}
        {theme.description ? (
          <Text style={styles.about}>{theme.description}</Text>
        ) : null}

        <Pressable
          style={[styles.cta, { backgroundColor: theme.primaryColor }]}
          onPress={() => navigation.navigate('NewRequest')}
        >
          <Text style={styles.ctaText}>+  Request service</Text>
        </Pressable>

        {theme.phone ? (
          <Pressable style={styles.contact} onPress={() => Linking.openURL(`tel:${theme.phone.replace(/[^0-9+]/g, '')}`)}>
            <Text style={styles.contactText}>📞  Call {theme.name || 'the shop'} · {theme.phone}</Text>
          </Pressable>
        ) : null}

        {theme.services?.length ? (
          <>
            <Text style={styles.section}>Services we offer</Text>
            <View style={styles.svcWrap}>
              {theme.services.map((s, i) => (
                <Pressable key={i} style={styles.svcChip}
                  onPress={() => navigation.navigate('NewRequest', { service: s.name })}>
                  <Text style={styles.svcChipText}>{s.name}</Text>
                  {s.price != null && <Text style={styles.svcChipPrice}>from ${s.price}</Text>}
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        <Text style={styles.section}>Your requests</Text>
        {loading ? <ActivityIndicator color={theme.primaryColor} style={{ marginTop: 20 }} />
          : requests.length === 0 ? (
            <Text style={styles.empty}>No requests yet. Tap “Request service” to get a quote.</Text>
          ) : requests.map((r) => {
            const s = statusOf(r);
            return (
              <Pressable
                key={r.id}
                disabled={!s.tappable}
                onPress={() => navigation.navigate('QuoteApproval', { quoteId: r.quote.id })}
                style={[styles.card, !s.tappable && { opacity: 0.85 }]}
              >
                <View style={styles.cardTop}>
                  <Text style={styles.cardName}>{fmtVehicle(r.vehicle)}</Text>
                  <View style={[styles.pill, { backgroundColor: s.bg }]}>
                    <Text style={[styles.pillText, { color: s.fg }]}>{s.label}</Text>
                  </View>
                </View>
                <Text style={styles.cardIssue}>“{r.description}”</Text>
                {r.preferredDate ? <Text style={styles.booking}>📅 {r.preferredDate}{r.preferredSlot ? ` · ${r.preferredSlot}` : ''}</Text> : null}
                {r.quote?.total != null && (
                  <Text style={styles.cardTotal}>Estimate: ${Number(r.quote.total).toFixed(2)}</Text>
                )}
                {s.tappable && <Text style={[styles.cardLink, { color: theme.primaryColor }]}>View details →</Text>}
              </Pressable>
            );
          })}
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
  brand: { color: '#fff', fontSize: 20, fontWeight: '700' },
  headerNote: { color: '#ffffffcc', fontSize: 12, marginTop: 2 },
  logout: { color: '#fff', fontSize: 14, fontWeight: '600' },
  body: { padding: 20, paddingBottom: 40 },
  banner: { width: '100%', height: 120, borderRadius: 16, marginBottom: 14, backgroundColor: '#dfe4ea' },
  about: { color: '#4b5563', fontSize: 14, lineHeight: 21, marginBottom: 14 },
  cta: { borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  svcWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  svcChip: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#e6eaf0' },
  svcChipText: { color: INK, fontSize: 13, fontWeight: '700' },
  svcChipPrice: { color: MUTED, fontSize: 11, marginTop: 2 },
  contact: { marginTop: 12, backgroundColor: '#fff', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  contactText: { color: '#1a2230', fontSize: 14, fontWeight: '600' },
  section: { color: INK, fontSize: 15, fontWeight: '700', marginTop: 24, marginBottom: 10 },
  empty: { color: MUTED, fontSize: 13, fontStyle: 'italic', marginTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardName: { color: INK, fontSize: 15, fontWeight: '700', flexShrink: 1, paddingRight: 10 },
  cardIssue: { color: MUTED, fontSize: 13, marginTop: 6, fontStyle: 'italic' },
  booking: { color: '#2563eb', fontSize: 12, fontWeight: '600', marginTop: 6 },
  cardTotal: { color: '#4b5563', fontSize: 13, marginTop: 6, fontWeight: '600' },
  cardLink: { fontSize: 13, fontWeight: '700', marginTop: 10 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  pillText: { fontSize: 11, fontWeight: '700' },
});
