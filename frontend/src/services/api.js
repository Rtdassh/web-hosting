import axios from 'axios';
import { toast } from '../components/ui/Toast';

export const getApiBaseUrl = () => {
  return import.meta.env.VITE_API_URL?.trim() || '/api/v1';
};

const API_BASE_URL = getApiBaseUrl();

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

// Interceptor para inyectar token JWT automáticamente si existe sesión
apiClient.interceptors.request.use((config) => {
  if (
    !config.url.includes('/auth/login') &&
    !config.url.includes('/auth/register')
  ) {
    const token = localStorage.getItem('paas_token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
});

// User initiated operations only: background polling stays silent.
const notifications = {
  '/auth/login': ['Sesión iniciada', 'Bienvenido a Codrop.'],
  '/auth/forgot-password': ['Solicitud recibida', 'Si el correo está registrado, recibirás instrucciones para recuperar tu cuenta.'],
  '/auth/reset-password': ['Contraseña actualizada', 'Ya puedes iniciar sesión con tu nueva contraseña.'],
  '/auth/verify-email': ['Correo verificado', 'Tu cuenta está lista para iniciar sesión.'],
  '/auth/resend-verification': ['Solicitud recibida', 'Revisa tu correo para continuar con la verificación.'],
};
apiClient.interceptors.response.use((response) => {
  const notice = notifications[response.config.url];
  if (notice) toast.success(notice[1], { title: notice[0] });
  return response;
}, (error) => {
  const url = error.config?.url || '';
  if (notifications[url] || ['/auth/register', '/instances/deploy', '/instances/deploy-template'].includes(url)) {
    const detail = error.response?.data?.detail;
    const message = typeof detail === 'string' ? detail : error.response
      ? 'Revisa los datos e inténtalo nuevamente.'
      : 'No pudimos confirmar la operación. Comprueba tu conexión y revisa el resultado antes de repetirla.';
    toast.error(message, { title: 'No se pudo completar la solicitud', duration: 7000 });
  }
  return Promise.reject(error);
});

export const authService = {
  login: async (email, password) => {
    const res = await apiClient.post('/auth/login', {
      email,
      password,
    });

    if (res.data.access_token) {
      localStorage.setItem('paas_token', res.data.access_token);
    }

    return res.data;
  },

  register: async (userData) => {
    const res = await apiClient.post('/auth/register', userData);
    return res.data;
  },

  logout: () => {
    localStorage.removeItem('paas_token');
    toast.info('Has cerrado tu sesión correctamente.');
  },

  getMe: async () => {
    const res = await apiClient.get('/auth/me');
    return res.data;
  },

  forgotPassword: async (email) => {
    const res = await apiClient.post('/auth/forgot-password', {
      email,
    });

    return res.data;
  },

  resetPassword: async (token, newPassword) => {
    const res = await apiClient.post('/auth/reset-password', {
      token,
      new_password: newPassword,
    });

    return res.data;
  },

  verifyEmail: async (token) => {
    const res = await apiClient.get('/auth/verify-email', {
      params: { token },
    });

    return res.data;
  },

  resendVerification: async (email) => {
    const res = await apiClient.post('/auth/resend-verification', {
      email,
    });

    return res.data;
  },
};

export const billingService = {
  getPlans: async () => {
    const res = await apiClient.get('/plans');
    return res.data;
  },

  checkout: async (checkoutData) => {
    const res = await apiClient.post('/billing/checkout', checkoutData);
    return res.data;
  },

  getInvoices: async () => {
    const res = await apiClient.get('/billing/invoices');
    return res.data;
  },

  changePlan: async (targetPlanId) => {
    const res = await apiClient.post('/subscriptions/change-plan', {
      target_plan_id: targetPlanId,
    });

    return res.data;
  },
};

export const templateService = {
  getTemplates: async () => {
    const res = await apiClient.get('/templates');
    return res.data;
  },

  deployTemplate: async (name, templateId) => {
    const res = await apiClient.post('/instances/deploy-template', {
      name,
      template_id: templateId,
    });

    return res.data;
  },
};

export const adminService = {
  getDashboard: async () => {
    const res = await apiClient.get('/admin/dashboard');
    return res.data;
  },

  getInstances: async () => {
    const res = await apiClient.get('/admin/instances');
    return res.data;
  },

  forceAction: async (instanceId, action, reason) => {
    const res = await apiClient.post(
      `/admin/instances/${instanceId}/force-action`,
      {
        action,
        reason,
      }
    );

    return res.data;
  },
};

export const instanceService = {
  getHealth: async () => (await apiClient.get('/instances/health')).data,
  getVersions: async (id) => (await apiClient.get(`/instances/${id}/versions`)).data,
  getInsights: async (id) => (await apiClient.get(`/instances/${id}/insights`)).data,
  publishVersion: async (id, file) => {
    const data = new FormData();
    data.append('file', file);
    return (await apiClient.post(`/instances/${id}/versions`, data)).data;
  },
  restoreVersion: async (id, version) => (await apiClient.post(`/instances/${id}/versions/${version}/restore`)).data,
  getInstances: async () => {
    const res = await apiClient.get('/instances');
    return res.data;
  },

  deployInstance: async (name, zipFile) => {
    const formData = new FormData();

    formData.append('name', name);
    formData.append('file', zipFile);

    const res = await apiClient.post('/instances/deploy', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return res.data;
  },

  triggerAction: async (instanceId, action) => {
    const res = await apiClient.post(
      `/instances/${instanceId}/action`,
      { action }
    );

    return res.data;
  },

  destroyInstance: async (instanceId) => {
    const res = await apiClient.delete(`/instances/${instanceId}`);
    return res.data;
  },

  getMetrics: async (instanceId) => {
    const res = await apiClient.get(`/instances/${instanceId}/metrics`);
    return res.data;
  },

  getLogs: async (instanceId, tail = 100) => {
    const res = await apiClient.get(`/instances/${instanceId}/logs`, {
      params: { tail },
    });

    return res.data;
  },

  syncStatus: async (instanceId) => {
    const res = await apiClient.post(`/instances/${instanceId}/sync`);
    return res.data;
  },
};

export default apiClient;