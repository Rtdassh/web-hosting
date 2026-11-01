import { describe, it, expect } from 'vitest';
import {
  validateLuhn,
  detectCardBrand,
  formatCardNumber
} from '../types/contracts_80_100';
import { getResourceAlertLevel } from '../types/contracts';

describe('Contracts & Helper Utilities (Hito 80%)', () => {
  describe('validateLuhn', () => {
    it('debe validar exitosamente números de tarjeta con checksum válido', () => {
      // Visa
      expect(validateLuhn('4532015112830366')).toBe(true);
      expect(validateLuhn('4532 0151 1283 0366')).toBe(true);
      // Mastercard
      expect(validateLuhn('5425233430109903')).toBe(true);
      // American Express
      expect(validateLuhn('378282246310005')).toBe(true);
    });

    it('debe rechazar números de tarjeta con checksum alterado o inválido', () => {
      expect(validateLuhn('4532015112830367')).toBe(false);
      expect(validateLuhn('5425233430109904')).toBe(false);
      expect(validateLuhn('0000000000000001')).toBe(false);
    });

    it('debe rechazar cadenas cortas o fuera de rango', () => {
      expect(validateLuhn('')).toBe(false);
      expect(validateLuhn('12345')).toBe(false);
      expect(validateLuhn('123456789012345678901')).toBe(false);
    });
  });

  describe('detectCardBrand', () => {
    it('debe detectar Visa por prefijo 4', () => {
      expect(detectCardBrand('4532015112830366')).toBe('Visa');
    });

    it('debe detectar Mastercard por rango 51-55 o 2221-2720', () => {
      expect(detectCardBrand('5425233430109903')).toBe('Mastercard');
      expect(detectCardBrand('2221000000000000')).toBe('Mastercard');
    });

    it('debe detectar American Express por prefijo 34 o 37', () => {
      expect(detectCardBrand('378282246310005')).toBe('American Express');
      expect(detectCardBrand('348282246310005')).toBe('American Express');
    });

    it('debe retornar Desconocida ante prefijos no identificados', () => {
      expect(detectCardBrand('6011000000000000')).toBe('Desconocida');
    });
  });

  describe('formatCardNumber', () => {
    it('debe formatear dígitos en bloques de 4 separados por espacios', () => {
      expect(formatCardNumber('4532015112830366')).toBe('4532 0151 1283 0366');
    });

    it('debe preservar formato parcial durante la escritura', () => {
      expect(formatCardNumber('453201')).toBe('4532 01');
    });
  });

  describe('getResourceAlertLevel', () => {
    it('debe clasificar niveles de alerta de consumo según los umbrales definidos', () => {
      expect(getResourceAlertLevel(45)).toBe('normal');
      expect(getResourceAlertLevel(72)).toBe('warning');
      expect(getResourceAlertLevel(95)).toBe('critical');
    });
  });
});
