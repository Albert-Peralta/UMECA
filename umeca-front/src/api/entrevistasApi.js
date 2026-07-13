/**
 * Funciones de acceso a la API de entrevistas de encuadre.
 */
import api from './axios';

export const getEntrevistas = () => api.get('/entrevistas');

// Búsqueda rápida usada al pre-llenar datos de imputado al crear una medida cautelar
export const buscarEntrevistasParaMedida = (q) =>
    api.get('/entrevistas/buscar', { params: { q } });

export const getEntrevistaById = (id) => api.get(`/entrevistas/${id}`);

export const crearEntrevista = (data) => api.post('/entrevistas', data);

export const actualizarEntrevista = (id, data) => api.put(`/entrevistas/${id}`, data);

export const eliminarEntrevista = (id) => api.delete(`/entrevistas/${id}`);