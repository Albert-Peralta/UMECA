import api from './axios';

export const getUsuarios = () => api.get('/users');

export const crearUsuario = (data) => api.post('/users', data);

export const actualizarUsuario = (id, data) => api.put(`/users/${id}`, data);

export const toggleUsuario = (id) => api.patch(`/users/${id}/toggle`, {});