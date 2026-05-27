import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, Platform, StatusBar } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, typography, spacing, borderRadius, shadows } from '@/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { syncService } from '@/utils/syncService';

// Mock Data
const MOCK_TABLES = [
  { id: '1', tableNo: 'Table 4', status: 'Payment Pending', amount: '$42.50', time: '5m ago' },
  { id: '2', tableNo: 'Table 12', status: 'Ordered', amount: '$112.00', time: '12m ago' },
  { id: '3', tableNo: 'Table 7', status: 'Needs Attention', amount: '-', time: '1m ago' },
  { id: '4', tableNo: 'Table 2', status: 'Dining', amount: '$85.00', time: '45m ago' },
  { id: '5', tableNo: 'Table 9', status: 'Dining', amount: '$34.00', time: '30m ago' },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Payment Pending': return colors.warning;
    case 'Ordered': return colors.primary;
    case 'Needs Attention': return colors.danger;
    default: return colors.success;
  }
};

export default function DashboardScreen() {
  const [tables, setTables] = React.useState(MOCK_TABLES);

  React.useEffect(() => {
    // Listen for real-time updates from syncService
    const unsubscribe = syncService.subscribeToTableUpdates((tableId, newStatus) => {
      setTables(prevTables => 
        prevTables.map(t => t.id === tableId ? { ...t, status: newStatus } : t)
      );
    });

    return () => unsubscribe();
  }, []);

  const renderTableCard = ({ item, index }: { item: typeof MOCK_TABLES[0], index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 100).springify()}>
      <TouchableOpacity 
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => router.push(`/table/${item.id}`)}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.01)']}
          style={StyleSheet.absoluteFill}
          borderRadius={borderRadius.lg}
        />
        <View style={styles.cardHeader}>
          <Text style={styles.tableNo}>{item.tableNo}</Text>
          <Text style={styles.time}>{item.time}</Text>
        </View>
        
        <View style={styles.cardFooter}>
          <View style={styles.statusBadgeContainer}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
          </View>
          <Text style={styles.amount}>{item.amount}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good evening,</Text>
            <Text style={styles.title}>Active Tables</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>JS</Text>
          </View>
        </View>

        <FlatList
          data={tables}
          keyExtractor={(item) => item.id}
          renderItem={renderTableCard}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  greeting: {
    ...typography.h3,
    color: colors.textMuted,
    fontWeight: '500',
  },
  title: {
    ...typography.h1,
    marginTop: spacing.xs,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.glow,
  },
  avatarText: {
    ...typography.button,
    color: '#fff',
  },
  listContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  tableNo: {
    ...typography.h2,
    fontSize: 22,
  },
  time: {
    ...typography.caption,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.pill,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
  },
  amount: {
    ...typography.h3,
    color: colors.text,
  },
});
