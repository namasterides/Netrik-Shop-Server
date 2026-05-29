import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, Platform, StatusBar, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, typography, spacing, borderRadius, shadows } from '@/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { syncService } from '@/utils/syncService';
import { formatCurrency, formatRelativeTime } from '@/utils/format';
import { TableSummary } from '@/types/server';
import { SymbolView } from 'expo-symbols';

const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'payment pending': return colors.warning;
    case 'ready to serve': return colors.primary;
    case 'occupied': return colors.textMuted;
    case 'preparing': return '#8B5CF6'; // Purple
    case 'cleaning': return colors.danger;
    case 'paid': return colors.success;
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
            <View style={styles.titleRow}>
              <Text style={styles.title}>Active Tables</Text>
              {isLoading ? (
                <Animated.View style={styles.syncingIndicator}>
                  <SymbolView name="arrow.triangle.2.circlepath" size={16} tintColor={colors.primary} />
                </Animated.View>
              ) : (
                <View style={[styles.syncingIndicator, { backgroundColor: colors.success + '20' }]}>
                  <View style={[styles.syncDot, { backgroundColor: colors.success }]} />
                  <Text style={styles.syncText}>Live</Text>
                </View>
              )}
            </View>
            <Text style={styles.greeting}>Good evening, John</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity 
              style={styles.headerLogoutButton}
              onPress={async () => {
                await syncService.logout();
                router.replace('/');
              }}
            >
              <SymbolView name="rectangle.portrait.and.arrow.right" size={20} tintColor={colors.danger} />
            </TouchableOpacity>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>JS</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Pending Payments</Text>
            <Text style={styles.statValue}>
              {tables.filter(t => t.status?.toLowerCase() === 'payment pending').length}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Served Today</Text>
            <Text style={styles.statValue}>14</Text>
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
    alignItems: 'flex-start',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greeting: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  title: {
    ...typography.h1,
    marginRight: spacing.md,
  },
  syncingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  syncText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '600',
    color: colors.success,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surfaceHighlight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statLabel: {
    ...typography.caption,
    fontSize: 12,
    marginBottom: spacing.xs,
  },
  statValue: {
    ...typography.h2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogoutButton: {
    marginRight: spacing.md,
    padding: spacing.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: borderRadius.md,
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
