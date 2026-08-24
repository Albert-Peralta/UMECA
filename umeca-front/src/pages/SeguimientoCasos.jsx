import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getMedidas, getMedidaById } from '../api/medidasApi';
import { getImputados } from '../api/imputadosApi';
import { buscarEntrevistasParaMedida } from '../api/entrevistasApi';
import FormularioMedida from './FormularioMedida';
import FormularioSCP from './FormularioSCP';
import DetalleMedida from './DetalleMedida';
import './Historico.css';
import './SeguimientoCasos.css';
import './Imputados.css';
import { ESTATUS_CIERRE_LABEL } from '../constants/estatusCierre';

const ITEMS_POR_PAGINA = 50;

const estadoConfig = {
    ACTIVO:     { label: 'Activo',     clase: 'estatus-atendido' },
    SUSPENDIDO: { label: 'Suspendido', clase: 'estatus-proceso' },
    FINALIZADO: { label: 'Finalizado', clase: 'estatus-pendiente' },
    LEVANTADO:  { label: 'Levantado',  clase: 'estatus-levantado' },
    REVOCADO:   { label: 'Revocado',   clase: 'estatus-revocado' },
};

const SeguimientoCasos = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const puedeRegistrar   = user?.rol === 'ADMINISTRADOR' || user?.rol === 'SUPERADMIN' || user?.rol === 'SUPERVISION';
    const puedeSeguimiento = user?.rol === 'ADMINISTRADOR' || user?.rol === 'SUPERADMIN' || user?.rol === 'SUPERVISION' || user?.rol === 'EVALUADOR_RIESGO';

    // ── Alerta de vencimiento SCP ─────────────────────────────────────────────
    // Prioridad de plazo: nuevo plazo acordado > vencimiento calculado > plazo original
    const plazoEfectivo = (item) => item.nuevoPlazoScp || item.vencimientoPlazo || item.plazoScp || null;

    const diasParaVencer = (item) => {
        if (item.tipo !== 'SUSPENSION_CONDICIONAL' || item.estado !== 'ACTIVO') return null;
        const plazo = plazoEfectivo(item);
        if (!plazo) return null;
        const hoy = new Date(); hoy.setHours(0,0,0,0);
        const fin  = new Date(plazo + 'T00:00:00');
        return Math.ceil((fin - hoy) / (1000 * 60 * 60 * 24));
    };

    /**
     * Devuelve el objeto de alerta de vencimiento para mostrar en la tabla,
     * o null si no aplica. Solo aplica a SCP activas.
     * Las SCP vencidas hace más de 15 días ya no se destacan para reducir ruido.
     */
    const alertaVencimiento = (item) => {
        const dias = diasParaVencer(item);
        if (dias === null) return null;
        if (dias < -15) return null; // más de 15 días vencida: ya no se muestra
        if (dias < 0)   return { tipo: 'vencido',  label: `Venció hace ${Math.abs(dias)} día(s)`, clase: 'alerta-vencido' };
        if (dias === 0) return { tipo: 'proximo',  label: 'Vence hoy',                            clase: 'alerta-proximo' };
        if (dias <= 30) return { tipo: 'proximo',  label: `Vence en ${dias} día(s)`,              clase: 'alerta-proximo' };
        return null;
    };

    // ── Vista: 'lista' | 'formulario' | 'detalle' ────────────────────────────
    const [vista, setVista]           = useState('lista');
    const [medidaActiva, setMedidaActiva] = useState(null);
    const [detalleActivo, setDetalleActivo] = useState(null);

    // ── Lista ──────────────────────────────────────────────────────────────────
    const [datos, setDatos]           = useState([]);
    const [busqueda, setBusqueda]     = useState('');
    const [filtroAlerta,  setFiltroAlerta]  = useState(null); // null | 'proximo' | 'vencido'
    const [zonaFiltro, setZonaFiltro] = useState('TODAS');
    const [showDropdown,  setShowDropdown]  = useState(false);
    const [expandedIds,   setExpandedIds]   = useState(new Set());
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handler = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);
    const [pagina, setPagina]         = useState(1);
    const [cargando, setCargando]     = useState(true);
    const [errorGlobal, setErrorGlobal] = useState('');

    // ── Modal de inicio (imputado + causa + tipo) ──────────────────────────────
    const [showInicio, setShowInicio] = useState(false);
    const [imputadosList, setImputadosList] = useState([]);
    const [initForm, setInitForm]     = useState({ imputadoId: '', causaPenal: '', tipo: 'MEDIDA_CAUTELAR', entrevistaId: '', fechaEntrevista: '' });
    const [initError, setInitError]   = useState('');

    // Pre-llenado desde entrevista
    const [preQuery, setPreQuery]     = useState('');
    const [preOpts, setPreOpts]       = useState([]);
    const [preNombre, setPreNombre]   = useState('');
    const [showPreOpts, setShowPreOpts] = useState(false);
    const [buscandoPre, setBuscandoPre] = useState(false);
    const [recientesPre, setRecientesPre] = useState([]);
    const preRef = useRef(null);
    const preInputRef = useRef(null);

    // ── Carga de detalle ──────────────────────────────────────────────────────
    const [cargandoDetalle, setCargandoDetalle] = useState(false);

    // ── Init ───────────────────────────────────────────────────────────────────
    useEffect(() => { cargarDatos(); }, []);

    // Auto-abrir detalle si viene desde el expediente
    useEffect(() => {
        const id = localStorage.getItem('verMedidaId');
        if (id) {
            localStorage.removeItem('verMedidaId');
            getMedidaById(Number(id)).then(res => {
                if (res.data.ok) { setDetalleActivo(res.data.data); setVista('detalle'); }
            }).catch(err => console.warn("Error al cargar datos:", err));
        }
    }, []);

    // imputadosList ya no se usa en el modal de inicio (se toma de la entrevista)
    // Se mantiene por si se necesita en otro contexto

    useEffect(() => {
        const handler = (e) => { if (preRef.current && !preRef.current.contains(e.target)) setShowPreOpts(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    useEffect(() => {
        document.body.style.overflow = showInicio ? 'hidden' : 'unset';
        return () => { document.body.style.overflow = 'unset'; };
    }, [showInicio]);

    // ── Helpers ────────────────────────────────────────────────────────────────
    const cargarDatos = async () => {
        setCargando(true);
        setErrorGlobal('');
        try {
            const res = await getMedidas();
            if (res.data.ok) setDatos(res.data.data);
            else setErrorGlobal(res.data.message || 'Error al cargar las medidas');
        } catch {
            setErrorGlobal('No se pudo conectar con el servidor. Verifica tu conexión.');
        } finally { setCargando(false); }
    };

    const conteoProximas = datos.filter(d => alertaVencimiento(d)?.tipo === 'proximo').length;
    const conteoVencidas = datos.filter(d => alertaVencimiento(d)?.tipo === 'vencido').length;

    const filtrados = datos.filter(d => {
        const textoOk = d.nombreImputado?.toLowerCase().includes(busqueda.toLowerCase()) ||
                        d.causaPenal?.toLowerCase().includes(busqueda.toLowerCase());
        const alertaOk = !filtroAlerta || alertaVencimiento(d)?.tipo === filtroAlerta;
        const zonaOk = zonaFiltro === 'TODAS' || d.zona === zonaFiltro;
        return textoOk && alertaOk && zonaOk;
    });

    // Agrupa las medidas por imputado para la vista de tabla anidada.
    // La medida más reciente se muestra siempre; las anteriores se expanden al hacer clic.
    const grupos = (() => {
        const map = new Map();
        filtrados.forEach(d => {
            const key = d.imputadoId ?? d.nombreImputado;
            if (!map.has(key)) map.set(key, { key, nombre: d.nombreImputado, medidas: [] });
            map.get(key).medidas.push(d);
        });
        return Array.from(map.values());
    })();

    const totalPaginas = Math.max(1, Math.ceil(grupos.length / ITEMS_POR_PAGINA));
    const inicio = (pagina - 1) * ITEMS_POR_PAGINA;
    const gruposPaginados = grupos.slice(inicio, inicio + ITEMS_POR_PAGINA);

    const toggleExpand = (key) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    };

    // ── Pre-llenado ────────────────────────────────────────────────────────────
    // Al crear una medida nueva se busca la entrevista de encuadre para extraer
    // imputadoId, causa penal y tipo de medida (MC/SCP) sin ingresarlos manualmente.
    const handlePreBuscar = async (e) => {
        const q = e.target.value;
        setPreQuery(q);
        setShowPreOpts(true);
        if (!q.trim()) { setPreOpts([]); return; }
        setBuscandoPre(true);
        try {
            const res = await buscarEntrevistasParaMedida(q);
            setPreOpts(res.data?.data || []);
        } catch { setPreOpts([]); }
        finally { setBuscandoPre(false); }
    };

    // Opciones visibles: resultados de búsqueda si hay query, recientes si no
    const opcionesVisibles = preQuery.trim() ? preOpts : recientesPre;

    const aplicarPreLlenado = (ent) => {
        const tipoMedida = ent.tipoSeguimiento === 'MC' ? 'MEDIDA_CAUTELAR' : 'SUSPENSION_CONDICIONAL';

        setInitError('');
        setInitForm({
            imputadoId: ent.imputadoId ? String(ent.imputadoId) : '',
            causaPenal: ent.causaPenal || '',
            tipo: tipoMedida,
            entrevistaId: String(ent.id),
            fechaEntrevista: ent.fechaRegistro || '',
        });
        setPreNombre(`${ent.nombreCompleto} — ${ent.causaPenal} (${ent.tipoSeguimiento})`);
        setPreQuery('');
        setPreOpts([]);
        setShowPreOpts(false);
    };

    const limpiarPreLlenado = () => {
        setInitForm({ imputadoId: '', causaPenal: '', tipo: 'MEDIDA_CAUTELAR', entrevistaId: '', fechaEntrevista: '' });
        setPreNombre('');
        setPreQuery('');
    };

    const abrirNuevaMedida = async () => {
        setInitForm({ imputadoId: '', causaPenal: '', tipo: 'MEDIDA_CAUTELAR', entrevistaId: '', fechaEntrevista: '' });
        setPreNombre('');
        setPreQuery('');
        setPreOpts([]);
        setInitError('');
        setShowInicio(true);
        // Cargar entrevistas recientes; priorizar las que aún no tienen medida activa
        try {
            const res = await buscarEntrevistasParaMedida('');
            const todas = res.data?.data || [];
            // Set de imputadoIds que ya tienen al menos una medida registrada
            const conMedidaIds = new Set((datos || []).map(d => d.imputadoId).filter(Boolean));
            const sinMedida = todas.filter(e => !conMedidaIds.has(e.imputadoId));
            const conMedida = todas.filter(e =>  conMedidaIds.has(e.imputadoId));
            // Marcar cada entrevista con flag para el badge
            const marcar = (arr, tiene) => arr.map(e => ({ ...e, tieneMedida: tiene }));
            setRecientesPre([...marcar(sinMedida, false), ...marcar(conMedida, true)].slice(0, 5));
        } catch { setRecientesPre([]); }
        // Auto-focus al input tras render
        setTimeout(() => preInputRef.current?.focus(), 80);
    };

    const confirmarInicio = () => {
        if (!preNombre) { setInitError('Selecciona una entrevista de encuadre'); return; }
        setMedidaActiva({
            imputadoId: Number(initForm.imputadoId),
            nombreImputado: preNombre.split(' — ')[0],
            causaPenal: initForm.causaPenal.toUpperCase(),
            tipo: initForm.tipo,
            entrevistaId: initForm.entrevistaId ? Number(initForm.entrevistaId) : null,
            folioEntrevista: preNombre,
        });
        setShowInicio(false);
        setVista('formulario');
    };

    // ── Editar ─────────────────────────────────────────────────────────────────
    const handleEditar = async (item) => {
        setCargandoDetalle(true);
        try {
            const res = await getMedidaById(item.id);
            if (res.data.ok) {
                setMedidaActiva(res.data.data);
                setVista('formulario');
            }
        } catch { showToast('Error al cargar la medida. Verifica la conexión.', 'error'); }
        finally { setCargandoDetalle(false); }
    };

    // ── Detalle ────────────────────────────────────────────────────────────────
    const handleVerDetalle = async (item) => {
        setCargandoDetalle(true);
        try {
            const res = await getMedidaById(item.id);
            if (res.data.ok) { setDetalleActivo(res.data.data); setVista('detalle'); }
        } catch { showToast('Error al cargar el detalle de la medida.', 'error'); }
        finally { setCargandoDetalle(false); }
    };

    const handleCambiarASCP = (medida) => {
        setMedidaActiva({
            _nuevoSCP: true,
            imputadoId: medida.imputadoId,
            nombreImputado: medida.nombreImputado,
            causaPenal: medida.causaPenal,
            entrevistaId: medida.entrevistaId,
            tipo: 'SUSPENSION_CONDICIONAL',
            medidaOrigenId: medida.id,
        });
        setDetalleActivo(null);
        setVista('formulario');
    };

    const handleCambiarAMC = (medida) => {
        setMedidaActiva({
            _nuevoMC: true,
            imputadoId: medida.imputadoId,
            nombreImputado: medida.nombreImputado,
            causaPenal: medida.causaPenal,
            entrevistaId: medida.entrevistaId,
            tipo: 'MEDIDA_CAUTELAR',
            medidaOrigenId: medida.id,  // para vincular la MC nueva con la SCP origen
        });
        setDetalleActivo(null);
        setVista('formulario');
    };

    // ── Render: Detalle ────────────────────────────────────────────────────────
    if (vista === 'detalle' && detalleActivo) {
        return (
            <DetalleMedida
                medida={detalleActivo}
                puedeRegistrar={puedeRegistrar}
                puedeSeguimiento={puedeSeguimiento}
                onVolver={() => { setVista('lista'); setDetalleActivo(null); cargarDatos(); }}
                onEditar={() => { setMedidaActiva(detalleActivo); setDetalleActivo(null); setVista('formulario'); }}
                onActualizado={(actualizado) => { setDetalleActivo(actualizado); cargarDatos(); }}
                onCambiarSCP={handleCambiarASCP}
                onCambiarMC={handleCambiarAMC}
            />
        );
    }

    // ── Render: FormularioMedida ───────────────────────────────────────────────
    if (vista === 'formulario') {
        const volverDesdeFormulario = async () => {
            // Si venimos de un detalle, regresar al detalle recargando datos frescos
            if (medidaActiva?.id) {
                try {
                    const res = await getMedidaById(medidaActiva.id);
                    if (res.data.ok) { setDetalleActivo(res.data.data); }
                } catch {}
                setMedidaActiva(null);
                setVista('detalle');
            } else {
                setMedidaActiva(null);
                setVista('lista');
            }
        };

        const guardadoDesdeFormulario = async (idGuardado) => {
            cargarDatos();
            showToast(medidaActiva?.id ? 'Medida actualizada correctamente' : 'Medida registrada correctamente');
            if (medidaActiva?.id) {
                try {
                    const res = await getMedidaById(medidaActiva.id);
                    if (res.data.ok) { setDetalleActivo(res.data.data); }
                } catch {}
                setMedidaActiva(null);
                setVista('detalle');
                document.querySelector('.dashboard-content')?.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                setMedidaActiva(null);
                setVista('lista');
            }
        };

        const esSCP = medidaActiva?.tipo === 'SUSPENSION_CONDICIONAL';
        return esSCP ? (
            <FormularioSCP
                medidaInicial={medidaActiva}
                onVolver={volverDesdeFormulario}
                onGuardado={guardadoDesdeFormulario}
            />
        ) : (
            <FormularioMedida
                medidaInicial={medidaActiva}
                onVolver={volverDesdeFormulario}
                onGuardado={guardadoDesdeFormulario}
            />
        );
    }

    // ── Render: Lista ──────────────────────────────────────────────────────────
    return (
        <div className="historico-wrapper">

            {errorGlobal && (
                <div style={{ margin: '1rem 1.5rem', padding: '.75rem 1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontSize: '.875rem', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                    <i className="bi bi-exclamation-triangle-fill" /> {errorGlobal}
                    <button onClick={cargarDatos} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 600 }}>Reintentar</button>
                </div>
            )}

            <div className="historico-toolbar">
                <span className="historico-count">
                    Mostrando <b>{grupos.length > 0 ? inicio + 1 : 0}</b> a{' '}
                    <b>{Math.min(inicio + ITEMS_POR_PAGINA, grupos.length)}</b> de{' '}
                    <b>{grupos.length}</b> imputados · <b>{filtrados.length}</b> medidas
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

            <div className="historico-actions">
                <div className="historico-search scp-toolbar-override">
                    <i className="bi bi-search"></i>
                    <input
                        type="text"
                        placeholder="Buscar por nombre o causa penal..."
                        value={busqueda}
                        onChange={e => { setBusqueda(e.target.value); setPagina(1); }}
                    />
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
                <div className="scp-dropdown-wrap" ref={dropdownRef}>
                    <button
                        className={`scp-dropdown-btn${filtroAlerta === 'vencido' ? ' scp-dd-vencido' : filtroAlerta === 'proximo' ? ' scp-dd-proximo' : ''}`}
                        onClick={() => setShowDropdown(v => !v)}
                    >
                        <i className={`bi ${filtroAlerta === 'vencido' ? 'bi-exclamation-circle' : filtroAlerta === 'proximo' ? 'bi-clock-history' : 'bi-funnel'}`} />
                        {filtroAlerta === 'vencido' ? `Vencidas (${conteoVencidas})` : filtroAlerta === 'proximo' ? `Próx. a vencer (${conteoProximas})` : 'Filtrar plazo'}
                        <i className="bi bi-chevron-down scp-dd-chevron" />
                    </button>
                    {showDropdown && (
                        <div className="scp-dropdown-menu">
                            <button className={`scp-dd-item${!filtroAlerta ? ' scp-dd-active' : ''}`} onClick={() => { setFiltroAlerta(null); setPagina(1); setShowDropdown(false); }}>
                                <i className="bi bi-list-ul" /> Todas las medidas
                            </button>
                            <button className={`scp-dd-item scp-dd-item-proximo${filtroAlerta === 'proximo' ? ' scp-dd-active' : ''}`} onClick={() => { setFiltroAlerta('proximo'); setPagina(1); setShowDropdown(false); }}>
                                <i className="bi bi-clock-history" /> Próx. a vencer
                                <span className="scp-dd-count scp-dd-count-proximo">{conteoProximas}</span>
                            </button>
                            <button className={`scp-dd-item scp-dd-item-vencido${filtroAlerta === 'vencido' ? ' scp-dd-active' : ''}`} onClick={() => { setFiltroAlerta('vencido'); setPagina(1); setShowDropdown(false); }}>
                                <i className="bi bi-exclamation-circle" /> Vencidas
                                <span className="scp-dd-count scp-dd-count-vencido">{conteoVencidas}</span>
                            </button>
                        </div>
                    )}
                </div>
                {puedeRegistrar && (
                    <button className="btn-solicitud" onClick={abrirNuevaMedida} style={{ marginLeft: 'auto' }}>
                        <i className="bi bi-plus-lg"></i> Nueva Medida
                    </button>
                )}
            </div>

            <div className="historico-tabla-wrapper">
                <div style={{ overflowX: 'auto' }}>
                <table className="historico-tabla scp-tabla-grupo">
                    <colgroup>
                        <col style={{width:40}} />
                        <col style={{width:200}} />
                        <col style={{width:110}} />
                        <col style={{width:80}} />
                        <col style={{width:130}} />
                        <col style={{width:70}} />
                        <col style={{width:130}} />
                        <col style={{width:100}} />
                        <col style={{width:60}} />
                    </colgroup>
                    <thead>
                        <tr>
                            <th>NO.</th>
                            <th style={{ minWidth: 200, width: 220 }}>NOMBRE IMPUTADO</th>
                            <th>CAUSA PENAL</th>
                            <th>TIPO</th>
                            <th>DELITO</th>
                            <th>FRACC.</th>
                            <th>VIGENCIA</th>
                            <th style={{ minWidth: 130 }}>CUMPLIMIENTO</th>
                            <th style={{ minWidth: 140, maxWidth: 200, width: 170 }}>ESTADO</th>
                            <th style={{ minWidth: 70, width: 70, textAlign: 'center', paddingRight: 16 }}>VER</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cargando ? (
                            <tr><td colSpan="10" className="tabla-vacia">Cargando...</td></tr>
                        ) : gruposPaginados.length === 0 ? (
                            <tr><td colSpan="10" className="tabla-vacia">No hay registros</td></tr>
                        ) : gruposPaginados.map((grupo, gi) => {
                            const expanded = expandedIds.has(grupo.key);
                            const tieneVarias = grupo.medidas.length > 1;
                            // La más reciente es la primera (asumimos orden desc del backend)
                            const reciente = grupo.medidas[0];
                            const resto   = grupo.medidas.slice(1);
                            const alertasVenc = grupo.medidas.map(m => alertaVencimiento(m)).filter(a => a?.tipo === 'vencido');
                            const alertasProx = grupo.medidas.map(m => alertaVencimiento(m)).filter(a => a?.tipo === 'proximo');
                            const countVenc = alertasVenc.length;
                            const countProx = alertasProx.length;
                            // Etiqueta más urgente para mostrar en el badge
                            const labelVenc = countVenc === 1 ? alertasVenc[0].label : `${countVenc} vencidas`;
                            const labelProx = countProx === 1 ? alertasProx[0].label : `${countProx} próximas a vencer`;
                            const alertaRec = alertaVencimiento(reciente);

                            const renderMedidaCols = (item) => {
                                const alerta = alertaVencimiento(item);
                                return <>
                                    <td>{item.causaPenal}</td>
                                    <td>
                                        <span className={`scp-tipo-badge ${item.tipo === 'SUSPENSION_CONDICIONAL' ? 'scp-tipo-suspension' : 'scp-tipo-medida'}`}>
                                            {item.tipo === 'SUSPENSION_CONDICIONAL' ? 'S.C.P.' : 'M.C.'}
                                        </span>
                                        {item.vieneDeMC && (
                                            <span style={{ display: 'block', fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                                                M.C. → S.C.P.
                                            </span>
                                        )}
                                        {item.vieneDeScp && (
                                            <span style={{ display: 'block', fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                                                S.C.P. → M.C.
                                            </span>
                                        )}
                                    </td>
                                    <td className="col-delito" title={item.delito || ''}>
                                        {item.delito || '—'}
                                        {alerta && (
                                            <span className={`badge-alerta-plazo ${alerta.clase}`} title={alerta.label} style={{marginLeft:5,display:'inline-flex',alignItems:'center',gap:3}}>
                                                <i className="bi bi-exclamation-triangle-fill" /> {alerta.label}
                                            </span>
                                        )}
                                    </td>
                                    <td><span className="scp-fracciones-count">{item.fracciones?.length ?? 0} fracc.</span></td>
                                    <td style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                                        {item.vigenciaInicio || item.vigenciaFin
                                            ? <>{item.vigenciaInicio ?? '—'}<span style={{ color: '#bbb', margin: '0 4px' }}>/</span>{item.vigenciaFin ?? '—'}</>
                                            : '—'}
                                    </td>
                                    <td>
                                        {item.cumpliendoIncumpliendo === 'CUMPLIMIENTO'
                                            ? <span className="cumpl-badge-tabla cumpl-cumplimiento">
                                                <i className="bi bi-check-circle-fill" /> Cumplimiento
                                              </span>
                                            : item.cumpliendoIncumpliendo === 'INCUMPLIMIENTO'
                                            ? <span className="cumpl-badge-tabla cumpl-incumplimiento">
                                                <i className="bi bi-x-circle-fill" /> Incumplimiento
                                              </span>
                                            : item.imputadoCarpetaCerrada && item.imputadoEstatusCierre
                                            ? (() => {
                                                const label = ESTATUS_CIERRE_LABEL[item.imputadoEstatusCierre] ?? item.imputadoEstatusCierre;
                                                return <span className="cumpl-badge-cierre-wrap"
                                                    onMouseEnter={e => {
                                                        const t = e.currentTarget.querySelector('.cumpl-tooltip-cierre');
                                                        const r = e.currentTarget.getBoundingClientRect();
                                                        t.style.display = 'block';
                                                        t.style.top = (r.bottom + 6) + 'px';
                                                        t.style.left = (r.left + r.width / 2) + 'px';
                                                    }}
                                                    onMouseLeave={e => {
                                                        e.currentTarget.querySelector('.cumpl-tooltip-cierre').style.display = 'none';
                                                    }}>
                                                    <span className="cumpl-badge-tabla cumpl-cumplimiento cumpl-badge-cierre"
                                                        style={{ fontSize: 10, padding: '4px 8px', maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}>
                                                        {label}
                                                    </span>
                                                    <span className="cumpl-tooltip-cierre">{label}</span>
                                                </span>;
                                              })()
                                            : <span className="cumpl-badge-tabla cumpl-sin-asignar">Sin estatus</span>
                                        }
                                    </td>
                                    <td style={{ maxWidth: 200 }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                                            {item.imputadoFallecido
                                                ? <span className="imp-badge-fallecido"><i className="bi bi-heartbreak-fill" /> Fallecido</span>
                                                : item.imputadoCarpetaCerrada
                                                ? <span className="exp-badge-cierre" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
                                                    <span><i className="bi bi-folder-x" /> Carpeta Cerrada</span>
                                                    {item.imputadoEstatusCierre && <span style={{ fontSize: 10, opacity: 0.85, fontWeight: 400 }}>{ESTATUS_CIERRE_LABEL[item.imputadoEstatusCierre] ?? item.imputadoEstatusCierre}</span>}
                                                  </span>
                                                : <span className={`estatus-badge ${estadoConfig[item.estado]?.clase}`}>{estadoConfig[item.estado]?.label ?? item.estado}</span>
                                            }
                                            {item.tieneSobreseimiento && (
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: 4,
                                                    background: '#7c3aed', color: '#fff',
                                                    borderRadius: 20, padding: '2px 9px',
                                                    fontSize: 10, fontWeight: 700,
                                                }}>
                                                    <i className="bi bi-check2-circle" style={{ fontSize: 10 }} />
                                                    Sobreseimiento
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                </>;
                            };

                            return [
                                // ── Fila principal (nombre + medida más reciente) ─
                                <tr
                                    key={`g-${grupo.key}`}
                                    className={`scp-grupo-header${expanded ? ' scp-grupo-expanded' : ''}${tieneVarias ? ' scp-grupo-clickeable' : ''}`}
                                    onClick={tieneVarias ? () => toggleExpand(grupo.key) : undefined}
                                    title={tieneVarias ? (expanded ? 'Ocultar anteriores' : `Ver ${resto.length} medida${resto.length > 1 ? 's' : ''} anterior${resto.length > 1 ? 'es' : ''}`) : undefined}
                                >
                                    <td className="scp-grupo-num">{inicio + gi + 1}</td>
                                    <td className="scp-grupo-nombre-cell">
                                        <div className="scp-grupo-nombre-wrap">
                                            {tieneVarias
                                                ? <i className={`bi bi-caret-${expanded ? 'down' : 'right'}-fill scp-grupo-caret`} />
                                                : <i className="bi bi-person-fill scp-grupo-icon" />
                                            }
                                            <span className="scp-grupo-nombre-txt">{grupo.nombre}</span>
                                            {reciente.zona && (
                                                <span className={`zona-tag zona-tag-${reciente.zona.toLowerCase()}`}>
                                                    {({'XOCHITEPEC':'Xochi','CUAUTLA':'Cuat','JOJUTLA':'Jojut'})[reciente.zona] ?? reciente.zona}
                                                </span>
                                            )}
                                        </div>
                                        {tieneVarias && (
                                            <span className="scp-grupo-hint-txt">
                                                {expanded
                                                    ? 'Ocultar anteriores'
                                                    : `+${resto.length} registro${resto.length > 1 ? 's' : ''} anterior${resto.length > 1 ? 'es' : ''}`
                                                }
                                            </span>
                                        )}
                                        <div className="scp-grupo-badges">
                                            {countVenc > 0 && <span className="scp-grupo-badge scp-grupo-badge-vencido"><i className="bi bi-exclamation-circle-fill" /> {labelVenc}</span>}
                                            {countProx > 0 && <span className="scp-grupo-badge scp-grupo-badge-proximo"><i className="bi bi-clock-fill" /> {labelProx}</span>}
                                        </div>
                                    </td>
                                    {renderMedidaCols(reciente)}
                                    <td style={{ textAlign: 'center', paddingRight: 16 }}>
                                        <button className="btn-ver" onClick={(e) => { e.stopPropagation(); handleVerDetalle(reciente); }} title="Ver detalle" disabled={cargandoDetalle}>
                                            <i className="bi bi-eye"></i>
                                        </button>
                                    </td>
                                </tr>,
                                // ── Filas de medidas anteriores (cuando expandido) ─
                                ...(expanded ? resto.map((item) => {
                                    const alerta = alertaVencimiento(item);
                                    return (
                                        <tr key={item.id} className={`scp-child-row${alerta ? ` fila-${alerta.tipo}` : ''}`}>
                                            <td className="scp-child-num" />
                                            <td className="scp-child-etiqueta">
                                                <span className="scp-child-anterior-label">anterior</span>
                                            </td>
                                            {renderMedidaCols(item)}
                                            <td style={{ textAlign: 'center', paddingRight: 16 }}>
                                                <button className="btn-ver" onClick={(e) => { e.stopPropagation(); handleVerDetalle(item); }} title="Ver detalle" disabled={cargandoDetalle}>
                                                    <i className="bi bi-eye"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                }) : [])
                            ];
                        })}
                    </tbody>
                </table>
                </div>
            </div>

            {/* ── MODAL: INICIO ────────────────────────────────────────────── */}
            {showInicio && (
                <div className="modal-overlay">
                    <div className="modal-box" style={{ maxWidth: 820 }}>
                        <div className="modal-header">
                            <div>
                                <h3>NUEVA MEDIDA / S.C.P.</h3>
                                <p style={{ fontSize: 12, color: '#d1e8d4', margin: '2px 0 0' }}>
                                    Busca la entrevista de encuadre para continuar
                                </p>
                            </div>
                            <button className="modal-close" onClick={() => setShowInicio(false)}>
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        <div className="modal-form">
                            {initError && <p className="error" style={{ marginBottom: 10 }}>{initError}</p>}

                            {/* Buscador de entrevista */}
                            <div className="scp-prellenado-bloque" ref={preRef}>
                                <div className="scp-prellenado-label">
                                    <i className="bi bi-journal-check" /> Entrevista de encuadre
                                </div>
                                {preNombre ? (
                                    <div className="scp-prellenado-row">
                                        <div className="scp-prellenado-chip">
                                            <i className="bi bi-journal-check" />
                                            <span>{preNombre}</span>
                                        </div>
                                        <button type="button" className="scp-btn-limpiar" onClick={limpiarPreLlenado}>
                                            <i className="bi bi-x" /> Cambiar
                                        </button>
                                    </div>
                                ) : (
                                    <div className="scp-prellenado-search">
                                        <i className="bi bi-search scp-pre-icon" />
                                        <input
                                            ref={preInputRef}
                                            type="text"
                                            placeholder="Nombre del imputado o causa penal..."
                                            value={preQuery}
                                            onChange={handlePreBuscar}
                                            onFocus={() => setShowPreOpts(true)}
                                            autoComplete="off"
                                        />
                                        {buscandoPre && <span className="scp-pre-buscando">Buscando...</span>}
                                        {showPreOpts && opcionesVisibles.length > 0 && (
                                            <ul className="scp-pre-opts">
                                                {!preQuery.trim() && (
                                                    <li className="scp-pre-recientes-label">
                                                        <i className="bi bi-exclamation-circle" /> Pendientes de medida
                                                    </li>
                                                )}
                                                {opcionesVisibles.map(e => (
                                                    <li key={e.id} onMouseDown={() => aplicarPreLlenado(e)} className="scp-pre-item">
                                                        <div className="scp-pre-item-top">
                                                            <div className="scp-pre-imputado">
                                                                <i className="bi bi-person-fill scp-pre-imputado-icon" />
                                                                <span className="scp-pre-nombre">{e.nombreCompleto}</span>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                {e.tieneMedida !== undefined && (
                                                                    e.tieneMedida
                                                                        ? <span className="fev-imp-tiene-ent"><i className="bi bi-card-checklist"></i> Con medida</span>
                                                                        : <span className="fev-imp-sin-ent"><i className="bi bi-card-checklist"></i> Sin medida</span>
                                                                )}
                                                                <span className={`scp-pre-tipo ${e.tipoSeguimiento === 'MC' ? 'scp-pre-mc' : 'scp-pre-scp'}`}>
                                                                    {e.tipoSeguimiento === 'MC' ? 'Medida Cautelar' : 'Susp. Condicional'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="scp-pre-item-bot">
                                                            <span><i className="bi bi-file-earmark-text" /> {e.causaPenal}</span>
                                                            {e.folio && <span><i className="bi bi-hash" /> {e.folio}</span>}
                                                            {e.fechaRegistro && <span><i className="bi bi-calendar3" /> {e.fechaRegistro}</span>}
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                        {showPreOpts && !buscandoPre && preQuery && preOpts.length === 0 && (
                                            <div className="scp-pre-vacio">Sin resultados con MC/SCP asignado en entrevista</div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Resumen de datos — solo lectura, visible tras seleccionar entrevista */}
                            {preNombre && (
                                <div className="scp-inicio-resumen">
                                    <div className="scp-inicio-fila">
                                        <span className="scp-inicio-etiqueta">IMPUTADO</span>
                                        <span className="scp-inicio-valor">{preNombre.split(' — ')[0]}</span>
                                    </div>
                                    <div className="scp-inicio-fila">
                                        <span className="scp-inicio-etiqueta">CAUSA PENAL</span>
                                        <span className="scp-inicio-valor">{initForm.causaPenal}</span>
                                    </div>
                                    <div className="scp-inicio-fila">
                                        <span className="scp-inicio-etiqueta">TIPO DE RESOLUCIÓN</span>
                                        <span className={`scp-tipo-badge ${initForm.tipo === 'SUSPENSION_CONDICIONAL' ? 'scp-tipo-suspension' : 'scp-tipo-medida'}`}>
                                            {initForm.tipo === 'SUSPENSION_CONDICIONAL' ? 'Suspensión Condicional del Proceso (S.C.P.)' : 'Medida Cautelar (M.C.)'}
                                        </span>
                                    </div>
                                    {initForm.fechaEntrevista && (
                                        <div className="scp-inicio-fila">
                                            <span className="scp-inicio-etiqueta">FECHA DE ENTREVISTA</span>
                                            <span className="scp-inicio-valor">{initForm.fechaEntrevista}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {!preNombre && (
                                <p className="scp-inicio-aviso">
                                    <i className="bi bi-info-circle" /> Busca y selecciona la entrevista de encuadre para continuar. El imputado, causa penal y tipo de resolución se tomarán automáticamente de ella.
                                </p>
                            )}

                            <div className="modal-buttons">
                                <button className="btn-cancelar" onClick={() => setShowInicio(false)}>Cancelar</button>
                                <button className="btn-registrar" onClick={confirmarInicio} disabled={!preNombre}>
                                    Continuar <i className="bi bi-arrow-right"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default SeguimientoCasos;
