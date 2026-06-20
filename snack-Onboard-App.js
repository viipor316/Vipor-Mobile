// VIPOR Service — WHITE-LABEL ONBOARDING + BILLING preview (Expo Snack).
// Paste into App.js on Snack. Self-contained; mirrors the real /onboard +
// /billing flow. Steps: Sign up garage -> pick brand -> choose plan ->
// active branded dashboard -> (simulate) payment failure -> paywall.

import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, StyleSheet, SafeAreaView, StatusBar,
} from 'react-native';

const NAVY = '#1b2434', INK = '#1a2230', MUTED = '#8a93a0';
const COLORS = ['#c8102e', '#2f7be8', '#19a974', '#7b3ff2', '#e8730c', '#0ea5a5'];
const TIERS = [
  { id: 'starter', name: 'Starter', price: 49, feats: ['1 location', 'Quotes + approval', 'Email / SMS'] },
  { id: 'pro', name: 'Pro', price: 99, popular: true, feats: ['Up to 3 techs', 'Live GPS tracking', 'Custom branding'] },
  { id: 'fleet', name: 'Fleet', price: 199, feats: ['Unlimited techs', 'In-app payments', 'Priority support'] },
];

export default function App() {
  const [step, setStep] = useState('signup'); // signup | plan | active | paused
  const [garage, setGarage] = useState('AutoPro Garage');
  const [color, setColor] = useState('#2f7be8');
  const [tier, setTier] = useState('pro');

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      {step === 'signup' && <Signup {...{ garage, setGarage, color, setColor }} onNext={() => setStep('plan')} />}
      {step === 'plan' && <Plan {...{ color, tier, setTier }} onBack={() => setStep('signup')} onPay={() => setStep('active')} />}
      {step === 'active' && <Dashboard {...{ garage, color, tier }} onFail={() => setStep('paused')} />}
      {step === 'paused' && <Paywall {...{ garage, color }} onPay={() => setStep('active')} />}
    </SafeAreaView>
  );
}

/* 1. Sign up + brand */
function Signup({ garage, setGarage, color, setColor, onNext }) {
  return (
    <View style={styles.screen}>
      <BrandHeader name={garage || 'Your Garage'} color={color} sub="White-label setup" />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.h1}>Set up your garage</Text>
        <Text style={styles.label}>Garage name</Text>
        <TextInput style={styles.input} value={garage} onChangeText={setGarage} placeholder="e.g. AutoPro Garage" placeholderTextColor="#aab2bd" />
        <Text style={styles.label}>Owner email</Text>
        <TextInput style={styles.input} placeholder="you@garage.com" placeholderTextColor="#aab2bd" autoCapitalize="none" keyboardType="email-address" />
        <Text style={styles.label}>Password</Text>
        <TextInput style={styles.input} placeholder="Create a password" placeholderTextColor="#aab2bd" secureTextEntry />

        <Text style={styles.label}>Brand color</Text>
        <View style={styles.swatches}>
          {COLORS.map((c) => (
            <Pressable key={c} onPress={() => setColor(c)}
              style={[styles.swatch, { backgroundColor: c }, color === c && styles.swatchOn]} />
          ))}
        </View>

        <View style={[styles.previewCard, { borderColor: color }]}>
          <Text style={styles.previewLabel}>Live preview</Text>
          <View style={[styles.previewBtn, { backgroundColor: color }]}><Text style={styles.previewBtnText}>Book Service</Text></View>
        </View>
      </ScrollView>
      <View style={styles.actions}>
        <Pressable style={[styles.primary, { backgroundColor: color }, !garage && styles.disabled]} disabled={!garage} onPress={onNext}>
          <Text style={styles.primaryText}>Choose a plan</Text>
        </Pressable>
      </View>
    </View>
  );
}

