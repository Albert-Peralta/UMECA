import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getReporteAutomatico, getReporteConsolidado, getHistorialPorUsuario } from '../api/seguimientosApi';
import { getMiReportePorFecha, actualizarOficiosRegistro } from '../api/reporteDiarioApi';
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
];

const CAMPOS_EVALUACION = [
    { key: 'oficiosRegistros',      label: 'Oficios de registros',          tipo: 'OFICIO_REGISTRO' },
    { key: 'opinionTecnicaFC',      label: 'Opinión técnica F.C.',           tipo: 'OPINION_TECNICA_FC' },
    { key: 'opinionTecnicaFF',      label: 'Opinión técnica F.F.',           tipo: 'OPINION_TECNICA_FF' },
    { key: 'negacionesFC',          label: 'Negaciones F.C.',                tipo: 'NEGACION_FC' },
    { key: 'negacionesFF',          label: 'Negaciones F.F.',                tipo: 'NEGACION_FF' },
    { key: 'informesFC',            label: 'Informes F.C.',                  tipo: 'INFORME_FC' },
    { key: 'informesFF',            label: 'Informes F.F.',                  tipo: 'INFORME_FF' },
    { key: 'otro',                  label: 'Otro',                           tipo: 'OTRO' },
];

const TODOS_CAMPOS = [...CAMPOS_SUPERVISION, ...CAMPOS_EVALUACION];

const ZONAS = ['XOCHITEPEC', 'CUAUTLA', 'JOJUTLA'];

