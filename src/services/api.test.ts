import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { getAutoDetectedBaseUrl, STORAGE_KEYS } from './api';

// Mocks para simular variables del entorno de ejecución de Expo y React Native
vi.mock('react-native', () => ({
  Platform: {
    OS: 'android',
  },
}));

vi.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      hostUri: undefined,
    },
  },
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

describe('api service and URL resolution (Unit Tests - Frontend Mobile)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Platform.OS = 'android';
    Constants.expoConfig = { hostUri: undefined } as any;
  });

  describe('STORAGE_KEYS', () => {
    it('debe tener definidas las claves constantes de AsyncStorage', () => {
      expect(STORAGE_KEYS.TOKEN).toBe('@turnosya_token');
      expect(STORAGE_KEYS.USER).toBe('@turnosya_user');
      expect(STORAGE_KEYS.API_URL).toBe('@turnosya_api_url');
    });
  });

  describe('getAutoDetectedBaseUrl', () => {
    it('debe retornar localhost:3000 cuando la plataforma es Web', () => {
      Platform.OS = 'web';
      expect(getAutoDetectedBaseUrl()).toBe('http://localhost:3000/api/v1');
    });

    it('debe retornar CLOUD_API_URL por defecto en dispositivos móviles para compatibilidad 4G/Wi-Fi', () => {
      Platform.OS = 'android';
      expect(getAutoDetectedBaseUrl()).toBe('https://turnos-ya-backend-api.onrender.com/api/v1');
    });

    it('debe retornar CLOUD_API_URL en iOS para evitar problemas de firewall local', () => {
      Platform.OS = 'ios';
      expect(getAutoDetectedBaseUrl()).toBe('https://turnos-ya-backend-api.onrender.com/api/v1');
    });
  });
});
