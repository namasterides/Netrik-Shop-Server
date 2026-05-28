type Listener = (payload: unknown) => void;
export type RealtimeStatus = 'connected' | 'disconnected' | 'error';

type StatusListener = (status: RealtimeStatus) => void;

type RealtimeMessage = {
  type: string;
  data?: unknown;
};

const parseMessage = (raw: unknown): RealtimeMessage | null => {
  if (typeof raw !== 'string') {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as RealtimeMessage & { payload?: unknown };
    if (!parsed || typeof parsed.type !== 'string') {
      return null;
    }

    return {
      type: parsed.type,
      data: parsed.data ?? parsed.payload,
    };
  } catch {
    return null;
  }
};

export class RealtimeClient {
  private socket: WebSocket | null = null;
  private listeners = new Map<string, Set<Listener>>();
  private statusListeners = new Set<StatusListener>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private shouldReconnect = true;
  private url = '';
  private token?: string;

  connect(url: string, token?: string) {
    if (this.socket || !url) {
      return;
    }

    this.shouldReconnect = true;
    this.url = url;
    this.token = token;

    const socketUrl = this.buildUrl(url, token);
    this.socket = new WebSocket(socketUrl);

    this.socket.onopen = () => {
      this.reconnectAttempts = 0;
      this.emitStatus('connected');

      if (this.token) {
        this.send({ type: 'auth', token: this.token });
      }
    };

    this.socket.onerror = () => {
      this.emitStatus('error');
    };

    this.socket.onclose = () => {
      this.emitStatus('disconnected');
      this.socket = null;

      if (this.shouldReconnect) {
        this.scheduleReconnect();
      }
    };

    this.socket.onmessage = (event) => {
      const message = parseMessage(event.data);
      if (!message) {
        return;
      }

      const handlers = this.listeners.get(message.type);
      handlers?.forEach((handler) => handler(message.data));
    };
  }

  disconnect() {
    this.shouldReconnect = false;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  isConnected() {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  on(event: string, listener: Listener) {
    const handlers = this.listeners.get(event) ?? new Set<Listener>();
    handlers.add(listener);
    this.listeners.set(event, handlers);

    return () => {
      handlers.delete(listener);
    };
  }

  onStatus(listener: StatusListener) {
    this.statusListeners.add(listener);

    return () => {
      this.statusListeners.delete(listener);
    };
  }

  send(payload: Record<string, unknown>) {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      return;
    }

    this.socket.send(JSON.stringify(payload));
  }

  private emitStatus(status: RealtimeStatus) {
    this.statusListeners.forEach((listener) => listener(status));
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) {
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 15000);
    this.reconnectAttempts += 1;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect(this.url, this.token);
    }, delay);
  }

  private buildUrl(url: string, token?: string) {
    if (!token) {
      return url;
    }

    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}token=${encodeURIComponent(token)}`;
  }
}
