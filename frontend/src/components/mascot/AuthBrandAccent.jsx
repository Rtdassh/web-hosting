import React from 'react';
import CrocodileMascot from './CrocodileMascot';

/** The parent reserves space above its card and keeps overflow visible. */
export default function AuthBrandAccent() {
  return (
    <>
      <div aria-hidden="true" className="accent-stripes absolute inset-x-0 top-0 rounded-t-[inherit]" />
      <div className="pointer-events-none absolute bottom-full right-6 h-11 w-24 overflow-hidden" aria-hidden="true">
        <CrocodileMascot variant="peeking" className="absolute top-0 right-0 !w-24" />
      </div>
    </>
  );
}
