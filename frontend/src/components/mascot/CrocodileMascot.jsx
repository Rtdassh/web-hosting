import React from 'react';
import walking from '../../assets/mascot/brand-walking.png';
import peeking from '../../assets/mascot/brand-peeking.png';
import inspector from '../../assets/mascot/brand-inspector.png';
import clerk from '../../assets/mascot/brand-clerk.png';
import sleeping from '../../assets/mascot/brand-sleeping.png';

const positions = {
  inline: '',
  'edge-top': 'mascot-edge-top',
  'corner-bottom': 'mascot-corner-bottom',
};
const artwork = { walking, peeking, inspector, clerk, sleeping };

/** Original-character raster variations generated from the Codrop references.
 * Decorative by default. Set alt when meaningful, src for custom artwork.
 * Absolute positions require a relative parent with visible overflow.
 */
export default function CrocodileMascot({
  variant = 'walking', position = 'inline', src, alt = '', className = '',
}) {
  return (
    <span className={`mascot-brand ${positions[position] || ''} ${className}`}>
      <img src={src || artwork[variant] || artwork.walking} alt={alt}
        loading="lazy" decoding="async" draggable={false} />
    </span>
  );
}
