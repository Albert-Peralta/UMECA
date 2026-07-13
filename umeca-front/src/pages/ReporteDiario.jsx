import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { guardarReporte, getMiReportePorFecha, getConsolidado, getCumplimiento } from '../api/reporteDiarioApi';
import './ReporteDiario.css';

// ── Definición de campos por sección ─────────────────────────────────────────

const CAMPOS_GENERALES = [
    { key: 'firmasRecabadas',       label: 'Firmas recabadas' },
    { key: 'nuevosCasosMC',         label: 'Nuevos casos M. C.' },
    { key: 'nuevosCasosSCP',        label: 'Nuevos casos S. C. P.' },
    { key: 'entrevistasEncuadre',   label: 'Entrevistas de encuadre' },
    { key: 'totalOficiosRecibidos', label: 'Total del oficios recibidos' },
];

const CAMPOS_SUPERVISION = [
    { key: 'oficiosEmitidosCSP',      label: 'Oficios emitidos de CSP' },
    { key: 'oficiosEmitidosDiversos', label: 'Oficios emitidos diversos' },
    { key: 'reportesIncumplimiento',  label: 'Reportes de incumplimiento' },
    { key: 'reportesNoPresentacion',  label: 'Reportes de no presentación' },
    { key: 'solicitudesColaboracion', label: 'Solicitudes de colaboración' },
    { key: 'solicitudesInfoJuez',     label: 'Solicitudes de información al Juez' },
    { key: 'solicitudesInfoMP',       label: 'Solicitudes de información al M.P.' },
    { key: 'informeFinal',            label: 'Informe final' },
    { key: 'canalizaciones',          label: 'Canalizaciones' },
    { key: 'visitasDomiciliarias',    label: 'Visitas domiciliarias' },
    { key: 'audienciasTTA',           label: 'Audiencias TTA' },
    { key: 'llamadasTelefonicas',     label: 'Llamadas telefónicas' },
];

const CAMPOS_EVALUACION = [
    { key: 'oficiosRegistros',    label: 'Oficios de registros' },
    { key: 'opinionTecnicaFC',    label: 'Opinión técnica F.C.' },
    { key: 'opinionTecnicaFF',    label: 'Opinión técnica F.F.' },
    { key: 'negacionesFC',        label: 'Negaciones F.C.' },
    { key: 'negacionesFF',        label: 'Negaciones F.F.' },
    { key: 'informesFC',          label: 'Informes F.C.' },
    { key: 'informesFF',          label: 'Informes F.F.' },
];

const CAMPOS_ADICIONAL = [
    { key: 'llamadasTelEvaluacion', label: 'Llamadas telefónicas evaluación' },
    { key: 'sobreseimientos',       label: 'Sobreseimientos' },
    { key: 'cierreCarpetas',        label: 'Cierre de carpetas' },
    { key: 'levantamientoMedida',   label: 'Levantamiento de medida' },
];

const TODOS_CAMPOS = [...CAMPOS_SUPERVISION, ...CAMPOS_EVALUACION];

const FORM_VACIO = Object.fromEntries(TODOS_CAMPOS.map(c => [c.key, 0]));

const ZONAS = ['XOCHITEPEC', 'CUAUTLA', 'JOJUTLA'];

// ── Helpers ───────────────────────────────────────────────────────────────────

const hoyISO = () => new Date().toISOString().split('T')[0];

const lunesDeEsta = () => {
    const d = new Date();
    const dia = d.getDay(); // 0=dom
    const diff = dia === 0 ? -6 : 1 - dia;
    d.setDate(d.getDate() + diff);
    return d.toISOString().split('T')[0];
};

// Suma los valores de una lista de reportes campo a campo
const sumarReportes = (lista) => {
    const total = { ...FORM_VACIO };
    lista.forEach(r => {
        TODOS_CAMPOS.forEach(c => { total[c.key] = (total[c.key] || 0) + (r[c.key] || 0); });
    });
    return total;
};

// ── Componente principal ──────────────────────────────────────────────────────

