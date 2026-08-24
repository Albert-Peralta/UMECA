import api from './axios';

export const getModulosExtra = (usuarioId) =>
    api.get(`/usuarios/${usuarioId}/modulos-extra`);

export const guardarModulosExtra = (usuarioId, modulos) =>
    api.put(`/usuarios/${usuarioId}/modulos-extra`, modulos);
