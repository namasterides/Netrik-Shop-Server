import * as Network from 'expo-network';

import { ApiClient, ApiError } from '@/utils/apiClient';
import { apiRoutes } from '@/utils/apiRoutes';
import { appConfig, isApiConfigured, isRealtimeConfigured, isStripeConfigured } from '@/utils/config';
import { OfflineAction, OfflineQueue } from '@/utils/offlineQueue';
import { RealtimeClient } from '@/utils/realtimeClient';
import { clearSession, loadSession, saveSession } from '@/utils/storage';
import { createId } from '@/utils/ids';
import { PaymentContext, TableDetails, TableSummary, Session, SplitBillPayload } from '@/types/server';

type TableUpdateListener = (update: Partial<TableSummary> & { id: string }) => void;

type LoginPayload = {
  credential: string;
  password: string;
  restaurantCode?: string;
};

type PaymentIntentPayload = {
  tableId: string;
  amount?: number;
  currency?: string;
  guestId?: string;
};

type PaymentStatusPayload = {
  tableId: string;
  status: string;
  paymentIntentId?: string;
};

class SyncService {
  private api = new ApiClient(appConfig.apiBaseUrl);
  private realtime = new RealtimeClient();
  private offlineQueue = new OfflineQueue('netrik.offline.queue');
  private listeners = new Set<TableUpdateListener>();
  private initialized = false;
  private session: Session | null = null;
  private isOnline = true;
  private realtimeBound = false;

  async initialize() {
    if (this.initialized) {
      return;
    }

    this.initialized = true;
    await this.offlineQueue.load();

    const networkState = await Network.getNetworkStateAsync();
    this.isOnline = Boolean(networkState.isInternetReachable ?? networkState.isConnected);

    Network.addNetworkStateListener((state) => {
      const nextOnline = Boolean(state.isInternetReachable ?? state.isConnected);
      this.isOnline = nextOnline;

      if (nextOnline) {
        this.flushOfflineQueue();
        this.connectRealtime();
      } else {
        this.realtime.disconnect();
      }
    });
  }

  async login(payload: LoginPayload) {
    this.ensureApiConfigured();

    const response = await this.api.post<Record<string, unknown>>(apiRoutes.login, payload);
    const session = normalizeSession(response);

    await saveSession(session);
    this.setSession(session);
    this.connectRealtime();

    return session;
  }

  async restoreSession() {
    await this.initialize();
    const session = await loadSession();

    if (!session) {
      return null;
    }

    this.setSession(session);
    this.connectRealtime();
    return session;
  }

  async logout() {
    this.setSession(null);
    this.realtime.disconnect();
    await clearSession();
  }

  subscribeToTableUpdates(callback: TableUpdateListener) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  async getActiveTables(): Promise<TableSummary[]> {
    this.ensureApiConfigured();
    const response = await this.api.get<Record<string, unknown> | unknown[]>(apiRoutes.tables);
    const tables = extractArray(response, ['tables', 'data']);
    return tables.map(normalizeTableSummary);
  }

  async getTableDetails(tableId: string): Promise<TableDetails> {
    this.ensureApiConfigured();
    const response = await this.api.get<Record<string, unknown>>(apiRoutes.tableDetails(tableId));
    const table = (response as { table?: Record<string, unknown> }).table ?? response;
    return normalizeTableDetails(table);
  }

  async getPaymentContext(tableId: string, guestId?: string): Promise<PaymentContext> {
    const table = await this.getTableDetails(tableId);
    const amount = table.billing?.total;

    if (amount === undefined) {
      throw new Error('No total amount available for this table.');
    }

    return {
      tableId,
      amount,
      currency: table.billing?.currency,
      guestId,
    };
  }

  async fetchStripeConnectionToken(): Promise<string> {
    this.ensureApiConfigured();

    if (!isStripeConfigured) {
      throw new Error('Stripe location ID is not configured.');
    }

    const response = await this.api.post<Record<string, unknown>>(apiRoutes.stripeConnectionToken, {});
    const token =
      (response as { secret?: string }).secret ||
      (response as { token?: string }).token ||
      (response as { connectionToken?: string }).connectionToken;

    if (!token) {
      throw new Error('Stripe connection token was not returned by the server.');
    }

    return token;
  }