export default function ReporteDiario() {
    const { user } = useAuth();
    const rol = user?.rol;

    const esAdmin  = rol === 'ADMINISTRADOR';
    const esSuper  = rol === 'SUPERVISION';
    const esEval   = rol === 'EVALUADOR_RIESGO';

    // ── Estado del formulario ─────────────────────────────────────────────────
    const [form, setForm]           = useState({ ...FORM_VACIO, fecha: hoyISO() });
    const [formGuardado, setFormGuardado] = useState({ ...FORM_VACIO }); // última versión guardada
    const [guardando, setGuardando] = useState(false);
    const [msgGuardar, setMsgGuardar] = useState('');
    const [yaExiste, setYaExiste]   = useState(false);

    // Detecta si hay cambios sin guardar
    const hayCambios = TODOS_CAMPOS.some(c =>
        (parseInt(form[c.key]) || 0) !== (parseInt(formGuardado[c.key]) || 0)
    );

    // ── Estado de la tabla consolidada ────────────────────────────────────────
    const [vista, setVista]         = useState('dia');   // 'dia' | 'semana' | 'rango'
    const [filtroDia, setFiltroDia] = useState(hoyISO());
    const [filtroDesde, setFiltroDesde] = useState(lunesDeEsta());
    const [filtroHasta, setFiltroHasta] = useState(hoyISO());
    const [consolidado, setConsolidado] = useState({});
    const [cargandoTabla, setCargandoTabla] = useState(false);
    const [cumplimiento, setCumplimiento]   = useState([]);
    const [cargandoCump, setCargandoCump]   = useState(false);

    // ── Cargar reporte del día seleccionado para pre-llenar formulario ────────
    useEffect(() => {
        if (esAdmin) return;
        getMiReportePorFecha(form.fecha).then(res => {
            if (res.data.ok && res.data.data) {
                const d = res.data.data;
                const prefilled = {};
                TODOS_CAMPOS.forEach(c => { prefilled[c.key] = d[c.key] ?? 0; });
                setForm(f => ({ ...f, ...prefilled }));
                setFormGuardado(prefilled);
                setYaExiste(true);
            } else {
                // Sin reporte para ese día — limpiar campos
                const vacios = {};
                TODOS_CAMPOS.forEach(c => { vacios[c.key] = 0; });
                setForm(f => ({ ...f, ...vacios }));
                setFormGuardado(vacios);
                setYaExiste(false);
            }
        }).catch(err => console.warn("Error al cargar datos:", err));
    }, [esAdmin, form.fecha]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Cargar tabla consolidada ──────────────────────────────────────────────
    const cargarTabla = useCallback(async () => {
        setCargandoTabla(true);
        setCargandoCump(true);
        try {
            let inicio, fin;
            if (vista === 'dia') {
                inicio = fin = filtroDia;
            } else if (vista === 'semana') {
                inicio = lunesDeEsta();
                fin    = hoyISO();
            } else {
                inicio = filtroDesde;
                fin    = filtroHasta;
            }
            const [resConsolidado, resCump] = await Promise.all([
                getConsolidado({ inicio, fin }),
                getCumplimiento({ inicio, fin }),
            ]);
            if (resConsolidado.data.ok) setConsolidado(resConsolidado.data.data || {});
            if (resCump.data.ok) setCumplimiento(resCump.data.data || []);
        } catch { /* ignore */ }
        finally { setCargandoTabla(false); setCargandoCump(false); }
    }, [vista, filtroDia, filtroDesde, filtroHasta]);

    useEffect(() => { if (esAdmin) cargarTabla(); }, [cargarTabla, esAdmin]);

    // ── Guardar reporte ───────────────────────────────────────────────────────
    const handleGuardar = async () => {
        setGuardando(true);
        setMsgGuardar('');
        try {
            const payload = { ...form };
            TODOS_CAMPOS.forEach(c => { payload[c.key] = parseInt(payload[c.key]) || 0; });
            const res = await guardarReporte(payload);
            if (res.data.ok) {
                const guardados = {};
                TODOS_CAMPOS.forEach(c => { guardados[c.key] = parseInt(payload[c.key]) || 0; });
                setFormGuardado(guardados);
                setMsgGuardar(yaExiste ? '✅ Reporte actualizado correctamente' : '✅ Reporte guardado correctamente');
                setYaExiste(true);
                cargarTabla();
            } else {
                setMsgGuardar('❌ ' + (res.data.message || 'Error al guardar'));
            }
        } catch { setMsgGuardar('❌ Error de conexión'); }
        finally { setGuardando(false); }
    };

    const setField = (key, val) => setForm(f => ({ ...f, [key]: val }));

    // ── Chips de resumen para evaluación (basados en el último guardado) ─────
    const resumenEval = () => {
        const v = (k) => parseInt(formGuardado[k]) || 0;
        const fc    = v('opinionTecnicaFC') + v('negacionesFC') + v('informesFC');
        const ff    = v('opinionTecnicaFF') + v('negacionesFF') + v('informesFF');
        const total = v('oficiosRegistros') + fc + ff;
        return (
            <div className="rd-eval-resumen">
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

    // ── Render de sección del formulario ──────────────────────────────────────
    const renderSeccion = (titulo, campos, color, extra = null) => (
        <div className="rd-seccion" style={{ '--rd-color': color }}>
            <div className="rd-seccion-titulo">
                <span className="rd-seccion-barra" />
                {titulo}
            </div>
            {extra}
            <div className="rd-campos-grid">
                {campos.map(c => (
                    <div key={c.key} className="rd-campo">
                        <label>{c.label}</label>
                        <input
                            type="number"
                            min="0"
                            value={form[c.key] ?? 0}
                            onChange={e => setField(c.key, e.target.value)}
                            onFocus={e => { if (parseInt(e.target.value) === 0) setField(c.key, ''); }}
                            onBlur={e  => { if (e.target.value === '')          setField(c.key, 0);  }}
                        />
                    </div>
                ))}
            </div>
        </div>
    );

    // ── Tabla consolidada ─────────────────────────────────────────────────────
    const zonasDatos  = ZONAS.filter(z => consolidado[z]);
    const totalesGlob = zonasDatos.length
        ? sumarReportes(zonasDatos.map(z => consolidado[z]))
        : null;

    const renderTablaSeccion = (titulo, campos, color) => {
        // Si no hay datos para esta sección, omitir
        const tieneAlgo = zonasDatos.some(z =>
            campos.some(c => (consolidado[z]?.[c.key] || 0) > 0)
        );
        return (
            <tr className="rd-tabla-seccion-header" style={{ '--rd-color': color }}>
                <td colSpan={ZONAS.length + 2} className="rd-tabla-seccion-label">{titulo}</td>
            </tr>
        );
    };

    const filasTabla = (campos) => {
        const conValor = campos.filter(c => ZONAS.reduce((s, z) => s + (consolidado[z]?.[c.key] || 0), 0) > 0);
        const sinValor = campos.filter(c => ZONAS.reduce((s, z) => s + (consolidado[z]?.[c.key] || 0), 0) === 0);
        return [...conValor, ...sinValor].map(c => {
            const vals = ZONAS.map(z => consolidado[z]?.[c.key] || 0);
            const total = vals.reduce((a, b) => a + b, 0);
            return (
                <tr key={c.key} className={total === 0 ? 'rd-fila-cero' : ''}>
                    <td className="rd-td-actividad">{c.label}</td>
                    {ZONAS.map(z => <td key={z} className="rd-td-num">{consolidado[z]?.[c.key] ?? 0}</td>)}
                    <td className="rd-td-total">{total}</td>
                </tr>
            );
        });
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
                        Registro de actividades diarias por zona
                    </p>
                </div>
            </div>

            {/* ── Formulario de captura (no para admin) ───────────────────── */}
            {!esAdmin && (
                <div className="rd-card rd-card-form">
                    <div className="rd-card-titulo">
                        <i className="bi bi-pencil-square" />
                        {yaExiste ? 'Actualizar reporte de hoy' : 'Capturar reporte de hoy'}
                        <span className="rd-badge-zona">{user?.zona}</span>
                    </div>

                    <div className="rd-fecha-resumen">
                        <div className="rd-fecha-wrap">
                            <label>Fecha del reporte</label>
                            <input type="date" value={form.fecha} onChange={e => setField('fecha', e.target.value)} className="rd-fecha-input" />
                        </div>

                    </div>

                    {/* Sección Supervisión */}
                    {(esSuper || esAdmin) && renderSeccion('Supervisión', CAMPOS_SUPERVISION, '#1565c0')}

                    {/* Sección Evaluación */}
                    {(esEval || esAdmin) && renderSeccion('Evaluación de Riesgos', CAMPOS_EVALUACION, '#e65100', resumenEval())}

                    {hayCambios && !guardando && (
                        <p className="rd-msg rd-msg-warn">
                            <i className="bi bi-exclamation-triangle-fill" /> Tienes cambios sin guardar — presiona el botón para actualizar el reporte.
                        </p>
                    )}
                    {msgGuardar && !hayCambios && <p className={`rd-msg ${msgGuardar.startsWith('✅') ? 'rd-msg-ok' : 'rd-msg-err'}`}>{msgGuardar}</p>}

                    <button className="rd-btn-guardar" onClick={handleGuardar} disabled={guardando}>
                        <i className={`bi ${guardando ? 'bi-hourglass-split' : 'bi-floppy-fill'}`} />
                        {guardando ? 'Guardando...' : yaExiste ? 'Actualizar reporte' : 'Guardar reporte'}
                    </button>
                </div>
            )}

            {/* ── Vista admin: tabla consolidada ───────────────────────────── */}
            {esAdmin && (
                <div className="rd-card">
                    <div className="rd-card-titulo">
                        <i className="bi bi-table" /> Resumen consolidado por zona
                    </div>

                    <div className="rd-filtros">
                        <div className="rd-filtros-tabs">
                            {[
                                { id: 'dia',    label: 'Día' },
                                { id: 'semana', label: 'Semana actual' },
                                { id: 'rango',  label: 'Rango' },
                            ].map(t => (
                                <button key={t.id}
                                    className={`rd-tab ${vista === t.id ? 'rd-tab-activo' : ''}`}
                                    onClick={() => setVista(t.id)}
                                >{t.label}</button>
                            ))}
                        </div>
                        {vista === 'dia' && (
                            <input type="date" value={filtroDia}
                                onChange={e => setFiltroDia(e.target.value)}
                                className="rd-fecha-input" />
                        )}
                        {vista === 'rango' && (
                            <div className="rd-rango">
                                <input type="date" value={filtroDesde} onChange={e => setFiltroDesde(e.target.value)} className="rd-fecha-input" />
                                <span>–</span>
                                <input type="date" value={filtroHasta} onChange={e => setFiltroHasta(e.target.value)} className="rd-fecha-input" />
                            </div>
                        )}
                        <button className="rd-btn-refrescar" onClick={cargarTabla} title="Refrescar">
                            <i className={`bi bi-arrow-clockwise ${cargandoTabla ? 'rd-spin' : ''}`} />
                        </button>
                    </div>

                    {/* ── Cumplimiento de usuarios ─────────────────────────── */}
                    {cumplimiento.length > 0 && (
                        <div className="rd-cumplimiento">
                            <div className="rd-cumpl-titulo">
                                <i className="bi bi-people-fill" /> Cumplimiento de reportes
                                <span className="rd-cumpl-resumen">
                                    {cumplimiento.filter(u => u.entrego).length} de {cumplimiento.length} entregaron
                                </span>
                            </div>
                            <div className="rd-cumpl-grid">
                                {cumplimiento.map(u => (
                                    <div key={u.usuarioId} className={`rd-cumpl-card ${u.entrego ? 'rd-cumpl-si' : 'rd-cumpl-no'}`}>
                                        <div className="rd-cumpl-avatar">
                                            {u.nombreCompleto.trim().charAt(0).toUpperCase()}
                                        </div>
                                        <div className="rd-cumpl-info">
                                            <span className="rd-cumpl-nombre">{u.nombreCompleto.trim()}</span>
                                            <span className="rd-cumpl-meta">
                                                {u.zona} · {u.rol === 'SUPERVISION' ? 'Supervisión' : 'Evaluación'}
                                            </span>
                                        </div>
                                        <div className="rd-cumpl-estado">
                                            {u.entrego
                                                ? <><i className="bi bi-check-circle-fill" /> <span>{u.totalRegistros} reporte{u.totalRegistros !== 1 ? 's' : ''}</span></>
                                                : <><i className="bi bi-x-circle-fill" /> <span>Sin reporte</span></>
                                            }
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Chips resumen evaluación — visible solo cuando hay datos */}
                    {Object.keys(consolidado).length > 0 && !cargandoTabla && (() => {
                        const sumaEvalCampo = (key) => ZONAS.reduce((s, z) => s + (consolidado[z]?.[key] || 0), 0);
                        const fc    = sumaEvalCampo('opinionTecnicaFC') + sumaEvalCampo('negacionesFC') + sumaEvalCampo('informesFC');
                        const ff    = sumaEvalCampo('opinionTecnicaFF') + sumaEvalCampo('negacionesFF') + sumaEvalCampo('informesFF');
                        const total = TODOS_CAMPOS.reduce((a, c) => a + ZONAS.reduce((s, z) => s + (consolidado[z]?.[c.key] || 0), 0), 0);
                        return (
                            <div className="rd-eval-resumen" style={{ marginBottom: 16 }}>
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
                    })()}

                    <div className="rd-tabla-wrap">
                        <table className="rd-tabla">
                            <thead>
                                <tr>
                                    <th className="rd-th-actividad">ACTIVIDAD</th>
                                    {ZONAS.map(z => <th key={z} className="rd-th-zona">{z}</th>)}
                                    <th className="rd-th-total">TOTAL</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cargandoTabla ? (
                                    <tr><td colSpan={5} className="rd-cargando"><i className="bi bi-hourglass-split rd-spin" /> Cargando...</td></tr>
                                ) : Object.keys(consolidado).length === 0 ? (
                                    <tr><td colSpan={5} className="rd-vacio"><i className="bi bi-inbox" /> Sin reportes para el período seleccionado</td></tr>
                                ) : (
                                    <>
                                        {[
                                            { titulo: 'Supervisión',          campos: CAMPOS_SUPERVISION, cls: 'rd-sec-super' },
                                            { titulo: 'Evaluación de Riesgos', campos: CAMPOS_EVALUACION, cls: 'rd-sec-eval'  },
                                        ].map(({ titulo, campos, cls }) => {
                                            const conValor = campos.filter(c => ZONAS.reduce((s, z) => s + (consolidado[z]?.[c.key] || 0), 0) > 0);
                                            const sinValor = campos.filter(c => ZONAS.reduce((s, z) => s + (consolidado[z]?.[c.key] || 0), 0) === 0);
                                            return (
                                                <React.Fragment key={titulo}>
                                                    <tr className={`rd-seccion-row ${cls}`}><td colSpan={5}>{titulo}</td></tr>
                                                    {[...conValor, ...sinValor].map(c => {
                                                        const total = ZONAS.reduce((s, z) => s + (consolidado[z]?.[c.key] || 0), 0);
                                                        return (
                                                            <tr key={c.key} className={total === 0 ? 'rd-fila-cero' : ''}>
                                                                <td className="rd-td-actividad">{c.label}</td>
                                                                {ZONAS.map(z => <td key={z} className="rd-td-num">{consolidado[z]?.[c.key] ?? 0}</td>)}
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
                                            <td className="rd-td-total">
                                                {TODOS_CAMPOS.reduce((a, c) => a + ZONAS.reduce((s, z) => s + (consolidado[z]?.[c.key] || 0), 0), 0)}
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
