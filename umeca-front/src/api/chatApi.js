import api from './axios';

export const getMensajesChat = () => api.get('/chat');
export const enviarMensajeChat = (contenido) => api.post('/chat', null, { params: { contenido } });
export const getNoLeidosChat = () => api.get('/chat/no-leidos');
export const marcarVistoChat = () => api.post('/chat/marcar-visto');
