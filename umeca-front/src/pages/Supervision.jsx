import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
    getAllSupervisions, getAgenda, buscarSupervision, crearSupervision,
    actualizarSupervision, eliminarSupervision
} from '../api/supervisionApi';
import { getImputados } from '../api/imputadosApi';
import './Supervision.css';
import './Imputados.css';

// ── helpers ──────────────────────────────────────────────────────────────────

/** Devuelve la fecha de hoy en formato ISO (YYYY-MM-DD). */
const hoy = () => new Date().toISOString().split('T')[0];

/** Devuelve el lunes y el domingo de la semana en curso (inicio de semana = lunes). */
const semanaActual = () => {
    const d = new Date();
    const lunes = new Date(d);
    lunes.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);
    return {
        inicio: lunes.toISOString().split('T')[0],
        fin: domingo.toISOString().split('T')[0],
    };
};

const fmt = (iso) => {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
};

const TIPO_LABEL = { LLAMADA: 'Llamada', VISITA_DOMICILIARIA: 'Visita domiciliaria' };
const TIPO_ICON  = { LLAMADA: 'bi-telephone-fill', VISITA_DOMICILIARIA: 'bi-house-fill' };

const ESTADO_CONFIG = {
    PENDIENTE:      { label: 'Pendiente',      clase: 'sv-badge-pendiente' },
    REALIZADA:      { label: 'Realizada',      clase: 'sv-badge-realizada' },
    NO_CONTACTADO:  { label: 'No contactado',  clase: 'sv-badge-nocontacto' },
    CANCELADA:      { label: 'Cancelada',      clase: 'sv-badge-cancelada' },
};

// Estructura inicial de destinatarios de supervisión (imputado, víctima, medio laboral).
// Se serializa a JSON para guardarse en Supervision.destinatariosJson.
const DEST_VACIO = () => ({
    imputado:    { telefono: '' },
    victima:     { nombre: '', telefono: '' },
    medioLaboral:{ nombre: '', nombreJefe: '', telefono: '' },
});

const destToJson = (d) => JSON.stringify(d);
const destFromJson = (json) => {
    try { return { ...DEST_VACIO(), ...JSON.parse(json || '{}') }; }
    catch { return DEST_VACIO(); }
};

const FORM_VACIO = {
    imputadoId: '',
    tipo: 'LLAMADA',
    fechaProgramada: hoy(),
    fechaRealizada: '',
    estado: 'PENDIENTE',
    observaciones: '',
    _celularImputado: '',
};

