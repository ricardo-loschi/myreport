import axios from 'axios';

const api = axios.create({
  //baseURL: 'http://localhost:3001',
  baseURL: process.env.APP_API_URL || 'http://localhost:3001',
  withCredentials: true, // importante para manter a sessão
  headers: { 'Content-Type': 'application/json' },
});

export default api;
