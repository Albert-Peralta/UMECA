/**
 * Funciones de acceso a la API de evaluaciones de riesgo.
 * Todas las funciones devuelven una Promise con la respuesta de Axios.
 */
import api from './axios';

export const getEvaluaciones = () => api.get('/evaluaciones');

export const buscarEvaluaciones = (termino) =>
    api.get('/evaluaciones/buscar', { params: { termino } });

export const getEvaluacionById = (id) => api.get(`/evaluaciones/${id}`);

export const crearEvaluacion = (data) => api.post('/evaluaciones', data);

// El usuario autenticado se auto-asigna como evaluador
export const asignarEvaluador = (id) => api.patch(`/evaluaciones/${id}/evaluador`);

export const asignarResultado = (id, resultado) =>
    api.patch(`/evaluaciones/${id}/resultado`, null, { params: { resultado } });

export const actualizarEvaluacion = (id, data) => api.put(`/evaluaciones/${id}`, data);

export const getEvaluacionesByImputado = (imputadoId) =>
    api.get(`/evaluaciones/imputado/${imputadoId}`);

// Registra que el imputado se negó a ser entrevistado (documento tipo NEGACION)
export const crearNegacion = (data) => api.post('/evaluaciones/negacion', data);
