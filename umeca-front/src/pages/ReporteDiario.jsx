import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getReporteAutomatico, getReporteConsolidado, getHistorialPorUsuario } from '../api/seguimientosApi';
import { getMiReportePorFecha, actualizarOficiosRegistro, actualizarCampoManual, getConsolidado as getConsolidadoRD, getListaReportes } from '../api/reporteDiarioApi';
import './ReporteDiario.css';

// ── Definición de campos por sección ─────────────────────────────────────────

const CAMPOS_SUPERVISION = [
    { key: 'oficiosEmitidosCSP',      label: 'Oficios emitidos de CSP',            tipo: 'OFICIO_CSP' },
    { key: 'oficiosEmitidosDiversos', label: 'Oficios emitidos diversos',           tipo: 'OFICIO_DIVERSO' },
    { key: 'reportesIncumplimiento',  label: 'Reportes de incumplimiento',          tipo: 'REPORTE_INCUMPLIMIENTO' },
    { key: 'reportesNoPresentacion',  label: 'Reportes de no presentación',         tipo: 'REPORTE_NO_PRESENTACION' },
    { key: 'solicitudesColaboracion', label: 'Solicitudes de colaboración',         tipo: 'SOLICITUD_COLABORACION' },
    { key: 'solicitudesInfoJuez',     label: 'Solicitudes de información al Juez',  tipo: 'SOLICITUD_INFO_JUEZ' },
    { key: 'solicitudesInfoMP',       label: 'Solicitudes de información al M.P.',  tipo: 'SOLICITUD_INFO_MP' },
    { key: 'informeFinal',            label: 'Informe final',                       tipo: 'INFORME_FINAL' },
    { key: 'canalizaciones',          label: 'Canalizaciones',                      tipo: 'CANALIZACION' },
    { key: 'visitasDomiciliarias',    label: 'Visitas domiciliarias',               tipo: 'VISITA_DOMICILIARIA' },
    { key: 'audienciasTTA',           label: 'Audiencias TTA',                      tipo: 'AUDIENCIA_TTA' },
    { key: 'llamadasTelefonicas',     label: 'Llamadas telefónicas',                tipo: 'LLAMADA_TELEFONICA' },
    { key: 'firmasRecabadasSuper',    label: 'Firmas recabadas',                    tipo: null, manual: true },
    { key: 'entrevistaEncuadreSuper', label: 'Entrevista de encuadre',              tipo: null, manual: true },
    { key: 'calendarioSuper',         label: 'Calendario',                          tipo: null, manual: true },
    { key: 'capturaCarpetas',         label: 'Captura de carpetas',                 tipo: null, manual: true },
    { key: 'capturaOficiosImposicion',label: 'Captura de oficios de imposición',    tipo: null, manual: true },
];

const CAMPOS_EVALUACION = [
    { key: 'oficiosRegistros',         label: 'Oficios de registros',         tipo: null, manual: true },
    { key: 'opinionTecnicaFC',         label: 'Opinión técnica F.C.',          tipo: null, manual: true },
    { key: 'opinionTecnicaFF',         label: 'Opinión técnica F.F.',          tipo: null, manual: true },
    { key: 'negacionesFC',             label: 'Negaciones F.C.',               tipo: null, manual: true },
    { key: 'negacionesFF',             label: 'Negaciones F.F.',               tipo: null, manual: true },
    { key: 'informesFC',               label: 'Informes F.C.',                 tipo: null, manual: true },
    { key: 'informesFF',               label: 'Informes F.F.',                 tipo: null, manual: true },
    { key: 'firmasRecabadasEval',      label: 'Firmas recabadas',              tipo: null, manual: true },
    { key: 'entrevistaEncuadreEval',   label: 'Entrevista de encuadre',        tipo: null, manual: true },
    { key: 'entrevistaEvaluacionEval', label: 'Entrevista de evaluación',      tipo: null, manual: true },
    { key: 'calendarioEval',           label: 'Calendario',                    tipo: null, manual: true },
    { key: 'capturaCarpetasEval',      label: 'Captura de carpetas',           tipo: null, manual: true },
    { key: 'capturaOficiosImposicionEval', label: 'Captura de oficios de imposición', tipo: null, manual: true },
];

const CAMPOS_CORRESPONDENCIA = [
    { key: 'totalOficiosRecibidos',   label: 'Total de oficios recibidos',     tipo: null, manual: true },
    { key: 'nuevosCasosMC',           label: 'Nuevos Casos M.C.',              tipo: null, manual: true },
    { key: 'nuevosCasosSCP',          label: 'Nuevos Casos S.C.P.',            tipo: null, manual: true },
    { key: 'sobreseimientos',         label: 'Sobreseimientos',                tipo: null, manual: true },
    { key: 'levantamientoMedida',     label: 'Levantamiento de medida',        tipo: null, manual: true },
    { key: 'oficiosDiversosCorr',     label: 'Oficios emitidos diversos',      tipo: null, manual: true },
    { key: 'firmasRecabadasCorr',     label: 'Firmas recabadas',               tipo: null, manual: true },
    { key: 'entrevistaEncuadreCorr',  label: 'Entrevista de encuadre',         tipo: null, manual: true },
    { key: 'calendarioCorr',          label: 'Calendario',                     tipo: null, manual: true },
    { key: 'capturaCarpetasCorr',     label: 'Captura de carpetas',            tipo: null, manual: true },
    { key: 'capturaOficiosImposicionCorr', label: 'Captura de oficios de imposición', tipo: null, manual: true },
];

