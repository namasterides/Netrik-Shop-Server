import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown, FadeInUp, useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSequence, Easing } from 'react-native-reanimated';
import { colors, typography, spacing, borderRadius, shadows } from '@/theme';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Background animation
  const bgOpacity = useSharedValue(0.4);
  
  useEffect(() => {
    bgOpacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 4000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const animatedBgStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
  }));

  const handleLogin = () => {
    // In a real app, authenticate here. For now, navigate to dashboard
    router.replace('/dashboard');
  };

  return (
    <View style={styles.container}>
      {/* Dynamic Background */}
      <Animated.View style={[StyleSheet.absoluteFill, animatedBgStyle]}>
        <LinearGradient
          colors={[colors.background, '#1A1C3B', colors.background]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={styles.glowOrb1} />
        <View style={styles.glowOrb2} />
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <Animated.View entering={FadeInDown.duration(1000).springify()} style={styles.header}>
            <Text style={styles.title}>Netrik Shop</Text>
            <Text style={styles.subtitle}>Server Terminal</Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(1000).delay(300).springify()} style={styles.formCard}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Server ID / Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your credential"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Passcode</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
              activeOpacity={0.8}
            >
              <Text style={styles.loginButtonText}>Access Dashboard</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  glowOrb1: {
    position: 'absolute',
    top: -height * 0.1,
    right: -width * 0.2,
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: colors.primary,
    opacity: 0.15,
    filter: 'blur(60px)',
  },
  glowOrb2: {
    position: 'absolute',
    bottom: -height * 0.1,
    left: -width * 0.2,
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: width * 0.3,
    backgroundColor: '#8B5CF6',
    opacity: 0.15,
    filter: 'blur(60px)',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  title: {
    ...typography.h1,
    fontSize: 42,
    letterSpacing: -1,
  },
  subtitle: {
    ...typography.body,
    color: colors.primary,
    marginTop: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontWeight: '700',
  },
  formCard: {
    backgroundColor: 'rgba(26, 28, 35, 0.6)',
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    ...shadows.md,
    backdropFilter: 'blur(20px)',
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.caption,
    marginBottom: spacing.sm,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  loginButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
    ...shadows.glow,
  },
  loginButtonText: {
    ...typography.button,
    fontSize: 18,
  },
});
