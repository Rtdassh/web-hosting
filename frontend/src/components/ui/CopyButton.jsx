import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export default function CopyButton({
  textToCopy,
  label = 'Copiar',
  successLabel = '¡Copiado!',
  className = '',
  iconOnly = false,
  title = 'Copiar al portapapeles',
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    e.stopPropagation();
    if (!textToCopy) return;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch (err) {
      console.warn('No se pudo copiar:', err);
    }
  };

  return (
    <button
      type="button"
      title={title}
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition duration-150 btn-tactile cursor-pointer select-none ${
        copied
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm'
          : 'bg-white hover:bg-slate-50 text-slate-600 hover:text-navy-900 border border-slate-200'
      } ${className}`}
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-emerald-600 scale-pop-in shrink-0" />
          {!iconOnly && <span className="scale-pop-in">{successLabel}</span>}
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          {!iconOnly && <span>{label}</span>}
        </>
      )}
    </button>
  );
}

