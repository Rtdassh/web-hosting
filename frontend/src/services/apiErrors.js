// Read only public validation messages; never render or stringify input/ctx values.
export function getApiErrorMessage(error, fallback = 'No se pudo completar la solicitud.') {
  const detail = error?.response?.data?.detail;
  const entries = Array.isArray(detail) ? detail : [detail];
  const messages = entries.map((entry) => {
    if (typeof entry === 'string') return entry;
    if (!entry || typeof entry.msg !== 'string') return null;
    const field = entry.loc?.[entry.loc.length - 1];
    const label = { new_password: 'Contraseña', password: 'Contraseña', token: 'Token', email: 'Correo' }[field];
    if (entry.type === 'string_too_short' && Number.isInteger(entry.ctx?.min_length)) {
      return `${label || 'El campo'} debe tener al menos ${entry.ctx.min_length} caracteres.`;
    }
    if (entry.type === 'string_too_long' && Number.isInteger(entry.ctx?.max_length)) {
      return `${label || 'El campo'} no puede superar ${entry.ctx.max_length} caracteres.`;
    }
    return label ? `${label}: ${entry.msg}` : entry.msg;
  }).filter(Boolean);
  return messages.length ? [...new Set(messages)].join(' ') : fallback;
}

export function getNewPasswordError(password) {
  if (Array.from(password).length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
  if (new TextEncoder().encode(password).length > 72) return 'La contraseña es demasiado larga: no puede superar 72 bytes en UTF-8.';
  return '';
}
