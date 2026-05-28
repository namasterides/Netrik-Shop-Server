import AsyncStorage from '@react-native-async-storage/async-storage';

export type OfflineAction = {
  id: string;
  type: string;
  payload: unknown;
  createdAt: string;
};

export class OfflineQueue {
  private storageKey: string;
  private queue: OfflineAction[] = [];

  constructor(storageKey: string) {
    this.storageKey = storageKey;
  }

  async load() {
    const raw = await AsyncStorage.getItem(this.storageKey);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as OfflineAction[];
      if (Array.isArray(parsed)) {
        this.queue = parsed;
      }
    } catch {
      this.queue = [];
    }
  }

  async enqueue(action: OfflineAction) {
    this.queue.push(action);
    await this.persist();
  }

  async flush(executor: (action: OfflineAction) => Promise<void>) {
    const remaining: OfflineAction[] = [];

    for (const action of this.queue) {
      try {
        await executor(action);
      } catch {
        remaining.push(action);
        break;
      }
    }

    this.queue = remaining;
    await this.persist();
  }

  private async persist() {
    await AsyncStorage.setItem(this.storageKey, JSON.stringify(this.queue));
  }
}
