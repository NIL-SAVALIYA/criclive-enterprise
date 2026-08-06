import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api/v1',
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  console.log('🚀 [FRONTEND API REQUEST]:', {
    url: `${config.baseURL || ''}${config.url}`,
    method: config.method?.toUpperCase(),
    headers: config.headers,
    body: config.data
  });
  return config;
});

export default api;
