import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

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

// Interceptor para inyectar token JWT automáticamente
apiClient.interceptors.request.use(async (config) => {
  if (!config.url.includes('/auth/login') && !config.url.includes('/auth/register')) {
    let token = localStorage.getItem('paas_token');
    if (!token) {
      token = await ensureAuthenticated();
    }
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
  }
};

export default apiClient;
