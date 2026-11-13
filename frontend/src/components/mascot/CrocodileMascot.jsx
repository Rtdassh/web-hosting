import React from 'react';

const positions = {
  inline: '',
  'edge-top': 'mascot-edge-top',
  'corner-bottom': 'mascot-corner-bottom',
};
const variants = new Set(['walking', 'peeking', 'inspector', 'clerk', 'sleeping']);

/** Decorative by default. Set alt for meaningful illustrations, src for external art.
 * Absolute positions require a relative parent with visible overflow.
 */
export default function CrocodileMascot({
  variant = 'walking', position = 'inline', src, alt = '', className = '',
}) {
  const pose = variants.has(variant) ? variant : 'walking';
  const sleeping = pose === 'sleeping';
  return (
    <span className={`mascot-brand ${positions[position] || ''} ${className}`}>
      {src ? <img src={src} alt={alt} loading="lazy" /> : (
        <svg viewBox="0 0 200 150" role={alt ? 'img' : undefined} aria-label={alt || undefined}
          aria-hidden={alt ? undefined : true} focusable="false"
          style={{ '--croc-body': 'var(--brand-primary, #28B586)', '--croc-belly': 'var(--brand-light, #CFE4D6)', '--croc-ink': 'var(--brand-ink, #172838)', '--croc-spine': 'var(--brand-deep, #1C7F62)' }}>
          {/* Rounded silhouette, long raised snout and triangular dorsal scales. */}
          <g stroke="var(--croc-ink)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M76 91 60 69 82 73 83 53 101 65 112 49 123 69" fill="var(--croc-spine)" />
            <path d="M84 111C42 145 20 105 12 99c24 11 30-4 44-9" fill="var(--croc-body)" />
            <path d="M57 101c0-21 13-39 37-39 23 0 36 19 36 41s-16 30-38 30-35-13-35-32Z" fill="var(--croc-body)" />
            <path d="M108 85c19 21 15 42-15 45l-10-13c21 0 24-12 25-32Z" fill="var(--croc-belly)" stroke="none" />
            <path d={pose === 'walking' ? 'M72 120 55 133 72 139 90 124M111 121 129 138 144 131 124 114' : 'M72 123 61 136 85 136M112 123 129 136 144 136'} fill="var(--croc-body)" />
            <path d="M91 79c-13-11-14-29-5-40 10-12 25-10 33 2l49-14c12-4 22 3 23 13 1 10-5 17-16 20l-49 15c-7 14-23 17-35 4Z" fill="var(--croc-body)" />
            <path d="m123 69 49-15c-4 14-21 24-46 18" fill="var(--croc-belly)" />
            <path d="m137 57 5 8 5-11m10 8 5-11 4 8" fill="white" stroke="none" />
            <path d={sleeping ? 'M96 47q7 12 14 0' : 'M96 49q7-12 14-1'} fill="none" />
            <path d="m174 36 0 3m9-6 0 3" />
            <path d="M85 88 71 101l-12-4m60-8 17 12 9-6" fill="none" stroke="var(--croc-spine)" strokeWidth="8" />
            {pose === 'peeking' && <path d="M42 121h116M64 120v8m7-9v8m60-7v8m7-9v8" fill="none" />}
            {pose === 'inspector' && <g>
              <path d="M80 36c0-24 38-25 41 0Zm-5 1h52m-26-19v16" fill="var(--croc-belly)" />
              <circle cx="148" cy="91" r="13" fill="var(--brand-soft, #EAF7F1)" />
              <path d="m157 101 12 13m-26-23 4 4 8-9" fill="none" />
            </g>}
            {pose === 'clerk' && <g>
              <path d="M126 82h33v45l-6-4-5 4-6-4-5 4-5-4-6 4Z" fill="var(--brand-soft, #EAF7F1)" />
              <path d="M134 93h17m-17 9h17m-17 9h9" fill="none" stroke="var(--croc-spine)" />
            </g>}
          </g>
          {sleeping && <g>
            {/* Curl the tail around the body, with a quiet closed eye and Z marks. */}
            <path d="M31 110c-4 39 94 39 107 8-25 14-58 15-77 2" fill="var(--croc-body)" stroke="var(--croc-ink)" strokeWidth="3" strokeLinejoin="round" />
            <path d="M48 47h11L48 60h12m-30-39h15L30 38h16" fill="none" stroke="var(--croc-ink)" strokeWidth="3" strokeLinecap="round" />
          </g>}
        </svg>
      )}
    </span>
  );
}
