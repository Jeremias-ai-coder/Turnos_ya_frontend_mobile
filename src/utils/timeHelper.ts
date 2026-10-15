/**
 * Utilidades centralizadas para manejo de horas de reloj (Wall-clock time)
 * Evita desplazamientos indeseados causados por la zona horaria del dispositivo móvil.
 */

export function formatTimeToHHMM(timeInput: string | Date | null | undefined): string {
  if (!timeInput) return '--:--';

  if (timeInput instanceof Date) {
    if (isNaN(timeInput.getTime())) return '--:--';
    const hours = String(timeInput.getUTCHours()).padStart(2, '0');
    const minutes = String(timeInput.getUTCMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  const str = String(timeInput).trim();

  if (str.includes('T')) {
    const timePart = str.split('T')[1];
    const match = timePart.match(/^(\d{1,2}):(\d{2})/);
    if (match) {
      return `${match[1].padStart(2, '0')}:${match[2]}`;
    }
  }

  const match = str.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    return `${match[1].padStart(2, '0')}:${match[2]}`;
  }

  return str;
}

export function toISOTimeString(timeStr: string): string {
  const formatted = formatTimeToHHMM(timeStr);
  if (formatted === '--:--') return '1970-01-01T00:00:00.000Z';
  return `1970-01-01T${formatted}:00.000Z`;
}

export function getHoursUntilAppointment(dateStr: string, timeStr: string): number {
  try {
    const datePart = dateStr.split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    const timeFormatted = formatTimeToHHMM(timeStr);
    const [hours, minutes] = timeFormatted.split(':').map(Number);

    const startLocal = new Date(year, month - 1, day, hours || 0, minutes || 0, 0);
    const now = new Date();
    return (startLocal.getTime() - now.getTime()) / (1000 * 60 * 60);
  } catch {
    return 0;
  }
}

export function getEffectiveDurationMinutes(durationMinutes: number = 30): number {
  const duration = Number(durationMinutes) || 30;
  if (duration <= 0) return 30;
  return Math.max(30, Math.ceil(duration / 30) * 30);
}

export function generateSlotsForSchedule(
  startTimeStr: string,
  endTimeStr: string,
  durationMinutes: number = 30
): string[] {
  const startFormatted = formatTimeToHHMM(startTimeStr);
  const endFormatted = formatTimeToHHMM(endTimeStr);

  if (startFormatted === '--:--' || endFormatted === '--:--') return [];

  const [startH, startM] = startFormatted.split(':').map(Number);
  const [endH, endM] = endFormatted.split(':').map(Number);

  const startTotalM = startH * 60 + startM;
  const endTotalM = endH * 60 + endM;

  const effectiveDuration = getEffectiveDurationMinutes(durationMinutes);
  const step = 30;
  const slots: string[] = [];

  for (let m = startTotalM; m + effectiveDuration <= endTotalM; m += step) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
  }

  return slots;
}
