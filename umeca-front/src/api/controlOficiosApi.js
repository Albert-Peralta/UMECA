import api from './axios';

export const getLista         = ()          => api.get('/control-oficios');
export const getContadores    = ()          => api.get('/control-oficios/contadores');
export const crearOficio      = (dto)       => api.post('/control-oficios', dto);
export const editarOficio     = (id, dto)   => api.put(`/control-oficios/${id}`, dto);
export const eliminarOficio   = (id)        => api.delete(`/control-oficios/${id}`);
export const cambiarEstado    = (id, estado)=> api.patch(`/control-oficios/${id}/estado`, null, { params: { estado } });
export const exportarExcel    = ()          => api.get('/control-oficios/exportar-excel', { responseType: 'blob' });

export const ESTADO_CONFIG = {
    PENDIENTE:  { label: 'Pendiente',  clase: 'co-badge-pendiente' },
    TRAMITADO:  { label: 'Tramitado',  clase: 'co-badge-tramitado' },
};
