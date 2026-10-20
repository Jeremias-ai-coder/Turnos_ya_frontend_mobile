import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as Location from 'expo-location';
import {
  calculateDistanceKm,
  formatDistance,
  requestUserLocation,
  DEFAULT_DEMO_COORDS,
} from './locationHelper';

// Mock del módulo expo-location para ejecutar en Node
vi.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: vi.fn(),
  getCurrentPositionAsync: vi.fn(),
  Accuracy: {
    Balanced: 3,
  },
}));

describe('locationHelper (Unit Tests - Frontend Mobile)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateDistanceKm', () => {
    it('debe calcular la distancia precisa entre Obelisco y Palermo Soho', () => {
      const dist = calculateDistanceKm(
        DEFAULT_DEMO_COORDS.latitude,
        DEFAULT_DEMO_COORDS.longitude,
        -34.5885,
        -58.4285
      );

      expect(dist).toBeGreaterThan(4.2);
      expect(dist).toBeLessThan(5.0);
    });

    it('debe retornar 0 si las coordenadas son idénticas', () => {
      const dist = calculateDistanceKm(-34.6037, -58.3816, -34.6037, -58.3816);
      expect(dist).toBe(0);
    });

    it('debe retornar 0 si los parámetros son inválidos o NaN', () => {
      expect(calculateDistanceKm(NaN, -58.38, -34.60, -58.38)).toBe(0);
      expect(calculateDistanceKm(undefined as any, -58.38, -34.60, -58.38)).toBe(0);
    });
  });

  describe('formatDistance', () => {
    it('debe formatear distancias menores a 1 km en metros', () => {
      expect(formatDistance(0.35)).toBe('350 m');
      expect(formatDistance(0.01)).toBe('50 m');
    });

    it('debe formatear distancias de 1 km o más en kilómetros con un decimal', () => {
      expect(formatDistance(1.23)).toBe('1.2 km');
      expect(formatDistance(3.78)).toBe('3.8 km');
    });

    it('debe retornar string vacío para nulos o indefinidos', () => {
      expect(formatDistance(null)).toBe('');
      expect(formatDistance(undefined)).toBe('');
    });
  });

  describe('requestUserLocation', () => {
    it('debe retornar coordenadas cuando el permiso es concedido', async () => {
      (Location.requestForegroundPermissionsAsync as any).mockResolvedValue({
        status: 'granted',
      });
      (Location.getCurrentPositionAsync as any).mockResolvedValue({
        coords: {
          latitude: -34.6037,
          longitude: -58.3816,
        },
      });

      const result = await requestUserLocation();

      expect(result.status).toBe('granted');
      expect(result.coords).toEqual({
        latitude: -34.6037,
        longitude: -58.3816,
      });
    });

    it('debe retornar status denied cuando el usuario rechaza los permisos de GPS', async () => {
      (Location.requestForegroundPermissionsAsync as any).mockResolvedValue({
        status: 'denied',
      });

      const result = await requestUserLocation();

      expect(result.status).toBe('denied');
      expect(result.coords).toBeNull();
      expect(result.errorMessage).toBe('Permiso de ubicación denegado.');
    });

    it('debe capturar errores de hardware o tiempo de espera', async () => {
      (Location.requestForegroundPermissionsAsync as any).mockResolvedValue({
        status: 'granted',
      });
      (Location.getCurrentPositionAsync as any).mockRejectedValue(
        new Error('GPS timeout')
      );

      const result = await requestUserLocation();

      expect(result.status).toBe('error');
      expect(result.coords).toBeNull();
      expect(result.errorMessage).toBe('GPS timeout');
    });
  });
});
