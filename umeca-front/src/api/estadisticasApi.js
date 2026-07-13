import api from './axios';

export const getEstadisticas = (anio, mes, semana = 0) =>
    api.get('/estadisticas', { params: { ...(anio ? { anio } : {}), ...(mes ? { mes } : {}), ...(semana ? { semana } : {}) } });

export const exportarEstadisticasExcel = (anio, mes) =>
    api.get('/estadisticas/exportar', { params: { anio, mes }, responseType: 'blob' });
