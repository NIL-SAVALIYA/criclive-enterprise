import axios from 'axios';

const rawBaseURL = import.meta.env.VITE_API_URL || (
  window.location.hostname === 'localhost'
    ? 'http://localhost:5000'
    : `http://${window.location.hostname}:5000`
);

const baseURL = rawBaseURL.endsWith('/api/v1')
  ? rawBaseURL
  : `${rawBaseURL.replace(/\/+$/, '')}/api/v1`;

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const scoringToken = sessionStorage.getItem('activeScoringToken');
  if (scoringToken && !config.headers['x-scoring-token']) {
    config.headers['x-scoring-token'] = scoringToken;
  }
  return config;
});

export default api;