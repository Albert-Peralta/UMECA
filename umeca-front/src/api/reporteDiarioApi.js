import api from './axios';

export const guardarReporte      = (data)         => api.post('/reportes-diarios', data);
export const getMiReporteHoy     = ()             => api.get('/reportes-diarios/mi-reporte-hoy');
export const getMiReportePorFecha = (fecha)       => api.get('/reportes-diarios/mi-reporte', { params: { fecha } });
export const getListaReportes    = (params)       => api.get('/reportes-diarios', { params });
export const getConsolidado      = (params)       => api.get('/reportes-diarios/consolidado', { params });
export const getSemanaActual     = ()             => api.get('/reportes-diarios/semana-actual');
export const getCumplimiento     = (params)       => api.get('/reportes-diarios/cumplimiento', { params });