  async fetchPaymentIntentClientSecret(payload: PaymentIntentPayload): Promise<string> {
    this.ensureApiConfigured();
    const response = await this.api.post<Record<string, unknown>>(apiRoutes.paymentIntent, payload);
    const secret =
      (response as { clientSecret?: string }).clientSecret ||
      (response as { client_secret?: string }).client_secret ||
      (response as { secret?: string }).secret;

    if (!secret) {
      throw new Error('Payment intent client secret missing from server response.');
    }

    return secret;
  }

  async updatePaymentStatus(payload: PaymentStatusPayload) {
    await this.executeOrQueue('payment.status', payload, async () => {
      await this.api.post(apiRoutes.paymentStatus(payload.tableId), payload);
    });

    this.emitTableUpdate({ id: payload.tableId, status: payload.status });
  }

  async saveSplitBill(payload: SplitBillPayload) {
    await this.executeOrQueue('split.save', payload, async () => {
      await this.api.post(apiRoutes.splitBill(payload.tableId), payload);
    });
  }

  private setSession(session: Session | null) {
    this.session = session;
    this.api.setAuthToken(session?.token ?? null);
  }

  private connectRealtime() {
    if (!isRealtimeConfigured || !this.session?.token || !this.isOnline) {
      return;
    }

    if (this.realtime.isConnected()) {
      return;
    }

    this.realtime.connect(appConfig.realtimeUrl, this.session.token);

    if (!this.realtimeBound) {
      this.realtimeBound = true;
      this.realtime.on('table.updated', (payload) => this.emitTableUpdate(payload));
      this.realtime.on('table.status', (payload) => this.emitTableUpdate(payload));
      this.realtime.on('payment.updated', (payload) => this.emitTableUpdate(payload));
    }
  }

  private emitTableUpdate(payload: unknown) {
    const update = normalizeTableUpdate(payload);
    if (!update.id) {
      return;
    }

    this.listeners.forEach((listener) => listener(update));
  }

  private ensureApiConfigured() {
    if (!isApiConfigured) {
      throw new Error('API base URL is not configured.');
    }
  }

  private async executeOrQueue(
    type: string,
    payload: unknown,
    executor: () => Promise<void>
  ) {
    if (!this.isOnline) {
      await this.offlineQueue.enqueue(createOfflineAction(type, payload));
      return;
    }

    try {
      await executor();
    } catch (error) {
      if (error instanceof ApiError && error.status) {
        throw error;
      }

      await this.offlineQueue.enqueue(createOfflineAction(type, payload));
      throw error;
    }
  }

  private async flushOfflineQueue() {
    if (!this.isOnline) {
      return;
    }

    await this.offlineQueue.flush(async (action) => {
      switch (action.type) {
        case 'payment.status':
          await this.api.post(
            apiRoutes.paymentStatus((action.payload as PaymentStatusPayload).tableId),
            action.payload
          );
          break;
        case 'split.save':
          await this.api.post(
            apiRoutes.splitBill((action.payload as SplitBillPayload).tableId),
            action.payload
          );
          break;
        default:
          break;
      }
    });
  }
}

const extractArray = (value: unknown, keys: string[]) => {
  if (Array.isArray(value)) {
    return value as Record<string, unknown>[];
  }

  if (value && typeof value === 'object') {
    for (const key of keys) {
      const candidate = (value as Record<string, unknown>)[key];
      if (Array.isArray(candidate)) {
        return candidate as Record<string, unknown>[];
      }
    }
  }

  return [] as Record<string, unknown>[];
};

const toNumber = (value: unknown) => {
  if (typeof value === 'number') {
    return Number.isNaN(value) ? undefined : value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }

  return undefined;
};

const normalizeSession = (response: Record<string, unknown>): Session => {
  const token =
    (response.token as string | undefined) ||
    (response.accessToken as string | undefined) ||
    ((response.session as { token?: string } | undefined)?.token ?? undefined);

  if (!token) {
    throw new Error('Login response did not include a session token.');
  }

  return {
    token,
    serverId:
      (response.serverId as string | undefined) ||
      ((response.server as { id?: string } | undefined)?.id ?? undefined) ||
      ((response.user as { id?: string } | undefined)?.id ?? undefined),
    restaurantId:
      (response.restaurantId as string | undefined) ||
      ((response.restaurant as { id?: string } | undefined)?.id ?? undefined),
    displayName:
      (response.displayName as string | undefined) ||
      ((response.server as { name?: string } | undefined)?.name ?? undefined),
  };
};

