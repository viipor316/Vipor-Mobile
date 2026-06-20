// VIPOR Service — Quote approval screen (React Native / Expo)
// Renders a sent quote and lets the customer Approve (-> books the job, unlocks
// tracking) or Decline. Talks to the backend approve/reject routes.

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { useAuth } from '../auth';
import { api } from '../api';

export default function QuoteApprovalScreen({ route, navigation }) {
  const { quoteId } = route.params;
  const theme = useTheme();
  const { logout } = useAuth();
  const insets = useSafeAreaInsets();   // notch / status bar — correct on iOS & Android

  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const loadQuote = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      setQuote(await api.get(`/quotes/${quoteId}`));
    } catch (e) {
      // 402 = the garage's subscription is inactive; the server gates every
      // business route. Show a clean "unavailable" state, not a scary error.
      setError(e.status === 402 ? 'unavailable' : 'Could not load this quote. Tap retry.');
    } finally {
      setLoading(false);
    }
  }, [quoteId]);

  useEffect(() => { loadQuote(); }, [loadQuote]);

  async function handleApprove() {
    setSubmitting(true);
    try {
      const job = await api.post(`/quotes/${quoteId}/approve`);
      navigation.replace('LiveTracking', { jobId: job.id, quoteId });
    } catch (e) {
      Alert.alert('Approval failed', e.message ?? 'Please try again.');
      setSubmitting(false);
    }
  }

  function handleDecline() {
    Alert.alert('Decline quote?', 'You can request a new quote anytime.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline', style: 'destructive',
        onPress: async () => {
          setSubmitting(true);
          try {
            await api.post(`/quotes/${quoteId}/reject`);
            Alert.alert('Quote declined');
            setQuote((q) => ({ ...q, status: 'rejected' }));
          } catch (e) {
            Alert.alert('Could not decline', e.message ?? 'Please try again.');
          } finally {
            setSubmitting(false);
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={theme.primaryColor} />
      </View>
    );
  }

  if (error === 'unavailable') {
    return (
      <View style={[styles.screen, styles.center, { padding: 32 }]}>
        <Text style={styles.unavailableTitle}>Temporarily unavailable</Text>
        <Text style={styles.unavailableBody}>
          This shop isn’t accepting requests right now. Please reach out to them
          directly, or try again later.
        </Text>
        <Pressable onPress={loadQuote} style={styles.retry}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  if (error || !quote) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Text style={styles.muted}>{error ?? 'Quote not found.'}</Text>
        <Pressable onPress={loadQuote} style={styles.retry}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const fmt = (n) => `$${Number(n).toFixed(2)}`;
  const isOpen = quote.status === 'sent';
  const isApproved = quote.status === 'approved';
  const v = quote.request?.vehicle;

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        {navigation.canGoBack() ? (
          <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
            <Text style={styles.back}>‹  Quote</Text>
          </Pressable>
        ) : (
          <Pressable onPress={logout} hitSlop={12}>
            <Text style={styles.back}>Log out</Text>
          </Pressable>
        )}
        <View style={[styles.pill, isOpen ? styles.pillSent : styles.pillMuted]}>
          <Text style={isOpen ? styles.pillSentText : styles.pillMutedText}>
            {quote.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Estimate</Text>
        <Text style={styles.subtitle}>
          {v ? `${v.year} ${v.make} ${v.model}` : `Quote #${quote.id.slice(-4)}`}
        </Text>

        <View style={styles.lines}>
          {quote.lineItems.map((li, i) => (
            <View key={i} style={[styles.lineRow, i === quote.lineItems.length - 1 && !quote.markupPct && styles.last]}>
              <Text style={styles.lineLabel}>
                {li.label}{li.qty > 1 ? <Text style={styles.muted}>  ×{li.qty}</Text> : null}
              </Text>
              <Text style={styles.lineValue}>{fmt(li.qty * li.unitPrice)}</Text>
            </View>
          ))}
          {Number(quote.markupPct) > 0 && (
            <View style={[styles.lineRow, styles.last]}>
              <Text style={styles.lineLabel}>Shop markup</Text>
              <Text style={styles.muted}>{Number(quote.markupPct)}%</Text>
            </View>
          )}
        </View>

        <View style={styles.totalCard}>
          <View>
            <Text style={styles.totalLabel}>Total estimate</Text>
            <Text style={styles.totalNote}>Taxes included · valid 14 days</Text>
          </View>
          <Text style={styles.totalValue}>{fmt(quote.total)}</Text>
        </View>

        {isOpen && (
          <Text style={styles.footnote}>Approving books the job and unlocks live tracking.</Text>
        )}
        {isApproved && (
          <Text style={styles.footnote}>Quote approved — your job is booked.</Text>
        )}
      </ScrollView>

      {isOpen && (
        <View style={[styles.actions, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable onPress={handleApprove} disabled={submitting}
            style={[styles.approve, submitting && styles.disabled]}>
            {submitting ? <ActivityIndicator color="#fff" />
              : <Text style={styles.approveText}>Approve & book</Text>}
          </Pressable>
          <Pressable onPress={handleDecline} disabled={submitting} style={styles.decline}>
            <Text style={styles.declineText}>Decline</Text>
          </Pressable>
        </View>
      )}

      {isApproved && quote.jobId && (
        <View style={[styles.actions, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable
            onPress={() => navigation.navigate('LiveTracking', { jobId: quote.jobId, quoteId })}
            style={[styles.approve, { backgroundColor: theme.primaryColor }]}
          >
            <Text style={styles.approveText}>View live tracking</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const NAVY = '#1b2434', INK = '#1a2230', MUTED = '#8a93a0', LINE = '#eef1f5';

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#eef1f5' },
  center: { alignItems: 'center', justifyContent: 'center', gap: 12 },

  header: {
    backgroundColor: NAVY, paddingBottom: 18, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
  },
  back: { color: '#fff', fontSize: 16, fontWeight: '600' },
  pill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  pillSent: { backgroundColor: '#1e6f43' },
  pillSentText: { color: '#d9f5e4', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  pillMuted: { backgroundColor: '#39424f' },
  pillMutedText: { color: '#aab4c4', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },

  body: { padding: 20, paddingBottom: 40 },
  title: { color: INK, fontSize: 26, fontWeight: '700' },
  subtitle: { color: MUTED, fontSize: 13, marginTop: 4, marginBottom: 16 },

  lines: { backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 16 },
  lineRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: LINE,
  },
  last: { borderBottomWidth: 0 },
  lineLabel: { color: '#4b5563', fontSize: 14, flexShrink: 1, paddingRight: 12 },
  lineValue: { color: INK, fontSize: 14, fontWeight: '600' },

  totalCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 18, marginTop: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  totalLabel: { color: '#6b7280', fontSize: 13 },
  totalNote: { color: MUTED, fontSize: 11, marginTop: 3 },
  totalValue: { color: INK, fontSize: 28, fontWeight: '700' },

  footnote: { color: MUTED, fontSize: 12, textAlign: 'center', marginTop: 18 },

  actions: {
    paddingHorizontal: 20, paddingTop: 16, backgroundColor: '#eef1f5',
    borderTopWidth: 1, borderTopColor: '#e3e7ed', gap: 12,
  },
  approve: { backgroundColor: '#16a34a', borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center' },
  approveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  decline: { backgroundColor: '#fff', borderRadius: 14, height: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e3e7ed' },
  declineText: { color: '#6b7280', fontSize: 14, fontWeight: '600' },
  disabled: { opacity: 0.6 },

  muted: { color: MUTED, fontSize: 13 },
  unavailableTitle: { color: INK, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  unavailableBody: { color: MUTED, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 10, marginBottom: 6 },
  retry: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: NAVY, borderRadius: 10 },
  retryText: { color: '#fff', fontWeight: '600' },
});
