/**
 * Sistema de Caché Inteligente en Memoria para la App Móvil (LRU + TTL)
 * 
 * Optimiza la experiencia móvil reduciendo el consumo de datos celulares y latencia,
 * cacheando peticiones GET frecuentes (categorías, comercios, detalles).
 */

import api from './api';

interface CacheEntry<T = any> {
  data: T;
  expiresAt: number;
  lastAccessed: number;
}

export class MobileClientCache {
  private cache: Map<string, CacheEntry> = new Map();
  private maxEntries: number;
  private accessCounter: number = 0;

  constructor(maxEntries: number = 100) {
    this.maxEntries = maxEntries;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    entry.lastAccessed = ++this.accessCounter;
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlSeconds: number = 120): void {
    if (this.cache.size >= this.maxEntries && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
      lastAccessed: ++this.accessCounter,
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.accessCounter = 0;
  }

  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestAccess = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestAccess) {
        oldestAccess = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
}

export const mobileCache = new MobileClientCache(120);

/**
 * Realiza un GET con caché en memoria.
 * Si ya existe y está vigente, devuelve los datos instantáneamente sin tocar la red.
 */
export async function cachedGet<T = any>(
  url: string,
  options?: { ttlSeconds?: number; forceRefresh?: boolean }
): Promise<{ data: T; fromCache: boolean }> {
  const ttl = options?.ttlSeconds ?? 120;
  const force = options?.forceRefresh ?? false;

  if (!force) {
    const cached = mobileCache.get<T>(url);
    if (cached !== null) {
      return { data: cached, fromCache: true };
    }
  }

  const res = await api.get<T>(url);
  mobileCache.set(url, res.data, ttl);
  return { data: res.data, fromCache: false };
}
