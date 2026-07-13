import { useState, useEffect, useCallback } from 'react';
import PrintConsulta from './PrintConsulta';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import {
    getConsultas, getConsultaById, getAntecedentes,
    crearConsulta, actualizarConsulta, eliminarConsulta, buscarRegistros
} from '../api/consultasApi';
import './ConsultaRegistros.css';

const FORM_BASE = {
    fechaSolicitud: '', quienSolicita: '', cargoSolicitante: '', dependenciaSolicitante: '',
    nombreImputado: '', apPaternoImputado: '', apMaternoImputado: '',
    fechaNacimientoImputado: '', causaPenal: '', curp: '',
    folioConsecutivo: '', oficioNumero: '', resultado: '', observaciones: '',
};

const hoy = new Date().toISOString().split('T')[0];

// ── Formulario ─────────────────────────────────────────────────────────────
const FormularioConsulta = ({ consulta, onVolver, onGuardado }) => {
    const { showToast } = useToast();
    const esEdicion = !!consulta;
    const [form, setForm] = useState(esEdicion ? { ...FORM_BASE, ...consulta } : { ...FORM_BASE });
    const [antecedentes, setAntecedentes] = useState([]);
    const [registros, setRegistros] = useState(null); // RegistrosImputadoDTO
    const [errores, setErrores] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [busquedaTimer, setBusquedaTimer] = useState(null);

    const s = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

    // Buscar antecedentes + registros en otros módulos al cambiar CURP, nombre+apellido o causa penal
    useEffect(() => {
        if (busquedaTimer) clearTimeout(busquedaTimer);
        const timer = setTimeout(async () => {
            const { curp, nombreImputado, apPaternoImputado, causaPenal } = form;
            const tieneIdentificador = curp || (nombreImputado && apPaternoImputado) || causaPenal;
            if (!tieneIdentificador) { setRegistros(null); return; }
            try {
                const params = {};
                if (curp) params.curp = curp;
                if (nombreImputado) params.nombre = nombreImputado;
                if (apPaternoImputado) params.apPaterno = apPaternoImputado;
                if (causaPenal) params.causaPenal = causaPenal;

                const [antRes, regRes] = await Promise.all([
                    getAntecedentes(params),
                    buscarRegistros(params),
                ]);
                if (antRes.data.ok) {
                    const previas = (antRes.data.data || []).filter(p => p.id !== consulta?.id);
                    setAntecedentes(previas);
                }
                if (regRes.data.ok) {
                    setRegistros(regRes.data.data?.encontrado ? regRes.data.data : null);
                }
            } catch { /* silencioso */ }
        }, 700);
        setBusquedaTimer(timer);
        return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.curp, form.nombreImputado, form.apPaternoImputado, form.causaPenal]);

    const handleGuardar = async () => {
        const nuevosErr = {
            fechaSolicitud: !form.fechaSolicitud,
            quienSolicita:  !form.quienSolicita,
            nombreImputado: !form.nombreImputado,
            resultado:      !form.resultado,
        };
        setErrores(nuevosErr);
        if (Object.values(nuevosErr).some(Boolean)) {
            setError('Por favor completa los campos obligatorios marcados en rojo');
            return;
        }
        setLoading(true);
        setError('');
        try {
            let res;
            const payload = {
                ...form,
                folioConsecutivo: form.folioConsecutivo ? parseInt(form.folioConsecutivo) : null,
            };
            if (esEdicion) res = await actualizarConsulta(consulta.id, payload);
            else           res = await crearConsulta(payload);
            if (res.data.ok) {
                showToast(esEdicion ? 'Consulta actualizada' : 'Consulta registrada');
                onGuardado?.(res.data.data);
                onVolver();
            } else {
                setError(res.data.message);
            }
        } catch (e) {
            setError(e.response?.data?.message || 'Error al guardar');
        } finally {
            setLoading(false);
        }
    };

    const fld = (label, children, req = false, err = false) => (
        <div className={`cr-field${err ? ' cr-field-err' : ''}`}>
            <label>{label}{req && <span className="cr-req"> *</span>}</label>
            {children}
            {err && <span className="cr-err-msg">Campo obligatorio</span>}
        </div>
    );

    return (
        <div className="cr-form-container">
            <div className="cr-topbar">
                <span className="cr-topbar-titulo">{esEdicion ? 'Editar Consulta' : 'Nueva Consulta de Registro'}</span>
                <button className="cr-btn-cancelar" onClick={onVolver}>← Cancelar</button>
            </div>

            {/* Alerta de antecedentes */}
            {antecedentes.length > 0 && (
                <div className="cr-alerta-ant">
                    <div className="cr-alerta-header">
                        <i className="bi bi-exclamation-triangle-fill" />
                        <strong>¡Atención! Este imputado ya fue consultado anteriormente {antecedentes.length} vez{antecedentes.length > 1 ? 'es' : ''}:</strong>
                    </div>
                    <ul className="cr-alerta-lista">
                        {antecedentes.map(p => (
                            <li key={p.id}>
                                <span className="cr-alerta-item"><b>Fecha:</b> {p.fechaSolicitud}</span>
                                <span className="cr-alerta-item"><b>Resultado:</b>
                                    <span className={`cr-badge cr-badge-${p.resultado?.toLowerCase()}`}>
                                        {p.resultado === 'POSITIVO' ? 'Positivo' : 'Negativo'}
                                    </span>
                                </span>
                                <span className="cr-alerta-item"><b>Solicitante:</b> {p.quienSolicita}</span>
                                {p.causaPenal && <span className="cr-alerta-item"><b>Causa:</b> {p.causaPenal}</span>}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="cr-seccion"><h3>Datos de la Solicitud</h3></div>
            <div className="cr-grid-3">
                {fld('Fecha de Solicitud', <input type="date" max={hoy} value={form.fechaSolicitud} onChange={e => s('fechaSolicitud', e.target.value)} />, true, errores.fechaSolicitud)}
                {fld('No. Folio (SSyPC/…)', <input type="number" min="1" value={form.folioConsecutivo} onChange={e => s('folioConsecutivo', e.target.value)} placeholder="Auto si se deja vacío" />)}
                {fld('Número de Oficio', <input value={form.oficioNumero} onChange={e => s('oficioNumero', e.target.value)} placeholder="Ej. FGR/AIC/PFM/2214-D" />)}
            </div>
            <div className="cr-grid-3">
                {fld('Quién Solicita', <input value={form.quienSolicita} onChange={e => s('quienSolicita', e.target.value)} placeholder="Nombre del MP, Juez o parte" />, true, errores.quienSolicita)}
                {fld('Cargo', <input value={form.cargoSolicitante} onChange={e => s('cargoSolicitante', e.target.value)} placeholder="Ej. Ministerio Público" />)}
                {fld('Dependencia', <input value={form.dependenciaSolicitante} onChange={e => s('dependenciaSolicitante', e.target.value)} placeholder="Ej. FGE Morelos" />)}
            </div>

            <div className="cr-seccion"><h3>Datos del Imputado</h3></div>
            <div className="cr-grid-3">
                {fld('Nombre(s)', <input value={form.nombreImputado} onChange={e => s('nombreImputado', e.target.value)} />, true, errores.nombreImputado)}
                {fld('Apellido Paterno', <input value={form.apPaternoImputado} onChange={e => s('apPaternoImputado', e.target.value)} />, false, errores.apPaternoImputado)}
                {fld('Apellido Materno', <input value={form.apMaternoImputado} onChange={e => s('apMaternoImputado', e.target.value)} />)}
            </div>
            <div className="cr-grid-3">
                {fld('Fecha de Nacimiento', <input type="date" value={form.fechaNacimientoImputado} onChange={e => s('fechaNacimientoImputado', e.target.value)} />)}
                {fld('CURP', <input value={form.curp} onChange={e => s('curp', e.target.value.toUpperCase())} placeholder="18 caracteres" maxLength={18} style={{ textTransform: 'uppercase' }} />)}
                {fld('Causa Penal / Carpeta de Investigación', <input value={form.causaPenal} onChange={e => s('causaPenal', e.target.value)} />)}
            </div>

            {/* Tabla de registros en otros módulos */}
            {registros && (
                <div className="cr-registros-box">
                    <div className="cr-registros-header">
                        <i className="bi bi-database-fill-check" />
                        <div>
                            <strong>{registros.nombreCompleto}</strong>
                            {registros.causaPenal && <span> · Causa: {registros.causaPenal}</span>}
                            {registros.delito && <span> · {registros.delito}</span>}
                        </div>
                        <span className={`cr-badge ${
                            (registros.entrevistas?.length || 0) + (registros.evaluaciones?.length || 0) + (registros.medidas?.length || 0) > 0
                                ? 'cr-badge-positivo' : 'cr-badge-negativo'
                        }`}>
                            {(registros.entrevistas?.length || 0) + (registros.evaluaciones?.length || 0) + (registros.medidas?.length || 0) > 0
                                ? 'Con registros' : 'Sin registros'}
                        </span>
                    </div>
                    <table className="cr-reg-tabla">
                        <thead>
                            <tr>
                                <th>Módulo</th>
                                <th style={{textAlign:'center'}}>Registros</th>
                                <th>Detalle</th>
                                <th>Estatus</th>
                                <th style={{textAlign:'center'}}>Fecha Levantamiento</th>
                                <th style={{textAlign:'center'}}>Cumplimiento</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><i className="bi bi-person-lines-fill" style={{ color: '#376842', marginRight: 6 }} />Entrevista de Encuadre</td>
                                <td style={{textAlign:'center'}}><span className={`cr-reg-count ${registros.entrevistas?.length ? 'has' : 'empty'}`}>{registros.entrevistas?.length || 0}</span></td>
                                <td>{registros.entrevistas?.[0]?.detalle || '—'}</td>
                                <td>{registros.entrevistas?.[0]?.estatus || '—'}</td>
                                <td style={{textAlign:'center'}}>—</td>
                                <td style={{textAlign:'center'}}>—</td>
                            </tr>
                            <tr>
                                <td><i className="bi bi-clipboard2-pulse-fill" style={{ color: '#1d4ed8', marginRight: 6 }} />Evaluación de Riesgos</td>
                                <td style={{textAlign:'center'}}><span className={`cr-reg-count ${registros.evaluaciones?.length ? 'has' : 'empty'}`}>{registros.evaluaciones?.length || 0}</span></td>
                                <td>{registros.evaluaciones?.[0]?.detalle || '—'}</td>
                                <td>{registros.evaluaciones?.[0]?.estatus || '—'}</td>
                                <td style={{textAlign:'center'}}>—</td>
                                <td style={{textAlign:'center'}}>—</td>
                            </tr>
                            {(() => {
                                const medidas = registros.medidas || [];
                                if (medidas.length === 0) return (
                                    <tr>
                                        <td><i className="bi bi-shield-fill-check" style={{ color: '#7c3aed', marginRight: 6 }} />Medidas Cautelares / SCP</td>
                                        <td style={{textAlign:'center'}}><span className="cr-reg-count empty">0</span></td>
                                        <td>—</td><td>—</td><td style={{textAlign:'center'}}>—</td><td style={{textAlign:'center'}}>—</td>
                                    </tr>
                                );
                                return medidas.map((m, i) => (
                                    <tr key={m.id || i}>
                                        <td>
                                            {i === 0
                                                ? <><i className="bi bi-shield-fill-check" style={{ color: '#7c3aed', marginRight: 6 }} />Medidas Cautelares / SCP</>
                                                : null}
                                            <div style={{ color: '#6b7280', fontSize: 11, paddingLeft: i === 0 ? 22 : 22, marginTop: i === 0 ? 2 : 0 }}>
                                                Medida #{i + 1}
                                            </div>
                                        </td>
                                        <td style={{textAlign:'center'}}>
                                            {i === 0 && <span className={`cr-reg-count ${medidas.length ? 'has' : 'empty'}`}>{medidas.length}</span>}
                                        </td>
                                        <td>{m.detalle || '—'}</td>
                                        <td>{m.estatus || '—'}</td>
                                        <td style={{ textAlign: 'center', fontSize: 12 }}>{m.fechaLevantamiento || '—'}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            {m.estatus === 'LEVANTADO'
                                                ? m.cumplioLevantamiento === true
                                                    ? <span className="cr-cumplio si"><i className="bi bi-check-circle-fill" /> Cumplió</span>
                                                    : m.cumplioLevantamiento === false
                                                        ? <span className="cr-cumplio no"><i className="bi bi-x-circle-fill" /> No Cumplió</span>
                                                        : '—'
                                                : '—'}
                                        </td>
                                    </tr>
                                ));
                            })()}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="cr-seccion"><h3>Resultado</h3></div>
            <div className={`cr-resultado-opciones${errores.resultado ? ' cr-resultado-err' : ''}`}>
                <label className={`cr-resultado-btn cr-positivo${form.resultado === 'POSITIVO' ? ' selected' : ''}`}>
                    <input type="radio" name="resultado" value="POSITIVO" checked={form.resultado === 'POSITIVO'} onChange={() => { s('resultado', 'POSITIVO'); setErrores(p => ({ ...p, resultado: false })); }} />
                    <i className="bi bi-check-circle-fill" /> Positivo — Sí tiene registros en UMECA
                </label>
                <label className={`cr-resultado-btn cr-negativo${form.resultado === 'NEGATIVO' ? ' selected' : ''}`}>
                    <input type="radio" name="resultado" value="NEGATIVO" checked={form.resultado === 'NEGATIVO'} onChange={() => { s('resultado', 'NEGATIVO'); setErrores(p => ({ ...p, resultado: false })); }} />
                    <i className="bi bi-x-circle-fill" /> Negativo — No tiene registros en UMECA
                </label>
            </div>
            {errores.resultado && <p className="cr-err-global">Selecciona un resultado</p>}

            <div className="cr-field cr-field-full">
                <label>Observaciones</label>
                <textarea value={form.observaciones} onChange={e => s('observaciones', e.target.value)} rows={3} placeholder="Información adicional relevante..." />
            </div>

            {error && <div className="cr-error">{error}</div>}
            <div className="cr-acciones">
                <button className="cr-btn-cancelar" onClick={onVolver}>✕ Cancelar</button>
                <button className="cr-btn-guardar" onClick={handleGuardar} disabled={loading}>
                    {loading ? 'Guardando...' : '✔ Guardar Consulta'}
                </button>
            </div>
        </div>
    );
};

// ── Vista de detalle ────────────────────────────────────────────────────────
const DetalleConsulta = ({ consulta: d, onVolver, onEditar }) => {
    const [imprimiendo, setImprimiendo] = useState(false);

    const campo = (label, valor) => (
        <>
            <span className="cr-campo-label">{label}</span>
            <span className="cr-campo-valor">{valor || '—'}</span>
        </>
    );

    return (
        <div className="cr-detalle-container">
            {imprimiendo && <PrintConsulta consulta={d} onCerrar={() => setImprimiendo(false)} />}
            <div className="cr-topbar-det">
                <button className="cr-btn-volver" onClick={onVolver}><i className="bi bi-arrow-left" /> Volver</button>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="cr-btn-imprimir-det" onClick={() => setImprimiendo(true)}>
                        <i className="bi bi-printer-fill" /> Imprimir
                    </button>
                    <button className="cr-btn-editar" onClick={onEditar}><i className="bi bi-pencil" /> Editar</button>
                </div>
            </div>

            {/* Header */}
            <div className="cr-detalle-header">
                <div className={`cr-resultado-badge-grande cr-badge-${d.resultado?.toLowerCase()}`}>
                    <i className={`bi ${d.resultado === 'POSITIVO' ? 'bi-check-circle-fill' : 'bi-x-circle-fill'}`} />
                    {d.resultado === 'POSITIVO' ? 'POSITIVO' : 'NEGATIVO'}
                </div>
                <div className="cr-detalle-info">
                    <span className="cr-detalle-nombre">{d.nombreCompleto || `${d.apPaternoImputado || ''} ${d.nombreImputado || ''}`.trim()}</span>
                    {d.causaPenal && <span className="cr-detalle-causa">{d.causaPenal}</span>}
                    {d.curp && <span className="cr-detalle-curp">CURP: {d.curp}</span>}
                </div>
                <div className="cr-detalle-fecha">
                    <span className="cr-detalle-fecha-lbl">FECHA SOLICITUD</span>
                    <span className="cr-detalle-fecha-val">{d.fechaSolicitud}</span>
                </div>
            </div>

            {/* Antecedentes */}
            {d.consultasPrevias?.length > 0 && (
                <div className="cr-alerta-ant cr-alerta-detalle">
                    <div className="cr-alerta-header">
                        <i className="bi bi-clock-history" />
                        <strong>Consultas previas de este imputado ({d.consultasPrevias.length})</strong>
                    </div>
                    <ul className="cr-alerta-lista">
                        {d.consultasPrevias.map(p => (
                            <li key={p.id}>
                                <span className="cr-alerta-item"><b>Fecha:</b> {p.fechaSolicitud}</span>
                                <span className="cr-alerta-item"><b>Resultado:</b>
                                    <span className={`cr-badge cr-badge-${p.resultado?.toLowerCase()}`}>
                                        {p.resultado === 'POSITIVO' ? 'Positivo' : 'Negativo'}
                                    </span>
                                </span>
                                <span className="cr-alerta-item"><b>Solicitante:</b> {p.quienSolicita}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="cr-det-sec">Datos de la Solicitud</div>
            <div className="cr-det-grid">
                {campo('Fecha Solicitud', d.fechaSolicitud)}
                {campo('No. Folio', d.folioConsecutivo ? String(d.folioConsecutivo).padStart(4,'0') : '—')}
                {campo('No. de Oficio', d.oficioNumero)}
                {campo('Quién Solicita', d.quienSolicita)}
                {campo('Cargo', d.cargoSolicitante)}
                {campo('Dependencia', d.dependenciaSolicitante)}
            </div>

            <div className="cr-det-sec">Datos del Imputado</div>
            <div className="cr-det-grid">
                {campo('Apellido Paterno', d.apPaternoImputado)}
                {campo('Apellido Materno', d.apMaternoImputado)}
                {campo('Nombre(s)', d.nombreImputado)}
                {campo('Fecha de Nacimiento', d.fechaNacimientoImputado
                    ? new Date(d.fechaNacimientoImputado + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
                    : null)}
                {campo('CURP', d.curp)}
                {campo('Causa Penal / Carpeta', d.causaPenal)}
            </div>

            {d.observaciones && (
                <>
                    <div className="cr-det-sec">Observaciones</div>
                    <div style={{ border: '1px solid #e5e5e5', borderTop: 'none', borderRadius: '0 0 10px 10px', padding: '10px 14px', fontSize: '14px', color: '#222', marginBottom: '4px' }}>
                        {d.observaciones}
                    </div>
                </>
            )}
        </div>
    );
};

// ── Módulo principal ────────────────────────────────────────────────────────
const ConsultaRegistros = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [consultas, setConsultas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [vista, setVista] = useState('lista'); // lista | form | detalle
    const [seleccionada, setSeleccionada] = useState(null);
    const [pagina, setPagina] = useState(1);
    const POR_PAGINA = 20;

    const cargar = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getConsultas();
            if (res.data.ok) setConsultas(res.data.data || []);
        } catch { /* silencioso */ }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { cargar(); }, [cargar]);

    const abrirDetalle = async (id) => {
        try {
            const res = await getConsultaById(id);
            if (res.data.ok) { setSeleccionada(res.data.data); setVista('detalle'); }
        } catch { /* silencioso */ }
    };

    const handleEliminar = async (id, e) => {
        e.stopPropagation();
        if (!window.confirm('¿Eliminar esta consulta?')) return;
        try {
            const res = await eliminarConsulta(id);
            if (res.data.ok) { showToast('Consulta eliminada', 'info'); cargar(); }
        } catch { /* silencioso */ }
    };

    const filtradas = consultas.filter(c => {
        const q = busqueda.toLowerCase();
        return (
            (c.nombreImputado || '').toLowerCase().includes(q) ||
            (c.apPaternoImputado || '').toLowerCase().includes(q) ||
            (c.causaPenal || '').toLowerCase().includes(q) ||
            (c.curp || '').toLowerCase().includes(q) ||
            (c.quienSolicita || '').toLowerCase().includes(q)
        );
    });

    const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
    const paginaActual = Math.min(pagina, totalPaginas);
    const desde = (paginaActual - 1) * POR_PAGINA;
    const paginadas = filtradas.slice(desde, desde + POR_PAGINA);

    if (vista === 'form') return (
        <FormularioConsulta
            consulta={seleccionada}
            onVolver={() => { setVista('lista'); setSeleccionada(null); }}
            onGuardado={() => cargar()}
        />
    );

    if (vista === 'detalle' && seleccionada) return (
        <DetalleConsulta
            consulta={seleccionada}
            onVolver={() => { setVista('lista'); setSeleccionada(null); }}
            onEditar={() => setVista('form')}
        />
    );

    // ── Lista ──
    return (
        <div className="cr-wrapper">

            {/* Paginación — encima del buscador */}
            {!loading && filtradas.length > 0 && (
                <div className="cr-paginacion">
                    <span className="cr-pag-info">
                        Mostrando <strong>{desde + 1}</strong> a <strong>{Math.min(desde + POR_PAGINA, filtradas.length)}</strong> de <strong>{filtradas.length}</strong> registros
                    </span>
                    <div className="cr-pag-controles">
                        <button className="cr-pag-btn" onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={paginaActual === 1}>
                            <i className="bi bi-chevron-left" />
                        </button>
                        <span className="cr-pag-num">{paginaActual} / {totalPaginas}</span>
                        <button className="cr-pag-btn" onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas}>
                            <i className="bi bi-chevron-right" />
                        </button>
                    </div>
                </div>
            )}

            <div className="cr-toolbar">
                <div className="cr-toolbar-left">
                    <div className="cr-search-box">
                        <i className="bi bi-search" />
                        <input
                            placeholder="Buscar por nombre, CURP, causa penal..."
                            value={busqueda}
                            onChange={e => { setBusqueda(e.target.value); setPagina(1); }}
                        />
                    </div>
                </div>
                <button className="cr-btn-nuevo" onClick={() => { setSeleccionada(null); setVista('form'); }}>
                    <i className="bi bi-plus-lg" /> Nueva Consulta
                </button>
            </div>

            {loading ? (
                <div className="cr-loading"><i className="bi bi-arrow-repeat" /> Cargando...</div>
            ) : filtradas.length === 0 ? (
                <div className="cr-empty">
                    <i className="bi bi-folder2-open" />
                    <p>{busqueda ? 'Sin resultados para la búsqueda' : 'No hay consultas registradas'}</p>
                    {!busqueda && <small>Registra la primera consulta con el botón "Nueva Consulta"</small>}
                </div>
            ) : (
                <>
                <div className="cr-tabla-wrap">
                    <table className="cr-tabla">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Imputado</th>
                                <th>CURP</th>
                                <th>Carpeta de Investigación</th>
                                <th>Solicitante</th>
                                <th>Resultado</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginadas.map(c => (
                                <tr key={c.id} onClick={() => abrirDetalle(c.id)} className="cr-fila">
                                    <td>{c.fechaSolicitud}</td>
                                    <td className="cr-td-nombre">
                                        <strong>{[c.apPaternoImputado, c.apMaternoImputado, c.nombreImputado].filter(Boolean).join(' ')}</strong>
                                        {c.oficioNumero && <span>Oficio: {c.oficioNumero}</span>}
                                    </td>
                                    <td className="cr-td-mono">{c.curp || '—'}</td>
                                    <td>{c.causaPenal || '—'}</td>
                                    <td>{c.quienSolicita}</td>
                                    <td>
                                        <span className={`cr-badge cr-badge-${c.resultado?.toLowerCase()}`}>
                                            <i className={`bi ${c.resultado === 'POSITIVO' ? 'bi-check-circle-fill' : 'bi-x-circle-fill'}`} />
                                            {c.resultado === 'POSITIVO' ? 'Positivo' : 'Negativo'}
                                        </span>
                                    </td>
                                    <td onClick={e => e.stopPropagation()}>
                                        {user?.role === 'ADMINISTRADOR' && (
                                            <button className="cr-btn-rm" onClick={e => handleEliminar(c.id, e)} title="Eliminar">
                                                <i className="bi bi-trash" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                </>
            )}
        </div>
    );
};

export default ConsultaRegistros;
