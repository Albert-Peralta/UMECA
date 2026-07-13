import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getEvaluaciones, buscarEvaluaciones, getEvaluacionById, asignarEvaluador, asignarResultado, crearNegacion } from '../api/evaluacionesApi';
import FormularioEvaluacion from './FormularioEvaluacion';
import DetalleEvaluacion from './DetalleEvaluacion';
import PrintNegacion from './PrintNegacion';
import './Historico.css';
import './Imputados.css';
import './EvaluacionRiesgos.css';

const ITEMS_POR_PAGINA = 10;

// ── Mapas de presentación ──────────────────────────────────────────────────────
// resultadoConfig: traduce los valores del enum Resultado a etiqueta y clase CSS de badge
const resultadoConfig = {
    FLEXIBLE:       { label: 'Bajo Riesgo',  clase: 'riesgo-bajo' },
    ESTRICTO:       { label: 'Medio Riesgo', clase: 'riesgo-medio' },
    DIFICIL_CUMPLIR:{ label: 'Alto Riesgo',  clase: 'riesgo-alto' },
};

const estatusConfig = {
    PENDIENTE:  { label: 'Pendiente',  clase: 'estatus-pendiente' },
    TRABAJANDO: { label: 'En Proceso', clase: 'estatus-proceso' },
    FINALIZADO: { label: 'Finalizado', clase: 'estatus-atendido' },
};

const RESULTADOS = [
    { value: 'FLEXIBLE',        label: 'Bajo Riesgo — Flexible' },
    { value: 'ESTRICTO',        label: 'Medio Riesgo — Estricto' },
    { value: 'DIFICIL_CUMPLIR', label: 'Alto Riesgo — Difícil Cumplir' },
];

