// VIPOR Service — app entry. Auth gates everything: no session → Login screen.
import 'react-native-gesture-handler';
import React, { useState, useEffect, useCallback } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ThemeProvider } from './src/theme';
import { AuthProvider, useAuth } from './src/auth';
import { api } from './src/api';
import LoginScreen from './src/screens/LoginScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import PaywallScreen from './src/screens/PaywallScreen';
import CustomerHomeScreen from './src/screens/CustomerHomeScreen';
import NewRequestScreen from './src/screens/NewRequestScreen';
import QuoteApprovalScreen from './src/screens/QuoteApprovalScreen';
import LiveTrackingScreen from './src/screens/LiveTrackingScreen';
import TechDashboardScreen from './src/screens/TechDashboardScreen';
import QuoteBuilderScreen from './src/screens/QuoteBuilderScreen';
import TeamScreen from './src/screens/TeamScreen';

const Stack = createNativeStackNavigator();

const Spinner = () => <View style={styles.center}><ActivityIndicator color="#c8102e" /></View>;

// Logged out: log in or start a new garage.
function AuthNav() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// Customer flow.
function CustomerNav() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="CustomerHome" component={CustomerHomeScreen} />
        <Stack.Screen name="NewRequest" component={NewRequestScreen} />
        <Stack.Screen name="QuoteApproval" component={QuoteApprovalScreen} />
        <Stack.Screen name="LiveTracking" component={LiveTrackingScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// Technician / admin flow.
function StaffNav() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="TechDashboard" component={TechDashboardScreen} />
        <Stack.Screen name="QuoteBuilder" component={QuoteBuilderScreen} />
        <Stack.Screen name="Team" component={TeamScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// Gate the staff app behind an active subscription; otherwise show the paywall.
function StaffArea() {
  const [status, setStatus] = useState(undefined);
  const check = useCallback(async () => {
    try { const s = await api.get('/tenant/status'); setStatus(s.status); }
    catch { setStatus('active'); } // don't lock staff out on a transient error
  }, []);
  useEffect(() => { check(); }, [check]);

  if (status === undefined) return <Spinner />;
  if (!['active', 'trialing'].includes(status)) return <PaywallScreen onActivated={check} />;
  return <StaffNav />;
}

function Root() {
  const { user, booting } = useAuth();
  if (booting) return <Spinner />;
  if (!user) return <AuthNav />;

  const isStaff = user.role === 'technician' || user.role === 'admin';
  return isStaff ? <StaffArea /> : <CustomerNav />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <StatusBar style="light" />
          <Root />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1b2434' },
});
