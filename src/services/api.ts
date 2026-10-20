import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// IP local de la computadora en la red Wi-Fi
const CURRENT_LAN_IP = '192.168.1.71';

/**
 * Obtiene dinámicamente la URL base de la API:
 * 1. Si el usuario definió una URL personalizada en Perfil -> usa esa.
 * 2. Si corre en Web -> http://localhost:3000/api/v1
 * 3. Si corre en Expo Go en un celular físico o emulador -> extrae la IP de hostUri de Expo
 * 4. Fallback -> IP de la red local (192.168.1.71:3000/api/v1)
 */
export const getAutoDetectedBaseUrl = (): string => {
  if (Platform.OS === 'web') {
    return 'http://localhost:3000/api/v1';
  }

  // En Expo Go, hostUri contiene "IP:PUERTO_METRO", por ej. "192.168.1.71:8081"
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const hostIp = hostUri.split(':')[0];
    // Solo usar hostIp si es una IP de LAN real (192.168.x.x), descartando interfaces virtuales como WSL/Hyper-V (172.x)
    if (hostIp && hostIp.startsWith('192.168.')) {
      return `http://${hostIp}:3000/api/v1`;
    }
  }

  // Fallback con la IP fija de la red local para celulares físicos
  return `http://${CURRENT_LAN_IP}:3000/api/v1`;
};

export const STORAGE_KEYS = {
  TOKEN: '@turnosya_token',
  USER: '@turnosya_user',
  API_URL: '@turnosya_api_url',
};

const api = axios.create({
  baseURL: getAutoDetectedBaseUrl(),
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para inyectar token JWT y permitir sobrescribir URL
api.interceptors.request.use(
  async (config) => {
    try {
      const customUrl = await AsyncStorage.getItem(STORAGE_KEYS.API_URL);
      // Validar que la URL personalizada no contenga IPs virtuales de WSL o localhost
      if (
        customUrl &&
        !customUrl.includes('172.27.') &&
        !customUrl.includes('172.17.') &&
        !customUrl.includes('localhost') &&
        !customUrl.includes('10.0.2.2')
      ) {
        config.baseURL = customUrl;
      } else {
        config.baseURL = getAutoDetectedBaseUrl();
      }

      const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // Ignorar fallos de lectura de storage
    }
    console.log(`[API Req] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para manejar expiración de token
api.interceptors.response.use(
  (response) => {
    console.log(`[API Res] ${response.status} ${response.config.url}`);
    return response;
  },
  async (error) => {
    console.warn(
      `[API Err] ${error.config?.baseURL}${error.config?.url} -> ${error.message}`
    );
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      try {
        await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN);
        await AsyncStorage.removeItem(STORAGE_KEYS.USER);
      } catch {
        // no-op
      }
    }
    return Promise.reject(error);
  }
);

export default api;
