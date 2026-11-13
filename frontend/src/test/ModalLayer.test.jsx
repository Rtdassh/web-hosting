import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ModalLayer from '../components/ui/ModalLayer';

it('monta el diálogo en body fuera de la vista animada y sin desenfoque', () => {
  const { container, unmount } = render(<div style={{ transform: 'translateY(0)' }}><ModalLayer><h2>Estado</h2><button>Cerrar</button></ModalLayer></div>);
  const dialog = screen.getByRole('dialog', { name: 'Estado' });
  expect(dialog.parentElement).toBe(document.body);
  expect(container).not.toContainElement(dialog);
  expect(dialog.className).not.toMatch(/backdrop-blur/);
  expect(document.body.style.overflow).toBe('hidden');
  unmount();
  expect(document.body.style.overflow).not.toBe('hidden');
});
it('mantiene el foco y devuelve el foco al botón de origen', () => {
  const origin = document.createElement('button'); document.body.appendChild(origin); origin.focus();
  const close = vi.fn();
  const { unmount } = render(<ModalLayer onClose={close}><h2>Logs</h2><button>Primero</button><button>Último</button></ModalLayer>);
  const first = screen.getByText('Primero'); const last = screen.getByText('Último');
  expect(first).toHaveFocus();
  last.focus(); fireEvent.keyDown(document, { key: 'Tab' }); expect(first).toHaveFocus();
  fireEvent.keyDown(document, { key: 'Tab', shiftKey: true }); expect(last).toHaveFocus();
  fireEvent.keyDown(document, { key: 'Escape' }); expect(close).toHaveBeenCalledOnce();
  unmount(); expect(origin).toHaveFocus(); origin.remove();
});
it('solo el diálogo superior procesa Escape y conserva el bloqueo al cerrar uno anidado', () => {
  const outerClose = vi.fn(); const innerClose = vi.fn();
  const { rerender, unmount } = render(<ModalLayer onClose={outerClose}><h2>Exterior</h2><ModalLayer onClose={innerClose}><h2>Interior</h2><button>Confirmar</button></ModalLayer></ModalLayer>);
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(innerClose).toHaveBeenCalledOnce(); expect(outerClose).not.toHaveBeenCalled();
  rerender(<ModalLayer onClose={outerClose}><h2>Exterior</h2><button>Cerrar</button></ModalLayer>);
  expect(document.body.style.overflow).toBe('hidden');
  unmount(); expect(document.body.style.overflow).not.toBe('hidden');
});
