import api from './axios';

export const getImputados = (buscar) =>
    api.get('/imputados', { params: buscar ? { buscar } : {} });

export const getImputadoById = (id) => api.get(`/imputados/${id}`);

/** Busca imputados por causa penal — puede devolver más de uno. */
export const getImputadosPorCausaPenal = (causaPenal) =>
    api.get('/imputados/por-causa', { params: { causaPenal } });

export const crearImputado = (data) => api.post('/imputados', data);

export const actualizarImputado = (id, data) => api.put(`/imputados/${id}`, data);

export const actualizarFotoImputado = (id, foto) => api.patch(`/imputados/${id}/foto`, { foto });

export const registrarFallecimiento = (id, datos) =>
    api.patch(`/imputados/${id}/fallecimiento`, datos);
