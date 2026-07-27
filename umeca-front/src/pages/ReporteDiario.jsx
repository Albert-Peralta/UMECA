import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getReporteAutomatico, getReporteConsolidado } from '../api/seguimientosApi';
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

    const esAdmin = rol === 'ADMINISTRADOR' || rol === 'SUPERADMIN';
    const esSuper = rol === 'SUPERVISION';
    const esEval  = rol === 'EVALUADOR_RIESGO';

    // ── Estado: vista propia (no admin) ──────────────────────────────────────
    const [fechaPropia, setFechaPropia]   = useState(hoyISO());
    const [datosAuto,   setDatosAuto]     = useState({});
    const [cargandoAuto, setCargandoAuto] = useState(false);

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

    // ── Estado: vista admin (tabla consolidada por zona) ──────────────────────
    const [vistaAdmin,    setVistaAdmin]    = useState('hoy');   // 'hoy' | 'semana' | 'mes' | 'rango'
    const [rangoDesde,    setRangoDesde]    = useState(hoyISO());
    const [rangoHasta,    setRangoHasta]    = useState(hoyISO());
    const [consolidado,   setConsolidado]   = useState({});
    const [cargandoTabla, setCargandoTabla] = useState(false);

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
                const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
                const fin    = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
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
    }, [vistaAdmin, rangoDesde, rangoHasta]); // eslint-disable-line react-hooks/exhaustive-deps

    // Carga inicial y cuando cambia el filtro (excepto rango — espera el botón refrescar)
    useEffect(() => {
        if (esAdmin && vistaAdmin !== 'rango') cargarTabla();
    }, [esAdmin, vistaAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

    // Para rango: carga cuando cambian las fechas (tras pulsar refrescar lo hace useCallback)
    useEffect(() => {
        if (esAdmin && vistaAdmin === 'rango') cargarTabla();
    }, [esAdmin, rangoDesde, rangoHasta]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Render sección (modo solo lectura) ────────────────────────────────────
    const renderSeccion = (titulo, campos, color) => {
        const total = campos.reduce((s, c) => s + (datosAuto[c.key] || 0), 0);
        return (
            <div className="rd-seccion" style={{ '--rd-color': color }}>
                <div className="rd-seccion-titulo">
                    <span className="rd-seccion-barra" />
                    {titulo}
                    <span className="rd-seccion-total-badge">{total} registros</span>
                </div>
                <div className="rd-campos-grid">
                    {campos.map(c => {
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

    // ── Chips resumen evaluación ──────────────────────────────────────────────
    const resumenEvalChips = (datos) => {
        const v = k => datos[k] || 0;
        const fc = v('opinionTecnicaFC') + v('negacionesFC') + v('informesFC');
        const ff = v('opinionTecnicaFF') + v('negacionesFF') + v('informesFF');
        const total = TODOS_CAMPOS.reduce((s, c) => s + (datos[c.key] || 0), 0);
        return (
            <div className="rd-eval-resumen">
                <div className="rd-eval-chip rd-eval-chip-total">
                    <span className="rd-eval-chip-label">Total General</span>
                    <span className="rd-eval-chip-val">{total}</span>
                </div>
                <div className="rd-eval-chip rd-eval-chip-fc">
                    <span className="rd-eval-chip-label">Evaluación de Riesgos F.C.</span>
                    <span className="rd-eval-chip-val">{fc}</span>
                </div>
                <div className="rd-eval-chip rd-eval-chip-ff">
                    <span className="rd-eval-chip-label">Evaluación de Riesgos F.F.</span>
                    <span className="rd-eval-chip-val">{ff}</span>
                </div>
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

            {/* ── Vista admin: tabla consolidada por zona ───────────────────── */}
            {esAdmin && (
                <div className="rd-card">
                    <div className="rd-card-titulo">
                        <i className="bi bi-table" /> Resumen consolidado por zona
                        <span className="rd-badge-auto">
                            <i className="bi bi-lightning-charge-fill" /> Automático desde seguimientos
                        </span>
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

                        <button className="rd-btn-refrescar" onClick={cargarTabla} title="Refrescar">
                            <i className={`bi bi-arrow-clockwise ${cargandoTabla ? 'rd-spin' : ''}`} />
                        </button>
                    </div>

                    {/* Chips resumen global */}
                    {!cargandoTabla && (() => {
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
                                {cargandoTabla ? (
                                    <tr><td colSpan={6} className="rd-cargando"><i className="bi bi-hourglass-split rd-spin" /> Cargando...</td></tr>
                                ) : (
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
            )}
        </div>
    );
}
