import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Platform, StatusBar } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { colors, typography, spacing, borderRadius, shadows } from '@/theme';
import { syncService } from '@/utils/syncService';
import { formatCurrency } from '@/utils/format';
import { SplitBillPayload, SplitGuest, TableDetails } from '@/types/server';

const MAX_GUESTS = 20;

const clampGuestCount = (value: number) => Math.min(Math.max(value, 1), MAX_GUESTS);

const buildGuests = (count: number): SplitGuest[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `guest-${index + 1}`,
    label: `Guest ${index + 1}`,
  }));

const roundAmount = (value?: number) =>
  value === undefined ? undefined : Math.round(value * 100) / 100;

export default function SplitBillScreen() {
  const { id } = useLocalSearchParams();
  const [table, setTable] = React.useState<TableDetails | null>(null);
  const [guestCount, setGuestCount] = React.useState(2);
  const [selectedGuestIndex, setSelectedGuestIndex] = React.useState(0);
  const [itemAssignments, setItemAssignments] = React.useState<Record<string, number>>({});
  const [sharedItemIds, setSharedItemIds] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [saveMessage, setSaveMessage] = React.useState('');

  React.useEffect(() => {
    const loadTable = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        await syncService.initialize();
        const details = await syncService.getTableDetails(id as string);
        setTable(details);
        if (details.guestCount && details.guestCount > 0) {
          setGuestCount(clampGuestCount(details.guestCount));
        }
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load table.');
      } finally {
        setIsLoading(false);
      }
    };

    loadTable();
  }, [id]);

  const updateGuestCount = React.useCallback((nextValue: number) => {
    const clamped = clampGuestCount(nextValue);
    setGuestCount(clamped);
    setSelectedGuestIndex((current) => Math.min(current, clamped - 1));
    setItemAssignments((current) => {
      const nextAssignments: Record<string, number> = {};
      Object.entries(current).forEach(([itemId, index]) => {
        if (index < clamped) {
          nextAssignments[itemId] = index;
        }
      });
      return nextAssignments;
    });
  }, []);

  const handleAssignItem = (itemId: string) => {
    setItemAssignments((current) => ({
      ...current,
      [itemId]: selectedGuestIndex,
    }));

    setSharedItemIds((current) => current.filter((idValue) => idValue !== itemId));
  };

  const handleToggleShared = (itemId: string) => {
    setSharedItemIds((current) => {
      if (current.includes(itemId)) {
        return current.filter((idValue) => idValue !== itemId);
      }

      return [...current, itemId];
    });

    setItemAssignments((current) => {
      const nextAssignments = { ...current };
      delete nextAssignments[itemId];
      return nextAssignments;
    });
  };

  const items = table?.items ?? [];
  const currency = table?.billing?.currency ?? 'USD';
  const itemsTotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const total = table?.billing?.total ?? (items.length ? itemsTotal : undefined);

  const guests = React.useMemo(() => buildGuests(guestCount), [guestCount]);
  const sharedSet = React.useMemo(() => new Set(sharedItemIds), [sharedItemIds]);

  const allocation = React.useMemo(() => {
    const guestTotals = Array.from({ length: guestCount }, () => 0);
    const guestItemIds = Array.from({ length: guestCount }, () => [] as string[]);
    const unassignedItemIds: string[] = [];
    let unassignedTotal = 0;

    items.forEach((item) => {
      const lineTotal = item.price * item.qty;

      if (sharedSet.has(item.id)) {
        const share = guestCount > 0 ? lineTotal / guestCount : 0;
        for (let index = 0; index < guestCount; index += 1) {
          guestTotals[index] += share;
        }
        return;
      }

      const assignedIndex = itemAssignments[item.id];
      if (assignedIndex === undefined || assignedIndex === null) {
        unassignedItemIds.push(item.id);
        unassignedTotal += lineTotal;
        return;
      }

      if (assignedIndex >= 0 && assignedIndex < guestCount) {
        guestTotals[assignedIndex] += lineTotal;
        guestItemIds[assignedIndex].push(item.id);
      } else {
        unassignedItemIds.push(item.id);
        unassignedTotal += lineTotal;
      }
    });

    return {
      guestTotals,
      guestItemIds,
      unassignedItemIds,
      unassignedTotal,
    };
  }, [guestCount, itemAssignments, items, sharedSet]);

  const guestTotals = allocation.guestTotals;

  const handleSaveSplit = async () => {
    if (!table || total === undefined) {
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    setSaveMessage('');

    const payloadGuests: SplitGuest[] = guests.map((guest, index) => ({
      id: guest.id,
      label: guest.label,
      amount: roundAmount(guestTotals[index]),
      itemIds: allocation.guestItemIds[index].length ? allocation.guestItemIds[index] : undefined,
    }));

    const payload: SplitBillPayload = {
      tableId: id as string,
      mode: 'item',
      guestCount,
      currency,
      total,
      guests: payloadGuests,
      sharedItemIds,
      unassignedItemIds: allocation.unassignedItemIds,
    };

    try {
      await syncService.saveSplitBill(payload);
      setSaveMessage('Split saved.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save split.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCollectPayment = (guestId: string, amount?: number) => {
    if (amount === undefined || amount <= 0) {
      return;
    }

    const params: Record<string, string> = {
      guestId,
    };

    if (currency) {
      params.currency = currency;
    }

    params.amount = amount.toString();

    router.push({
      pathname: `/payment/${id}`,
      params,
    });
  };

  const hasUnassignedItems = allocation.unassignedItemIds.length > 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Split Bill</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <Animated.View entering={FadeInDown.duration(600).springify()} style={styles.summaryCard}>
          <View>
            <Text style={styles.summaryLabel}>Table</Text>
            <Text style={styles.summaryValue}>{table?.tableNo || '--'}</Text>
          </View>
          <View style={styles.summaryAmountWrapper}>
            <Text style={styles.summaryLabel}>Total</Text>
            <Text style={styles.summaryAmount}>{formatCurrency(total, currency)}</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(200).duration(700).springify()} style={styles.guestsCard}>
          <Text style={styles.sectionTitle}>Guests</Text>
          <View style={styles.counterRow}>
            <TouchableOpacity
              style={styles.counterButton}
              onPress={() => updateGuestCount(guestCount - 1)}
              disabled={guestCount <= 1}
            >
              <Text style={styles.counterText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.counterValue}>{guestCount}</Text>
            <TouchableOpacity
              style={styles.counterButton}
              onPress={() => updateGuestCount(guestCount + 1)}
              disabled={guestCount >= MAX_GUESTS}
            >
              <Text style={styles.counterText}>+</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.helperText}>
            Assign each item to a guest or mark it as shared.
          </Text>
          {hasUnassignedItems ? (
            <Text style={styles.warningText}>
              {formatCurrency(allocation.unassignedTotal, currency)} unassigned
            </Text>
          ) : null}
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(300).duration(700).springify()} style={styles.itemsCard}>
          <Text style={styles.sectionTitle}>Assign Items</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.guestSelector}>
            {guests.map((guest, index) => (
              <TouchableOpacity
                key={guest.id}
                style={[styles.guestChip, selectedGuestIndex === index && styles.guestChipActive]}
                onPress={() => setSelectedGuestIndex(index)}
              >
                <Text
                  style={[styles.guestChipLabel, selectedGuestIndex === index && styles.guestChipLabelActive]}
                >
                  {guest.label}
                </Text>
                <Text
                  style={[styles.guestChipAmount, selectedGuestIndex === index && styles.guestChipLabelActive]}
                >
                  {formatCurrency(roundAmount(allocation.guestTotals[index]), currency)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {items.map((item) => {
            const isShared = sharedSet.has(item.id);
            const assignedIndex = itemAssignments[item.id];
            const assignmentLabel = isShared
              ? 'Shared'
              : assignedIndex === undefined
                ? 'Unassigned'
                : `Guest ${assignedIndex + 1}`;

            return (
              <View key={item.id} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>
                    {item.qty}x {item.name}
                  </Text>
                  <Text style={styles.itemPrice}>
                    {formatCurrency(item.price * item.qty, currency)}
                  </Text>
                </View>
                <View style={styles.itemActions}>
                  <TouchableOpacity style={styles.assignButton} onPress={() => handleAssignItem(item.id)}>
                    <Text style={styles.assignButtonText}>{assignmentLabel}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.sharedButton, isShared && styles.sharedButtonActive]}
                    onPress={() => handleToggleShared(item.id)}
                  >
                    <Text
                      style={[styles.sharedButtonText, isShared && styles.sharedButtonTextActive]}
                    >
                      Shared
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(400).duration(700).springify()} style={styles.paymentsCard}>
          <Text style={styles.sectionTitle}>Guest Payments</Text>
          {guests.map((guest, index) => {
            const amount = roundAmount(guestTotals[index]);
            const canCollect = amount !== undefined && amount > 0;

            return (
              <View key={guest.id} style={styles.guestRow}>
                <View>
                  <Text style={styles.guestName}>{guest.label}</Text>
                  <Text style={styles.guestAmount}>{formatCurrency(amount, currency)}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.collectButton, !canCollect && styles.collectButtonDisabled]}
                  onPress={() => handleCollectPayment(guest.id, amount)}
                  disabled={!canCollect}
                >
                  <Text style={styles.collectButtonText}>Collect</Text>
                </TouchableOpacity>
              </View>
            );
          })}

          {!guests.length && !isLoading ? (
            <Text style={styles.emptyText}>{errorMessage || 'No guests yet.'}</Text>
          ) : null}
        </Animated.View>
      </ScrollView>

      <Animated.View entering={FadeInUp.delay(500).duration(700).springify()} style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, (!table || total === undefined) && styles.saveButtonDisabled]}
          onPress={handleSaveSplit}
          disabled={isSaving || !table || total === undefined}
        >
          <Text style={styles.saveButtonText}>{isSaving ? 'Saving...' : 'Save Split'}</Text>
        </TouchableOpacity>
        {saveMessage ? <Text style={styles.successText}>{saveMessage}</Text> : null}
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
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
    paddingBottom: spacing.xxl,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
  },
  summaryLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  summaryValue: {
    ...typography.h2,
  },
  summaryAmountWrapper: {
    alignItems: 'flex-end',
  },
  summaryAmount: {
    ...typography.h2,
    color: colors.primary,
  },
  sectionTitle: {
    ...typography.h3,
    marginBottom: spacing.md,
  },
  guestsCard: {
    backgroundColor: colors.surfaceHighlight,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterText: {
    ...typography.h3,
  },
  counterValue: {
    ...typography.h2,
    marginHorizontal: spacing.lg,
  },
  helperText: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  warningText: {
    ...typography.caption,
    color: colors.warning,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  itemsCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  guestSelector: {
    marginBottom: spacing.md,
  },
  guestChip: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  guestChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  guestChipLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  guestChipLabelActive: {
    color: colors.text,
  },
  guestChipAmount: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  itemName: {
    ...typography.body,
  },
  itemPrice: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  itemActions: {
    alignItems: 'flex-end',
  },
  assignButton: {
    backgroundColor: colors.surfaceHighlight,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  assignButtonText: {
    ...typography.caption,
    color: colors.text,
  },
  sharedButton: {
    marginTop: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sharedButtonActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
  },
  sharedButtonText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  sharedButtonTextActive: {
    color: colors.primary,
  },
  paymentsCard: {
    backgroundColor: colors.surfaceHighlight,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  guestRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  guestName: {
    ...typography.body,
  },
  guestAmount: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  collectButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  collectButtonDisabled: {
    opacity: 0.5,
  },
  collectButtonText: {
    ...typography.button,
  },
  emptyText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.glow,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    ...typography.button,
    fontSize: 18,
  },
  successText: {
    ...typography.caption,
    color: colors.success,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
