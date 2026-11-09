import { afterEach, describe, expect, it, vi } from 'vitest';
import { getApiBaseUrl } from '../services/api';
afterEach(() => vi.unstubAllEnvs());
describe('API origin configuration', () => {
  it('respects the configured API URL', () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.invalid/api/v1');
    expect(getApiBaseUrl()).toBe('https://api.example.invalid/api/v1');
  });
  it('uses the same-origin proxy', () => {
    vi.stubEnv('VITE_API_URL', '');
    expect(getApiBaseUrl()).toBe('/api/v1');
  });
});
