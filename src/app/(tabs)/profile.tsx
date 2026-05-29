import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform, StatusBar } from 'react-native';
import { router } from 'expo-router';
import { colors, typography, spacing, borderRadius, shadows } from '@/theme';
import { syncService } from '@/utils/syncService';
import { SymbolView } from 'expo-symbols';

export default function ProfileScreen() {
  const handleLogout = async () => {
    await syncService.logout();
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <Text style={styles.screenTitle}>Profile</Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>JS</Text>
          </View>
          <View style={styles.info}>
            <Text style={styles.name}>John Server</Text>
            <Text style={styles.role}>Lead Waiter</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shift Details</Text>
          <View style={styles.row}>
            <SymbolView name="clock.fill" size={20} tintColor={colors.textMuted} />
            <Text style={styles.rowText}>Started at 4:00 PM</Text>
          </View>
          <View style={styles.row}>
            <SymbolView name="chart.bar.fill" size={20} tintColor={colors.textMuted} />
            <Text style={styles.rowText}>14 tables served today</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Device</Text>
          <View style={styles.row}>
            <SymbolView name="wifi" size={20} tintColor={colors.success} />
            <Text style={styles.rowText}>Connected to Netrik-Sync</Text>
          </View>
          <View style={styles.row}>
            <SymbolView name="creditcard.fill" size={20} tintColor={colors.success} />
            <Text style={styles.rowText}>Tap-to-Pay Ready</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <SymbolView name="rectangle.portrait.and.arrow.right" size={20} tintColor={colors.danger} />
          <Text style={styles.logoutText}>End Shift & Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    padding: spacing.xl,
  },
  headerContainer: {
    marginBottom: spacing.xl,
  },
  screenTitle: {
    ...typography.h1,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.lg,
    ...shadows.glow,
  },
  avatarText: {
    ...typography.h2,
    color: '#fff',
  },
  info: {
    flex: 1,
  },
  name: {
    ...typography.h2,
    marginBottom: 4,
  },
  role: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  section: {
    marginBottom: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    ...typography.h3,
    fontSize: 16,
    marginBottom: spacing.md,
    color: colors.textMuted,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  rowText: {
    ...typography.body,
    marginLeft: spacing.md,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceHighlight,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.danger + '40',
    marginTop: 'auto',
  },
  logoutText: {
    ...typography.button,
    color: colors.danger,
    marginLeft: spacing.sm,
  },
});
