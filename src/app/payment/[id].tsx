import React, { useEffect, useState } from 'react';
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
  runOnJS
} from 'react-native-reanimated';
import { colors, typography, spacing, shadows } from '@/theme';

const { width } = Dimensions.get('window');

type PaymentStatus = 'waiting' | 'processing' | 'success';

export default function TapToPayScreen() {
  const { id } = useLocalSearchParams();
  const [status, setStatus] = useState<PaymentStatus>('waiting');
  
  // Ripple animation values
  const ripple1 = useSharedValue(0);
  const ripple2 = useSharedValue(0);
  const ripple3 = useSharedValue(0);
  
  // Phone bounce animation
  const phoneY = useSharedValue(0);

  useEffect(() => {
    if (status === 'waiting') {
      // Start ripples
      ripple1.value = withRepeat(withTiming(1, { duration: 2000, easing: Easing.out(Easing.ease) }), -1, false);
      
      setTimeout(() => {
        ripple2.value = withRepeat(withTiming(1, { duration: 2000, easing: Easing.out(Easing.ease) }), -1, false);
      }, 600);
      
      setTimeout(() => {
        ripple3.value = withRepeat(withTiming(1, { duration: 2000, easing: Easing.out(Easing.ease) }), -1, false);
      }, 1200);

      // Phone floating animation
      phoneY.value = withRepeat(
        withSequence(
          withTiming(-15, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    }
  }, [status]);

  const createRippleStyle = (rippleValue: Animated.SharedValue<number>) => {
    return useAnimatedStyle(() => {
      return {
        opacity: 1 - rippleValue.value,
        transform: [{ scale: 1 + rippleValue.value * 2 }],
      };
    });
  };

  const phoneAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: phoneY.value }]
  }));

  // Simulate tapping the card
  const handleSimulateTap = () => {
    if (status !== 'waiting') return;
    
    setStatus('processing');
    
    // Stop animations
    ripple1.value = 0;
    ripple2.value = 0;
    ripple3.value = 0;
    phoneY.value = 0;

    // Simulate network delay
    setTimeout(() => {
      setStatus('success');
      
      // Auto redirect back to dashboard after success
      setTimeout(() => {
        router.dismissAll();
        router.replace('/dashboard');
      }, 2500);
    }, 1500);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <TouchableOpacity 
        style={styles.closeButton} 
        onPress={() => router.back()}
        disabled={status === 'processing'}
      >
        <Text style={styles.closeButtonText}>✕</Text>
      </TouchableOpacity>

      <View style={styles.container}>
        <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
          <Text style={styles.title}>
            {status === 'waiting' && 'Hold card near device'}
            {status === 'processing' && 'Processing...'}
            {status === 'success' && 'Payment Approved'}
          </Text>
          <Text style={styles.amount}>$141.10</Text>
        </Animated.View>

        <TouchableOpacity 
          style={styles.animationContainer} 
          activeOpacity={1} 
          onPress={handleSimulateTap}
        >
          {status === 'waiting' && (
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

        {status === 'waiting' && (
          <Text style={styles.instructionText}>
            Tap anywhere to simulate customer tapping their card
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000', // Pure black for payment screen looks premium
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
    backgroundColor: 'rgba(99, 102, 241, 0.2)', // Primary color with opacity
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
