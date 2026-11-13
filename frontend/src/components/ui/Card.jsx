import React from 'react';

/** Use interactive only for cards containing an action; the surface stays semantic. */
export default function Card({ children, header, accent = false, interactive = false, className = '', ...props }) {
  return (
    <div {...props} data-interactive={interactive} className={`card-tactile relative ${className}`}>
      {accent && <div aria-hidden="true" className="accent-stripes rounded-t-[15px]" />}
      {header && <div className="bg-brand-stripes-subtle rounded-t-[15px] border-b border-brand-100 px-5 py-4 font-semibold text-navy-900">{header}</div>}
      <div className="p-5">{children}</div>
    </div>
  );
}
