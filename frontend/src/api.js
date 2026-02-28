import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor – attach JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor – handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ── AUTH ──
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateMe: (data) => api.put('/auth/me', data),
};

// ── PROJECTS ──
export const projectAPI = {
  create: (data) => api.post('/projects', data),
  getAll: () => api.get('/projects'),
  getById: (id) => api.get(`/projects/${id}`),
  update: (id, data) => api.put(`/projects/${id}`, data),
  addMember: (id, data) => api.post(`/projects/${id}/members`, data),
  removeMember: (id, userId) => api.delete(`/projects/${id}/members/${userId}`),
};

// ── SCRIPTS ──
export const scriptAPI = {
  upload: (formData) => api.post('/scripts/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getByProject: (projectId) => api.get(`/scripts/project/${projectId}`),
  getById: (id) => api.get(`/scripts/${id}`),
  delete: (id) => api.delete(`/scripts/${id}`),
};

// ── SCENES ──
export const sceneAPI = {
  getByProject: (projectId) => api.get(`/scenes/project/${projectId}`),
  getById: (id) => api.get(`/scenes/${id}`),
  create: (data) => api.post('/scenes', data),
  update: (id, data) => api.put(`/scenes/${id}`, data),
  delete: (id) => api.delete(`/scenes/${id}`),
};

// ── SCHEDULES ──
export const scheduleAPI = {
  create: (data) => api.post('/schedules', data),
  getByProject: (projectId) => api.get(`/schedules/project/${projectId}`),
  getById: (id) => api.get(`/schedules/${id}`),
  update: (id, data) => api.put(`/schedules/${id}`, data),
  addScene: (id, data) => api.post(`/schedules/${id}/scenes`, data),
  removeScene: (id, sceneId) => api.delete(`/schedules/${id}/scenes/${sceneId}`),
  revise: (id, data) => api.post(`/schedules/${id}/revise`, data),
  publish: (id) => api.post(`/schedules/${id}/publish`),
  getCallSheet: (id) => api.get(`/schedules/${id}/callsheet`),
  createCallSheet: (id, data) => api.post(`/schedules/${id}/callsheet`, data),
};

// ── TASKS ──
export const taskAPI = {
  create: (data) => api.post('/tasks', data),
  getByProject: (projectId) => api.get(`/tasks/project/${projectId}`),
  getBySchedule: (scheduleId) => api.get(`/tasks/schedule/${scheduleId}`),
  getMyTasks: () => api.get('/tasks/my'),
  getByDepartment: (dept) => api.get(`/tasks/department/${dept}`),
  getById: (id) => api.get(`/tasks/${id}`),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  delete: (id) => api.delete(`/tasks/${id}`),
};

// ── CREW ──
export const crewAPI = {
  getByProject: (projectId) => api.get(`/crew/project/${projectId}`),
  getByDepartment: (dept) => api.get(`/crew/department/${dept}`),
  getAll: () => api.get('/crew/all'),
  update: (id, data) => api.put(`/crew/${id}`, data),
};

// ── READINESS ──
export const readinessAPI = {
  getBySchedule: (scheduleId) => api.get(`/readiness/schedule/${scheduleId}`),
  create: (data) => api.post('/readiness', data),
  update: (id, data) => api.put(`/readiness/${id}`, data),
  getDashboard: (scheduleId) => api.get(`/readiness/dashboard/${scheduleId}`),
};

// ── NOTIFICATIONS ──
export const notificationAPI = {
  create: (data) => api.post('/notifications', data),
  getMy: () => api.get('/notifications/my'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};

// ── REPORTS ──
export const reportAPI = {
  create: (data) => api.post('/reports', data),
  getByProject: (projectId) => api.get(`/reports/project/${projectId}`),
  getBySchedule: (scheduleId) => api.get(`/reports/schedule/${scheduleId}`),
  getById: (id) => api.get(`/reports/${id}`),
  getSummary: (projectId) => api.get(`/reports/summary/${projectId}`),
};

// ── LOCATIONS ──
export const locationAPI = {
  create: (data) => api.post('/locations', data),
  getByProject: (projectId) => api.get(`/locations/project/${projectId}`),
  getById: (id) => api.get(`/locations/${id}`),
  update: (id, data) => api.put(`/locations/${id}`, data),
  delete: (id) => api.delete(`/locations/${id}`),
};

export default api;
