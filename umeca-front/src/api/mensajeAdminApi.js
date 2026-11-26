import api from './axios';

export const enviarMensaje = (contenido, zona) =>
    api.post('/mensajes-admin', null, { params: { contenido, zona } });

export const getMensajesNoLeidos = () =>
    api.get('/mensajes-admin/no-leidos');

export const marcarMensajeLeido = (id) =>
    api.post(`/mensajes-admin/${id}/leido`);

export const getHistorialMensajes = () =>
    api.get('/mensajes-admin/historial');

export const desactivarMensaje = (id) =>
    api.patch(`/mensajes-admin/${id}/desactivar`);

export const activarMensaje = (id) =>
    api.patch(`/mensajes-admin/${id}/activar`);

export const getMisMensajes = () =>
    api.get('/mensajes-admin/mis-mensajes');

export const editarMensaje = (id, contenido) =>
    api.patch(`/mensajes-admin/${id}/editar`, null, { params: { contenido } });
