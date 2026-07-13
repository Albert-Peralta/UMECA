import api from './axios';

export const getConsultas       = ()          => api.get('/consultas');
export const getConsultaById    = (id)        => api.get(`/consultas/${id}`);
export const getAntecedentes    = (params)    => api.get('/consultas/antecedentes', { params });
export const crearConsulta      = (data)      => api.post('/consultas', data);
export const actualizarConsulta = (id, data)  => api.put(`/consultas/${id}`, data);
export const eliminarConsulta   = (id)        => api.delete(`/consultas/${id}`);
export const buscarRegistros    = (params)    => api.get('/consultas/registros', { params });
