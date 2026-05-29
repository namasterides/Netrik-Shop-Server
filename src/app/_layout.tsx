import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '@/theme';
import { Platform } from 'react-native';
import { syncService } from '@/utils/syncService';
import { StripeTerminalProvider as StripeProvider } from '@/components/StripeProvider';

export default function RootLayout() {
  const fetchTokenProvider = async () => {
    // This calls your backend to get the Stripe Terminal connection token
    const token = await syncService.fetchStripeConnectionToken();
    return token;
  };

  return (
    <StripeProvider
      tokenProvider={fetchTokenProvider}
      logLevel="verbose"
    >
      <StatusBar style="light" backgroundColor={colors.background} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade_from_bottom',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="table/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="split/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="payment/[id]" options={{ presentation: 'modal' }} />
      </Stack>
    </StripeProvider>
  );
}
