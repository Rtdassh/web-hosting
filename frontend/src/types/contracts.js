/**
 * @file Contratos y Tipos DTO de Integración (Hito 50% - CloudPaaS)
 * Define las interfaces de datos compartidas entre Frontend y Backend.
 */

/**
 * Estados posibles de una instancia.
 * @readonly
 * @enum {string}
 */
export const InstanceStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  STOPPED: 'stopped',
  FAILED: 'failed'
};

/**
 * Acciones soportadas de ciclo de vida.
 * @readonly
 * @enum {string}
 */
export const InstanceLifecycleAction = {
  START: 'start',
  STOP: 'stop',
  RESTART: 'restart'
};

/**
 * @typedef {Object} InstanceEntity
 * @property {number} id - Identificador único de la instancia
 * @property {string} uuid - Hash identificador de 8 caracteres
 * @property {string} name - Nombre asignado al proyecto
 * @property {number} assigned_port - Puerto TCP host asignado (30001 - 30100)
 * @property {string} public_url - URL directa accesible http://host:puerto
 * @property {InstanceStatus} status - Estado actual de la instancia
 * @property {string} created_at - Timestamp ISO-8601 de creación
 * @property {string|null} container_id - ID del contenedor Docker
 */

/**
 * @typedef {Object} InstanceMetricsDTO
 * @property {number} instance_id - ID de la instancia
 * @property {InstanceStatus} status - Estado reportado
 * @property {number} cpu_percent - Porcentaje de uso de CPU (0.0 - 100.0)
 * @property {number} memory_usage_mb - Uso de RAM activa en Megabytes
 * @property {number} memory_limit_mb - Límite de RAM configurado según el plan (ej. 128, 256, 512)
 * @property {number} memory_percent - Porcentaje de RAM utilizado (0.0 - 100.0)
 * @property {string} updated_at - Timestamp UTC del reporte
 */

/**
 * @typedef {Object} InstanceLogsDTO
 * @property {number} instance_id - ID de la instancia
 * @property {string|null} container_id - ID del contenedor
 * @property {number} total_lines - Total de líneas recuperadas
 * @property {string[]} lines - Líneas formateadas de access y error log
 */

/**
 * @typedef {Object} InstanceSyncDTO
 * @property {number} instance_id - ID de la instancia
 * @property {InstanceStatus} previous_status - Estado antes de sincronizar
 * @property {InstanceStatus} current_status - Estado real obtenido de Docker
 * @property {boolean} synced - Indica si hubo cambio de estado persistido
 */

/**
 * Helper para clasificar el nivel de alerta según el porcentaje de consumo de recursos.
 * @param {number} percent
 * @returns {'normal' | 'warning' | 'critical'}
 */
export const getResourceAlertLevel = (percent) => {
  if (percent >= 90) return 'critical';
  if (percent >= 70) return 'warning';
  return 'normal';
};
