import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, Platform, StatusBar, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, typography, spacing, borderRadius, shadows } from '@/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { syncService } from '@/utils/syncService';
import { formatCurrency, formatRelativeTime } from '@/utils/format';
import { TableSummary } from '@/types/server';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Payment Pending': return colors.warning;
    case 'Ordered': return colors.primary;
    case 'Needs Attention': return colors.danger;
    default: return colors.success;
  }
};

export default function DashboardScreen() {
  const [tables, setTables] = React.useState<TableSummary[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState('');

  const loadTables = React.useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const data = await syncService.getActiveTables();
      setTables(data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load tables.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    syncService.initialize();
    loadTables();

    const unsubscribe = syncService.subscribeToTableUpdates((update) => {
      setTables((prevTables) => {
        const index = prevTables.findIndex((table) => table.id === update.id);
        if (index === -1) {
          return prevTables;
        }

        const next = [...prevTables];
        next[index] = { ...next[index], ...update };
        return next;
      });
    });

    return () => unsubscribe();
  }, [loadTables]);

  const renderTableCard = ({ item, index }: { item: TableSummary; index: number }) => {
    const amountLabel = formatCurrency(item.amount, item.currency);
    const timeLabel = item.timeLabel || formatRelativeTime(item.startedAt ?? item.updatedAt);

    return (
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
          <Text style={styles.time}>{timeLabel}</Text>
        </View>
        
        <View style={styles.cardFooter}>
          <View style={styles.statusBadgeContainer}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
          </View>
          <Text style={styles.amount}>{amountLabel}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
    );
  };

  const renderEmptyState = () => {
    const message = isLoading
      ? 'Loading tables...'
      : errorMessage || 'No active tables yet.';

    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>{message}</Text>
      </View>
    );
  };

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
          refreshControl={
            <RefreshControl
              tintColor={colors.primary}
              refreshing={isLoading}
              onRefresh={loadTables}
            />
          }
          ListEmptyComponent={renderEmptyState}
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
  emptyState: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
