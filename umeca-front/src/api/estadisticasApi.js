import api from './axios';

export const getEstadisticas = (desde, hasta, zona) =>
    api.get('/estadisticas', { params: { desde, hasta, ...(zona && zona !== 'TODAS' ? { zona } : {}) } });

export const exportarEstadisticasExcel = (desde, hasta, zona) =>
    api.get('/estadisticas/exportar', { params: { desde, hasta, ...(zona && zona !== 'TODAS' ? { zona } : {}) }, responseType: 'blob' });