// ── Componente principal ──────────────────────────────────────────────────────
const Supervision = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const puedeEditar  = user?.rol === 'ADMINISTRADOR' || user?.rol === 'SUPERVISION';
    const puedeEliminar = user?.rol === 'ADMINISTRADOR';

    // Vista: 'agenda' | 'buscar'
    const [vista, setVista] = useState('agenda');
    const [agendaInicio, setAgendaInicio] = useState(semanaActual().inicio);
    const [agendaFin, setAgendaFin]       = useState(semanaActual().fin);

    const [datos, setDatos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [busqueda, setBusqueda] = useState('');

    // Filtros
    const [filtroTipo, setFiltroTipo]     = useState('');
    const [filtroEstado, setFiltroEstado] = useState('');

    const [imputados, setImputados] = useState([]);

    // Modal
    const [showModal, setShowModal] = useState(false);
    const [editando, setEditando] = useState(null); // null = nuevo, objeto = editar
    const [form, setForm] = useState(FORM_VACIO);
    const [dest, setDest] = useState(DEST_VACIO());
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');
    const [modoVer, setModoVer] = useState(false); // true = solo lectura

    // Buscador de imputado dentro del modal
    const [impQuery, setImpQuery]           = useState('');
    const [impOpts, setImpOpts]             = useState([]);
    const [impNombre, setImpNombre]         = useState('');
    const [showImpOpts, setShowImpOpts]     = useState(false);
    const impRef = useRef(null);

    // Confirmación eliminar
    const [eliminarId, setEliminarId] = useState(null);

    // ── carga datos ──────────────────────────────────────────────────────────
    const cargarAgenda = useCallback(async () => {
        setCargando(true);
        try {
            const res = await getAgenda(agendaInicio, agendaFin);
            setDatos(res.data?.data || []);
        } catch { setDatos([]); }
        finally { setCargando(false); }
    }, [agendaInicio, agendaFin]);

    const cargarTodos = useCallback(async () => {
        setCargando(true);
        try {
            const res = await getAllSupervisions();
            setDatos(res.data?.data || []);
        } catch { setDatos([]); }
        finally { setCargando(false); }
    }, []);

    useEffect(() => {
        if (vista === 'agenda') cargarAgenda();
        else cargarTodos();
    }, [vista, cargarAgenda, cargarTodos]);

    useEffect(() => {
        getImputados().then(r => setImputados(r.data?.data || [])).catch(err => console.warn("Error al cargar datos:", err));
    }, []);

    // Filtrar imputados según query
    useEffect(() => {
        if (!impQuery.trim()) { setImpOpts([]); return; }
        const q = impQuery.toLowerCase();
        setImpOpts(
            imputados.filter(i =>
                i.nombreCompleto?.toLowerCase().includes(q) ||
                i.causaPenal?.toLowerCase().includes(q)
            ).slice(0, 8)
        );
    }, [impQuery, imputados]);

    // Cerrar dropdown al click fuera
    useEffect(() => {
        const handler = (e) => { if (impRef.current && !impRef.current.contains(e.target)) setShowImpOpts(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // ── buscar en tiempo real ─────────────────────────────────────────────────
    useEffect(() => {
        if (vista !== 'buscar') return;
        const delay = setTimeout(async () => {
            setCargando(true);
            try {
                const res = busqueda.trim()
                    ? await buscarSupervision(busqueda.trim())
                    : await getAllSupervisions();
                setDatos(res.data?.data || []);
            } catch { setDatos([]); }
            finally { setCargando(false); }
        }, 300);
        return () => clearTimeout(delay);
    }, [busqueda, vista]);

    // ── modal ────────────────────────────────────────────────────────────────
    const abrirNuevo = () => {
        setEditando(null);
        setModoVer(false);
        setForm(FORM_VACIO);
        setDest(DEST_VACIO());
        setImpQuery(''); setImpNombre(''); setImpOpts([]); setShowImpOpts(false);
        setError('');
        setShowModal(true);
    };

    // Abre el modal en modo solo-lectura. El usuario puede activar edición dentro del modal.
    const abrirEditar = (item) => {
        setEditando(item);
        const parsedDest = destFromJson(item.destinatariosJson);
        // Si el teléfono no fue guardado antes pero viene de la entrevista, rellenarlo
        if (!parsedDest.imputado.telefono && item.telefonoImputado) {
            parsedDest.imputado.telefono = item.telefonoImputado;
        }
        setDest(parsedDest);
        setForm({
            imputadoId: item.imputadoId,
            tipo: item.tipo,
            _celularImputado: item.telefonoImputado || '',
            fechaProgramada: item.fechaProgramada || '',
            fechaRealizada: item.fechaRealizada || '',
            estado: item.estado,
            observaciones: item.observaciones || '',
        });
        setImpNombre(item.nombreImputado + ' — ' + item.causaPenal);
        setImpQuery(''); setImpOpts([]); setShowImpOpts(false);
        setModoVer(true);
        setError('');
        setShowModal(true);
    };

    const cerrarModal = () => { setShowModal(false); setEditando(null); };

    const seleccionarImputado = (imp) => {
        const tel = imp.celular || imp.telefono || imp.telefonoCasa || '';
        setForm(f => ({ ...f, imputadoId: imp.id, _celularImputado: tel }));
        // Pre-llenar siempre el teléfono (vacío si no hay)
        setDest(d => ({ ...d, imputado: { ...d.imputado, telefono: tel } }));
        setImpNombre(imp.nombreCompleto + ' — ' + imp.causaPenal);
        setImpQuery('');
        setImpOpts([]);
        setShowImpOpts(false);
    };

    const limpiarImputado = () => {
        setForm(f => ({ ...f, imputadoId: '', _celularImputado: '' }));
        setDest(d => ({ ...d, imputado: { ...d.imputado, telefono: '' } }));
        setImpNombre('');
        setImpQuery('');
    };

    const handleGuardar = async () => {
        if (!form.imputadoId) { setError('Selecciona un imputado'); return; }
        if (!form.fechaProgramada) { setError('La fecha programada es requerida'); return; }
        if (!dest.imputado.telefono?.trim()) { setError('El teléfono del imputado es obligatorio'); return; }
        setGuardando(true);
        setError('');
        const { _celularImputado, ...baseForm } = form;
        const payload = { ...baseForm, destinatariosJson: destToJson(dest) };
        try {
            if (editando) {
                await actualizarSupervision(editando.id, payload);
                showToast('Supervisión actualizada correctamente');
            } else {
                await crearSupervision(payload);
                showToast('Supervisión registrada correctamente');
            }
            cerrarModal();
            if (vista === 'agenda') cargarAgenda();
            else cargarTodos();
        } catch (e) {
            setError(e.response?.data?.message || 'Error al guardar');
        } finally { setGuardando(false); }
    };

    const handleEliminar = async (id) => {
        try {
            await eliminarSupervision(id);
            setEliminarId(null);
            if (vista === 'agenda') cargarAgenda();
            else cargarTodos();
        } catch {}
    };

    // ── filtrar ──────────────────────────────────────────────────────────────
    const datosFiltrados = datos.filter(item =>
        (!filtroTipo   || item.tipo   === filtroTipo) &&
        (!filtroEstado || item.estado === filtroEstado)
    );

    // Agrupa supervisiones por fechaProgramada para la vista de agenda diaria.
    const porFecha = datosFiltrados.reduce((acc, item) => {
        const key = item.fechaProgramada || 'Sin fecha';
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
    }, {});

    // ── render ───────────────────────────────────────────────────────────────
    return (
        <div className="sv-container">

            {/* Encabezado */}
            <div className="sv-topbar">
                <span className="sv-topbar-titulo">
                    <i className="bi bi-eye" /> Supervisión
                </span>
                {puedeEditar && (
                    <button className="sv-btn-nuevo" onClick={abrirNuevo}>
                        <i className="bi bi-plus-lg" /> Nueva supervisión
                    </button>
                )}
            </div>

            {/* Barra sticky: pestañas + controles + filtros */}
            <div className="sv-sticky-bar">
                <div className="sv-tabs">
                    <button
                        className={`sv-tab ${vista === 'agenda' ? 'sv-tab-activo' : ''}`}
                        onClick={() => setVista('agenda')}
                    >
                        <i className="bi bi-calendar3" /> Agenda semanal
                    </button>
                    <button
                        className={`sv-tab ${vista === 'buscar' ? 'sv-tab-activo' : ''}`}
                        onClick={() => setVista('buscar')}
                    >
                        <i className="bi bi-search" /> Buscar
                    </button>
                </div>

                <div className="sv-bar-controles">
                    <div className="sv-bar-izq">
                        {/* Controles de agenda */}
                        {vista === 'agenda' && (
                            <div className="sv-agenda-controles">
                                <label>Del</label>
                                <input type="date" value={agendaInicio}
                                    onChange={e => setAgendaInicio(e.target.value)} />
                                <label>al</label>
                                <input type="date" value={agendaFin}
                                    onChange={e => setAgendaFin(e.target.value)} />
                                <button className="sv-btn-hoy" onClick={() => {
                                    const s = semanaActual();
                                    setAgendaInicio(s.inicio);
                                    setAgendaFin(s.fin);
                                }}>
                                    Semana actual
                                </button>
                            </div>
                        )}

                        {/* Buscador */}
                        {vista === 'buscar' && (
                            <div className="sv-buscar-row">
                                <i className="bi bi-search sv-buscar-icon" />
                                <input
                                    type="text"
                                    placeholder="Buscar por nombre o causa penal..."
                                    value={busqueda}
                                    onChange={e => setBusqueda(e.target.value)}
                                />
                            </div>
                        )}
                    </div>

                    {/* Filtros siempre visibles — pegados a la derecha */}
                    <div className="sv-filtros">
                        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
                            <option value="">Todos los tipos</option>
                            <option value="LLAMADA">Llamada</option>
                            <option value="VISITA_DOMICILIARIA">Visita domiciliaria</option>
                        </select>
                        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
                            <option value="">Todos los estados</option>
                            <option value="PENDIENTE">Pendiente</option>
                            <option value="REALIZADA">Realizada</option>
                            <option value="NO_CONTACTADO">No contactado</option>
                            <option value="CANCELADA">Cancelada</option>
                        </select>
                        {(filtroTipo || filtroEstado) && (
                            <button className="sv-btn-limpiar-filtros"
                                onClick={() => { setFiltroTipo(''); setFiltroEstado(''); }}>
                                <i className="bi bi-x" /> Limpiar
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Contenido */}
            {cargando ? (
                <p className="sv-loading">Cargando...</p>
            ) : datosFiltrados.length === 0 ? (
                <div className="sv-vacio">
                    <i className="bi bi-calendar-x" />
                    <p>{vista === 'agenda' ? 'No hay supervisiones programadas para este período' : 'No se encontraron resultados'}</p>
                </div>
            ) : vista === 'agenda' ? (
                // Vista agenda agrupada por fecha
                <div className="sv-agenda">
                    {Object.entries(porFecha).map(([fecha, items]) => (
                        <div key={fecha} className="sv-dia">
                            <div className={`sv-dia-header ${fecha === hoy() ? 'sv-dia-hoy' : ''}`}>
                                <span className="sv-dia-fecha">{fmt(fecha)}</span>
                                {fecha === hoy() && <span className="sv-dia-badge">Hoy</span>}
                                <span className="sv-dia-count">{items.length} actividad{items.length !== 1 ? 'es' : ''}</span>
                            </div>
                            <div className="sv-dia-items">
                                {items.map(item => (
                                    <SupervisionCard
                                        key={item.id}
                                        item={item}
                                        puedeEditar={puedeEditar}
                                        puedeEliminar={puedeEliminar}
                                        onEditar={abrirEditar}
                                        onEliminar={setEliminarId}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                // Vista lista (buscar)
                <div className="sv-lista">
                    {datosFiltrados.map(item => (
                        <SupervisionCard
                            key={item.id}
                            item={item}
                            puedeEditar={puedeEditar}
                            puedeEliminar={puedeEliminar}
                            onEditar={abrirEditar}
                            onEliminar={setEliminarId}
                        />
                    ))}
                </div>
            )}

            {/* Modal nueva / editar */}
            {showModal && (
                <div className="sv-modal-overlay">
                    <div className="sv-modal">
                        <div className="sv-modal-header">
                            <h3>{editando ? (modoVer ? 'Ver supervisión' : 'Editar supervisión') : 'Nueva supervisión'}</h3>
                            <div className="sv-modal-header-actions">
                                {editando && modoVer && puedeEditar && (
                                    <button className="sv-btn-habilitar" onClick={() => setModoVer(false)}>
                                        <i className="bi bi-pencil" /> Editar
                                    </button>
                                )}
                                {editando && !modoVer && (
                                    <button className="sv-btn-habilitar sv-btn-habilitar-cancel" onClick={() => { setModoVer(true); setError(''); }}>
                                        <i className="bi bi-x-circle" /> Cancelar edición
                                    </button>
                                )}
                                <button className="sv-modal-close" onClick={cerrarModal}>×</button>
                            </div>
                        </div>
                        <div className="sv-modal-body">
                            <div className="sv-form-grid">

                                {/* Buscador de imputado */}
                                <div className="sv-field sv-field-full" ref={impRef}>
                                    <label>Imputado *</label>
                                    {form.imputadoId ? (
                                        <div className="sv-imp-seleccionado">
                                            <i className="bi bi-person-check" />
                                            <span>{impNombre}</span>
                                            {!editando && (
                                                <button type="button" className="sv-imp-limpiar" onClick={limpiarImputado} title="Cambiar imputado">
                                                    <i className="bi bi-x" />
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="sv-imp-search-wrap">
                                            <i className="bi bi-search sv-imp-icon" />
                                            <input
                                                type="text"
                                                placeholder="Buscar por nombre o causa penal..."
                                                value={impQuery}
                                                onChange={e => { setImpQuery(e.target.value); setShowImpOpts(true); }}
                                                onFocus={() => impQuery && setShowImpOpts(true)}
                                                autoComplete="off"
                                            />
                                            {showImpOpts && impOpts.length > 0 && (
                                                <ul className="sv-imp-opts">
                                                    {impOpts.map(i => (
                                                        <li key={i.id} onMouseDown={() => seleccionarImputado(i)}>
                                                            <span className="sv-imp-nombre">{i.nombreCompleto}</span>
                                                            <span className="sv-imp-causa">{i.causaPenal}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="sv-field">
                                    <label>Tipo *</label>
                                    <select value={form.tipo} disabled={modoVer}
                                        onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                                        <option value="LLAMADA">Llamada telefónica</option>
                                        <option value="VISITA_DOMICILIARIA">Visita domiciliaria</option>
                                    </select>
                                </div>

                                {/* ── Destinatarios: secciones estáticas ── */}
                                <div className="sv-field sv-field-full">
                                    <label>Contactos de supervisión</label>
                                    <div className="sv-dest-static">

                                        {/* — Imputado — */}
                                        <div className="sv-dest-section sv-dest-section-imputado">
                                            <div className="sv-dest-section-title">
                                                <i className="bi bi-person-fill" /> Imputado
                                            </div>
                                            <div className="sv-dest-section-body">
                                                <div className="sv-field">
                                                    <label>Teléfono *</label>
                                                    <input type="tel" value={dest.imputado.telefono} disabled={modoVer}
                                                        onChange={e => setDest(d => ({ ...d, imputado: { ...d.imputado, telefono: e.target.value } }))}
                                                        placeholder="10 dígitos" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* — Víctima — */}
                                        <div className="sv-dest-section sv-dest-section-victima">
                                            <div className="sv-dest-section-title">
                                                <i className="bi bi-person-exclamation" /> Víctima
                                            </div>
                                            <div className="sv-dest-section-body sv-dest-2col">
                                                <div className="sv-field">
                                                    <label>Nombre</label>
                                                    <input type="text" value={dest.victima.nombre} disabled={modoVer}
                                                        onChange={e => setDest(d => ({ ...d, victima: { ...d.victima, nombre: e.target.value } }))}
                                                        placeholder="Nombre completo de la víctima" />
                                                </div>
                                                <div className="sv-field">
                                                    <label>Teléfono</label>
                                                    <input type="tel" value={dest.victima.telefono} disabled={modoVer}
                                                        onChange={e => setDest(d => ({ ...d, victima: { ...d.victima, telefono: e.target.value } }))}
                                                        placeholder="10 dígitos" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* — Medio Laboral — */}
                                        <div className="sv-dest-section sv-dest-section-laboral">
                                            <div className="sv-dest-section-title">
                                                <i className="bi bi-briefcase-fill" /> Medio Laboral
                                            </div>
                                            <div className="sv-dest-section-body sv-dest-2col">
                                                <div className="sv-field">
                                                    <label>Empresa / Lugar de trabajo</label>
                                                    <input type="text" value={dest.medioLaboral.nombre} disabled={modoVer}
                                                        onChange={e => setDest(d => ({ ...d, medioLaboral: { ...d.medioLaboral, nombre: e.target.value } }))}
                                                        placeholder="Empresa, negocio o lugar de trabajo" />
                                                </div>
                                                <div className="sv-field">
                                                    <label>Nombre del jefe / contacto</label>
                                                    <input type="text" value={dest.medioLaboral.nombreJefe || ''} disabled={modoVer}
                                                        onChange={e => setDest(d => ({ ...d, medioLaboral: { ...d.medioLaboral, nombreJefe: e.target.value } }))}
                                                        placeholder="Nombre del jefe o supervisor" />
                                                </div>
                                                <div className="sv-field">
                                                    <label>Teléfono de contacto</label>
                                                    <input type="tel" value={dest.medioLaboral.telefono} disabled={modoVer}
                                                        onChange={e => setDest(d => ({ ...d, medioLaboral: { ...d.medioLaboral, telefono: e.target.value } }))}
                                                        placeholder="10 dígitos" />
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                </div>

                                <div className="sv-field">
                                    <label>Estado</label>
                                    <select value={form.estado} disabled={modoVer}
                                        onChange={e => {
                                            const newEstado = e.target.value;
                                            setForm(f => ({
                                                ...f,
                                                estado: newEstado,
                                                fechaRealizada: newEstado === 'REALIZADA' ? f.fechaRealizada : '',
                                            }));
                                        }}>
                                        <option value="PENDIENTE">Pendiente</option>
                                        <option value="REALIZADA">Realizada</option>
                                        <option value="NO_CONTACTADO">No contactado</option>
                                        <option value="CANCELADA">Cancelada</option>
                                    </select>
                                </div>

                                <div className="sv-field">
                                    <label>Fecha programada *</label>
                                    <input type="date" value={form.fechaProgramada} disabled={modoVer}
                                        min={hoy()}
                                        onChange={e => setForm(f => ({ ...f, fechaProgramada: e.target.value }))} />
                                </div>

                                {/* Fecha realizada — solo cuando estado = REALIZADA */}
                                {form.estado === 'REALIZADA' && (
                                    <div className="sv-field">
                                        <label>Fecha realizada *</label>
                                        <input type="date" value={form.fechaRealizada} disabled={modoVer}
                                            onChange={e => setForm(f => ({ ...f, fechaRealizada: e.target.value }))} />
                                    </div>
                                )}

                                <div className="sv-field sv-field-full">
                                    <label>Observaciones</label>
                                    <textarea rows={3} value={form.observaciones} disabled={modoVer}
                                        onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))}
                                        placeholder="Resultado de la llamada o visita, comentarios..." />
                                </div>
                            </div>
                        </div>
                        <div className="sv-modal-footer">
                            {!modoVer && error && <div className="sv-error sv-error-footer">{error}</div>}
                            <div className="sv-footer-btns">
                                <button className="sv-btn-cancelar" onClick={cerrarModal}>
                                    {modoVer ? 'Cerrar' : 'Cancelar'}
                                </button>
                                {!modoVer && (
                                    <button className="sv-btn-guardar" onClick={handleGuardar} disabled={guardando}>
                                        {guardando ? 'Guardando...' : editando ? 'Actualizar' : 'Registrar'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmación eliminar */}
            {eliminarId && (
                <div className="sv-modal-overlay">
                    <div className="sv-modal sv-modal-sm">
                        <div className="sv-modal-header">
                            <h3>Eliminar supervisión</h3>
                            <button className="sv-modal-close" onClick={() => setEliminarId(null)}>×</button>
                        </div>
                        <div className="sv-modal-body">
                            <p>¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer.</p>
                        </div>
                        <div className="sv-modal-footer">
                            <button className="sv-btn-cancelar" onClick={() => setEliminarId(null)}>Cancelar</button>
                            <button className="sv-btn-eliminar" onClick={() => handleEliminar(eliminarId)}>
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Tarjeta de supervisión ────────────────────────────────────────────────────
// Muestra los datos de una supervisión individual en la agenda y en la lista.
// Para visitas domiciliarias incluye link a Google Maps usando coordenadas exactas
// o, si no las hay, búsqueda por dirección.
const SupervisionCard = ({ item, puedeEditar, puedeEliminar, onEditar, onEliminar }) => {
    const cfg = ESTADO_CONFIG[item.estado] || ESTADO_CONFIG.PENDIENTE;
    const dest = destFromJson(item.destinatariosJson);
    return (
        <div className={`sv-card ${item.estado === 'PENDIENTE' ? 'sv-card-pendiente' : ''}`}>
            <div className="sv-card-tipo">
                <i className={`bi ${TIPO_ICON[item.tipo]}`} />
                <span>{TIPO_LABEL[item.tipo]}</span>
            </div>
            <div className="sv-card-info">
                <div className="sv-card-nombre-row">
                    <span className="sv-card-nombre">{item.nombreImputado}</span>
                    {item.imputadoFallecido
                        ? <span className="imp-badge-fallecido"><i className="bi bi-heartbreak-fill" /> Fallecido</span>
                        : <span className={`sv-badge ${cfg.clase}`}>{cfg.label}</span>
                    }
                </div>
                <span className="sv-card-causa">{item.causaPenal}</span>
                {dest.imputado.telefono && (
                    <span className="sv-card-destinatario">
                        <i className="bi bi-person-fill" /> <strong>Imputado:</strong> {dest.imputado.telefono}
                    </span>
                )}
                {(dest.victima.nombre || dest.victima.telefono) && (
                    <span className="sv-card-destinatario sv-card-dest-victima">
                        <i className="bi bi-person-exclamation" /> <strong>Víctima:</strong> {dest.victima.nombre}{dest.victima.telefono ? ` · ${dest.victima.telefono}` : ''}
                    </span>
                )}
                {(dest.medioLaboral.nombre || dest.medioLaboral.telefono) && (
                    <span className="sv-card-destinatario sv-card-dest-laboral">
                        <i className="bi bi-briefcase-fill" />
                        <strong>Medio Laboral:</strong>
                        {dest.medioLaboral.nombre && ` ${dest.medioLaboral.nombre}`}
                        {dest.medioLaboral.nombreJefe && ` · Jefe: ${dest.medioLaboral.nombreJefe}`}
                        {dest.medioLaboral.telefono && ` · ${dest.medioLaboral.telefono}`}
                    </span>
                )}
                {item.domicilioImputado && (
                    <span className="sv-card-domicilio">
                        <i className="bi bi-geo-alt-fill" /> {item.domicilioImputado}
                    </span>
                )}
                {item.observaciones && (
                    <span className="sv-card-obs">{item.observaciones}</span>
                )}
                {item.fechaRealizada && (
                    <span className="sv-card-realizada">
                        <i className="bi bi-check2" /> Realizada: {fmt(item.fechaRealizada)}
                    </span>
                )}
                {item.registradoPor && (
                    <span className="sv-card-registrado">
                        <i className="bi bi-person" /> {item.registradoPor}
                    </span>
                )}
            </div>
            <div className="sv-card-acciones">
                {/* estado movido al lado del nombre */}
                {item.domicilioImputado && (
                    <a
                        className="sv-btn-icon sv-btn-maps"
                        href={item.coordenadasImputado
                            ? `https://www.google.com/maps?q=${item.coordenadasImputado.trim()}`
                            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.domicilioImputado)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={item.coordenadasImputado ? "Ver pin exacto en Google Maps" : "Buscar en Google Maps"}
                    >
                        <i className="bi bi-map-fill" />
                    </a>
                )}
                {puedeEditar && (
                    <button className="sv-btn-icon" title="Ver / Editar" onClick={() => onEditar(item)}>
                        <i className="bi bi-eye" />
                    </button>
                )}
                {puedeEliminar && (
                    <button className="sv-btn-icon sv-btn-icon-del" title="Eliminar" onClick={() => onEliminar(item.id)}>
                        <i className="bi bi-trash" />
                    </button>
                )}
            </div>
        </div>
    );
};

export default Supervision;
