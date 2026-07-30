import api from './axios';

export const getEstadisticas = (desde, hasta) =>
    api.get('/estadisticas', { params: { desde, hasta } });

export const exportarEstadisticasExcel = (desde, hasta) =>
    api.get('/estadisticas/exportar', { params: { desde, hasta }, responseType: 'blob' });
