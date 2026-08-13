import api from './axios';

export const getCorrespondencia = (buscar) =>
    api.get('/correspondencia', { params: buscar ? { buscar } : {} });

export const getMisAsignados = () =>
    api.get('/correspondencia/mis-asignados');

export const getMisRegistros = () =>
    api.get('/correspondencia/mis-registros');

export const getCorrespondenciaRegistradores = () =>
    api.get('/correspondencia/registradores');

export const crearCorrespondencia = (datos, archivo) => {
    const form = new FormData();
    form.append('datos', JSON.stringify(datos));
    if (archivo) form.append('archivo', archivo);
    return api.post('/correspondencia', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
};

export const editarCorrespondencia = (id, datos, archivo) => {
    const form = new FormData();
    form.append('datos', JSON.stringify(datos));
    if (archivo) form.append('archivo', archivo);
    return api.put(`/correspondencia/${id}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
};

export const eliminarCorrespondencia = (id) =>
    api.delete(`/correspondencia/${id}`);

export const getPersonalAsignable = () =>
    api.get('/correspondencia/personal-asignable');

export const asignarCorrespondencia = (id, usuarioId) =>
    api.patch(`/correspondencia/${id}/asignar`, null, { params: { usuarioId } });

export const quitarAsignacion = (id) =>
    api.patch(`/correspondencia/${id}/quitar-asignacion`);

export const cambiarEstadoCorrespondencia = (id, estado) =>
    api.patch(`/correspondencia/${id}/estado`, null, { params: { estado } });

export const getContadoresCorrespondencia = () =>
    api.get('/correspondencia/contadores');

export const getEstadisticasCorrespondencia = (anio) =>
    api.get('/correspondencia/estadisticas', { params: { anio } });

export const exportarCorrespondenciaExcel = () =>
    api.get('/correspondencia/exportar-excel', { responseType: 'blob' });

export const getPdfUrl = (ruta) =>
    `${import.meta.env.VITE_API_URL}/api/correspondencia/pdf?ruta=${encodeURIComponent(ruta)}`;

export const SEDES = [
    { value: 'XOCHITEPEC', label: 'Xochitepec' },
    { value: 'CUAUTLA',    label: 'Cuautla' },
    { value: 'JOJUTLA',    label: 'Jojutla' },
];

export const TIPOS = [
    { value: 'OFICIO',    label: 'Físico' },
    { value: 'CORREO',    label: 'Correo' },
    { value: 'WHATSAPP',  label: 'WhatsApp' },
];

export const PRIORIDADES = [
    { value: 'NORMAL',          label: 'Normal' },
    { value: 'URGENTE',         label: 'Urgente' },
    { value: 'DE_CONOCIMIENTO', label: 'De Conocimiento' },
];

export const ESTADOS_PERSONAL = [
    { value: 'LEIDO',      label: 'Leído' },
    { value: 'EN_ESPERA',  label: 'En Espera' },
    { value: 'FINALIZADO', label: 'Finalizado' },
];

export const ESTADO_CONFIG = {
    PENDIENTE:  { label: 'Pendiente',  clase: 'corr-badge-pendiente' },
    ASIGNADO:   { label: 'Asignado',   clase: 'corr-badge-asignado' },
    LEIDO:      { label: 'Leído',      clase: 'corr-badge-leido' },
    EN_ESPERA:  { label: 'En Espera',  clase: 'corr-badge-espera' },
    FINALIZADO: { label: 'Finalizado', clase: 'corr-badge-finalizado' },
};

export const PRIORIDAD_CONFIG = {
    NORMAL:          { label: 'Normal',          clase: 'corr-prior-normal' },
    URGENTE:         { label: 'Urgente',          clase: 'corr-prior-urgente' },
    DE_CONOCIMIENTO: { label: 'De Conocimiento',  clase: 'corr-prior-conocimiento' },
};
