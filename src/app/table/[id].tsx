import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Platform, StatusBar } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { colors, typography, spacing, borderRadius, shadows } from '@/theme';
import { syncService } from '@/utils/syncService';
import { formatCurrency } from '@/utils/format';
import { TableDetails } from '@/types/server';

export default function TableDetailsScreen() {
  const { id } = useLocalSearchParams();
  const [table, setTable] = React.useState<TableDetails | null>(null);
  const [status, setStatus] = React.useState('');
  const [errorMessage, setErrorMessage] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const loadTable = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const details = await syncService.getTableDetails(id as string);
        setTable(details);
        setStatus(details.status);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load table.');
      } finally {
        setIsLoading(false);
      }
    };

    loadTable();

    const unsubscribe = syncService.subscribeToTableUpdates((update) => {
      if (update.id === id) {
        setStatus((current) => update.status ?? current);
      }
    });
    return () => unsubscribe();
  }, [id]);

  const items = table?.items ?? [];
  const subtotal =
    table?.billing?.subtotal ??
    (items.length ? items.reduce((sum, item) => sum + item.price * item.qty, 0) : undefined);
  const tax = table?.billing?.tax;
  const total = table?.billing?.total;
  const currency = table?.billing?.currency ?? 'USD';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Table Details</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <Animated.View entering={FadeInDown.duration(600).springify()} style={styles.tableInfo}>
          <Text style={styles.tableNo}>{table?.tableNo || 'Table'}</Text>
          <View style={[styles.statusBadge, status === 'Paid' && styles.statusBadgeSuccess]}>
            <Text style={[styles.statusText, status === 'Paid' && styles.statusTextSuccess]}>
              {status || '--'}
            </Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(200).duration(800).springify()} style={styles.receiptContainer}>
          <View style={styles.receiptHeader}>
            <Text style={styles.receiptTitle}>Order Receipt</Text>
          </View>
          
          {items.map((item) => (
            <View key={item.id} style={styles.orderItem}>
              <View style={styles.itemLeft}>
                <Text style={styles.itemQty}>{item.qty}x</Text>
                <Text style={styles.itemName}>{item.name}</Text>
              </View>
              <Text style={styles.itemPrice}>
                {formatCurrency(item.price * item.qty, currency)}
              </Text>
            </View>
          ))}

          {!items.length && !isLoading ? (
            <Text style={styles.emptyText}>{errorMessage || 'No items yet.'}</Text>
          ) : null}

          <View style={styles.divider} />
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{formatCurrency(subtotal, currency)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax (8.5%)</Text>
            <Text style={styles.summaryValue}>{formatCurrency(tax, currency)}</Text>
          </View>
          
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatCurrency(total, currency)}</Text>
          </View>
        </Animated.View>
      </ScrollView>

      <Animated.View entering={FadeInUp.delay(400).duration(800).springify()} style={styles.footer}>
        {status !== 'Paid' ? (
          <View>
            <TouchableOpacity
              style={styles.splitButton}
              activeOpacity={0.8}
              onPress={() => router.push(`/split/${id}`)}
              disabled={isLoading || !table}
            >
              <Text style={styles.splitButtonText}>Split Bill</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.payButton}
              activeOpacity={0.8}
              onPress={() => router.push(`/payment/${id}`)}
              disabled={isLoading || !table}
            >
              <Text style={styles.payButtonText}>Accept Tap to Pay</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.paidButton}>
            <Text style={styles.paidButtonText}>Table Paid ✓</Text>
          </View>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.sm,
  },
  backButtonText: {
    ...typography.button,
    color: colors.primary,
  },
  headerTitle: {
    ...typography.h3,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  tableInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  tableNo: {
    ...typography.h1,
  },
  statusBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)', // Warning color with opacity
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  statusBadgeSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  statusText: {
    ...typography.caption,
    color: colors.warning,
    fontWeight: '600',
  },
  statusTextSuccess: {
    color: colors.success,
  },
  receiptContainer: {
    backgroundColor: colors.surfaceHighlight,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    ...shadows.md,
  },
  receiptHeader: {
    marginBottom: spacing.lg,
  },
  receiptTitle: {
    ...typography.h3,
    color: colors.textMuted,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemQty: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '700',
    width: 32,
  },
  itemName: {
    ...typography.body,
    flex: 1,
  },
  itemPrice: {
    ...typography.body,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    ...typography.body,
    color: colors.textMuted,
  },
  summaryValue: {
    ...typography.body,
    color: colors.textMuted,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalLabel: {
    ...typography.h2,
  },
  totalValue: {
    ...typography.h2,
    color: colors.primary,
  },
  footer: {
    padding: spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? spacing.xxl : spacing.xl,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  payButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.glow,
  },
  payButtonText: {
    ...typography.button,
    fontSize: 18,
  },
  splitButton: {
    backgroundColor: colors.surfaceHighlight,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  splitButtonText: {
    ...typography.button,
    fontSize: 18,
    color: colors.text,
  },
  paidButton: {
    backgroundColor: colors.surfaceHighlight,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.success,
  },
  paidButtonText: {
    ...typography.button,
    color: colors.success,
    fontSize: 18,
  },
  emptyText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
