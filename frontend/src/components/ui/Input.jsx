import React, { forwardRef } from 'react';

/** Associate a visible label using id/htmlFor in the consuming form. */
const Input = forwardRef(function Input({ className = '', type = 'text', ...props }, ref) {
  return <input {...props} ref={ref} type={type} className={`input-brand brand-focus ${className}`} />;
});

export default Input;
