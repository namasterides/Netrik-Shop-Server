export class ApiError extends Error {
  status?: number;
  details?: unknown;

  constructor(message: string, status?: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

const safeJsonParse = (text: string) => {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

export class ApiClient {
  private baseUrl = '';
  private authToken: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setBaseUrl(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setAuthToken(token: string | null) {
    this.authToken = token;
  }

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (!this.baseUrl) {
      throw new ApiError('API base URL is not configured.');
    }

    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const url = `${this.baseUrl.replace(/\/$/, '')}${normalizedPath}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.authToken) {
      headers.Authorization = `Bearer ${this.authToken}`;
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new ApiError('Network request failed.');
    }

    const text = await response.text();
    const data = text ? safeJsonParse(text) : undefined;

    if (!response.ok) {
      const message =
        (data as { message?: string })?.message || response.statusText || 'Request failed.';
      throw new ApiError(message, response.status, data);
    }

    return (data as T) ?? ({} as T);
  }

  get<T>(path: string) {
    return this.request<T>('GET', path);
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>('POST', path, body);
  }

  put<T>(path: string, body?: unknown) {
    return this.request<T>('PUT', path, body);
  }

  patch<T>(path: string, body?: unknown) {
    return this.request<T>('PATCH', path, body);
  }
}