const normalizeTableSummary = (raw: Record<string, unknown>): TableSummary => ({
  id: String(raw.id ?? raw.tableId ?? raw.table_id ?? ''),
  tableNo: String(raw.tableNo ?? raw.tableNumber ?? raw.table ?? raw.name ?? ''),
  status: String(raw.status ?? raw.tableStatus ?? raw.state ?? ''),
  amount: toNumber(raw.amount ?? raw.totalAmount ?? raw.orderTotal ?? raw.balanceDue),
  currency:
    (raw.currency as string | undefined) ||
    (raw.orderCurrency as string | undefined) ||
    (raw.currencyCode as string | undefined),
  startedAt:
    (raw.startedAt as string | undefined) ||
    (raw.sessionStartTime as string | undefined) ||
    (raw.createdAt as string | undefined),
  updatedAt:
    (raw.updatedAt as string | undefined) ||
    (raw.lastUpdatedAt as string | undefined) ||
    (raw.updated_at as string | undefined),
  timeLabel: (raw.timeLabel as string | undefined) || (raw.time as string | undefined),
});

const normalizeTableUpdate = (payload: unknown): Partial<TableSummary> & { id: string } => {
  if (!payload || typeof payload !== 'object') {
    return { id: '' };
  }

  const raw = (payload as { table?: Record<string, unknown> }).table ?? (payload as Record<string, unknown>);
  return {
    ...normalizeTableSummary(raw),
    id: String(raw.id ?? raw.tableId ?? raw.table_id ?? ''),
  };
};

const normalizeOrderItem = (raw: Record<string, unknown>) => {
  const qty = toNumber(raw.qty ?? raw.quantity ?? raw.count) ?? 0;
  const unitPrice = toNumber(raw.unitPrice ?? raw.unit_price ?? raw.price);
  const totalPrice = toNumber(raw.totalPrice ?? raw.lineTotal ?? raw.total);

  const price =
    unitPrice ??
    (totalPrice !== undefined && qty > 0 ? totalPrice / qty : totalPrice ?? 0);

  return {
    id: String(raw.id ?? raw.itemId ?? raw.item_id ?? ''),
    name: String(raw.name ?? raw.title ?? raw.itemName ?? ''),
    qty,
    price,
    addOns: (raw.addOns as string[]) ?? (raw.addons as string[]) ?? undefined,
    notes: (raw.notes as string | undefined) ?? (raw.instructions as string | undefined),
    status: (raw.status as string | undefined) ?? (raw.state as string | undefined),
  };
};

const normalizeBilling = (raw?: Record<string, unknown>) => {
  if (!raw) {
    return undefined;
  }

  return {
    subtotal: toNumber(raw.subtotal ?? raw.subTotal ?? raw.sub_total),
    tax: toNumber(raw.tax ?? raw.taxes),
    discount: toNumber(raw.discount ?? raw.discounts),
    serviceCharge: toNumber(raw.serviceCharge ?? raw.service_charge),
    total: toNumber(raw.total ?? raw.grandTotal ?? raw.amount),
    currency: (raw.currency as string | undefined) ?? (raw.currencyCode as string | undefined),
  };
};

const normalizeTableDetails = (raw: Record<string, unknown>): TableDetails => {
  const items = extractArray(raw, ['items', 'orderItems', 'lineItems']);

  return {
    id: String(raw.id ?? raw.tableId ?? raw.table_id ?? ''),
    tableNo: String(raw.tableNo ?? raw.tableNumber ?? raw.table ?? raw.name ?? ''),
    status: String(raw.status ?? raw.tableStatus ?? raw.state ?? ''),
    guestCount: toNumber(raw.guestCount ?? raw.guests ?? raw.partySize ?? raw.party_size),
    sessionStartTime:
      (raw.sessionStartTime as string | undefined) ||
      (raw.startedAt as string | undefined) ||
      (raw.createdAt as string | undefined),
    sessionId: (raw.sessionId as string | undefined) || (raw.qrSessionId as string | undefined),
    items: items.map(normalizeOrderItem),
    billing: normalizeBilling(
      (raw.billing as Record<string, unknown> | undefined) ||
        (raw.totals as Record<string, unknown> | undefined) ||
        (raw.summary as Record<string, unknown> | undefined)
    ),
  };
};

const createOfflineAction = (type: string, payload: unknown): OfflineAction => ({
  id: createId(),
  type,
  payload,
  createdAt: new Date().toISOString(),
});

export const syncService = new SyncService();
