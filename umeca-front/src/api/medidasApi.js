/**
 * Funciones de acceso a la API de medidas cautelares y SCP.
 */
import api from './axios';

// El parámetro `buscar` es opcional; sin él devuelve todas las medidas
export const getMedidas = (buscar) =>
    api.get('/medidas', { params: buscar ? { buscar } : {} });

export const getMedidaById = (id) => api.get(`/medidas/${id}`);

export const crearMedida = (data) => api.post('/medidas', data);

export const actualizarMedida = (id, data) => api.put(`/medidas/${id}`, data);

export const cambiarEstadoMedida = (id, estado) =>
    api.patch(`/medidas/${id}/estado`, null, { params: { estado } });

export const agregarSeguimiento = (id, data) =>
    api.post(`/medidas/${id}/seguimientos`, data);

export const getMedidasByImputado = (imputadoId) =>
    api.get(`/medidas/by-imputado/${imputadoId}`);

export const registrarLevantamiento = (id, data) =>
    api.post(`/medidas/${id}/levantamiento`, data);

// Solo aplica a SCP; cambia estado a REVOCADO
export const registrarRevocacion = (id, data) =>
    api.post(`/medidas/${id}/revocacion`, data);

// Amplía el plazo de una SCP vigente
export const registrarAmpliacion = (id, data) =>
    api.post(`/medidas/${id}/ampliacion`, data);
