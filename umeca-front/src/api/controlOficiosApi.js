import api from './axios';

export const getLista         = ()          => api.get('/control-oficios');
export const getContadores    = ()          => api.get('/control-oficios/contadores');
export const crearOficio      = (dto)       => api.post('/control-oficios', dto);
export const editarOficio     = (id, dto)   => api.put(`/control-oficios/${id}`, dto);
export const eliminarOficio   = (id)        => api.delete(`/control-oficios/${id}`);
export const cambiarEstado              = (id, estado) => api.patch(`/control-oficios/${id}/estado`, null, { params: { estado } });
export const cancelarOficio             = (id, motivo) => api.patch(`/control-oficios/${id}/cancelar`, { motivo });
export const revertirCancelacionOficio  = (id)         => api.patch(`/control-oficios/${id}/revertir-cancelacion`);
export const exportarExcel              = ()            => api.get('/control-oficios/exportar-excel', { responseType: 'blob' });

export const ESTADO_CONFIG = {
    PENDIENTE:  { label: 'Pendiente',  clase: 'co-badge-pendiente' },
    TRAMITADO:  { label: 'Tramitado',  clase: 'co-badge-tramitado' },
    CANCELADO:  { label: 'Cancelado',  clase: 'co-badge-cancelado' },
};
