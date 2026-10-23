/**
 * @file Contratos de Integración y Tipos DTO (Hitos 80% y 100% - CloudPaaS)
 * Define las interfaces compartidas entre Frontend y Backend para:
 * - Facturación, Suscripciones y Validación Algoritmo de Luhn (RF-07, RF-08, RF-09, RF-10, RF-11)
 * - Plantillas en 1 Clic (RF-14)
 * - Panel de Gobernanza y Supervisión Global para Administradores (RF-22, RF-23)
 * - Flujo de Recuperación de Contraseña y Verificación de Correo (RF-02, RF-05)
 */

/**
 * Validación matemática del Algoritmo de Luhn (Módulo 10) en el cliente.
 * Proporciona retroalimentación instantánea antes de enviar la transacción.
 * @param {string} cardNumber - Número de tarjeta sin espacios ni guiones
 * @returns {boolean} true si el checksum es matemáticamente válido
 */
export const validateLuhn = (cardNumber) => {
  const digits = cardNumber.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;

  let sum = 0;
  let shouldDouble = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits.charAt(i), 10);

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
};

/**
 * Identifica la franquicia de la tarjeta según los prefijos bancarios estándar.
 * @param {string} cardNumber
 * @returns {'Visa' | 'Mastercard' | 'American Express' | 'Desconocida'}
 */
export const detectCardBrand = (cardNumber) => {
  const clean = cardNumber.replace(/\D/g, '');
  if (clean.startsWith('4')) return 'Visa';
  if (/^5[1-5]/.test(clean) || (clean.length >= 4 && parseInt(clean.slice(0, 4), 10) >= 2221 && parseInt(clean.slice(0, 4), 10) <= 2720)) {
    return 'Mastercard';
  }
  if (/^3[47]/.test(clean)) return 'American Express';
  return 'Desconocida';
};

/**
 * Formatea un número de tarjeta añadiendo un espacio cada 4 dígitos.
 * @param {string} value
 * @returns {string}
 */
export const formatCardNumber = (value) => {
  const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
  const matches = v.match(/\d{4,16}/g);
  const match = (matches && matches[0]) || '';
  const parts = [];

  for (let i = 0, len = match.length; i < len; i += 4) {
    parts.push(match.substring(i, i + 4));
  }

  if (parts.length) {
    return parts.join(' ');
  } else {
    return value;
  }
};

/**
 * @typedef {Object} PlanDTO
 * @property {number} id - Identificador único del plan
 * @property {string} name - Nombre del plan (Free, Developer, Pro)
 * @property {string} description - Descripción comercial
 * @property {number} price - Costo mensual simulado en USD
 * @property {number} max_instances - Límite de sitios activos permitidos
 * @property {number} max_ram_mb - Límite estricto de memoria RAM por contenedor
 * @property {number} cpu_quota - Porcentaje asignado de CPU (ej. 0.25, 0.50, 1.0)
 * @property {boolean} is_active - Disponibilidad en catálogo
 */

/**
 * @typedef {Object} CheckoutPayloadDTO
 * @property {number} plan_id - ID del plan a contratar
 * @property {string} card_holder - Nombre del titular
 * @property {string} card_number - 16 dígitos validados con Luhn
 * @property {number} exp_month - Mes de expiración (1-12)
 * @property {number} exp_year - Año de expiración (YYYY)
 * @property {string} cvv - Código de seguridad (3-4 dígitos)
 */

/**
 * @typedef {Object} TransactionReceiptDTO
 * @property {number} transaction_id - Identificador de transacción
 * @property {string} status - Estado ('approved', 'rejected')
 * @property {string} auth_code - Código de autorización ('AUTH-XXXXXX')
 * @property {string} plan_name - Nombre del plan contratado
 * @property {number} amount_charged - Monto cargado
 * @property {string} card_last_four - Últimos cuatro dígitos
 * @property {string} card_brand - Franquicia de la tarjeta
 * @property {string} invoice_number - Número de factura electrónica ('INV-2026-XXXX')
 * @property {Object} new_quota - Nuevas cuotas asignadas en el perfil
 * @property {string} timestamp - Fecha y hora UTC
 */

/**
 * @typedef {Object} TemplateDTO
 * @property {string} id - Identificador de la plantilla ('landing-business', 'personal-portfolio', 'html5-docs')
 * @property {string} name - Título descriptivo
 * @property {string} description - Resumen de características
 * @property {string} category - Categoría ('Negocios', 'Personal', 'Documentación')
 * @property {string} preview_url - URL de vista previa
 */

/**
 * @typedef {Object} AdminDashboardDTO
 * @property {Object} summary
 * @property {number} summary.total_users - Total de clientes registrados
 * @property {number} summary.total_revenue_simulated - Ingresos acumulados (MRR)
 * @property {number} summary.total_instances - Total histórico de instancias
 * @property {number} summary.active_instances - Contenedores activos en ejecución
 * @property {number} summary.stopped_instances - Contenedores detenidos
 * @property {Object} host_resources - Métricas del hardware anfitrión
 * @property {number} host_resources.cpu_usage_percent - Uso global de CPU
 * @property {number} host_resources.memory_used_mb - RAM usada en el host
 * @property {number} host_resources.memory_total_mb - RAM total instalada
 * @property {number} host_resources.memory_usage_percent - Porcentaje de RAM
 * @property {number} host_resources.storage_used_gb - Espacio en disco ocupado
 * @property {number} host_resources.storage_total_gb - Espacio total en disco
 */
