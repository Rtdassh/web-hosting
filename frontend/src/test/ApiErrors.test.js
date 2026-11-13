import { expect, it } from 'vitest';
import { getApiErrorMessage, getNewPasswordError } from '../services/apiErrors';

it('acepta strings, listas y objetos sin serializar valores privados', () => {
  const error = (detail) => ({ response: { data: { detail } } });
  expect(getApiErrorMessage(error('Token expirado'))).toBe('Token expirado');
  expect(getApiErrorMessage(error({ msg: 'Valor inválido', input: 'secret' }))).toBe('Valor inválido');
  expect(getApiErrorMessage(error([{ msg: 'Uno' }, { msg: 'Dos' }]))).toBe('Uno Dos');
  expect(getApiErrorMessage(error({ input: 'secret' }), 'Error seguro')).toBe('Error seguro');
  expect(getApiErrorMessage(new Error('network'), 'Sin conexión')).toBe('Sin conexión');
});

it('respeta el mínimo de 8 caracteres y el límite de 72 bytes de bcrypt', () => {
  expect(getNewPasswordError('1234567')).not.toBe('');
  expect(getNewPasswordError('a'.repeat(72))).toBe('');
  expect(getNewPasswordError('a'.repeat(73))).not.toBe('');
  expect(getNewPasswordError('🔒'.repeat(18))).toBe('');
  expect(getNewPasswordError('🔒'.repeat(19))).not.toBe('');
});