const EvaluacionRiesgos = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const puedeEvaluar = user?.rol === 'ADMINISTRADOR' || user?.rol === 'EVALUADOR_RIESGO';
    const puedeRegistrar = user?.rol === 'ADMINISTRADOR' || user?.rol === 'SUPERVISION' || user?.rol === 'EVALUADOR_RIESGO';

    const [datos, setDatos] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [filtroEstatus, setFiltroEstatus] = useState('');
    const [pagina, setPagina] = useState(1);
    const [cargando, setCargando] = useState(true);

    // Modal cargar resultado
    const [showModal, setShowModal] = useState(false);
    const [seleccionada, setSeleccionada] = useState(null);
    const [resultado, setResultado] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Formulario completo
    const [showFormulario, setShowFormulario] = useState(false);
    const [evalEdicion, setEvalEdicion] = useState(null);
    // Si venimos del detalle, al guardar regresamos al detalle
    const [volverADetalle, setVolverADetalle] = useState(false);

    // Vista detalle completa
    const [showDetalle, setShowDetalle] = useState(false);
    const [detalle, setDetalle] = useState(null);

    // Modal Negación
    const [showModalNegacion, setShowModalNegacion] = useState(false);
    const [showPrintNegacion, setShowPrintNegacion] = useState(false);
    const negacionVacio = { nombreImputado: '', apPaternoImputado: '', apMaternoImputado: '', edad: '',
        causaPenal: '', dependencia: '', cargo: '',
        nombreSolicitante: '', fechaSolicitud: '', horaInicio: '', lugarEntrevista: '' };
    const [negacionData, setNegacionData] = useState(negacionVacio);
    const [negacionErrores, setNegacionErrores] = useState({});

    // Valida campos obligatorios del formulario de negación antes de generar el documento.
    const validarNegacion = () => {
        const requeridos = {
            nombreImputado:    'Nombre(s)',
            apPaternoImputado: 'Apellido paterno',
            causaPenal:        'Carpeta / Causa penal',
            nombreSolicitante: 'Nombre del solicitante',
            fechaSolicitud:    'Fecha',
        };
        const errs = {};
        Object.entries(requeridos).forEach(([k, label]) => {
            if (!negacionData[k]?.trim()) errs[k] = `${label} es requerido`;
        });
        setNegacionErrores(errs);
        return Object.keys(errs).length === 0;
    };

    useEffect(() => { cargarDatos(); }, []);

    // Cuando el módulo Imputados/Expediente guarda 'verEvaluacionId' en localStorage,
    // abrimos el detalle automáticamente al montar.
    useEffect(() => {
        const preset = localStorage.getItem('verEvaluacionId');
        if (preset) {
            localStorage.removeItem('verEvaluacionId');
            getEvaluacionById(Number(preset)).then(res => {
                if (res.data.ok) { setDetalle(res.data.data); setShowDetalle(true); }
            }).catch(err => console.warn('No se pudo abrir evaluación desde expediente:', err));
        }
    }, []);

    useEffect(() => {
        document.body.style.overflow = showModal ? 'hidden' : 'unset';
        return () => { document.body.style.overflow = 'unset'; };
    }, [showModal]);

    const cargarDatos = async () => {
        setCargando(true);
        try {
            const res = await getEvaluaciones();
            if (res.data.ok) setDatos(res.data.data);
        } catch (err) {
            // silenced
        } finally {
            setCargando(false);
        }
    };

    const handleBusqueda = async (e) => {
        const val = e.target.value;
        setBusqueda(val);
        setPagina(1);
        if (val.trim().length >= 2) {
            try {
                const res = await buscarEvaluaciones(val.trim());
                if (res.data.ok) setDatos(res.data.data);
            } catch { /* silencioso */ }
        } else if (val.trim() === '') {
            cargarDatos();
        }
    };

    const datosFiltrados = datos.filter(d => {
        if (!filtroEstatus) return true;
        // Filtrar por resultado si aplica
        if (['FLEXIBLE', 'ESTRICTO', 'DIFICIL_CUMPLIR'].includes(filtroEstatus))
            return d.resultado === filtroEstatus;
        return d.estatus === filtroEstatus;
    });

    const totalPaginas = Math.max(1, Math.ceil(datosFiltrados.length / ITEMS_POR_PAGINA));
    const inicio = (pagina - 1) * ITEMS_POR_PAGINA;
    const paginados = datosFiltrados.slice(inicio, inicio + ITEMS_POR_PAGINA);

    // Abre el modal de carga de resultado. Si la evaluación no tiene evaluador asignado,
    // se auto-asigna al usuario autenticado antes de abrir el modal.
    const handleCargar = async (item) => {
        // Si no tiene evaluador, asignarse primero
        if (!item.nombreEvaluador) {
            try { await asignarEvaluador(item.id); } catch { /* continuar */ }
        }
        setSeleccionada(item);
        setResultado(item.resultado || '');
        setError('');
        setShowModal(true);
    };

    const handleGuardar = async () => {
        if (!resultado) { setError('Selecciona un nivel de riesgo'); return; }
        setLoading(true);
        try {
            const res = await asignarResultado(seleccionada.id, resultado);
            if (res.data.ok) {
                setShowModal(false);
                cargarDatos();
            } else {
                setError(res.data.message);
            }
        } catch {
            setError('Error al guardar el resultado');
        } finally {
            setLoading(false);
        }
    };

    if (showDetalle && detalle) {
        return (
            <DetalleEvaluacion
                evaluacion={detalle}
                puedeEditar={puedeEvaluar}
                onVolver={() => { setShowDetalle(false); setDetalle(null); }}
                onEditar={() => {
                    setEvalEdicion(detalle);
                    setVolverADetalle(true);
                    setShowFormulario(true);
                    setShowDetalle(false);
                }}
            />
        );
    }

    if (showFormulario) {
        return (
            <FormularioEvaluacion
                evaluacion={evalEdicion}
                onVolver={() => {
                    // Cancelar → volver a donde estaba (detalle o lista)
                    setShowFormulario(false);
                    if (volverADetalle) {
                        setShowDetalle(true);
                    }
                    setVolverADetalle(false);
                }}
                onGuardado={() => {
                    // Guardado exitoso → SIEMPRE ir a la tabla
                    setShowFormulario(false);
                    setShowDetalle(false);
                    setVolverADetalle(false);
                    cargarDatos();
                    showToast('Evaluación guardada correctamente');
                }}
            />
        );
    }

    return (
        <div className="historico-wrapper">

            {/* Toolbar paginación */}
            <div className="historico-toolbar">
                <span className="historico-count">
                    Mostrando <b>{datosFiltrados.length > 0 ? inicio + 1 : 0}</b> a{' '}
                    <b>{Math.min(inicio + ITEMS_POR_PAGINA, datosFiltrados.length)}</b> de{' '}
                    <b>{datosFiltrados.length}</b> registros
                </span>
                <div className="historico-paginacion">
                    <button onClick={() => setPagina(p => Math.max(p - 1, 1))} disabled={pagina === 1}>
                        <i className="bi bi-chevron-left"></i>
                    </button>
                    <span>{pagina} / {totalPaginas}</span>
                    <button onClick={() => setPagina(p => Math.min(p + 1, totalPaginas))} disabled={pagina === totalPaginas}>
                        <i className="bi bi-chevron-right"></i>
                    </button>
                </div>
            </div>

            {/* Búsqueda y acciones */}
            <div className="historico-actions">
                <div className="eval-search-wrap">
                    <div className="historico-search">
                        <i className="bi bi-search"></i>
                        <input
                            type="text"
                            placeholder="Buscar el imputado por nombre..."
                            value={busqueda}
                            onChange={handleBusqueda}
                        />
                    </div>
                </div>
                <select
                    className="eval-filtro-estatus"
                    value={filtroEstatus}
                    onChange={e => { setFiltroEstatus(e.target.value); setPagina(1); }}
                >
                    <option value="">Todos</option>
                    <option value="FLEXIBLE">Bajo Riesgo</option>
                    <option value="ESTRICTO">Medio Riesgo</option>
<option value="DIFICIL_CUMPLIR">Alto Riesgo</option>
                </select>
                {puedeRegistrar && (<>
                    <button className="btn-nueva-eval" onClick={() => { setEvalEdicion(null); setShowFormulario(true); }}>
                        <i className="bi bi-plus-lg"></i> Nueva Evaluación
                    </button>
                    <button className="btn-nueva-eval" style={{ background: '#c0392b', borderColor: '#c0392b' }}
                        onClick={() => setShowModalNegacion(true)}>
                        <i className="bi bi-file-earmark-x"></i> Negación
                    </button>
                </>)}
            </div>

            {/* Tabla */}
            <div className="historico-tabla-wrapper">
<div style={{ overflowX: 'auto' }}>
                    <table className="historico-tabla eval-tabla">
                        <colgroup>
                            <col style={{width:'40px'}} />
                            <col style={{width:'110px'}} />
                            <col style={{width:'100px'}} />
                            <col style={{width:'150px'}} />
                            <col style={{width:'100px'}} />
                            <col style={{width:'130px'}} />
                            <col style={{width:'130px'}} />
                            <col style={{width:'100px'}} />
                            <col style={{width:'80px'}} />
                        </colgroup>
                        <thead>
                            <tr>
                                <th>NO.</th>
                                <th className="eval-col-centro">SOLICITANTE</th>
                                <th>CAUSA PENAL</th>
                                <th>NOMBRE IMPUTADO</th>
                                <th>DELITO</th>
                                <th className="eval-col-centro">FECHA SOL. / AUDIENCIA</th>
                                <th>EVALUADOR</th>
                                <th>ESTATUS</th>
                                <th>ACCIONES</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cargando ? (
                                <tr><td colSpan={9} className="tabla-vacia">Cargando...</td></tr>
                            ) : paginados.length === 0 ? (
                                <tr><td colSpan={9} className="tabla-vacia">No hay registros</td></tr>
                            ) : (
                                paginados.map((item, index) => (
                                    <tr key={item.id}>
                                        <td>{inicio + index + 1}</td>
                                        <td className="eval-col-centro">{item.nombreSolicitante}</td>
                                        <td>{item.causaPenal}</td>
                                        <td>{item.nombreCompletoImputado || item.nombreImputado}</td>
                                        <td>{item.delito}</td>
                                        <td className="eval-fechas eval-col-centro">
                                            <span>{item.fechaSolicitud || '—'}</span>
                                            <span className="eval-fecha-sep eval-fecha-audiencia">
                                                {item.fechaAudiencia || <span className="eval-fecha-vacia">—</span>}
                                            </span>
                                        </td>
                                        <td>{item.nombreEvaluador ?? <span className="sin-asignar">—</span>}</td>
                                        {/* Badge de estado: prioridad Negación > Fallecido > Resultado (riesgo) > Estatus */}
                                        <td>
                                            {item.tipoDocumento === 'NEGACION' ? (
                                                <span className="estatus-badge" style={{ background: '#fde8e8', color: '#c0392b', border: '1px solid #f5c6c6' }}><i className="bi bi-x-circle-fill" /> Negación</span>
                                            ) : item.imputadoFallecido ? (
                                                <span className="imp-badge-fallecido"><i className="bi bi-heartbreak-fill" /> Fallecido</span>
                                            ) : item.resultado ? (
                                                <span className={`riesgo-badge ${resultadoConfig[item.resultado]?.clase}`}>
                                                    {resultadoConfig[item.resultado]?.label}
                                                </span>
                                            ) : (
                                                <span className={`estatus-badge ${estatusConfig[item.estatus]?.clase}`}>
                                                    {estatusConfig[item.estatus]?.label}
                                                </span>
                                            )}
                                        </td>
                                        <td className="eval-acciones-col">
                                            <button className="btn-ver-eval" title="Ver detalle" onClick={async () => {
                                                try {
                                                    const res = await getEvaluacionById(item.id);
                                                    if (res.data.ok) {
                                                        const data = res.data.data;
                                                        if (data.tipoDocumento === 'NEGACION') {
                                                            setNegacionData({
                                                                nombreImputado: data.nombreImputado || '',
                                                                apPaternoImputado: data.apPaternoImputado || '',
                                                                apMaternoImputado: data.apMaternoImputado || '',
                                                                edad: data.edad || '',
                                                                causaPenal: data.causaPenal || '',
                                                                dependencia: data.dependencia || '',
                                                                cargo: data.cargo || '',
                                                                nombreSolicitante: data.nombreSolicitante || '',
                                                                fechaSolicitud: data.fechaSolicitud || '',
                                                                horaInicio: data.horaInicio || '',
                                                                lugarEntrevista: data.lugarEntrevista || '',
                                                            });
                                                            setShowPrintNegacion(true);
                                                        } else {
                                                            setDetalle(data); setShowDetalle(true);
                                                        }
                                                    }
                                                } catch { setDetalle(item); setShowDetalle(true); }
                                            }}>
                                                <i className="bi bi-eye"></i>
                                            </button>
                                            {puedeEvaluar && item.estatus !== 'FINALIZADO' && (
                                                <button className="btn-ver-eval btn-cargar-small" title="Cargar resultado" onClick={() => handleCargar(item)}>
                                                    <i className="bi bi-upload"></i>
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>


            {/* Modal cargar resultado */}
            {showModal && seleccionada && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <div className="modal-header">
                            <h3>CARGAR EVALUACIÓN DE RIESGO</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>
                        <div className="modal-form">
                            {/* Resumen del caso */}
                            <div className="eval-resumen">
                                <div className="eval-resumen-fila">
                                    <span className="detalle-label">IMPUTADO</span>
                                    <span className="detalle-valor">{seleccionada.nombreCompletoImputado || seleccionada.nombreImputado}</span>
                                </div>
                                <div className="eval-resumen-fila">
                                    <span className="detalle-label">CAUSA PENAL</span>
                                    <span className="detalle-valor">{seleccionada.causaPenal}</span>
                                </div>
                                <div className="eval-resumen-fila">
                                    <span className="detalle-label">DELITO</span>
                                    <span className="detalle-valor">{seleccionada.delito}</span>
                                </div>
                                <div className="eval-resumen-fila">
                                    <span className="detalle-label">SOLICITANTE</span>
                                    <span className="detalle-valor">{seleccionada.nombreSolicitante}</span>
                                </div>
                                <div className="eval-resumen-fila">
                                    <span className="detalle-label">FECHA AUDIENCIA</span>
                                    <span className="detalle-valor">{seleccionada.fechaAudiencia}</span>
                                </div>
                            </div>

                            <div className="modal-field" style={{ marginTop: '8px' }}>
                                <label>RESULTADO DE LA EVALUACIÓN*</label>
                                <div className="eval-opciones">
                                    {RESULTADOS.map(r => (
                                        <label
                                            key={r.value}
                                            className={`eval-opcion ${resultado === r.value ? 'selected' : ''} ${r.value === 'FLEXIBLE' ? 'op-bajo' : r.value === 'ESTRICTO' ? 'op-medio' : 'op-alto'}`}
                                        >
                                            <input
                                                type="radio"
                                                name="resultado"
                                                value={r.value}
                                                checked={resultado === r.value}
                                                onChange={() => { setResultado(r.value); setError(''); }}
                                            />
                                            {r.label}
                                        </label>
                                    ))}
                                </div>
                                {error && <span className="error">{error}</span>}
                            </div>

                            <div className="modal-buttons">
                                <button className="btn-cancelar" onClick={() => setShowModal(false)}>
                                    Cancelar
                                </button>
                                <button className="btn-registrar" onClick={handleGuardar} disabled={loading}>
                                    {loading ? 'Guardando...' : 'Guardar Evaluación'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal Negación ── */}
            {showModalNegacion && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 9998,
                    background: 'rgba(0,0,0,.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div style={{
                        background: '#fff', borderRadius: 12, width: '100%', maxWidth: 580,
                        maxHeight: '90vh', overflowY: 'auto',
                        boxShadow: '0 8px 32px rgba(0,0,0,.2)'
                    }} onClick={e => e.stopPropagation()}>

                        {/* Header */}
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '18px 24px', borderBottom: '1px solid #eee',
                            background: '#c0392b', borderRadius: '12px 12px 0 0'
                        }}>
                            <h3 style={{ margin: 0, color: '#fff', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <i className="bi bi-file-earmark-x" /> Negación de Información
                            </h3>
                            <button onClick={() => { setShowModalNegacion(false); setNegacionData(negacionVacio); setNegacionErrores({}); }}
                                style={{ background: 'rgba(255,255,255,.2)', border: 'none', color: '#fff', width: 30, height: 30, borderRadius: 6, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                ×
                            </button>
                        </div>

                        {/* Body */}
                        <div style={{ padding: '20px 24px' }}>
                            <p style={{ fontSize: 13, color: '#666', margin: '0 0 18px', background: '#fff8f0', border: '1px solid #f0d9c8', borderRadius: 8, padding: '10px 14px' }}>
                                <i className="bi bi-info-circle" style={{ color: '#c0392b' }} /> El imputado se negó a proporcionar información. Completa los datos mínimos para generar el documento.
                            </p>

                            {/* Sección imputado */}
                            <p style={{ fontSize: 11, fontWeight: 700, color: '#c0392b', textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 10px', borderBottom: '1px solid #f0d9c8', paddingBottom: 6 }}>Datos del imputado</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px', marginBottom: 16 }}>
                                {[
                                    ['nombreImputado',    'Nombre(s) *'],
                                    ['apPaternoImputado', 'Apellido paterno *'],
                                    ['apMaternoImputado', 'Apellido materno'],
                                ].map(([key, label]) => (
                                    <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        <label style={{ fontSize: 11, fontWeight: 600, color: negacionErrores[key] ? '#c0392b' : '#444' }}>{label}</label>
                                        <input value={negacionData[key]} onChange={e => { setNegacionData(p => ({ ...p, [key]: e.target.value })); setNegacionErrores(p => ({ ...p, [key]: '' })); }}
                                            style={{ border: `1px solid ${negacionErrores[key] ? '#c0392b' : '#ddd'}`, borderRadius: 6, padding: '7px 10px', fontSize: 13, outline: 'none', background: negacionErrores[key] ? '#fff5f5' : '#fff' }} />
                                        {negacionErrores[key] && <span style={{ fontSize: 10, color: '#c0392b' }}>{negacionErrores[key]}</span>}
                                    </div>
                                ))}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: 18 }}>
                                {[
                                    ['edad',      'Edad'],
                                    ['causaPenal','Carpeta / Causa penal *'],
                                ].map(([key, label]) => (
                                    <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        <label style={{ fontSize: 11, fontWeight: 600, color: negacionErrores[key] ? '#c0392b' : '#444' }}>{label}</label>
                                        <input value={negacionData[key]} onChange={e => { setNegacionData(p => ({ ...p, [key]: e.target.value })); setNegacionErrores(p => ({ ...p, [key]: '' })); }}
                                            style={{ border: `1px solid ${negacionErrores[key] ? '#c0392b' : '#ddd'}`, borderRadius: 6, padding: '7px 10px', fontSize: 13, outline: 'none', background: negacionErrores[key] ? '#fff5f5' : '#fff' }} />
                                        {negacionErrores[key] && <span style={{ fontSize: 10, color: '#c0392b' }}>{negacionErrores[key]}</span>}
                                    </div>
                                ))}
                            </div>

                            {/* Sección solicitante */}
                            <p style={{ fontSize: 11, fontWeight: 700, color: '#c0392b', textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 10px', borderBottom: '1px solid #f0d9c8', paddingBottom: 6 }}>Datos del solicitante</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: 18 }}>
                                {[
                                    ['nombreSolicitante', 'Nombre del solicitante *'],
                                    ['cargo',             'Cargo'],
                                    ['dependencia',       'Fiscalía / Dependencia'],
                                ].map(([key, label]) => (
                                    <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        <label style={{ fontSize: 11, fontWeight: 600, color: negacionErrores[key] ? '#c0392b' : '#444' }}>{label}</label>
                                        <input value={negacionData[key]} onChange={e => { setNegacionData(p => ({ ...p, [key]: e.target.value })); setNegacionErrores(p => ({ ...p, [key]: '' })); }}
                                            style={{ border: `1px solid ${negacionErrores[key] ? '#c0392b' : '#ddd'}`, borderRadius: 6, padding: '7px 10px', fontSize: 13, outline: 'none', background: negacionErrores[key] ? '#fff5f5' : '#fff' }} />
                                        {negacionErrores[key] && <span style={{ fontSize: 10, color: '#c0392b' }}>{negacionErrores[key]}</span>}
                                    </div>
                                ))}
                            </div>

                            {/* Sección entrevista */}
                            <p style={{ fontSize: 11, fontWeight: 700, color: '#c0392b', textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 10px', borderBottom: '1px solid #f0d9c8', paddingBottom: 6 }}>Datos de la entrevista</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: 8 }}>
                                {[
                                    ['fechaSolicitud', 'Fecha *', 'date'],
                                    ['horaInicio',     'Hora',    'time'],
                                ].map(([key, label, type = 'text']) => (
                                    <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        <label style={{ fontSize: 11, fontWeight: 600, color: negacionErrores[key] ? '#c0392b' : '#444' }}>{label}</label>
                                        <input type={type} value={negacionData[key]} onChange={e => { setNegacionData(p => ({ ...p, [key]: e.target.value })); setNegacionErrores(p => ({ ...p, [key]: '' })); }}
                                            style={{ border: `1px solid ${negacionErrores[key] ? '#c0392b' : '#ddd'}`, borderRadius: 6, padding: '7px 10px', fontSize: 13, outline: 'none', background: negacionErrores[key] ? '#fff5f5' : '#fff' }} />
                                        {negacionErrores[key] && <span style={{ fontSize: 10, color: '#c0392b' }}>{negacionErrores[key]}</span>}
                                    </div>
                                ))}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <label style={{ fontSize: 11, fontWeight: 600, color: '#444' }}>Lugar de entrevista</label>
                                <input value={negacionData.lugarEntrevista} onChange={e => setNegacionData(p => ({ ...p, lugarEntrevista: e.target.value }))}
                                    style={{ border: '1px solid #ddd', borderRadius: 6, padding: '7px 10px', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                            </div>
                        </div>

                        {/* Footer */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 24px', borderTop: '1px solid #eee', background: '#fafafa', borderRadius: '0 0 12px 12px' }}>
                            <button onClick={() => { setShowModalNegacion(false); setNegacionData(negacionVacio); setNegacionErrores({}); }}
                                style={{ background: 'none', border: '1px solid #ccc', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', fontSize: 13, color: '#555' }}>
                                Cancelar
                            </button>
                            <button onClick={async () => {
                                if (!validarNegacion()) return;
                                try {
                                    const payload = {
                                        nombreImputado: negacionData.nombreImputado,
                                        apPaternoImputado: negacionData.apPaternoImputado,
                                        apMaternoImputado: negacionData.apMaternoImputado || '',
                                        edad: negacionData.edad ? parseInt(negacionData.edad) : null,
                                        causaPenal: negacionData.causaPenal,
                                        dependencia: negacionData.dependencia,
                                        cargo: negacionData.cargo,
                                        nombreSolicitante: negacionData.nombreSolicitante,
                                        fechaSolicitud: negacionData.fechaSolicitud || new Date().toISOString().split('T')[0],
                                        horaInicio: negacionData.horaInicio,
                                        lugarEntrevista: negacionData.lugarEntrevista,
                                    };
                                    await crearNegacion(payload);
                                    showToast('Negación registrada en el sistema', 'success');
                                    cargarDatos();
                                } catch (e) {
                                    showToast('No se pudo guardar el registro de negación', 'error');
                                }
                                setShowModalNegacion(false);
                                setNegacionData(negacionVacio);
                                setShowPrintNegacion(true);
                            }}
                                style={{ background: '#c0392b', border: 'none', color: '#fff', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <i className="bi bi-file-earmark-text" /> Generar Documento
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showPrintNegacion && (
                <PrintNegacion evaluacion={negacionData} onCerrar={() => setShowPrintNegacion(false)} />
            )}
        </div>
    );
};

export default EvaluacionRiesgos;
