import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Session } from '@/types/server';

const SESSION_KEY = 'netrik.session';
export const saveSession = async (session: Session) => {
  const payload = JSON.stringify(session);

  if (await SecureStore.isAvailableAsync()) {
    await SecureStore.setItemAsync(SESSION_KEY, payload);
  } else {
    await AsyncStorage.setItem(SESSION_KEY, payload);
  }
};

export const loadSession = async (): Promise<Session | null> => {
  let raw: string | null = null;
  if (await SecureStore.isAvailableAsync()) {
    raw = await SecureStore.getItemAsync(SESSION_KEY);
  } else {
    raw = await AsyncStorage.getItem(SESSION_KEY);
  }

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
};

export const clearSession = async () => {
  if (await SecureStore.isAvailableAsync()) {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  }

  await AsyncStorage.removeItem(SESSION_KEY);
};
