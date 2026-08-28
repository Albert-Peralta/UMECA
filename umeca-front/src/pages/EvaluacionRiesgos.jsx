import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { puedeCrear as _puedeCrear, puedeEditar as _puedeEditar } from '../utils/permisos';
import { useToast } from '../context/ToastContext';
import { getEvaluaciones, buscarEvaluaciones, getEvaluacionById, asignarEvaluador, asignarResultado, crearNegacion, eliminarEvaluacion } from '../api/evaluacionesApi';
import { getImputadosPorCausaPenal, getImputados, getImputadoById } from '../api/imputadosApi';
import FormularioEvaluacion from './FormularioEvaluacion';
import DetalleEvaluacion from './DetalleEvaluacion';
import PrintNegacion from './PrintNegacion';
import './Historico.css';
import './Imputados.css';
import './EvaluacionRiesgos.css';
import { ESTATUS_CIERRE_LABEL } from '../constants/estatusCierre';

const ITEMS_POR_PAGINA = 50;

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
    const puedeRegistrar = _puedeCrear(user, 'EVALUACION');
    const puedeEvaluar   = _puedeEditar(user, 'EVALUACION');

    const [datos, setDatos] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [filtroEstatus, setFiltroEstatus] = useState('');
    const [zonaFiltro, setZonaFiltro] = useState('TODAS');
    const [pagina, setPagina] = useState(1);
    const [cargando, setCargando] = useState(true);

    // Modal confirmación eliminar
    const [confirmEliminar, setConfirmEliminar] = useState(null); // { id, label }
    const [eliminando, setEliminando] = useState(false);

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
    const [negacionParaImprimir, setNegacionParaImprimir] = useState(null);
    const impVacio = () => ({ nombreImputado: '', apPaternoImputado: '', apMaternoImputado: '', edad: '', imputadoId: null });
    const getNegacionVacio = () => ({
        causaPenal: '',
        imputados: [impVacio()],
        dependencia: '', cargo: '',
        nombreSolicitante: '', fechaSolicitud: '', horaInicio: '', lugarEntrevista: ''
    });
    const [negacionData, setNegacionData] = useState(getNegacionVacio);
    const [negacionErrores, setNegacionErrores] = useState({});

    // Sugerencias inline por índice de imputado
    const [sugerenciasPorIdx, setSugerenciasPorIdx] = useState({});
    const [negBusqPorIdx, setNegBusqPorIdx] = useState({});   // búsqueda de imputado por tarjeta
    const [negOptsporIdx, setNegOptsPorIdx] = useState({});   // resultados del buscador por tarjeta
    const [negDupPorIdx, setNegDupPorIdx] = useState({});     // imputado duplicado detectado por tarjeta
    const [negDupEntsPorIdx, setNegDupEntsPorIdx] = useState({}); // entrevistas del duplicado por tarjeta

    const normalizar = str => (str || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

    // Clave estable para detectar cambios en los imputados de la negación sin crear nueva referencia en cada render
    const negacionImputadosKey = useMemo(
        () => negacionData.imputados.map(i => `${i.nombreImputado}|${i.apPaternoImputado}|${i.apMaternoImputado}|${i.imputadoId}`).join(','),
        [negacionData.imputados]
    );

    // Detecta duplicado automáticamente al llenar nombre + apellido paterno en cada tarjeta
    useEffect(() => {
        if (!showModalNegacion) return;
        negacionData.imputados.forEach(async (imp, idx) => {
            if (imp.imputadoId) return; // ya vinculado, no buscar
            const nombre = normalizar(imp.nombreImputado);
            const apPaterno = normalizar(imp.apPaternoImputado);
            const apMaterno = normalizar(imp.apMaternoImputado);
            if (nombre.length < 2 || apPaterno.length < 2) {
                setNegDupPorIdx(p => ({ ...p, [idx]: null }));
                setNegDupEntsPorIdx(p => ({ ...p, [idx]: [] }));
                return;
            }
            try {
                const res = await getImputados(imp.nombreImputado.trim());
                if (!res.data.ok) return;
                const encontrado = (res.data.data || []).find(i => {
                    if (i.fallecido || i.carpetaCerrada) return false;
                    if (normalizar(i.nombre) !== nombre) return false;
                    if (normalizar(i.apPaterno) !== apPaterno) return false;
                    if (apMaterno.length >= 2 && normalizar(i.apMaterno) !== apMaterno) return false;
                    return true;
                });
                setNegDupPorIdx(p => ({ ...p, [idx]: encontrado || null }));
                if (encontrado) {
                    const detRes = await getImputadoById(encontrado.id);
                    if (detRes.data.ok) setNegDupEntsPorIdx(p => ({ ...p, [idx]: detRes.data.data.entrevistas || [] }));
                } else {
                    setNegDupEntsPorIdx(p => ({ ...p, [idx]: [] }));
                }
            } catch { /* sin bloqueo */ }
        });
    }, [negacionImputadosKey, showModalNegacion]); // eslint-disable-line react-hooks/exhaustive-deps

    const buscarImpNeg = async (idx, q) => {
        setNegBusqPorIdx(p => ({ ...p, [idx]: q }));
        if (q.trim().length < 2) { setNegOptsPorIdx(p => ({ ...p, [idx]: [] })); return; }
        try {
            const res = await getImputados(q.trim());
            if (res.data.ok) setNegOptsPorIdx(p => ({ ...p, [idx]: (res.data.data || []).filter(i => !i.fallecido && !i.carpetaCerrada) }));
        } catch { /* sin resultados */ }
    };

    const seleccionarImpNeg = (idx, imp) => {
        setImputado(idx, 'imputadoId', imp.id);
        setImputado(idx, 'nombreImputado', imp.nombre || '');
        setImputado(idx, 'apPaternoImputado', imp.apPaterno || '');
        setImputado(idx, 'apMaternoImputado', imp.apMaterno || '');
        // No auto-llenar causa penal — el usuario la captura manualmente en el campo correspondiente
        setNegBusqPorIdx(p => ({ ...p, [idx]: '' }));
        setNegOptsPorIdx(p => ({ ...p, [idx]: [] }));
    };

    const limpiarImpNeg = (idx) => {
        setImputado(idx, 'imputadoId', null);
        setImputado(idx, 'nombreImputado', '');
        setImputado(idx, 'apPaternoImputado', '');
        setImputado(idx, 'apMaternoImputado', '');
    };

    const handleCausaPenalBlur = async (causaPenal) => {
        if (!causaPenal?.trim()) return;
        try {
            const res = await getImputadosPorCausaPenal(causaPenal.trim());
            const lista = res.data?.data || [];
            if (lista.length >= 1) setSugerenciasPorIdx(p => ({ ...p, causa: lista }));
        } catch { /* el usuario captura manualmente */ }
    };

    const setImputado = (idx, campo, valor) => {
        setNegacionData(p => {
            const imps = [...p.imputados];
            imps[idx] = { ...imps[idx], [campo]: valor };
            return { ...p, imputados: imps };
        });
    };

    const agregarImputado = () =>
        setNegacionData(p => ({ ...p, imputados: [...p.imputados, impVacio()] }));

    const eliminarImputado = (idx) => {
        setNegacionData(p => ({ ...p, imputados: p.imputados.filter((_, i) => i !== idx) }));
        // Limpiar estados de búsqueda y duplicado del índice eliminado y reindexar
        setNegBusqPorIdx(p => { const n = {}; Object.entries(p).forEach(([k, v]) => { const ki = Number(k); if (ki < idx) n[ki] = v; else if (ki > idx) n[ki - 1] = v; }); return n; });
        setNegOptsPorIdx(p => { const n = {}; Object.entries(p).forEach(([k, v]) => { const ki = Number(k); if (ki < idx) n[ki] = v; else if (ki > idx) n[ki - 1] = v; }); return n; });
        setNegDupPorIdx(p => { const n = {}; Object.entries(p).forEach(([k, v]) => { const ki = Number(k); if (ki < idx) n[ki] = v; else if (ki > idx) n[ki - 1] = v; }); return n; });
        setNegDupEntsPorIdx(p => { const n = {}; Object.entries(p).forEach(([k, v]) => { const ki = Number(k); if (ki < idx) n[ki] = v; else if (ki > idx) n[ki - 1] = v; }); return n; });
    };

    // Valida campos obligatorios del formulario de negación antes de generar el documento.
    const validarNegacion = () => {
        const errs = {};
        if (!negacionData.causaPenal?.trim()) errs.causaPenal = 'Carpeta / Causa penal es requerida';
        negacionData.imputados.forEach((imp, idx) => {
            if (!imp.nombreImputado?.trim())    errs[`imp_${idx}_nombreImputado`]    = 'Requerido';
            if (!imp.apPaternoImputado?.trim()) errs[`imp_${idx}_apPaternoImputado`] = 'Requerido';
        });
        if (!negacionData.nombreSolicitante?.trim()) errs.nombreSolicitante = 'Nombre del solicitante es requerido';
        if (!negacionData.fechaSolicitud?.trim())    errs.fechaSolicitud    = 'Fecha es requerida';
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
                if (res.data.ok) {
                    const data = res.data.data;
                    if (data.tipoDocumento === 'NEGACION') {
                        setNegacionParaImprimir({
                            nombreImputado:    data.nombreImputado || '',
                            apPaternoImputado: data.apPaternoImputado || '',
                            apMaternoImputado: data.apMaternoImputado || '',
                            edad:              data.edad || '',
                            causaPenal:        data.causaPenal || '',
                            dependencia:       data.dependencia || '',
                            cargo:             data.cargo || '',
                            nombreSolicitante: data.nombreSolicitante || '',
                            fechaSolicitud:    data.fechaSolicitud || '',
                            horaInicio:        data.horaInicio || '',
                            lugarEntrevista:   data.lugarEntrevista || '',
                        });
                        setShowPrintNegacion(true);
                    } else {
                        setDetalle(data); setShowDetalle(true);
                    }
                }
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
            showToast('Error al cargar evaluaciones. Verifica la conexión.', 'error');
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
        const zonaOk = zonaFiltro === 'TODAS' || d.zonaEvaluador === zonaFiltro;
        if (!zonaOk) return false;
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
                onGuardado={async () => {
                    cargarDatos();
                    showToast('Evaluación guardada correctamente');
                    setShowFormulario(false);
                    setVolverADetalle(false);
                    // Recargar detalle fresco desde backend para mostrar datos actualizados
                    if (evalEdicion?.id) {
                        try {
                            const res = await getEvaluacionById(evalEdicion.id);
                            if (res.data.ok) setDetalle(res.data.data);
                        } catch { /* si falla, el detalle anterior sigue visible */ }
                    }
                    setShowDetalle(true);
                    document.querySelector('.dashboard-content')?.scrollTo({ top: 0, behavior: 'smooth' });
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
                <div className="zona-pills">
                    {['TODAS','XOCHITEPEC','CUAUTLA','JOJUTLA'].map(z => (
                        <button key={z}
                            className={`zona-pill zona-pill-${z.toLowerCase()} ${zonaFiltro === z ? 'zona-pill-active' : ''}`}
                            onClick={() => { setZonaFiltro(z); setPagina(1); }}>
                            {z === 'TODAS' ? 'Todas' : z.charAt(0) + z.slice(1).toLowerCase()}
                        </button>
                    ))}
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
                        onClick={() => { setNegacionData(getNegacionVacio()); setNegacionErrores({}); setSugerenciasPorIdx({}); setNegBusqPorIdx({}); setNegOptsPorIdx({}); setNegDupPorIdx({}); setNegDupEntsPorIdx({}); setShowModalNegacion(true); }}>
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
                                <th className="eval-col-centro">FECHA SOL./AUDIENCIA</th>
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
                                        <td>
                                            <div style={{ display:'flex', alignItems:'center', gap:'7px' }}>
                                                {item.nombreCompletoImputado || item.nombreImputado}
                                                {item.zonaEvaluador && (
                                                    <span className={`zona-tag zona-tag-${item.zonaEvaluador.toLowerCase()}`}>
                                                        {({'XOCHITEPEC':'Xochi','CUAUTLA':'Cuat','JOJUTLA':'Jojut'})[item.zonaEvaluador] ?? item.zonaEvaluador}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td>{item.delito}</td>
                                        <td className="eval-col-centro" style={{verticalAlign:'middle', textAlign:'center', fontSize:'0.82rem'}}>
                                            <span style={{display:'block'}}>{item.fechaSolicitud || '—'}</span>
                                            <span style={{display:'block', fontSize:'0.78rem', color:'#9ca3af'}}>
                                                {item.fechaAudiencia || <span style={{color:'#ccc'}}>—</span>}
                                            </span>
                                        </td>
                                        <td>{item.nombreEvaluador ?? <span className="sin-asignar eval-sin-eval">Sin asignar</span>}</td>
                                        {/* Badge de estado: prioridad Negación > Fallecido > Resultado (riesgo) > Estatus */}
                                        <td>
                                            {item.tipoDocumento === 'NEGACION' ? (
                                                <span className="estatus-badge" style={{ background: '#fde8e8', color: '#c0392b', border: '1px solid #f5c6c6' }}><i className="bi bi-x-circle-fill" /> Negación</span>
                                            ) : item.imputadoFallecido ? (
                                                <span className="imp-badge-fallecido"><i className="bi bi-heartbreak-fill" /> Fallecido</span>
                                            ) : item.imputadoCarpetaCerrada ? (
                                                <span
                                                    className="exp-badge-cierre eval-badge-cierre-tabla"
                                                    title={item.imputadoEstatusCierre ? (ESTATUS_CIERRE_LABEL[item.imputadoEstatusCierre] ?? item.imputadoEstatusCierre) : 'Carpeta Cerrada'}
                                                >
                                                    <i className="bi bi-folder-x" /> Carpeta Cerrada
                                                    {item.imputadoEstatusCierre && (
                                                        <span className="eval-cierre-sub">
                                                            {ESTATUS_CIERRE_LABEL[item.imputadoEstatusCierre] ?? item.imputadoEstatusCierre}
                                                        </span>
                                                    )}
                                                </span>
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
                                          <div>
                                            <button className="btn-ver-eval" title="Ver detalle" onClick={async () => {
                                                try {
                                                    const res = await getEvaluacionById(item.id);
                                                    if (res.data.ok) {
                                                        const data = res.data.data;
                                                        if (data.tipoDocumento === 'NEGACION') {
                                                            setNegacionParaImprimir({
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
                                            {(user?.rol === 'ADMINISTRADOR' || user?.rol === 'SUPERADMIN') && (
                                                <button className="btn-ver-eval" title="Eliminar registro"
                                                    style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5' }}
                                                    onClick={() => setConfirmEliminar({ id: item.id, label: item.nombreCompletoImputado || item.nombreImputado || 'este registro' })}>
                                                    <i className="bi bi-trash3"></i>
                                                </button>
                                            )}
                                          </div>
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
                            <button onClick={() => { setShowModalNegacion(false); setNegacionData(getNegacionVacio()); setNegacionErrores({}); setSugerenciasPorIdx({}); setNegBusqPorIdx({}); setNegOptsPorIdx({}); setNegDupPorIdx({}); setNegDupEntsPorIdx({}); }}
                                style={{ background: 'rgba(255,255,255,.2)', border: 'none', color: '#fff', width: 30, height: 30, borderRadius: 6, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                ×
                            </button>
                        </div>

                        {/* Body */}
                        <div style={{ padding: '20px 24px' }}>
                            <p style={{ fontSize: 13, color: '#666', margin: '0 0 18px', background: '#fff8f0', border: '1px solid #f0d9c8', borderRadius: 8, padding: '10px 14px' }}>
                                <i className="bi bi-info-circle" style={{ color: '#c0392b' }} /> El imputado se negó a proporcionar información. Completa los datos mínimos para generar el documento.
                            </p>

                            {/* Sección imputados */}
                            <p style={{ fontSize: 11, fontWeight: 700, color: '#c0392b', textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 10px', borderBottom: '1px solid #f0d9c8', paddingBottom: 6 }}>Datos del imputado</p>

                            {/* Causa penal — compartida por todos */}
                            <div style={{ marginBottom: 8 }}>
                                <label style={{ fontSize: 11, fontWeight: 600, color: negacionErrores.causaPenal ? '#c0392b' : '#444', display: 'block', marginBottom: 3 }}>Carpeta / Causa penal *</label>
                                <input value={negacionData.causaPenal}
                                    onChange={e => { setNegacionData(p => ({ ...p, causaPenal: e.target.value })); setSugerenciasPorIdx(p => ({ ...p, causa: [] })); setNegacionErrores(p => ({ ...p, causaPenal: '' })); }}
                                    onBlur={e => handleCausaPenalBlur(e.target.value)}
                                    style={{ width: '100%', boxSizing: 'border-box', border: `1px solid ${negacionErrores.causaPenal ? '#c0392b' : '#ddd'}`, borderRadius: 6, padding: '7px 10px', fontSize: 13, outline: 'none' }} />
                                {negacionErrores.causaPenal && <span style={{ fontSize: 10, color: '#c0392b' }}>{negacionErrores.causaPenal}</span>}
                            </div>

                            {/* Sugerencias por causa penal */}
                            {(sugerenciasPorIdx.causa || []).length > 0 && (
                                <div style={{ border: '1px solid #b6d4fe', borderRadius: 8, marginBottom: 10, overflow: 'hidden', background: '#eef4ff' }}>
                                    <p style={{ margin: 0, padding: '6px 10px', fontSize: 11, fontWeight: 600, color: '#2c4fa3', background: '#ddeaff', borderBottom: '1px solid #b6d4fe' }}>
                                        ℹ Esta causa penal ya existe. ¿Es alguno de estos?
                                    </p>
                                    {(sugerenciasPorIdx.causa || []).map((s, si) => (
                                        <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', borderBottom: '1px solid #d0e4ff', background: '#f5f9ff' }}>
                                            <span style={{ fontSize: 12 }}><strong>{s.nombre} {s.apPaterno} {s.apMaterno || ''}</strong></span>
                                            <button onClick={() => {
                                                setNegacionData(p => {
                                                    const imps = [...p.imputados];
                                                    // Asignar al primer imputado sin vincular, o al índice 0 si todos ya están vinculados
                                                    const targetIdx = imps.findIndex(imp => !imp.imputadoId);
                                                    const idx = targetIdx >= 0 ? targetIdx : 0;
                                                    imps[idx] = { ...imps[idx], imputadoId: s.id, nombreImputado: s.nombre || '', apPaternoImputado: s.apPaterno || '', apMaternoImputado: s.apMaterno || '' };
                                                    return { ...p, imputados: imps };
                                                });
                                                setSugerenciasPorIdx(p => ({ ...p, causa: [] }));
                                            }} style={{ background: '#2d6a4f', color: '#fff', border: 'none', borderRadius: 5, padding: '4px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                                                Seleccionar
                                            </button>
                                        </div>
                                    ))}
                                    <div style={{ padding: '6px 10px', background: '#eef4ff' }}>
                                        <button onClick={() => setSugerenciasPorIdx(p => ({ ...p, causa: [] }))}
                                            style={{ background: '#fff', border: '1px solid #aac4f0', borderRadius: 5, fontSize: 12, cursor: 'pointer', color: '#2c4fa3', padding: '3px 10px', fontWeight: 600 }}>
                                            + Son personas diferentes
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Una tarjeta por imputado — solo nombre, apellidos, edad */}
                            {negacionData.imputados.map((imp, idx) => (
                                <div key={idx} style={{ border: '1px solid #f0d9c8', borderRadius: 8, padding: '12px', marginBottom: 10, background: idx % 2 === 0 ? '#fff' : '#fffaf9' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <span style={{ fontSize: 11, fontWeight: 700, color: '#c0392b' }}>Imputado {idx + 1}</span>
                                        {negacionData.imputados.length > 1 && (
                                            <button onClick={() => eliminarImputado(idx)}
                                                style={{ background: 'none', border: '1px solid #e0b0aa', borderRadius: 5, color: '#c0392b', fontSize: 11, cursor: 'pointer', padding: '2px 8px' }}>
                                                ✕ Quitar
                                            </button>
                                        )}
                                    </div>

                                    {/* Aviso de duplicado detectado automáticamente */}
                                    {negDupPorIdx[idx] && !imp.imputadoId && (
                                        <div style={{ border: '1px solid #dc2626', background: '#fef2f2', borderRadius: 8, padding: '10px 12px', marginBottom: 8, fontSize: 12 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                                <i className="bi bi-exclamation-triangle-fill" style={{ color: '#dc2626' }} />
                                                <strong style={{ color: '#991b1b' }}>Este imputado ya está registrado en el sistema.</strong>
                                                <button onMouseDown={() => seleccionarImpNeg(idx, negDupPorIdx[idx])}
                                                    style={{ marginLeft: 'auto', background: '#2d6a4f', color: '#fff', border: 'none', borderRadius: 5, padding: '3px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                                                    <i className="bi bi-link-45deg" /> Vincular
                                                </button>
                                                <button onMouseDown={() => setNegDupPorIdx(p => ({ ...p, [idx]: null }))}
                                                    style={{ background: '#fff', color: '#555', border: '1px solid #fca5a5', borderRadius: 5, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}>
                                                    Son diferentes
                                                </button>
                                            </div>
                                            {(negDupEntsPorIdx[idx] || []).length > 0 && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, borderTop: '1px solid #fca5a5', paddingTop: 6 }}>
                                                    {(negDupEntsPorIdx[idx] || []).map(ent => (
                                                        <div key={ent.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff1f1', borderRadius: 4, padding: '3px 8px', flexWrap: 'wrap' }}>
                                                            <span style={{ fontWeight: 700, color: '#7f1d1d', fontSize: 11 }}>{ent.folio}</span>
                                                            <span style={{ color: '#6b7280', fontSize: 10 }}>|</span>
                                                            <span style={{ color: '#374151', fontSize: 11 }}>{ent.causaPenal || 'Sin causa'}</span>
                                                            <span style={{ color: '#6b7280', fontSize: 10 }}>|</span>
                                                            <span style={{ fontWeight: 600, fontSize: 10, color: ent.estado === 'COMPLETADO' ? '#065f46' : '#92400e', background: ent.estado === 'COMPLETADO' ? '#d1fae5' : '#fef3c7', borderRadius: 3, padding: '1px 5px' }}>{ent.estado}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Buscador de imputado existente */}
                                    {!imp.imputadoId ? (
                                        <div style={{ position: 'relative', marginBottom: 10 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #ddd', borderRadius: 6, overflow: 'hidden', background: '#fafafa' }}>
                                                <i className="bi bi-search" style={{ padding: '0 8px', color: '#888', fontSize: 13 }} />
                                                <input
                                                    placeholder="Buscar imputado ya registrado..."
                                                    value={negBusqPorIdx[idx] || ''}
                                                    onChange={e => buscarImpNeg(idx, e.target.value)}
                                                    onBlur={() => setTimeout(() => setNegOptsPorIdx(p => ({ ...p, [idx]: [] })), 200)}
                                                    style={{ flex: 1, border: 'none', outline: 'none', padding: '7px 8px', fontSize: 12, background: 'transparent' }}
                                                />
                                            </div>
                                            {(negOptsporIdx[idx] || []).length > 0 && (
                                                <ul style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 999, background: '#fff', border: '1px solid #ddd', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,.1)', listStyle: 'none', margin: 0, padding: 0, maxHeight: 180, overflowY: 'auto' }}>
                                                    {(negOptsporIdx[idx] || []).map(s => (
                                                        <li key={s.id} onMouseDown={() => seleccionarImpNeg(idx, s)}
                                                            style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0', fontSize: 12 }}
                                                            onMouseEnter={e => e.currentTarget.style.background = '#f0f8f1'}
                                                            onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                                                            <div style={{ fontWeight: 600, color: '#1e293b' }}>{s.nombre} {s.apPaterno} {s.apMaterno || ''}</div>
                                                            <div style={{ color: '#6b7280', fontSize: 11 }}>{s.causaPenal} {(s.totalEntrevistas ?? 0) > 0 ? `• ${s.totalEntrevistas} entrevista(s)` : '• Sin entrevista'}</div>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f0faf4', border: '1px solid #a7d7b8', borderRadius: 6, padding: '6px 10px', marginBottom: 10, fontSize: 12 }}>
                                            <i className="bi bi-person-check-fill" style={{ color: '#2d6a4f' }} />
                                            <span style={{ color: '#2d6a4f', fontWeight: 600 }}>Imputado vinculado al expediente</span>
                                            <button onMouseDown={() => limpiarImpNeg(idx)} style={{ marginLeft: 'auto', background: 'none', border: '1px solid #a7d7b8', borderRadius: 4, fontSize: 11, cursor: 'pointer', color: '#555', padding: '2px 8px' }}>
                                                <i className="bi bi-x-circle" /> Cambiar
                                            </button>
                                        </div>
                                    )}

                                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
                                        {[
                                            ['nombreImputado',    `imp_${idx}_nombreImputado`,    'Nombre(s) *'],
                                            ['apPaternoImputado', `imp_${idx}_apPaternoImputado`, 'Apellido paterno *'],
                                            ['apMaternoImputado', null,                           'Apellido materno'],
                                        ].map(([campo, errKey, label]) => (
                                            <div key={campo} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                                <label style={{ fontSize: 11, fontWeight: 600, color: errKey && negacionErrores[errKey] ? '#c0392b' : '#444' }}>{label}</label>
                                                <input value={imp[campo]}
                                                    readOnly={!!imp.imputadoId}
                                                    onChange={e => { if (!imp.imputadoId) { setImputado(idx, campo, e.target.value); if (errKey) setNegacionErrores(p => ({ ...p, [errKey]: '' })); } }}
                                                    style={{ border: `1px solid ${errKey && negacionErrores[errKey] ? '#c0392b' : '#ddd'}`, borderRadius: 6, padding: '7px 10px', fontSize: 13, outline: 'none', background: imp.imputadoId ? '#f5f5f5' : '#fff', cursor: imp.imputadoId ? 'not-allowed' : 'text' }} />
                                                {errKey && negacionErrores[errKey] && <span style={{ fontSize: 10, color: '#c0392b' }}>{negacionErrores[errKey]}</span>}
                                            </div>
                                        ))}
                                    </div>

                                    <div style={{ width: '30%' }}>
                                        <label style={{ fontSize: 11, fontWeight: 600, color: '#444', display: 'block', marginBottom: 3 }}>Edad</label>
                                        <input value={imp.edad} onChange={e => setImputado(idx, 'edad', e.target.value)}
                                            style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #ddd', borderRadius: 6, padding: '7px 10px', fontSize: 13, outline: 'none' }} />
                                    </div>
                                </div>
                            ))}

                            <button onClick={agregarImputado}
                                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1.5px dashed #c0392b', color: '#c0392b', borderRadius: 7, padding: '7px 14px', fontSize: 12, cursor: 'pointer', fontWeight: 600, marginBottom: 16, width: '100%', justifyContent: 'center' }}>
                                <i className="bi bi-person-plus" /> Agregar imputado
                            </button>

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
                            <button onClick={() => { setShowModalNegacion(false); setNegacionData(getNegacionVacio()); setNegacionErrores({}); setSugerenciasPorIdx({}); setNegBusqPorIdx({}); setNegOptsPorIdx({}); setNegDupPorIdx({}); setNegDupEntsPorIdx({}); }}
                                style={{ background: 'none', border: '1px solid #ccc', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', fontSize: 13, color: '#555' }}>
                                Cancelar
                            </button>
                            <button onClick={async () => {
                                if (!validarNegacion()) return;
                                try {
                                    // Crear un registro con el primer imputado como principal
                                    const primero = negacionData.imputados[0];
                                    const payload = {
                                        nombreImputado:    primero.nombreImputado,
                                        apPaternoImputado: primero.apPaternoImputado,
                                        apMaternoImputado: primero.apMaternoImputado || '',
                                        edad:              primero.edad ? parseInt(primero.edad) : null,
                                        causaPenal:        negacionData.causaPenal,
                                        dependencia:       negacionData.dependencia,
                                        cargo:             negacionData.cargo,
                                        nombreSolicitante: negacionData.nombreSolicitante,
                                        fechaSolicitud:    negacionData.fechaSolicitud || new Date().toISOString().split('T')[0],
                                        horaInicio:        negacionData.horaInicio,
                                        lugarEntrevista:   negacionData.lugarEntrevista,
                                        imputadoId:        primero.imputadoId || null,
                                    };
                                    await crearNegacion(payload);
                                    showToast('Negación registrada en el sistema', 'success');
                                    cargarDatos();
                                    setNegacionParaImprimir({ ...negacionData });
                                    setShowModalNegacion(false);
                                    setNegacionData(getNegacionVacio());
                                    setSugerenciasPorIdx({});
                                    setShowPrintNegacion(true);
                                } catch (e) {
                                    showToast('No se pudo guardar el registro de negación', 'error');
                                    setShowModalNegacion(false);
                                    setNegacionData(getNegacionVacio());
                                    setSugerenciasPorIdx({});
                                }
                            }}
                                style={{ background: '#c0392b', border: 'none', color: '#fff', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <i className="bi bi-file-earmark-text" /> Generar Documento
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showPrintNegacion && (
                <PrintNegacion evaluacion={negacionParaImprimir} onCerrar={() => { setShowPrintNegacion(false); setNegacionParaImprimir(null); }} />
            )}

            {/* ── Modal confirmar eliminar ── */}
            {confirmEliminar && (
                <div className="modal-overlay" onClick={() => { if (!eliminando) setConfirmEliminar(null); }}>
                    <div className="modal-box" style={{ width: 'min(420px, 92vw)', textAlign: 'center', padding: '32px 28px' }} onClick={e => e.stopPropagation()}>
                        <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: '2px solid #fca5a5' }}>
                            <i className="bi bi-trash3" style={{ fontSize: 24, color: '#dc2626' }} />
                        </div>
                        <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700, color: '#1a1a2e' }}>¿Eliminar registro?</h3>
                        <p style={{ margin: '0 0 24px', fontSize: 14, color: '#6b7280', lineHeight: 1.5 }}>
                            Se eliminará el registro de <strong style={{ color: '#374151' }}>{confirmEliminar.label}</strong>.<br />Esta acción no se puede deshacer.
                        </p>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                            <button
                                disabled={eliminando}
                                onClick={() => setConfirmEliminar(null)}
                                style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                                Cancelar
                            </button>
                            <button
                                disabled={eliminando}
                                onClick={async () => {
                                    setEliminando(true);
                                    try {
                                        const res = await eliminarEvaluacion(confirmEliminar.id);
                                        if (res.data.ok) { cargarDatos(); showToast('Registro eliminado', 'success'); }
                                        else showToast('No se pudo eliminar', 'error');
                                    } catch { showToast('Error al eliminar', 'error'); }
                                    setEliminando(false);
                                    setConfirmEliminar(null);
                                }}
                                style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', background: eliminando ? '#f87171' : '#dc2626', color: '#fff', fontWeight: 700, fontSize: 14, cursor: eliminando ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                {eliminando ? <><i className="bi bi-hourglass-split" /> Eliminando…</> : <><i className="bi bi-trash3" /> Eliminar</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default EvaluacionRiesgos;
