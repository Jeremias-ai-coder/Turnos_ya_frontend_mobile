import * as Location from 'expo-location';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

// Ubicación de referencia en el centro de CABA (Obelisco / Microcentro)
// Usada como respaldo en caso de emuladores o si el usuario no otorga permisos de GPS
export const DEFAULT_DEMO_COORDS: Coordinates = {
  latitude: -34.6037,
  longitude: -58.3816,
};

/**
 * Calcula la distancia en línea recta en kilómetros entre dos coordenadas
 * utilizando la fórmula de Haversine.
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (
    typeof lat1 !== 'number' ||
    typeof lon1 !== 'number' ||
    typeof lat2 !== 'number' ||
    typeof lon2 !== 'number' ||
    isNaN(lat1) ||
    isNaN(lon1) ||
    isNaN(lat2) ||
    isNaN(lon2)
  ) {
    return 0;
  }

  const R = 6371; // Radio de la Tierra en kilómetros
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Formatea una distancia en kilómetros a un texto legible para el usuario
 * Ejemplos: "450 m" si es menor a 1 km, "2.4 km" si es mayor o igual.
 */
export function formatDistance(km: number | null | undefined): string {
  if (km === null || km === undefined || isNaN(km)) return '';
  if (km < 1) {
    const meters = Math.max(50, Math.round(km * 1000));
    return `${meters} m`;
  }
  return `${km.toFixed(1)} km`;
}

/**
 * Solicita permisos de ubicación al sistema operativo y obtiene las coordenadas actuales del usuario.
 */
export async function requestUserLocation(): Promise<{
  coords: Coordinates | null;
  status: 'granted' | 'denied' | 'error';
  errorMessage?: string;
}> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return {
        coords: null,
        status: 'denied',
        errorMessage: 'Permiso de ubicación denegado.',
      };
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      coords: {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      },
      status: 'granted',
    };
  } catch (error: any) {
    return {
      coords: null,
      status: 'error',
      errorMessage: error?.message || 'No se pudo obtener la ubicación actual.',
    };
  }
}
