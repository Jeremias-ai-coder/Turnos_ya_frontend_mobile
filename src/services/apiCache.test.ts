import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

vi.mock('expo-constants', () => ({
  default: { expoConfig: {} },
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

import { MobileClientCache } from './apiCache';

describe('MobileClientCache (Unit Tests)', () => {
  let cache: MobileClientCache;

  beforeEach(() => {
    cache = new MobileClientCache(3);
  });

  it('guarda y recupera valores correctamente', () => {
    cache.set('negocio:1', { nombre: 'Barbería Premium' }, 10);
    const item = cache.get<{ nombre: string }>('negocio:1');
    expect(item).toEqual({ nombre: 'Barbería Premium' });
  });

  it('devuelve null si la clave no existe', () => {
    expect(cache.get('inexistente')).toBeNull();
  });

  it('expira entradas tras cumplirse el TTL', async () => {
    cache.set('temp', { activo: true }, 0.05); // 50ms
    await new Promise((r) => setTimeout(r, 70));
    expect(cache.get('temp')).toBeNull();
  });

  it('desaloja el elemento menos usado (LRU) al superar la capacidad máxima', () => {
    cache.set('c1', 'A', 60);
    cache.set('c2', 'B', 60);
    cache.set('c3', 'C', 60);

    // Accedemos a c1 y c2 para que c3 sea el más antiguo
    cache.get('c1');
    cache.get('c2');

    // Insertamos c4
    cache.set('c4', 'D', 60);

    // c3 debe haber sido desalojado
    expect(cache.get('c3')).toBeNull();
    expect(cache.get('c1')).toBe('A');
    expect(cache.get('c2')).toBe('B');
    expect(cache.get('c4')).toBe('D');
  });

  it('limpia todas las claves con clear()', () => {
    cache.set('k1', 1, 60);
    cache.set('k2', 2, 60);
    cache.clear();
    expect(cache.get('k1')).toBeNull();
    expect(cache.get('k2')).toBeNull();
  });
});
