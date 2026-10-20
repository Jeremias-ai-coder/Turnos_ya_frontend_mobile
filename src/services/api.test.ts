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

    it('debe detectar dinámicamente la IP de la LAN desde hostUri en dispositivos móviles', () => {
      Platform.OS = 'android';
      (Constants as any).expoConfig = {
        hostUri: '192.168.1.45:8081',
      };

      expect(getAutoDetectedBaseUrl()).toBe('http://192.168.1.45:3000/api/v1');
    });

    it('debe ignorar IPs virtuales de WSL/Hyper-V (172.x) y caer en el fallback LAN', () => {
      Platform.OS = 'android';
      (Constants as any).expoConfig = {
        hostUri: '172.27.16.1:8081',
      };

      expect(getAutoDetectedBaseUrl()).toBe('http://192.168.1.71:3000/api/v1');
    });

    it('debe usar el fallback de red local cuando hostUri está ausente', () => {
      Platform.OS = 'android';
      (Constants as any).expoConfig = {};

      expect(getAutoDetectedBaseUrl()).toBe('http://192.168.1.71:3000/api/v1');
    });
  });
});
