import React from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, Platform, StatusBar } from 'react-native';
import { colors, typography, spacing, borderRadius, shadows } from '@/theme';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SymbolView } from 'expo-symbols';

type Notification = {
  id: string;
  type: 'order' | 'payment' | 'kitchen' | 'assistance';
  title: string;
  message: string;
  time: string;
  isRead: boolean;
};

const DUMMY_NOTIFICATIONS: Notification[] = [
  { id: '1', type: 'order', title: 'New Order - Table 4', message: 'Truffle Pasta x2, Coke x1', time: 'Just now', isRead: false },
  { id: '2', type: 'payment', title: 'Payment Received', message: 'Table 12 paid $42.00 via Tap to Pay', time: '5m ago', isRead: false },
  { id: '3', type: 'kitchen', title: 'Order Ready - Table 8', message: 'Mains are ready to be served', time: '12m ago', isRead: true },
  { id: '4', type: 'assistance', title: 'Assistance Needed', message: 'Table 3 requested a waiter', time: '15m ago', isRead: true },
];

export default function NotificationsScreen() {
  const getIconName = (type: Notification['type']) => {
    switch (type) {
      case 'order': return 'cart.fill';
      case 'payment': return 'creditcard.fill';
      case 'kitchen': return 'flame.fill';
      case 'assistance': return 'hand.raised.fill';
      default: return 'bell.fill';
    }
  };

  const getIconColor = (type: Notification['type']) => {
    switch (type) {
      case 'order': return colors.primary;
      case 'payment': return colors.success;
      case 'kitchen': return colors.warning;
      case 'assistance': return colors.danger;
      default: return colors.textMuted;
    }
  };

  const renderItem = ({ item, index }: { item: Notification; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 100).springify()}>
      <View style={[styles.card, !item.isRead && styles.unreadCard]}>
        <View style={[styles.iconContainer, { backgroundColor: getIconColor(item.type) + '20' }]}>
          <SymbolView name={getIconName(item.type) as any} size={24} tintColor={getIconColor(item.type)} />
        </View>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.time}>{item.time}</Text>
          </View>
          <Text style={styles.message}>{item.message}</Text>
        </View>
      </View>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <Text style={styles.screenTitle}>Alerts</Text>
        </View>
        <FlatList
          data={DUMMY_NOTIFICATIONS}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
        />
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
  },
  headerContainer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  screenTitle: {
    ...typography.h1,
  },
  listContainer: {
    padding: spacing.lg,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  unreadCard: {
    borderColor: colors.primary + '50',
    backgroundColor: colors.surfaceHighlight,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.h3,
    fontSize: 16,
  },
  time: {
    ...typography.caption,
    fontSize: 12,
  },
  message: {
    ...typography.body,
    color: colors.textMuted,
    fontSize: 14,
  },
});
