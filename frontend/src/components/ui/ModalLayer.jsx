import React, { createContext, useContext, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

const LayerDepth = createContext(0);
const openLayers = [];
let previousOverflow = '';

/** Mount dialogs outside transformed views so they always cover the viewport. */
export default function ModalLayer({ children, className = '', onClose, ...props }) {
  const depth = useContext(LayerDepth) + 1;
  const root = useRef(null);
  const close = useRef(onClose);
  close.current = onClose;
  const titleId = useId();
  useEffect(() => {
    const element = root.current;
    const previousFocus = document.activeElement;
    if (!openLayers.length) { previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; }
    openLayers.push(element);
    openLayers.sort((a, b) => Number(a.dataset.modalDepth) - Number(b.dataset.modalDepth));
    element.style.zIndex = String(60 + depth * 10);
    const heading = element.querySelector('h1,h2,h3');
    if (heading) { if (!heading.id) heading.id = titleId; element.setAttribute('aria-labelledby', heading.id); }
    const focusable = () => [...element.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]')].filter((node) => !node.closest('[hidden]'));
    if (openLayers.at(-1) === element) (focusable()[0] || element).focus();
    const handleKey = (event) => {
      if (openLayers.at(-1) !== element) return;
      if (event.key === 'Escape' && close.current) { event.preventDefault(); event.stopPropagation(); close.current(); }
      if (event.key === 'Tab') {
        const nodes = focusable(); const first = nodes[0]; const last = nodes.at(-1);
        if (!nodes.length) { event.preventDefault(); element.focus(); }
        else if (event.shiftKey && (document.activeElement === first || !element.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || !element.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      const index = openLayers.indexOf(element); if (index >= 0) openLayers.splice(index, 1);
      if (!openLayers.length) document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [titleId, depth]);
  return createPortal(<div ref={root} data-modal-depth={depth} role="dialog" aria-modal="true" tabIndex={-1} className={`fixed inset-0 flex items-center justify-center bg-navy-900/30 p-4 outline-none ${className}`} {...props}><LayerDepth.Provider value={depth}>{children}</LayerDepth.Provider></div>, document.body);
}