/* 2. Plan picker */
function Plan({ color, tier, setTier, onBack, onPay }) {
  const sel = TIERS.find((t) => t.id === tier);
  return (
    <View style={styles.screen}>
      <BrandHeader name="Choose your plan" color={color} sub="Cancel anytime" back onBack={onBack} />
      <ScrollView contentContainerStyle={styles.body}>
        {TIERS.map((t) => {
          const on = t.id === tier;
          return (
            <Pressable key={t.id} onPress={() => setTier(t.id)} style={[styles.tier, on && { borderColor: color, borderWidth: 2 }]}>
              <View style={styles.tierTop}>
                <Text style={styles.tierName}>{t.name}{t.popular ? '  ★' : ''}</Text>
                <Text style={styles.tierPrice}>${t.price}<Text style={styles.perMo}>/mo</Text></Text>
              </View>
              {t.feats.map((f) => <Text key={f} style={styles.feat}>• {f}</Text>)}
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={styles.actions}>
        <Pressable style={[styles.primary, { backgroundColor: color }]} onPress={onPay}>
          <Text style={styles.primaryText}>Start {sel.name} · ${sel.price}/mo</Text>
        </Pressable>
        <Text style={styles.fine}>Secure checkout by Stripe · webhook activates access on payment</Text>
      </View>
    </View>
  );
}

/* 3. Active branded dashboard */
function Dashboard({ garage, color, tier, onFail }) {
  return (
    <View style={styles.screen}>
      <BrandHeader name={garage} color={color} sub="Admin · Active" />
      <ScrollView contentContainerStyle={styles.body}>
        <View style={[styles.statusBanner, { backgroundColor: '#e7f6ed' }]}>
          <Text style={{ color: '#1e6f43', fontWeight: '700' }}>● Subscription active — {tier.toUpperCase()} plan</Text>
        </View>
        <View style={styles.tiles}>
          <Tile n="3" label="Active jobs" color={color} />
          <Tile n="5" label="New requests" color={NAVY} />
          <Tile n="$1.2k" label="Today" color="#16a34a" />
        </View>
        <Text style={styles.h2}>Your branded app</Text>
        <Text style={styles.muted}>Customers see {garage} with your color throughout — logo, buttons, and accents all themed from this account.</Text>
        <View style={[styles.previewBtn, { backgroundColor: color, marginTop: 16 }]}><Text style={styles.previewBtnText}>Book Service</Text></View>
      </ScrollView>
      <View style={styles.actions}>
        <Pressable style={styles.outline}><Text style={styles.outlineText}>Manage billing (Stripe portal)</Text></Pressable>
        <Pressable style={styles.simBtn} onPress={onFail}>
          <Text style={styles.simText}>▶ Simulate payment failure</Text>
        </Pressable>
      </View>
    </View>
  );
}

/* 4. Paywall when payment fails */
function Paywall({ garage, color, onPay }) {
  return (
    <View style={[styles.screen, styles.center]}>
      <View style={styles.lockBadge}><Text style={{ fontSize: 30 }}>🔒</Text></View>
      <Text style={[styles.h1, { textAlign: 'center', marginTop: 16 }]}>Subscription paused</Text>
      <Text style={[styles.muted, { textAlign: 'center', paddingHorizontal: 36, marginTop: 6 }]}>
        We couldn't process the latest payment for {garage}. Access is paused until billing is updated.
      </Text>
      <Pressable style={[styles.primary, { backgroundColor: color, marginTop: 28, paddingHorizontal: 30 }]} onPress={onPay}>
        <Text style={styles.primaryText}>Update payment method</Text>
      </Pressable>
      <Text style={styles.fine}>The API returns 402 for all business routes while paused.</Text>
    </View>
  );
}

/* shared bits */
function BrandHeader({ name, color, sub, back, onBack }) {
  return (
    <View style={[styles.header, { backgroundColor: color }]}>
      {back && <Pressable onPress={onBack} hitSlop={12}><Text style={styles.back}>‹</Text></Pressable>}
      <View>
        <Text style={styles.brand}>{name}</Text>
        <Text style={styles.brandSub}>{sub}</Text>
      </View>
    </View>
  );
}
function Tile({ n, label, color }) {
  return <View style={styles.tile}><Text style={[styles.tileN, { color }]}>{n}</Text><Text style={styles.tileLabel}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: NAVY },
  screen: { flex: 1, backgroundColor: '#eef1f5' },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },

  header: { paddingVertical: 18, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { color: '#fff', fontSize: 26, fontWeight: '700' },
  brand: { color: '#fff', fontSize: 18, fontWeight: '700' },
  brandSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },

  body: { padding: 20, paddingBottom: 40 },
  h1: { color: INK, fontSize: 24, fontWeight: '700', marginBottom: 6 },
  h2: { color: INK, fontSize: 17, fontWeight: '700', marginTop: 22, marginBottom: 6 },
  label: { color: '#6b7280', fontSize: 12, fontWeight: '600', marginTop: 16, marginBottom: 6 },
  input: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e3e7ed', paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: INK },
  muted: { color: MUTED, fontSize: 13, lineHeight: 19 },

  swatches: { flexDirection: 'row', gap: 12, marginTop: 4 },
  swatch: { width: 38, height: 38, borderRadius: 19, borderWidth: 3, borderColor: 'transparent' },
  swatchOn: { borderColor: '#1a2230' },

  previewCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 2, padding: 16, marginTop: 22 },
  previewLabel: { color: MUTED, fontSize: 11, marginBottom: 10 },
  previewBtn: { borderRadius: 10, height: 44, alignItems: 'center', justifyContent: 'center' },
  previewBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  tiers: {},
  tier: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e3e7ed', padding: 16, marginBottom: 12 },
  tierTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  tierName: { color: INK, fontSize: 16, fontWeight: '700' },
  tierPrice: { color: INK, fontSize: 20, fontWeight: '700' },
  perMo: { color: MUTED, fontSize: 12, fontWeight: '400' },
  feat: { color: '#4b5563', fontSize: 13, marginTop: 3 },

  statusBanner: { borderRadius: 12, padding: 14, marginBottom: 16 },
  tiles: { flexDirection: 'row', gap: 12 },
  tile: { flex: 1, backgroundColor: '#fff', borderRadius: 14, paddingVertical: 16, paddingHorizontal: 14 },
  tileN: { fontSize: 24, fontWeight: '700' },
  tileLabel: { color: MUTED, fontSize: 11, marginTop: 4 },

  actions: { padding: 20, borderTopWidth: 1, borderTopColor: '#e3e7ed', gap: 12 },
  primary: { borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  outline: { borderRadius: 12, height: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#cdd4de' },
  outlineText: { color: NAVY, fontWeight: '700', fontSize: 14 },
  disabled: { opacity: 0.45 },
  fine: { color: '#aab2bd', fontSize: 11, textAlign: 'center' },

  simBtn: { backgroundColor: '#fdeaec', borderRadius: 12, height: 46, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f3b4ba' },
  simText: { color: '#c8102e', fontWeight: '700', fontSize: 13 },

  lockBadge: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
});
