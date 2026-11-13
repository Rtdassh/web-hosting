import React from 'react';
import { act, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import SiteHealthNotifications from '../components/instances/SiteHealthNotifications';
import { instanceService } from '../services/api';
import { toast } from '../components/ui/Toast';

vi.mock('../services/api', () => ({ instanceService: { getHealth: vi.fn() } }));
vi.mock('../components/ui/Toast', () => ({ toast: { warning: vi.fn(), success: vi.fn() } }));
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });

it('avisa una vez por caída y notifica recuperación sin confundir fallos de consulta', async () => {
  vi.useFakeTimers();
  const site = (status) => [{ id: 1, name: 'Mi sitio', monitor: { stale: false, latest: { status } } }];
  instanceService.getHealth.mockResolvedValueOnce(site('down')).mockResolvedValueOnce(site('down'))
    .mockRejectedValueOnce(new Error('network')).mockResolvedValue(site('up'));
  const { unmount } = render(<SiteHealthNotifications />);
  await act(async () => {});
  expect(toast.warning).toHaveBeenCalledOnce();
  await act(async () => { await vi.advanceTimersByTimeAsync(60000); });
  expect(toast.warning).toHaveBeenCalledOnce();
  expect(toast.success).not.toHaveBeenCalled();
  await act(async () => { await vi.advanceTimersByTimeAsync(30000); });
  expect(toast.success).toHaveBeenCalledOnce();
  unmount();
  await vi.advanceTimersByTimeAsync(30000);
  expect(instanceService.getHealth).toHaveBeenCalledTimes(4);
});
