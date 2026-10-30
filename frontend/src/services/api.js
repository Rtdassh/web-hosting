import axios from 'axios';

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined' && window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return `http://${window.location.hostname}:8000/api/v1`;
  }
  return import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
};

const API_BASE_URL = getApiBaseUrl();

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

export const ensureAuthenticated = async () => {
  let token = localStorage.getItem('paas_token');
  if (!token) {
    try {
      const res = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: 'dev@cloudpaas.local',
        password: 'admin123'
      });
      if (res.data?.access_token) {
        token = res.data.access_token;
        localStorage.setItem('paas_token', token);
      }
    } catch (e) {
      console.warn("Falla en sesión inicial:", e);
    }
  }
  return token;
};

// Interceptor para inyectar token JWT automáticamente si existe sesión
apiClient.interceptors.request.use((config) => {
  if (!config.url.includes('/auth/login') && !config.url.includes('/auth/register')) {
    const token = localStorage.getItem('paas_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export const authService = {
  login: async (email, password) => {
    const res = await apiClient.post('/auth/login', { email, password });
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
  },
  getMe: async () => {
    const res = await apiClient.get('/auth/me');
    return res.data;
  },
  forgotPassword: async (email) => {
    const res = await apiClient.post('/auth/forgot-password', { email });
    return res.data;
  },
  resetPassword: async (token, newPassword) => {
    const res = await apiClient.post('/auth/reset-password', { token, new_password: newPassword });
    return res.data;
  },
  verifyEmail: async (token) => {
    const res = await apiClient.get('/auth/verify-email', { params: { token } });
    return res.data;
  }
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
    const res = await apiClient.post('/subscriptions/change-plan', { target_plan_id: targetPlanId });
    return res.data;
  }
};

export const templateService = {
  getTemplates: async () => {
    const res = await apiClient.get('/templates');
    return res.data;
  },
  deployTemplate: async (name, templateId) => {
    const res = await apiClient.post('/instances/deploy-template', {
      name,
      template_id: templateId
    });
    return res.data;
  }
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
    const res = await apiClient.post(`/admin/instances/${instanceId}/force-action`, {
      action,
      reason
    });
    return res.data;
  }
};

export const instanceService = {
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
    const res = await apiClient.post(`/instances/${instanceId}/action`, { action });
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
      params: { tail }
    });
    return res.data;
  },
  syncStatus: async (instanceId) => {
    const res = await apiClient.post(`/instances/${instanceId}/sync`);
    return res.data;
  }
};

export default apiClient;

