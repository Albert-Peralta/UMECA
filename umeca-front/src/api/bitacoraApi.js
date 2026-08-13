import api from './axios';

/**
 * Vista global paginada (solo ADMINISTRADOR).
 * @param {object} filtros - { entidad, accion, usuarioId, desde, hasta, pagina, tamano }
 */
export const getBitacoraGlobal = (filtros = {}) =>
    api.get('/bitacora', { params: filtros });

/** Lista de usuarios distintos que tienen entradas en la bitácora */
export const getBitacoraUsuarios = () =>
    api.get('/bitacora/usuarios');

/**
 * Historial de un registro concreto.
 * @param {string} entidad - IMPUTADO | MEDIDA_CAUTELAR | ENTREVISTA | SUPERVISION | USUARIO
 * @param {number} id
 */
export const getHistorialRegistro = (entidad, id) =>
    api.get(`/bitacora/${entidad}/${id}`);
