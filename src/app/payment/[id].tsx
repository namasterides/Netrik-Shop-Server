import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Dimensions } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  Easing, 
  FadeIn,
  FadeInDown,
  withSequence,
} from 'react-native-reanimated';
import { colors, typography, spacing, shadows } from '@/theme';
import { useStripeTerminal } from '@stripe/stripe-terminal-react-native';
import { syncService } from '@/utils/syncService';
import { appConfig } from '@/utils/config';
import { formatCurrency } from '@/utils/format';
import { PaymentContext } from '@/types/server';

const { width } = Dimensions.get('window');

type PaymentStatus = 'initializing' | 'waiting_for_card' | 'processing' | 'success' | 'error';

export default function TapToPayScreen() {
  const { id, amount, guestId, currency } = useLocalSearchParams();
  const [status, setStatus] = useState<PaymentStatus>('initializing');
  const [errorMessage, setErrorMessage] = useState('');
  const [paymentContext, setPaymentContext] = useState<PaymentContext | null>(null);
  const statusRef = useRef<PaymentStatus>('initializing');

  const amountOverride = parseNumberParam(amount);
  const guestIdParam = normalizeStringParam(guestId);
  const currencyOverride = normalizeStringParam(currency);
  
  const { discoverReaders, connectLocalMobileReader, collectPaymentMethod, processPayment, cancelCollectPaymentMethod } = useStripeTerminal();

  // Ripple animation values
  const ripple1 = useSharedValue(0);
  const ripple2 = useSharedValue(0);
  const ripple3 = useSharedValue(0);
  const phoneY = useSharedValue(0);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    let isActive = true;

    const init = async () => {
      try {
        const context = await syncService.getPaymentContext(id as string, guestIdParam || undefined);
        const mergedContext: PaymentContext = {
          ...context,
          amount: amountOverride ?? context.amount,
          currency: currencyOverride ?? context.currency,
          guestId: guestIdParam || context.guestId,
        };
        if (!isActive) {
          return;
        }

        setPaymentContext(mergedContext);
        await startPaymentFlow(mergedContext);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : 'Payment failed.');
        setStatus('error');
      }
    };

    init();

    return () => {
      isActive = false;
      if (statusRef.current === 'waiting_for_card') {
        cancelCollectPaymentMethod();
      }
    };
  }, [id]);

  const startPaymentFlow = async (context: PaymentContext) => {
    try {
      setStatus('initializing');
      setErrorMessage('');

      if (!appConfig.stripeLocationId) {
        throw new Error('Stripe location ID is not configured.');
      }

      // 1. Discover local mobile reader (NFC chip on device)
      const { readers, error: discoverError } = await discoverReaders({
        discoveryMethod: 'localMobile',
        simulated: appConfig.stripeSimulated,
      });

      if (discoverError || !readers?.length) {
        throw new Error(discoverError?.message || 'No NFC reader detected on this device.');
      }

      // 2. Connect to the reader
      const { error: connectError } = await connectLocalMobileReader({
        reader: readers[0],
        locationId: appConfig.stripeLocationId,
      });

      if (connectError) {
        throw new Error(connectError.message);
      }

      // 3. Get Payment Intent from backend
      const clientSecret = await syncService.fetchPaymentIntentClientSecret({
        tableId: id as string,
        amount: context.amount,
        currency: context.currency,
        guestId: context.guestId,
      });
      
      setStatus('waiting_for_card');
      startWaitingAnimations();

      // 4. Collect Payment Method (Prompt user to tap card)
      const { paymentIntent, error: collectError } = await collectPaymentMethod({
        paymentIntent: clientSecret,
      });

      if (collectError) {
        throw new Error(collectError.message);
      }

      setStatus('processing');
      stopAnimations();

      // 5. Process Payment
      if (paymentIntent) {
        const { error: processError } = await processPayment({ paymentIntent });
        
        if (processError) {
          throw new Error(processError.message);
        }

        await handleSuccess(paymentIntent.id);
      }
    } catch (error) {
      stopAnimations();
      setErrorMessage(error instanceof Error ? error.message : 'Payment failed.');
      setStatus('error');
    }
  };

  const handleSuccess = async (paymentIntentId?: string) => {
    setStatus('success');

    try {
      await syncService.updatePaymentStatus({
        tableId: id as string,
        status: 'Paid',
        paymentIntentId,
      });
    } catch {
      // If sync fails, the offline queue will retry when back online.
    }
    
    setTimeout(() => {
      router.dismissAll();
      router.replace('/dashboard');
    }, 2500);
  };

  const startWaitingAnimations = () => {
    ripple1.value = withRepeat(withTiming(1, { duration: 2000, easing: Easing.out(Easing.ease) }), -1, false);
    setTimeout(() => {
      ripple2.value = withRepeat(withTiming(1, { duration: 2000, easing: Easing.out(Easing.ease) }), -1, false);
    }, 600);
    setTimeout(() => {
      ripple3.value = withRepeat(withTiming(1, { duration: 2000, easing: Easing.out(Easing.ease) }), -1, false);
    }, 1200);

    phoneY.value = withRepeat(
      withSequence(
        withTiming(-15, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  };

  const stopAnimations = () => {
    ripple1.value = 0;
    ripple2.value = 0;
    ripple3.value = 0;
    phoneY.value = 0;
  };

  const createRippleStyle = (rippleValue: Animated.SharedValue<number>) => {
    return useAnimatedStyle(() => ({
      opacity: 1 - rippleValue.value,
      transform: [{ scale: 1 + rippleValue.value * 2 }],
    }));
  };

  const phoneAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: phoneY.value }]
  }));

  return (
    <SafeAreaView style={styles.safeArea}>
      <TouchableOpacity style={styles.closeButton} onPress={() => router.back()} disabled={status === 'processing'}>
        <Text style={styles.closeButtonText}>✕</Text>
      </TouchableOpacity>

      <View style={styles.container}>
        <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
          <Text style={styles.title}>
            {status === 'initializing' && 'Starting Card Reader...'}
            {status === 'waiting_for_card' && 'Hold card near device'}
            {status === 'processing' && 'Processing...'}
            {status === 'success' && 'Payment Approved'}
            {status === 'error' && 'Payment Error'}
          </Text>
          <Text style={styles.amount}>
            {formatCurrency(paymentContext?.amount, paymentContext?.currency ?? 'USD')}
          </Text>
          {status === 'error' ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}
        </Animated.View>

        <TouchableOpacity 
          style={styles.animationContainer} 
          activeOpacity={1} 
          onPress={
            status === 'error' && paymentContext
              ? () => startPaymentFlow(paymentContext)
              : undefined
          }
        >
          {status === 'waiting_for_card' && (
            <>
              <Animated.View style={[styles.ripple, createRippleStyle(ripple1)]} />
              <Animated.View style={[styles.ripple, createRippleStyle(ripple2)]} />
              <Animated.View style={[styles.ripple, createRippleStyle(ripple3)]} />
              
              <Animated.View style={[styles.deviceContainer, phoneAnimatedStyle]}>
                <View style={styles.nfcIcon}>
                  <Text style={styles.nfcText}>NFC</Text>
                </View>
              </Animated.View>
            </>
          )}

          {status === 'processing' && (
            <Animated.View entering={FadeIn} style={styles.spinnerContainer}>
              <View style={styles.processingDot} />
            </Animated.View>
          )}

          {status === 'success' && (
            <Animated.View entering={FadeIn.springify()} style={styles.successContainer}>
              <View style={styles.checkmarkCircle}>
                <Text style={styles.checkmark}>✓</Text>
              </View>
            </Animated.View>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const parseNumberParam = (value: string | string[] | undefined) => {
  if (!value) {
    return undefined;
  }

  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const normalizeStringParam = (value: string | string[] | undefined) => {
  if (!value) {
    return undefined;
  }

  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw.trim();
  return trimmed.length ? trimmed : undefined;
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000', 
  },
  closeButton: {
    padding: spacing.xl,
    alignSelf: 'flex-start',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '300',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  title: {
    ...typography.h3,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  amount: {
    fontSize: 48,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -1,
  },
  animationContainer: {
    width: width * 0.8,
    height: width * 0.8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ripple: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.4)',
  },
  deviceContainer: {
    width: 100,
    height: 140,
    backgroundColor: colors.surfaceHighlight,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.glow,
  },
  nfcIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nfcText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  instructionText: {
    ...typography.caption,
    textAlign: 'center',
    opacity: 0.5,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
    marginTop: spacing.sm,
  },
  spinnerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.glow,
    shadowColor: colors.success,
  },
  checkmark: {
    color: '#fff',
    fontSize: 48,
    fontWeight: 'bold',
  },
});