const TODOS_CAMPOS = [...CAMPOS_SUPERVISION, ...CAMPOS_EVALUACION, ...CAMPOS_CORRESPONDENCIA];

const ZONAS = ['XOCHITEPEC', 'CUAUTLA', 'JOJUTLA'];

// Convierte la respuesta del backend (Map<TipoActividad,Long>) a un objeto { key: count }
const mapearCuentas = (data) => {
    const out = Object.fromEntries(TODOS_CAMPOS.map(c => [c.key, 0]));
    TODOS_CAMPOS.forEach(c => { if (c.tipo && data[c.tipo] != null) out[c.key] = data[c.tipo]; });
    return out;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

// Fecha local (no UTC) para evitar desfase de zona horaria
const hoyISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ── Componente principal ──────────────────────────────────────────────────────

export default function ReporteDiario() {
    const { user } = useAuth();
    const { showToast } = useToast();
    const rol = user?.rol;

    const esAdmin = rol === 'ADMINISTRADOR' || rol === 'SUPERADMIN';
    const esCorr  = rol === 'CORRESPONDENCIA';
    const esSuper = rol === 'SUPERVISION';
    const esEval  = rol === 'EVALUADOR_RIESGO';

    // ── Estado: vista propia (no admin) ──────────────────────────────────────
    const [fechaPropia, setFechaPropia]   = useState(hoyISO());
    const [datosAuto,   setDatosAuto]     = useState({});
    const [cargandoAuto, setCargandoAuto] = useState(false);

    // ── Estado: campos manuales (oficios de registro + nuevos campos manual) ──
    // manualesGuardados: valores confirmados (afectan totales)
    // manualesEditando:  valores en edición (solo afectan inputs)
    const CAMPOS_MANUALES_KEYS = [
        // Supervisión manuales
        'firmasRecabadasSuper', 'entrevistaEncuadreSuper', 'calendarioSuper',
        'capturaCarpetas', 'capturaOficiosImposicion',
        // Evaluación — todos manuales
        'oficiosRegistros',
        'opinionTecnicaFC', 'opinionTecnicaFF',
        'negacionesFC', 'negacionesFF',
        'informesFC', 'informesFF',
        'firmasRecabadasEval', 'entrevistaEncuadreEval', 'entrevistaEvaluacionEval',
        'calendarioEval', 'capturaCarpetasEval', 'capturaOficiosImposicionEval',
        // Correspondencia
        'totalOficiosRecibidos', 'nuevosCasosMC', 'nuevosCasosSCP',
        'sobreseimientos', 'levantamientoMedida', 'oficiosDiversosCorr',
        'firmasRecabadasCorr', 'entrevistaEncuadreCorr', 'calendarioCorr',
        'capturaCarpetasCorr', 'capturaOficiosImposicionCorr',
    ];
    const initManuales = () => Object.fromEntries(CAMPOS_MANUALES_KEYS.map(k => [k, 0]));
    const [manualesGuardados, setManualesGuardados] = useState(initManuales);
    const [manualesEditando,  setManualesEditando]  = useState(initManuales);
    const [guardandoManual,   setGuardandoManual]   = useState({});
    const [manualesCargados,  setManualesCargados]  = useState(false);
    // legacy alias para no romper referencias internas a oficiosGuardados
    const oficiosGuardados = manualesGuardados['oficiosRegistros'] ?? 0;

    useEffect(() => {
        if (esAdmin || esCorr || !user?.zona) return;
        setCargandoAuto(true);
        getReporteAutomatico(fechaPropia, user.zona)
            .then(res => {
                if (res.data.ok) setDatosAuto(mapearCuentas(res.data.data || {}));
                else setDatosAuto({});
            })
            .catch(() => { setDatosAuto({}); showToast('Error al cargar el reporte diario.', 'error'); })
            .finally(() => setCargandoAuto(false));
    }, [esAdmin, fechaPropia, user?.zona]); // eslint-disable-line react-hooks/exhaustive-deps

    // Carga valores manuales al cambiar la fecha (para evaluador, supervisión y correspondencia)
    useEffect(() => {
        if (esAdmin) return;
        setManualesCargados(false);
        getMiReportePorFecha(fechaPropia)
            .then(res => {
                const d = res.data?.data;
                if (d) {
                    const vals = {};
                    CAMPOS_MANUALES_KEYS.forEach(k => { vals[k] = d[k] ?? 0; });
                    setManualesGuardados(vals);
                    setManualesEditando({ ...vals });
                } else {
                    setManualesGuardados(initManuales());
                    setManualesEditando(initManuales());
                }
            })
            .catch(() => { setManualesGuardados(initManuales()); setManualesEditando(initManuales()); })
            .finally(() => setManualesCargados(true));
    }, [esAdmin, fechaPropia]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleGuardarCampoManual = async (campo) => {
        setGuardandoManual(prev => ({ ...prev, [campo]: true }));
        try {
            const valor = manualesEditando[campo] ?? 0;
            if (campo === 'oficiosRegistros') {
                await actualizarOficiosRegistro(fechaPropia, valor);
            } else {
                await actualizarCampoManual(fechaPropia, campo, valor);
            }
            setManualesGuardados(prev => ({ ...prev, [campo]: valor }));
            showToast('Guardado correctamente');
        } catch {
            showToast('Error al guardar', 'error');
        } finally {
            setGuardandoManual(prev => ({ ...prev, [campo]: false }));
        }
    };

    // ── Estado: pestaña admin ─────────────────────────────────────────────────
    const [pestanaAdmin, setPestanaAdmin] = useState(esCorr ? 'mis-actividades' : 'resumen'); // 'mis-actividades' | 'resumen' | 'historial'
    const [expandidos, setExpandidos] = useState({}); // { 'zona-usuario': true }
    const toggleExpandido = (key) => setExpandidos(prev => ({ ...prev, [key]: !prev[key] }));
    const LIMITE_SEGS = 3;

    // ── Estado: vista admin (tabla consolidada por zona) ──────────────────────
    const [vistaAdmin,    setVistaAdmin]    = useState('hoy');   // 'hoy' | 'semana' | 'mes' | 'rango'
    const [rangoDesde,    setRangoDesde]    = useState(hoyISO());
    const [rangoHasta,    setRangoHasta]    = useState(hoyISO());
    const mesActual = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; };
    const [mesSel, setMesSel] = useState(mesActual());
    const [consolidado,   setConsolidado]   = useState({});
    const [consolidadoRD, setConsolidadoRD] = useState({});
    const [cargandoTabla, setCargandoTabla] = useState(false);

    // ── Estado: historial por usuario ─────────────────────────────────────────
    const [historial,        setHistorial]        = useState({});
    const [cargandoHistorial, setCargandoHistorial] = useState(false);
    const [reportesManuales, setReportesManuales] = useState([]); // ReporteDiarioResponseDTO[]

    // Calcula el rango de fechas según el filtro activo
    const cargarTabla = useCallback(async () => {
        setCargandoTabla(true);
        try {
            const fmtDate = (d) =>
                `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
            const hoy = new Date();
            let desde, hasta;

            if (vistaAdmin === 'hoy') {
                desde = hasta = hoyISO();
            } else if (vistaAdmin === 'semana') {
                const dia = hoy.getDay();
                const lunes = new Date(hoy); lunes.setDate(hoy.getDate() - (dia === 0 ? 6 : dia - 1));
                const domingo = new Date(lunes); domingo.setDate(lunes.getDate() + 6);
                desde = fmtDate(lunes); hasta = fmtDate(domingo);
            } else if (vistaAdmin === 'mes') {
                const [y, m] = mesSel.split('-').map(Number);
                const inicio = new Date(y, m - 1, 1);
                const fin    = new Date(y, m, 0);
                desde = fmtDate(inicio); hasta = fmtDate(fin);
            } else {
                desde = rangoDesde; hasta = rangoHasta;
            }

            const [resSeg, resRD] = await Promise.all([
                getReporteConsolidado(desde, hasta),
                getConsolidadoRD({ inicio: desde, fin: hasta }),
            ]);
            if (resSeg.data.ok) {
                const rawPorZona = resSeg.data.data || {};
                const nuevo = {};
                ZONAS.forEach(z => { nuevo[z] = mapearCuentas(rawPorZona[z] || {}); });
                if (rawPorZona['SIN_ZONA']) {
                    nuevo['SIN_ZONA'] = mapearCuentas(rawPorZona['SIN_ZONA']);
                }
                setConsolidado(nuevo);
            }
            if (resRD.data.ok) {
                // resRD: { XOCHITEPEC: ReporteDiarioResponseDTO, ... }
                const rawRD = resRD.data.data || {};
                const nuevoRD = {};
                const CAMPOS_MANUALES_TODOS = [
                    ...CAMPOS_SUPERVISION.filter(c => c.manual),
                    ...CAMPOS_EVALUACION.filter(c => c.manual),
                    ...CAMPOS_CORRESPONDENCIA,
                ];
                Object.entries(rawRD).forEach(([zona, dto]) => {
                    nuevoRD[zona] = {};
                    CAMPOS_MANUALES_TODOS.forEach(c => { nuevoRD[zona][c.key] = dto[c.key] ?? 0; });
                });
                setConsolidadoRD(nuevoRD);
            }
        } catch { showToast('Error al cargar el reporte consolidado.', 'error'); }
        finally { setCargandoTabla(false); }
    }, [vistaAdmin, rangoDesde, rangoHasta, mesSel]); // eslint-disable-line react-hooks/exhaustive-deps

    // Carga inicial y cuando cambia el filtro (excepto rango — espera el botón refrescar)
    useEffect(() => {
        if ((esAdmin || esCorr) && vistaAdmin !== 'rango') cargarTabla();
    }, [esAdmin, esCorr, vistaAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

    // Para rango: carga cuando cambian las fechas
    useEffect(() => {
        if ((esAdmin || esCorr) && vistaAdmin === 'rango') cargarTabla();
    }, [esAdmin, esCorr, rangoDesde, rangoHasta]); // eslint-disable-line react-hooks/exhaustive-deps

    // Para mes: recarga cuando cambia el mes seleccionado
    useEffect(() => {
        if ((esAdmin || esCorr) && vistaAdmin === 'mes') cargarTabla();
    }, [esAdmin, esCorr, mesSel, cargarTabla]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Cargar historial por usuario ──────────────────────────────────────────
    const cargarHistorial = useCallback(async () => {
        setCargandoHistorial(true);
        try {
            const fmtDate = (d) =>
                `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
            const hoy = new Date();
            let desde, hasta;
            if (vistaAdmin === 'hoy') {
                desde = hasta = hoyISO();
            } else if (vistaAdmin === 'semana') {
                const dia = hoy.getDay();
                const lunes = new Date(hoy); lunes.setDate(hoy.getDate() - (dia === 0 ? 6 : dia - 1));
                const domingo = new Date(lunes); domingo.setDate(lunes.getDate() + 6);
                desde = fmtDate(lunes); hasta = fmtDate(domingo);
            } else if (vistaAdmin === 'mes') {
                const [y, m] = mesSel.split('-').map(Number);
                const inicio = new Date(y, m - 1, 1);
                const fin    = new Date(y, m, 0);
                desde = fmtDate(inicio); hasta = fmtDate(fin);
            } else {
                desde = rangoDesde; hasta = rangoHasta;
            }
            const [resHist, resRD] = await Promise.all([
                getHistorialPorUsuario(desde, hasta),
                getListaReportes({ inicio: desde, fin: hasta }),
            ]);
            if (resHist.data.ok) setHistorial(resHist.data.data || {});
            if (resRD.data.ok) setReportesManuales(resRD.data.data || []);
        } catch { showToast('Error al cargar el historial por usuario.', 'error'); }
        finally { setCargandoHistorial(false); }
    }, [vistaAdmin, rangoDesde, rangoHasta, mesSel]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if ((esAdmin || esCorr) && pestanaAdmin === 'historial' && vistaAdmin !== 'rango') cargarHistorial();
    }, [esAdmin, esCorr, pestanaAdmin, vistaAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if ((esAdmin || esCorr) && pestanaAdmin === 'historial' && vistaAdmin === 'rango') cargarHistorial();
    }, [esAdmin, esCorr, pestanaAdmin, rangoDesde, rangoHasta]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if ((esAdmin || esCorr) && pestanaAdmin === 'historial' && vistaAdmin === 'mes') cargarHistorial();
    }, [esAdmin, esCorr, pestanaAdmin, mesSel, cargarHistorial]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Detección de cambios sin guardar ────────────────────────────────────
    const hayCambiosSinGuardar = manualesCargados && CAMPOS_MANUALES_KEYS.some(
        k => (manualesEditando[k] ?? 0) !== (manualesGuardados[k] ?? 0)
    );

    // ── Guardar todos los campos manuales de una vez ─────────────────────────
    const [guardandoTodo, setGuardandoTodo] = useState(false);
    const handleGuardarTodo = async () => {
        setGuardandoTodo(true);
        try {
            const changedKeys = CAMPOS_MANUALES_KEYS.filter(
                k => (manualesEditando[k] ?? 0) !== (manualesGuardados[k] ?? 0)
            );
            // Secuencial (no paralelo) para evitar race condition cuando el registro aún no existe:
            // si se crean varias peticiones en paralelo todas ven "no existe" y la última sobreescribe las demás.
            for (const k of changedKeys) {
                const valor = manualesEditando[k] ?? 0;
                if (k === 'oficiosRegistros') await actualizarOficiosRegistro(fechaPropia, valor);
                else await actualizarCampoManual(fechaPropia, k, valor);
            }
            setManualesGuardados({ ...manualesEditando });
            showToast('Reporte guardado correctamente');
            // Refrescar tabla consolidada solo para roles con acceso
            if (esAdmin || esCorr) cargarTabla();
        } catch {
            showToast('Error al guardar', 'error');
        } finally {
            setGuardandoTodo(false);
        }
    };

    // ── Render campo manual genérico (solo input directo) ────────────────────
    const renderCampoManual = (c) => {
        const valGuardado = manualesGuardados[c.key] ?? 0;
        const valEditando = manualesEditando[c.key] ?? 0;
        const cambiado    = valEditando !== valGuardado;
        return (
            <div key={c.key} className={`rd-campo ${cambiado ? 'rd-campo-editado' : ''}`}>
                <label>{c.label}</label>
                <input
                    type="number"
                    min={0}
                    value={valEditando === 0 ? '' : valEditando}
                    onFocus={e => e.target.select()}
                    onChange={e => setManualesEditando(prev => ({ ...prev, [c.key]: Math.max(0, parseInt(e.target.value) || 0) }))}
                    onBlur={e => { if (e.target.value === '') setManualesEditando(prev => ({ ...prev, [c.key]: 0 })); }}
                    className="rd-campo-input-manual"
                    disabled={!manualesCargados}
                    placeholder="0"
                />
            </div>
        );
    };

    // ── Render sección ────────────────────────────────────────────────────────
    const renderSeccion = (titulo, campos, color, esSoloManual = false) => {
        const totalAuto   = campos.filter(c => !c.manual).reduce((s, c) => s + (datosAuto[c.key] || 0), 0);
        const totalManual = campos.filter(c => c.manual).reduce((s, c) => s + (manualesGuardados[c.key] || 0), 0);
        const total = totalAuto + totalManual;
        return (
            <div className="rd-seccion" style={{ '--rd-color': color }}>
                <div className="rd-seccion-titulo">
                    <span className="rd-seccion-barra" />
                    {titulo}
                    <span className="rd-seccion-total-badge">{total} registros</span>
                </div>
                {campos.some(c => !c.manual) && (
                    <div className="rd-campos-grid">
                        {campos.filter(c => !c.manual).map(c => {
                            const val = datosAuto[c.key] || 0;
                            return (
                                <div key={c.key} className={`rd-campo rd-campo-readonly ${val > 0 ? 'rd-campo-activo' : ''}`}>
                                    <label>{c.label}</label>
                                    <div className="rd-valor-auto">
                                        {cargandoAuto ? <span className="rd-cargando-mini">…</span> : <span className="rd-num-grande">{val}</span>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
                {campos.some(c => c.manual) && (
                    <div className="rd-campos-manuales-fila">
                        {campos.filter(c => c.manual).map(c => renderCampoManual(c))}
                    </div>
                )}
            </div>
        );
    };

    // ── Render banner + botón guardar general ─────────────────────────────────
    const renderGuardarGeneral = () => (
        <div className="rd-guardar-general-wrap">
            {hayCambiosSinGuardar && (
                <div className="rd-aviso-cambios">
                    <i className="bi bi-exclamation-triangle-fill" />
                    Tienes cambios sin guardar. Presiona Guardar para aplicarlos.
                </div>
            )}
            <button
                className="rd-btn-guardar-general"
                onClick={handleGuardarTodo}
                disabled={guardandoTodo || !manualesCargados || !hayCambiosSinGuardar}
            >
                {guardandoTodo
                    ? <><i className="bi bi-hourglass-split" /> Guardando...</>
                    : <><i className="bi bi-floppy-fill" /> Guardar reporte</>}
            </button>
        </div>
    );

    // ── Chips resumen ─────────────────────────────────────────────────────────
    const resumenEvalChips = (datos, manuales = {}) => {
        const m = k => manuales[k] || 0;
        const fc = m('opinionTecnicaFC') + m('negacionesFC') + m('informesFC');
        const ff = m('opinionTecnicaFF') + m('negacionesFF') + m('informesFF');
        const camposRol = esSuper ? CAMPOS_SUPERVISION : esEval ? CAMPOS_EVALUACION : esCorr ? CAMPOS_CORRESPONDENCIA : TODOS_CAMPOS;
        const total = camposRol.reduce((s, c) => s + (c.manual ? (manuales[c.key] || 0) : (datos[c.key] || 0)), 0);
        return (
            <div className="rd-eval-resumen">
                <div className="rd-eval-chip rd-eval-chip-total">
                    <span className="rd-eval-chip-label">Total General</span>
                    <span className="rd-eval-chip-val">{total}</span>
                </div>
                {esEval && <>
                    <div className="rd-eval-chip rd-eval-chip-fc">
                        <span className="rd-eval-chip-label">Evaluación de Riesgos F.C.</span>
                        <span className="rd-eval-chip-val">{fc}</span>
                    </div>
                    <div className="rd-eval-chip rd-eval-chip-ff">
                        <span className="rd-eval-chip-label">Evaluación de Riesgos F.F.</span>
                        <span className="rd-eval-chip-val">{ff}</span>
                    </div>
                </>}
            </div>
        );
    };

    return (
        <div className="rd-container">
            {/* ── Encabezado ──────────────────────────────────────────────── */}
            <div className="rd-header">
                <div>
                    <h2 className="rd-titulo">
                        <i className="bi bi-clipboard-data-fill" /> Reporte Diario
                    </h2>
                    <p className="rd-subtitulo">
                        Actividades registradas automáticamente desde seguimientos
                    </p>
                </div>
            </div>

            {/* ── Vista propia: SUPERVISION / EVALUADOR_RIESGO ─────────────── */}
            {(esSuper || esEval) && (
                <div className="rd-card rd-card-form">
                    <div className="rd-card-titulo">
                        <i className="bi bi-bar-chart-fill" />
                        Mis actividades del día
                        <span className="rd-badge-zona">{user?.zona}</span>
                        <span className="rd-badge-auto">
                            <i className="bi bi-lightning-charge-fill" /> Automático
                        </span>
                    </div>

                    <div className="rd-fecha-resumen">
                        <div className="rd-fecha-wrap">
                            <label>Fecha</label>
                            <span className="rd-fecha-fija">{new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        </div>
                        <p className="rd-info-auto">
                            <i className="bi bi-info-circle" />
                            Los conteos se calculan automáticamente a partir de los seguimientos registrados en el sistema.
                        </p>
                    </div>

                    {resumenEvalChips(datosAuto, manualesGuardados)}

                    {esSuper && renderSeccion('Supervisión',           CAMPOS_SUPERVISION, '#1565c0')}
                    {esEval  && renderSeccion('Evaluación de Riesgos', CAMPOS_EVALUACION,  '#e65100')}

                    {renderGuardarGeneral()}
                </div>
            )}

            {/* ── Vista admin / correspondencia: pestañas ───────────────────── */}
            {(esAdmin || esCorr) && (
                <div className="rd-card">
                    {/* Pestañas + filtros en la misma fila */}
                    <div className="rd-pestanas-bar">
                        <div className="rd-pestanas">
                            {esCorr && (
                                <button
                                    className={`rd-pestana ${pestanaAdmin === 'mis-actividades' ? 'rd-pestana-activa' : ''}`}
                                    onClick={() => setPestanaAdmin('mis-actividades')}
                                >
                                    <i className="bi bi-bar-chart-fill" /> Mis actividades
                                </button>
                            )}
                            <button
                                className={`rd-pestana ${pestanaAdmin === 'resumen' ? 'rd-pestana-activa' : ''}`}
                                onClick={() => setPestanaAdmin('resumen')}
                            >
                                <i className="bi bi-table" /> Resumen por zona
                            </button>
                            <button
                                className={`rd-pestana ${pestanaAdmin === 'historial' ? 'rd-pestana-activa' : ''}`}
                                onClick={() => setPestanaAdmin('historial')}
                            >
                                <i className="bi bi-person-lines-fill" /> Historial por usuario
                            </button>
                        </div>

                        {pestanaAdmin !== 'mis-actividades' && (
                        <div className="rd-filtros">
                            <div className="rd-filtros-tabs">
                                {[
                                    { id: 'hoy',    label: 'Hoy',    icon: 'bi-calendar-check' },
                                    { id: 'semana', label: 'Semana', icon: 'bi-calendar-week' },
                                    { id: 'mes',    label: 'Mes',    icon: 'bi-calendar-month' },
                                    { id: 'rango',  label: 'Rango',  icon: 'bi-calendar-range' },
                                ].map(t => (
                                    <button key={t.id}
                                        className={`rd-tab ${vistaAdmin === t.id ? 'rd-tab-activo' : ''}`}
                                        onClick={() => setVistaAdmin(t.id)}
                                    >
                                        <i className={`bi ${t.icon}`} /> {t.label}
                                    </button>
                                ))}
                            </div>

                            <button className="rd-btn-refrescar" onClick={pestanaAdmin === 'historial' ? cargarHistorial : cargarTabla} title="Refrescar">
                                <i className={`bi bi-arrow-clockwise ${(cargandoTabla || cargandoHistorial) ? 'rd-spin' : ''}`} />
                            </button>
                        </div>
                        )}
                    </div>

                    {pestanaAdmin !== 'mis-actividades' && (vistaAdmin === 'mes' || vistaAdmin === 'rango') && (
                        <div className="rd-rango-bar">
                            {vistaAdmin === 'mes' && (
                                <input
                                    type="month"
                                    value={mesSel}
                                    onChange={e => setMesSel(e.target.value)}
                                    className="rd-fecha-input rd-mes-input"
                                />
                            )}
                            {vistaAdmin === 'rango' && (
                                <div className="rd-rango">
                                    <input type="date" value={rangoDesde}
                                        onChange={e => setRangoDesde(e.target.value)}
                                        className="rd-fecha-input" />
                                    <span className="rd-rango-sep">–</span>
                                    <input type="date" value={rangoHasta}
                                        onChange={e => setRangoHasta(e.target.value)}
                                        className="rd-fecha-input" />
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Pestaña: Mis actividades (solo CORRESPONDENCIA) ── */}
                    {pestanaAdmin === 'mis-actividades' && esCorr && (
                        <div className="rd-pestana-contenido">
                            <div className="rd-fecha-resumen" style={{ paddingTop: 16 }}>
                                <div className="rd-fecha-wrap">
                                    <label>Fecha</label>
                                    <span className="rd-fecha-fija">{new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                </div>
                            </div>
                            {resumenEvalChips({}, manualesGuardados)}
                            {renderSeccion('Correspondencia', CAMPOS_CORRESPONDENCIA, '#2d6a4f')}
                            {renderGuardarGeneral()}
                        </div>
                    )}

                    {/* ── Pestaña: Historial por usuario ── */}
                    {pestanaAdmin === 'historial' && (
                        <div className="rd-pestana-contenido">
                        <div className="rd-historial-wrap" style={{ opacity: cargandoHistorial ? 0.45 : 1, transition: 'opacity .25s', pointerEvents: cargandoHistorial ? 'none' : 'auto' }}>
                            {(() => {
                                // Construir estructura combinada: seguimientos + entradas manuales
                                const CM = [
                                    ...CAMPOS_SUPERVISION.filter(c => c.manual),
                                    ...CAMPOS_EVALUACION.filter(c => c.manual),
                                    ...CAMPOS_CORRESPONDENCIA,
                                ];
                                // zonaData: { ZONA: { nombreUsuario: { segs: [], manuales: [] } } }
                                const zonaData = {};
                                // Agregar seguimientos
                                Object.entries(historial).forEach(([zona, usuarios]) => {
                                    if (!zonaData[zona]) zonaData[zona] = {};
                                    Object.entries(usuarios).forEach(([nombre, segs]) => {
                                        if (!zonaData[zona][nombre]) zonaData[zona][nombre] = { segs: [], manuales: [] };
                                        zonaData[zona][nombre].segs = segs;
                                    });
                                });
                                // Agregar entradas manuales
                                reportesManuales.forEach(r => {
                                    const zona = r.zona || 'SIN_ZONA';
                                    const nombre = r.usuarioNombre;
                                    if (!nombre) return;
                                    if (!zonaData[zona]) zonaData[zona] = {};
                                    if (!zonaData[zona][nombre]) zonaData[zona][nombre] = { segs: [], manuales: [] };
                                    const entradas = CM.filter(c => (r[c.key] ?? 0) > 0).map(c => ({ label: c.label, valor: r[c.key], fecha: r.fecha }));
                                    zonaData[zona][nombre].manuales.push(...entradas);
                                });

                                if (Object.keys(zonaData).length === 0 && !cargandoHistorial) {
                                    return <div className="rd-sin-datos"><i className="bi bi-inbox" /> Sin registros en el periodo seleccionado</div>;
                                }

                                return Object.entries(zonaData).map(([zona, usuarios]) => (
                                    <div key={zona} className="rd-hist-zona">
                                        <div className="rd-hist-zona-titulo">
                                            <i className="bi bi-geo-alt-fill" /> {zona}
                                            <span className="rd-hist-zona-count">
                                                {Object.values(usuarios).reduce((s, v) => s + v.segs.length, 0)} seguimientos
                                            </span>
                                            {Object.values(usuarios).reduce((s, v) => s + v.manuales.length, 0) > 0 && (
                                                <span className="rd-hist-zona-count" style={{ background: '#4a6fa5', marginLeft: 4 }}>
                                                    {Object.values(usuarios).reduce((s, v) => s + v.manuales.length, 0)} manuales
                                                </span>
                                            )}
                                        </div>
                                        {Object.entries(usuarios).map(([nombreUsuario, { segs, manuales }]) => {
                                            const initials = nombreUsuario.split(' ').slice(0,2).map(p => p[0]).join('').toUpperCase();
                                            return (
                                            <div key={nombreUsuario} className="rd-hist-usuario">
                                                <div className="rd-hist-usuario-header">
                                                    <div className="rd-hist-usuario-avatar">{initials}</div>
                                                    <div className="rd-hist-usuario-info">
                                                        <div className="rd-hist-usuario-nombre">{nombreUsuario}</div>
                                                        <div className="rd-hist-usuario-meta">{zona}</div>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                                        <span className="rd-hist-usuario-count">{segs.length} seguimiento{segs.length !== 1 ? 's' : ''}</span>
                                                        {manuales.length > 0 && (
                                                            <span className="rd-hist-usuario-count" style={{ background: '#dbeafe', color: '#1e40af', border: '1px solid #93c5fd' }}>
                                                                {manuales.length} manual{manuales.length !== 1 ? 'es' : ''}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                {segs.length > 0 && (
                                                <div className="rd-hist-segs">
                                                    {(expandidos[`${zona}-${nombreUsuario}`] ? segs : segs.slice(0, LIMITE_SEGS)).map(seg => (
                                                        <div key={seg.id} className="rd-hist-seg-item">
                                                            <span className="rd-hist-seg-dot" />
                                                            <div className="rd-hist-seg-body">
                                                                <div className="rd-hist-seg-tipo">{seg.tipoActividadLabel}</div>
                                                                <div className="rd-hist-seg-info">
                                                                    <span className="rd-hist-seg-imputado">
                                                                        <i className="bi bi-person-fill" /> {seg.imputadoNombre || '—'}
                                                                    </span>
                                                                    <span className="rd-hist-seg-fecha">
                                                                        <i className="bi bi-clock" />
                                                                        {seg.fechaRegistro ? new Date(seg.fechaRegistro).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                                                                    </span>
                                                                </div>
                                                                {seg.detalles && <div className="rd-hist-seg-detalles">
                                                                    {(() => {
                                                                        const m = seg.detalles.match(/^\[([^\]]+)\]\s*([\s\S]*)$/);
                                                                        if (m) return <><span className="rd-otro-tag">{m[1]}</span>{m[2] && <span> {m[2]}</span>}</>;
                                                                        return seg.detalles;
                                                                    })()}
                                                                </div>}
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {segs.length > LIMITE_SEGS && (
                                                        <button
                                                            className="rd-hist-ver-mas"
                                                            onClick={() => toggleExpandido(`${zona}-${nombreUsuario}`)}
                                                        >
                                                            {expandidos[`${zona}-${nombreUsuario}`]
                                                                ? <><i className="bi bi-chevron-up" /> Ver menos</>
                                                                : <><i className="bi bi-chevron-down" /> Ver {segs.length - LIMITE_SEGS} más</>
                                                            }
                                                        </button>
                                                    )}
                                                </div>
                                                )}
                                                {manuales.length > 0 && (() => {
                                                    const keyMan = `man-${zona}-${nombreUsuario}`;
                                                    const expandidoMan = expandidos[keyMan];
                                                    const visibles = expandidoMan ? manuales : manuales.slice(0, LIMITE_SEGS);
                                                    return (
                                                    <div className="rd-hist-manual-wrap">
                                                        <div className="rd-hist-manual-titulo"><i className="bi bi-pencil-square" /> Registros manuales</div>
                                                        {visibles.map((e, i) => (
                                                            <div key={i} className="rd-hist-seg-item">
                                                                <span className="rd-hist-seg-dot rd-hist-dot-manual" />
                                                                <div className="rd-hist-seg-body">
                                                                    <div className="rd-hist-seg-tipo">{e.label}</div>
                                                                    <div className="rd-hist-seg-info">
                                                                        <span className="rd-hist-seg-cantidad"><i className="bi bi-hash" /> {e.valor}</span>
                                                                        <span className="rd-hist-seg-fecha"><i className="bi bi-calendar3" /> {e.fecha}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {manuales.length > LIMITE_SEGS && (
                                                            <button className="rd-hist-ver-mas" onClick={() => toggleExpandido(keyMan)}>
                                                                {expandidoMan
                                                                    ? <><i className="bi bi-chevron-up" /> Ver menos</>
                                                                    : <><i className="bi bi-chevron-down" /> Ver {manuales.length - LIMITE_SEGS} más</>
                                                                }
                                                            </button>
                                                        )}
                                                    </div>
                                                    );
                                                })()}
                                            </div>
                                            );
                                        })}
                                    </div>
                                ));
                            })()}
                        </div>
                        </div>
                    )}

                    {/* ── Pestaña: Resumen por zona ── */}
                    {pestanaAdmin === 'resumen' && <div className="rd-pestana-contenido"><div style={{ opacity: cargandoTabla ? 0.45 : 1, transition: 'opacity .25s', pointerEvents: cargandoTabla ? 'none' : 'auto' }}>
                    {/* Chips resumen global */}
                    {(() => {
                        const todasZonas = [...ZONAS, ...(consolidado['SIN_ZONA'] ? ['SIN_ZONA'] : [])];
                        const sumaAuto = {};
                        const sumaManual = {};
                        TODOS_CAMPOS.forEach(c => {
                            sumaAuto[c.key]   = todasZonas.reduce((s, z) => s + (consolidado[z]?.[c.key] || 0), 0);
                            sumaManual[c.key] = todasZonas.reduce((s, z) => s + (consolidadoRD[z]?.[c.key] || 0), 0);
                        });
                        return resumenEvalChips(sumaAuto, sumaManual);
                    })()}

                    <div className="rd-tabla-wrap">
                        <table className="rd-tabla">
                            <thead>
                                <tr>
                                    <th className="rd-th-actividad">ACTIVIDAD</th>
                                    {ZONAS.map(z => <th key={z} className="rd-th-zona">{z}</th>)}
                                    {consolidado['SIN_ZONA'] && <th className="rd-th-zona" style={{ color: '#9ca3af' }}>SIN ZONA</th>}
                                    <th className="rd-th-total">TOTAL</th>
                                </tr>
                            </thead>
                            <tbody>
                                {false ? null : (
                                    <>
                                        {(() => {
                                            const todasZonas = [...ZONAS, ...(consolidado['SIN_ZONA'] ? ['SIN_ZONA'] : [])];
                                            // Obtiene el valor de un campo en una zona (manual → consolidadoRD, auto → consolidado)
                                            const getVal = (c, z) => c.manual
                                                ? (consolidadoRD[z]?.[c.key] ?? 0)
                                                : (consolidado[z]?.[c.key] ?? 0);
                                            const getTotal = (c) => todasZonas.reduce((s, z) => s + getVal(c, z), 0);
                                            const colSpan = 1 + ZONAS.length + (consolidado['SIN_ZONA'] ? 1 : 0) + 1;
                                            return [
                                                { titulo: 'Supervisión',           campos: CAMPOS_SUPERVISION,    cls: 'rd-sec-super' },
                                                { titulo: 'Evaluación de Riesgos', campos: CAMPOS_EVALUACION,    cls: 'rd-sec-eval'  },
                                                { titulo: 'Correspondencia',       campos: CAMPOS_CORRESPONDENCIA, cls: 'rd-sec-corr' },
                                            ].map(({ titulo, campos, cls }) => {
                                                const conValor = campos.filter(c => getTotal(c) > 0);
                                                const sinValor = campos.filter(c => getTotal(c) === 0);
                                                return (
                                                    <React.Fragment key={titulo}>
                                                        <tr className={`rd-seccion-row ${cls}`}><td colSpan={colSpan}>{titulo}</td></tr>
                                                        {[...conValor, ...sinValor].map(c => {
                                                            const total = getTotal(c);
                                                            return (
                                                                <tr key={c.key} className={total === 0 ? 'rd-fila-cero' : ''}>
                                                                    <td className="rd-td-actividad">{c.label}</td>
                                                                    {ZONAS.map(z => <td key={z} className="rd-td-num">{getVal(c, z)}</td>)}
                                                                    {consolidado['SIN_ZONA'] && <td className="rd-td-num" style={{ color: '#9ca3af' }}>{getVal(c, 'SIN_ZONA')}</td>}
                                                                    <td className="rd-td-total">{total}</td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </React.Fragment>
                                                );
                                            });
                                        })()}
                                        <tr className="rd-fila-gran-total">
                                            <td>TOTAL GENERAL</td>
                                            {ZONAS.map(z => (
                                                <td key={z} className="rd-td-total">
                                                    {TODOS_CAMPOS.reduce((s, c) => s + (c.manual ? (consolidadoRD[z]?.[c.key] || 0) : (consolidado[z]?.[c.key] || 0)), 0)}
                                                </td>
                                            ))}
                                            {consolidado['SIN_ZONA'] && (
                                                <td className="rd-td-total" style={{ color: '#9ca3af' }}>
                                                    {TODOS_CAMPOS.reduce((s, c) => s + (c.manual ? (consolidadoRD['SIN_ZONA']?.[c.key] || 0) : (consolidado['SIN_ZONA']?.[c.key] || 0)), 0)}
                                                </td>
                                            )}
                                            <td className="rd-td-total">
                                                {TODOS_CAMPOS.reduce((a, c) => a + [...ZONAS, ...(consolidado['SIN_ZONA'] ? ['SIN_ZONA'] : [])].reduce((s, z) => s + (c.manual ? (consolidadoRD[z]?.[c.key] || 0) : (consolidado[z]?.[c.key] || 0)), 0), 0)}
                                            </td>
                                        </tr>
                                    </>
                                )}
                            </tbody>
                        </table>
                    </div>
                    </div>
                    </div>}
                </div>
            )}
        </div>
    );
}
