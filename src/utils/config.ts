import Constants from 'expo-constants';

type ExtraConfig = {
  apiBaseUrl?: string;
  realtimeUrl?: string;
  stripeLocationId?: string;
  stripeSimulated?: boolean;
  defaultRestaurantCode?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as ExtraConfig;

const normalizeString = (value: unknown) =>
  typeof value === 'string' ? value.trim() : '';

const normalizeBoolean = (value: unknown, fallback = false) =>
  typeof value === 'boolean' ? value : fallback;

export const appConfig = {
  apiBaseUrl: normalizeString(extra.apiBaseUrl),
  realtimeUrl: normalizeString(extra.realtimeUrl),
  stripeLocationId: normalizeString(extra.stripeLocationId),
  stripeSimulated: normalizeBoolean(extra.stripeSimulated, false),
  defaultRestaurantCode: normalizeString(extra.defaultRestaurantCode),
};

export const isApiConfigured = appConfig.apiBaseUrl.length > 0;
export const isRealtimeConfigured = appConfig.realtimeUrl.length > 0;
export const isStripeConfigured = appConfig.stripeLocationId.length > 0;
