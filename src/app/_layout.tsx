import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '@/theme';
import { ThemeProvider, DarkTheme } from '@react-navigation/native';
import { StripeTerminalProvider } from '@stripe/stripe-terminal-react-native';
import { syncService } from '@/utils/syncService';

export default function RootLayout() {
  const fetchTokenProvider = async () => {
    // This calls your backend to get the Stripe Terminal connection token
    const token = await syncService.fetchStripeConnectionToken();
    return token;
  };

  return (
    <StripeTerminalProvider
      tokenProvider={fetchTokenProvider}
      logLevel="verbose"
    >
      <ThemeProvider value={DarkTheme}>
        <StatusBar style="light" backgroundColor={colors.background} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: 'fade_from_bottom',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="dashboard" />
          <Stack.Screen name="table/[id]" options={{ presentation: 'card' }} />
          <Stack.Screen name="split/[id]" options={{ presentation: 'card' }} />
          <Stack.Screen name="payment/[id]" options={{ presentation: 'modal' }} />
        </Stack>
      </ThemeProvider>
    </StripeTerminalProvider>
  );
}
