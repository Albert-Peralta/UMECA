import api from './axios';

export const getAllSupervisions = () =>
    api.get('/supervision');

export const getAgenda = (inicio, fin) => {
    const params = {};
    if (inicio) params.inicio = inicio;
    if (fin) params.fin = fin;
    return api.get('/supervision/agenda', { params });
};

export const buscarSupervision = (q) =>
    api.get('/supervision/buscar', { params: { q } });

export const getSupervisionesPorImputado = (imputadoId) =>
    api.get(`/supervision/imputado/${imputadoId}`);

export const getSupervisionById = (id) =>
    api.get(`/supervision/${id}`);

export const crearSupervision = (data) =>
    api.post('/supervision', data);

export const actualizarSupervision = (id, data) =>
    api.put(`/supervision/${id}`, data);

export const eliminarSupervision = (id) =>
    api.delete(`/supervision/${id}`);
