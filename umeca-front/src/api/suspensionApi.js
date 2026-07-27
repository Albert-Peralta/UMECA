import api from './axios';

export const getSuspensiones = (params) =>
    api.get('/suspension-condicional', { params });

export const getSuspensionById = (id) =>
    api.get(`/suspension-condicional/${id}`);

export const crearSuspension = (dto) =>
    api.post('/suspension-condicional', dto);

export const actualizarSuspension = (id, dto) =>
    api.put(`/suspension-condicional/${id}`, dto);

export const eliminarSuspension = (id) =>
    api.delete(`/suspension-condicional/${id}`);

export const importarSuspensiones = (archivo) => {
    const form = new FormData();
    form.append('archivo', archivo);
    return api.post('/suspension-condicional/importar', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
};

export const getAniosDisponibles = () =>
    api.get('/suspension-condicional/anios');
