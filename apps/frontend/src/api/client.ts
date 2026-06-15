const BASE = import.meta.env.VITE_CRM_API_URL || 'http://localhost:4000';

export const globalCache: Record<string, any> = {};

export const api = {
  get: async <T>(path: string): Promise<T> => {
    const res = await fetch(`${BASE}${path}`);
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    globalCache[path] = data; // Update cache
    return data;
  },
  post: async <T>(path: string, body: unknown): Promise<T> => {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  del: async (path: string): Promise<void> => {
    const res = await fetch(`${BASE}${path}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(await res.text());
  },
  getCached: <T>(path: string): T | undefined => {
    return globalCache[path] as T;
  }
};
