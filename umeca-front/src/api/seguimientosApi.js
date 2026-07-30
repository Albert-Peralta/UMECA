import api from './axios';

export const registrarSeguimiento = (dto) =>
    api.post('/seguimientos', dto);

export const getSeguimientosPorImputado = (imputadoId) =>
    api.get(`/seguimientos/imputado/${imputadoId}`);

export const getSeguimientosPorMedida = (medidaId) =>
    api.get(`/seguimientos/medida/${medidaId}`);

export const getSeguimientosPorEntrevista = (entrevistaId) =>
    api.get(`/seguimientos/entrevista/${entrevistaId}`);

export const getSeguimientosPorEvaluacion = (evaluacionId) =>
    api.get(`/seguimientos/evaluacion/${evaluacionId}`);

export const getReporteAutomatico = (fecha, zona) =>
    api.get('/seguimientos/reporte-automatico', { params: { fecha, zona } });

// Para el admin: devuelve { XOCHITEPEC: { OFICIO_CSP: 2, ... }, CUAUTLA: {...}, ... }
export const getReporteConsolidado = (desde, hasta) =>
    api.get('/seguimientos/reporte-consolidado', { params: { desde, hasta } });

// Historial detallado por usuario: { XOCHITEPEC: { 'Juan Pérez': [...seguimientos] }, ... }
export const getHistorialPorUsuario = (desde, hasta) =>
    api.get('/seguimientos/historial-por-usuario', { params: { desde, hasta } });

// Catálogo de tipos de actividad para el desplegable
export const TIPOS_ACTIVIDAD = [
    // Supervisión
    { value: 'OFICIO_CSP',              label: 'Oficio emitido de CSP',           grupo: 'SUPERVISIÓN' },
    { value: 'OFICIO_DIVERSO',          label: 'Oficio emitido diverso',           grupo: 'SUPERVISIÓN' },
    { value: 'REPORTE_INCUMPLIMIENTO',  label: 'Reporte de incumplimiento',        grupo: 'SUPERVISIÓN' },
    { value: 'REPORTE_NO_PRESENTACION', label: 'Reporte de no presentación',       grupo: 'SUPERVISIÓN' },
    { value: 'SOLICITUD_COLABORACION',  label: 'Solicitud de colaboración',        grupo: 'SUPERVISIÓN' },
    { value: 'SOLICITUD_INFO_JUEZ',     label: 'Solicitud de información al Juez', grupo: 'SUPERVISIÓN' },
    { value: 'SOLICITUD_INFO_MP',       label: 'Solicitud de información al M.P.', grupo: 'SUPERVISIÓN' },
    { value: 'INFORME_FINAL',           label: 'Informe final',                    grupo: 'SUPERVISIÓN' },
    { value: 'CANALIZACION',            label: 'Canalización',                     grupo: 'SUPERVISIÓN' },
    { value: 'VISITA_DOMICILIARIA',     label: 'Visita domiciliaria',              grupo: 'SUPERVISIÓN' },
    { value: 'AUDIENCIA_TTA',           label: 'Audiencia TTA',                    grupo: 'SUPERVISIÓN' },
    { value: 'LLAMADA_TELEFONICA',      label: 'Llamada telefónica',               grupo: 'SUPERVISIÓN' },
    // Evaluación
    { value: 'OFICIO_REGISTRO',         label: 'Oficio de registro',               grupo: 'EVALUACIÓN' },
    { value: 'OPINION_TECNICA_FC',      label: 'Opinión técnica F.C.',             grupo: 'EVALUACIÓN' },
    { value: 'OPINION_TECNICA_FF',      label: 'Opinión técnica F.F.',             grupo: 'EVALUACIÓN' },
    { value: 'NEGACION_FC',             label: 'Negación F.C.',                    grupo: 'EVALUACIÓN' },
    { value: 'NEGACION_FF',             label: 'Negación F.F.',                    grupo: 'EVALUACIÓN' },
    { value: 'INFORME_FC',              label: 'Informe F.C.',                     grupo: 'EVALUACIÓN' },
    { value: 'INFORME_FF',              label: 'Informe F.F.',                     grupo: 'EVALUACIÓN' },
    // General
    { value: 'OTRO',                    label: 'Otro',                             grupo: 'GENERAL' },
];