// Convierte la respuesta del backend (Map<TipoActividad,Long>) a un objeto { key: count }
const mapearCuentas = (data) => {
    const out = Object.fromEntries(TODOS_CAMPOS.map(c => [c.key, 0]));
    TODOS_CAMPOS.forEach(c => { if (data[c.tipo] != null) out[c.key] = data[c.tipo]; });
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

    const esAdmin = rol === 'ADMINISTRADOR' || rol === 'SUPERADMIN' || rol === 'CORRESPONDENCIA';
    const esSuper = rol === 'SUPERVISION';
    const esEval  = rol === 'EVALUADOR_RIESGO';

    // ── Estado: vista propia (no admin) ──────────────────────────────────────
    const [fechaPropia, setFechaPropia]   = useState(hoyISO());
    const [datosAuto,   setDatosAuto]     = useState({});
    const [cargandoAuto, setCargandoAuto] = useState(false);

    // ── Estado: campo manual oficios de registro (solo evaluador) ────────────
    // oficiosGuardados: valor confirmado (afecta el total)
    // oficiosEditando:  valor en edición (solo afecta el input)
    const [oficiosGuardados,  setOficiosGuardados]  = useState(0);
    const [oficiosEditando,   setOficiosEditando]   = useState(0);
    const [guardandoOficios,  setGuardandoOficios]  = useState(false);
    const [oficiosCargados,   setOficiosCargados]   = useState(false);

    useEffect(() => {
        if (esAdmin || !user?.zona) return;
        setCargandoAuto(true);
        getReporteAutomatico(fechaPropia, user.zona)
            .then(res => {
                if (res.data.ok) setDatosAuto(mapearCuentas(res.data.data || {}));
                else setDatosAuto({});
            })
            .catch(() => { setDatosAuto({}); showToast('Error al cargar el reporte diario.', 'error'); })
            .finally(() => setCargandoAuto(false));
    }, [esAdmin, fechaPropia, user?.zona]); // eslint-disable-line react-hooks/exhaustive-deps

    // Carga el valor guardado de oficiosRegistros al cambiar la fecha (solo evaluador)
    useEffect(() => {
        if (!esEval) return;
        setOficiosCargados(false);
        getMiReportePorFecha(fechaPropia)
            .then(res => {
                const val = res.data?.data?.oficiosRegistros ?? 0;
                setOficiosGuardados(val);
                setOficiosEditando(val);
            })
            .catch(() => { setOficiosGuardados(0); setOficiosEditando(0); })
            .finally(() => setOficiosCargados(true));
    }, [esEval, fechaPropia]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleGuardarOficios = async () => {
        setGuardandoOficios(true);
        try {
            await actualizarOficiosRegistro(fechaPropia, oficiosEditando);
            setOficiosGuardados(oficiosEditando); // solo aquí se actualiza el total
            showToast('Oficios de registro guardados');
        } catch {
            showToast('Error al guardar oficios de registro', 'error');
        } finally {
            setGuardandoOficios(false);
        }
    };

    // ── Estado: pestaña admin ─────────────────────────────────────────────────
    const [pestanaAdmin, setPestanaAdmin] = useState('resumen'); // 'resumen' | 'historial'
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
    const [cargandoTabla, setCargandoTabla] = useState(false);

    // ── Estado: historial por usuario ─────────────────────────────────────────
    const [historial,        setHistorial]        = useState({});
    const [cargandoHistorial, setCargandoHistorial] = useState(false);

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

            const res = await getReporteConsolidado(desde, hasta);
            if (res.data.ok) {
                const rawPorZona = res.data.data || {};
                // rawPorZona: { XOCHITEPEC: { OFICIO_CSP: 2, ... }, SIN_ZONA: { ... }, ... }
                const nuevo = {};
                // Inicializar todas las zonas conocidas con 0
                ZONAS.forEach(z => { nuevo[z] = mapearCuentas(rawPorZona[z] || {}); });
                // Agregar SIN_ZONA a la primera zona conocida como fallback visible
                if (rawPorZona['SIN_ZONA']) {
                    const sinZona = rawPorZona['SIN_ZONA'];
                    // Acumularlo en la tabla sin zona propia — se muestra como zona extra
                    nuevo['SIN_ZONA'] = mapearCuentas(sinZona);
                }
                setConsolidado(nuevo);
            }
        } catch { showToast('Error al cargar el reporte consolidado.', 'error'); }
        finally { setCargandoTabla(false); }
    }, [vistaAdmin, rangoDesde, rangoHasta, mesSel]); // eslint-disable-line react-hooks/exhaustive-deps

    // Carga inicial y cuando cambia el filtro (excepto rango — espera el botón refrescar)
    useEffect(() => {
        if (esAdmin && vistaAdmin !== 'rango') cargarTabla();
    }, [esAdmin, vistaAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

    // Para rango: carga cuando cambian las fechas
    useEffect(() => {
        if (esAdmin && vistaAdmin === 'rango') cargarTabla();
    }, [esAdmin, rangoDesde, rangoHasta]); // eslint-disable-line react-hooks/exhaustive-deps

    // Para mes: recarga cuando cambia el mes seleccionado
    useEffect(() => {
        if (esAdmin && vistaAdmin === 'mes') cargarTabla();
    }, [esAdmin, mesSel, cargarTabla]); // eslint-disable-line react-hooks/exhaustive-deps

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
            const res = await getHistorialPorUsuario(desde, hasta);
            if (res.data.ok) setHistorial(res.data.data || {});
        } catch { showToast('Error al cargar el historial por usuario.', 'error'); }
        finally { setCargandoHistorial(false); }
    }, [vistaAdmin, rangoDesde, rangoHasta, mesSel]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (esAdmin && pestanaAdmin === 'historial' && vistaAdmin !== 'rango') cargarHistorial();
    }, [esAdmin, pestanaAdmin, vistaAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (esAdmin && pestanaAdmin === 'historial' && vistaAdmin === 'rango') cargarHistorial();
    }, [esAdmin, pestanaAdmin, rangoDesde, rangoHasta]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (esAdmin && pestanaAdmin === 'historial' && vistaAdmin === 'mes') cargarHistorial();
    }, [esAdmin, pestanaAdmin, mesSel, cargarHistorial]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Render sección (modo solo lectura) ────────────────────────────────────
    const renderSeccion = (titulo, campos, color) => {
        // Para evaluación: el total incluye oficiosRegistros (manual) + seguimientos automáticos
        const totalAuto = campos
            .filter(c => c.key !== 'oficiosRegistros')
            .reduce((s, c) => s + (datosAuto[c.key] || 0), 0);
        const total = totalAuto + (esEval ? oficiosGuardados : 0);
        return (
            <div className="rd-seccion" style={{ '--rd-color': color }}>
                <div className="rd-seccion-titulo">
                    <span className="rd-seccion-barra" />
                    {titulo}
                    <span className="rd-seccion-total-badge">{total} registros</span>
                </div>
                <div className="rd-campos-grid">
                    {campos.map(c => {
                        // Campo manual editable solo para oficiosRegistros en la vista del evaluador
                        if (c.key === 'oficiosRegistros' && esEval) {
                            return (
                                <div key={c.key} className={`rd-campo ${oficiosGuardados > 0 ? 'rd-campo-activo' : ''}`}>
                                    <label>{c.label}</label>
                                    <div className="rd-oficios-manual">
                                        <div className="rd-oficios-controles">
                                            <button
                                                className="rd-oficios-btn"
                                                onClick={() => setOficiosEditando(v => Math.max(0, v - 1))}
                                                disabled={oficiosEditando <= 0 || !oficiosCargados}
                                            >−</button>
                                            <input
                                                type="number"
                                                min={0}
                                                value={oficiosEditando}
                                                onChange={e => setOficiosEditando(Math.max(0, parseInt(e.target.value) || 0))}
                                                className="rd-oficios-input"
                                                disabled={!oficiosCargados}
                                            />
                                            <button
                                                className="rd-oficios-btn"
                                                onClick={() => setOficiosEditando(v => v + 1)}
                                                disabled={!oficiosCargados}
                                            >+</button>
                                        </div>
                                        <button
                                            className="rd-oficios-guardar"
                                            onClick={handleGuardarOficios}
                                            disabled={guardandoOficios || !oficiosCargados}
                                        >
                                            {guardandoOficios ? '…' : <><i className="bi bi-floppy" /> Guardar</>}
                                        </button>
                                    </div>
                                </div>
                            );
                        }
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
            </div>
        );
    };

    // ── Chips resumen ─────────────────────────────────────────────────────────
    const resumenEvalChips = (datos) => {
        const v = k => datos[k] || 0;
        const fc = v('opinionTecnicaFC') + v('negacionesFC') + v('informesFC');
        const ff = v('opinionTecnicaFF') + v('negacionesFF') + v('informesFF');
        const camposRol = esSuper ? CAMPOS_SUPERVISION : esEval ? CAMPOS_EVALUACION : TODOS_CAMPOS;
        const total = camposRol.reduce((s, c) => s + (c.key === 'oficiosRegistros' ? oficiosGuardados : (datos[c.key] || 0)), 0);
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

            {/* ── Vista propia: resumen automático por fecha ───────────────── */}
            {!esAdmin && (
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
                            <input
                                type="date"
                                value={fechaPropia}
                                onChange={e => setFechaPropia(e.target.value)}
                                className="rd-fecha-input"
                            />
                        </div>
                        <p className="rd-info-auto">
                            <i className="bi bi-info-circle" />
                            Los conteos se calculan automáticamente a partir de los seguimientos registrados en el sistema.
                        </p>
                    </div>

                    {resumenEvalChips(datosAuto)}

                    {esSuper  && renderSeccion('Supervisión',          CAMPOS_SUPERVISION, '#1565c0')}
                    {esEval   && renderSeccion('Evaluación de Riesgos', CAMPOS_EVALUACION,  '#e65100')}
                </div>
            )}

            {/* ── Vista admin: pestañas ─────────────────────────────────────── */}
            {esAdmin && (
                <div className="rd-card">
                    {/* Pestañas + filtros en la misma fila */}
                    <div className="rd-pestanas-bar">
                        <div className="rd-pestanas">
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
                    </div>

                    {(vistaAdmin === 'mes' || vistaAdmin === 'rango') && (
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

                    {/* ── Pestaña: Historial por usuario ── */}
                    {pestanaAdmin === 'historial' && (
                        <div className="rd-pestana-contenido">
                        <div className="rd-historial-wrap" style={{ opacity: cargandoHistorial ? 0.45 : 1, transition: 'opacity .25s', pointerEvents: cargandoHistorial ? 'none' : 'auto' }}>
                            {Object.keys(historial).length === 0 && !cargandoHistorial ? (
                                <div className="rd-sin-datos"><i className="bi bi-inbox" /> Sin seguimientos en el periodo seleccionado</div>
                            ) : (
                                Object.entries(historial).map(([zona, usuarios]) => (
                                    <div key={zona} className="rd-hist-zona">
                                        <div className="rd-hist-zona-titulo">
                                            <i className="bi bi-geo-alt-fill" /> {zona}
                                            <span className="rd-hist-zona-count">
                                                {Object.values(usuarios).reduce((s, v) => s + v.length, 0)} registros
                                            </span>
                                        </div>
                                        {Object.entries(usuarios).map(([nombreUsuario, seguimientos]) => {
                                            const initials = nombreUsuario.split(' ').slice(0,2).map(p => p[0]).join('').toUpperCase();
                                            return (
                                            <div key={nombreUsuario} className="rd-hist-usuario">
                                                <div className="rd-hist-usuario-header">
                                                    <div className="rd-hist-usuario-avatar">{initials}</div>
                                                    <div className="rd-hist-usuario-info">
                                                        <div className="rd-hist-usuario-nombre">{nombreUsuario}</div>
                                                        <div className="rd-hist-usuario-meta">{zona}</div>
                                                    </div>
                                                    <span className="rd-hist-usuario-count">{seguimientos.length} seguimiento{seguimientos.length !== 1 ? 's' : ''}</span>
                                                </div>
                                                <div className="rd-hist-segs">
                                                    {(expandidos[`${zona}-${nombreUsuario}`] ? seguimientos : seguimientos.slice(0, LIMITE_SEGS)).map(seg => (
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
                                                                {seg.detalles && <div className="rd-hist-seg-detalles">{seg.detalles}</div>}
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {seguimientos.length > LIMITE_SEGS && (
                                                        <button
                                                            className="rd-hist-ver-mas"
                                                            onClick={() => toggleExpandido(`${zona}-${nombreUsuario}`)}
                                                        >
                                                            {expandidos[`${zona}-${nombreUsuario}`]
                                                                ? <><i className="bi bi-chevron-up" /> Ver menos</>
                                                                : <><i className="bi bi-chevron-down" /> Ver {seguimientos.length - LIMITE_SEGS} más</>
                                                            }
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            );
                                        })}
                                    </div>
                                ))
                            )}
                        </div>
                        </div>
                    )}

                    {/* ── Pestaña: Resumen por zona ── */}
                    {pestanaAdmin === 'resumen' && <div className="rd-pestana-contenido"><div style={{ opacity: cargandoTabla ? 0.45 : 1, transition: 'opacity .25s', pointerEvents: cargandoTabla ? 'none' : 'auto' }}>
                    {/* Chips resumen global */}
                    {(() => {
                        const todasZonas = [...ZONAS, ...(consolidado['SIN_ZONA'] ? ['SIN_ZONA'] : [])];
                        const suma = {};
                        TODOS_CAMPOS.forEach(c => {
                            suma[c.key] = todasZonas.reduce((s, z) => s + (consolidado[z]?.[c.key] || 0), 0);
                        });
                        return resumenEvalChips(suma);
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
                                        {[
                                            { titulo: 'Supervisión',           campos: CAMPOS_SUPERVISION, cls: 'rd-sec-super' },
                                            { titulo: 'Evaluación de Riesgos', campos: CAMPOS_EVALUACION,  cls: 'rd-sec-eval'  },
                                        ].map(({ titulo, campos, cls }) => {
                                            // Incluir SIN_ZONA en el conteo total
                                            const todasZonas = [...ZONAS, ...(consolidado['SIN_ZONA'] ? ['SIN_ZONA'] : [])];
                                            const conValor = campos.filter(c => todasZonas.reduce((s, z) => s + (consolidado[z]?.[c.key] || 0), 0) > 0);
                                            const sinValor = campos.filter(c => todasZonas.reduce((s, z) => s + (consolidado[z]?.[c.key] || 0), 0) === 0);
                                            return (
                                                <React.Fragment key={titulo}>
                                                    <tr className={`rd-seccion-row ${cls}`}><td colSpan={6}>{titulo}</td></tr>
                                                    {[...conValor, ...sinValor].map(c => {
                                                        const total = todasZonas.reduce((s, z) => s + (consolidado[z]?.[c.key] || 0), 0);
                                                        return (
                                                            <tr key={c.key} className={total === 0 ? 'rd-fila-cero' : ''}>
                                                                <td className="rd-td-actividad">{c.label}</td>
                                                                {ZONAS.map(z => <td key={z} className="rd-td-num">{consolidado[z]?.[c.key] ?? 0}</td>)}
                                                                {consolidado['SIN_ZONA'] && <td className="rd-td-num" style={{ color: '#9ca3af' }}>{consolidado['SIN_ZONA']?.[c.key] ?? 0}</td>}
                                                                <td className="rd-td-total">{total}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </React.Fragment>
                                            );
                                        })}
                                        <tr className="rd-fila-gran-total">
                                            <td>TOTAL GENERAL</td>
                                            {ZONAS.map(z => (
                                                <td key={z} className="rd-td-total">
                                                    {TODOS_CAMPOS.reduce((s, c) => s + (consolidado[z]?.[c.key] || 0), 0)}
                                                </td>
                                            ))}
                                            {consolidado['SIN_ZONA'] && (
                                                <td className="rd-td-total" style={{ color: '#9ca3af' }}>
                                                    {TODOS_CAMPOS.reduce((s, c) => s + (consolidado['SIN_ZONA']?.[c.key] || 0), 0)}
                                                </td>
                                            )}
                                            <td className="rd-td-total">
                                                {TODOS_CAMPOS.reduce((a, c) => a + [...ZONAS, ...(consolidado['SIN_ZONA'] ? ['SIN_ZONA'] : [])].reduce((s, z) => s + (consolidado[z]?.[c.key] || 0), 0), 0)}
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
