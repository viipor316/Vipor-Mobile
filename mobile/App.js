// VIPOR Service — app entry. Auth gates everything: no session → Login screen.
import 'react-native-gesture-handler';
import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ThemeProvider } from './src/theme';
import { AuthProvider, useAuth } from './src/auth';
import LoginScreen from './src/screens/LoginScreen';
import QuoteApprovalScreen from './src/screens/QuoteApprovalScreen';
import LiveTrackingScreen from './src/screens/LiveTrackingScreen';
import TechDashboardScreen from './src/screens/TechDashboardScreen';
import QuoteBuilderScreen from './src/screens/QuoteBuilderScreen';

const Stack = createNativeStackNavigator();

function Root() {
  const { user, booting } = useAuth();

  if (booting) {
    return (
      <View style={styles.center}><ActivityIndicator color="#c8102e" /></View>
    );
  }

  if (!user) return <LoginScreen />;

  // Role-based routing: technicians/admins get the shop dashboard; customers get
  // the quote-approval + tracking flow.
  const isStaff = user.role === 'technician' || user.role === 'admin';

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isStaff ? (
          <>
            <Stack.Screen name="TechDashboard" component={TechDashboardScreen} />
            <Stack.Screen name="QuoteBuilder" component={QuoteBuilderScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="QuoteApproval" component={QuoteApprovalScreen} initialParams={{ quoteId: 'q_1042' }} />
            <Stack.Screen name="LiveTracking" component={LiveTrackingScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
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
