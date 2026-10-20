import { describe, it, expect } from 'vitest';
import {
  formatTimeToHHMM,
  toISOTimeString,
  getHoursUntilAppointment,
  getEffectiveDurationMinutes,
  generateSlotsForSchedule,
} from './timeHelper';

describe('timeHelper (Unit Tests - Frontend Mobile)', () => {
  describe('formatTimeToHHMM', () => {
    it('debe extraer HH:mm de strings ISO completos en UTC', () => {
      expect(formatTimeToHHMM('1970-01-01T16:00:00.000Z')).toBe('16:00');
      expect(formatTimeToHHMM('2026-10-15T08:30:00.000Z')).toBe('08:30');
    });

    it('debe manejar strings directos en formato 24hs', () => {
      expect(formatTimeToHHMM('9:00')).toBe('09:00');
      expect(formatTimeToHHMM('14:45')).toBe('14:45');
    });

    it('debe retornar "--:--" para valores vacíos o nulos', () => {
      expect(formatTimeToHHMM(null)).toBe('--:--');
      expect(formatTimeToHHMM(undefined)).toBe('--:--');
      expect(formatTimeToHHMM('')).toBe('--:--');
    });
  });

  describe('toISOTimeString', () => {
    it('debe convertir un formato HH:mm a ISO UTC con fecha base 1970', () => {
      expect(toISOTimeString('15:30')).toBe('1970-01-01T15:30:00.000Z');
      expect(toISOTimeString('09:00')).toBe('1970-01-01T09:00:00.000Z');
    });

    it('debe retornar 1970-01-01T00:00:00.000Z si el formato es inválido', () => {
      expect(toISOTimeString('')).toBe('1970-01-01T00:00:00.000Z');
    });
  });

  describe('getEffectiveDurationMinutes', () => {
    it('debe redondear al múltiplo de 30 minutos superior', () => {
      expect(getEffectiveDurationMinutes(20)).toBe(30);
      expect(getEffectiveDurationMinutes(30)).toBe(30);
      expect(getEffectiveDurationMinutes(45)).toBe(60);
      expect(getEffectiveDurationMinutes(75)).toBe(90);
    });

    it('debe retornar 30 minutos si se provee un valor menor o igual a cero', () => {
      expect(getEffectiveDurationMinutes(0)).toBe(30);
      expect(getEffectiveDurationMinutes(-15)).toBe(30);
    });
  });

  describe('generateSlotsForSchedule', () => {
    it('debe generar los slots de 30 minutos disponibles entre inicio y fin', () => {
      const slots = generateSlotsForSchedule('09:00', '11:00', 30);
      expect(slots).toEqual(['09:00', '09:30', '10:00', '10:30']);
    });

    it('debe considerar la duración efectiva del servicio para no exceder el fin', () => {
      // Con servicio de 45 min (efectivo: 60 min), el último turno posible para terminar a las 11:00 es a las 10:00
      const slots = generateSlotsForSchedule('09:00', '11:00', 45);
      expect(slots).toEqual(['09:00', '09:30', '10:00']);
    });

    it('debe retornar un array vacío si la hora de inicio es posterior a la de fin', () => {
      const slots = generateSlotsForSchedule('18:00', '15:00', 30);
      expect(slots).toEqual([]);
    });

    it('debe retornar un array vacío si las horas provistas son inválidas', () => {
      const slots = generateSlotsForSchedule('invalido', '12:00', 30);
      expect(slots).toEqual([]);
    });
  });

  describe('getHoursUntilAppointment', () => {
    it('debe calcular horas positivas para un turno futuro', () => {
      const future = new Date(Date.now() + 5 * 60 * 60 * 1000);
      const dateStr = `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, '0')}-${String(future.getDate()).padStart(2, '0')}`;
      const timeStr = `${String(future.getHours()).padStart(2, '0')}:${String(future.getMinutes()).padStart(2, '0')}`;

      const hours = getHoursUntilAppointment(dateStr, timeStr);
      expect(hours).toBeGreaterThan(4);
      expect(hours).toBeLessThanOrEqual(6);
    });
  });
});
