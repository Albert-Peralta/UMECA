import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
    getLista, getContadores, crearOficio, editarOficio,
    eliminarOficio, cambiarEstado, exportarExcel, ESTADO_CONFIG,
} from '../api/controlOficiosApi';
import './ControlOficios.css';
import './EntrevistaEncuadre.css';

const POR_PAGINA = 50;
const fmtFecha = (iso) => {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
};

const FORM_VACIO = { destinatario: '', asunto: '', supervisado: '' };

export default function ControlOficios() {
    const { user } = useAuth();
    const { showToast } = useToast();
    const rol = user?.rol;
    const esAdmin = rol === 'SUPERADMIN' || rol === 'ADMINISTRADOR';

    // ── Estado principal ──────────────────────────────────────────────────────
    const [lista,    setLista]    = useState([]);
    const [loading,  setLoading]  = useState(false);
    const [contador, setContador] = useState(0);

    // ── Vista: 'lista' | 'form' | 'detalle' ──────────────────────────────────
    const [vista,    setVista]    = useState('lista');
    const [registro, setRegistro] = useState(null);

    // ── Formulario ────────────────────────────────────────────────────────────
    const [form,        setForm]        = useState(FORM_VACIO);
    const [errores,     setErrores]     = useState({});
    const [guardando,   setGuardando]   = useState(false);
    const [confirmando, setConfirmando] = useState(false); // modal confirmación guardar

    // ── Búsqueda y paginación ─────────────────────────────────────────────────
    const [buscar,       setBuscar]      = useState('');
    const [filtroZona,   setFiltroZona]  = useState('');
    const [filtroEstado, setFiltroEstado] = useState('');
    const [pagina,       setPagina]      = useState(1);

    // ── Confirmación eliminar ─────────────────────────────────────────────────
    const [modalEliminar,  setModalEliminar]  = useState(null);
    const [eliminando,     setEliminando]     = useState(false);
    const [modalTramitar,  setModalTramitar]  = useState(null); // registro a tramitar

    // ── Cargar lista ──────────────────────────────────────────────────────────
    const cargar = useCallback(async () => {
        setLoading(true);
        try {
            const [resLista, resCont] = await Promise.all([getLista(), getContadores()]);
            if (resLista.data.ok) setLista(resLista.data.data || []);
            if (resCont.data.ok)  setContador(resCont.data.data?.pendientes ?? 0);
        } catch { showToast('Error al cargar los oficios', 'error'); }
        finally  { setLoading(false); }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { cargar(); }, [cargar]);

    // ── Filtrado y paginación ─────────────────────────────────────────────────
    const filtrada = lista.filter(r => {
        if (filtroZona   && r.solicitanteZona !== filtroZona)   return false;
        if (filtroEstado && r.estado          !== filtroEstado) return false;
        if (!buscar) return true;
        const q = buscar.toLowerCase();
        const fechaCorta = fmtFecha(r.fecha);
        const fechaLarga = r.fecha ? new Date(r.fecha + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }) : '';
        return [r.noOficio, r.destinatario, r.asunto, r.supervisado, r.solicitanteNombre, fechaCorta, fechaLarga]
            .some(v => v?.toLowerCase().includes(q));
    });
    const totalPags = Math.max(1, Math.ceil(filtrada.length / POR_PAGINA));
    const pagActual = filtrada.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

    // ── Abrir formulario ──────────────────────────────────────────────────────
    const abrirNuevo = () => {
        setForm(FORM_VACIO);
        setErrores({});
        setRegistro(null);
        setVista('form');
    };

    const abrirEditar = (r) => {
        setForm({ destinatario: r.destinatario || '', asunto: r.asunto || '', supervisado: r.supervisado || '' });
        setErrores({});
        setRegistro(r);
        setVista('form');
    };

    // ── Validar ───────────────────────────────────────────────────────────────
    const validar = () => {
        const errs = {};
        if (!form.destinatario?.trim()) errs.destinatario = 'Campo requerido';
        if (!form.asunto?.trim())       errs.asunto       = 'Campo requerido';
        if (!form.supervisado?.trim())  errs.supervisado  = 'Campo requerido';
        setErrores(errs);
        return Object.keys(errs).length === 0;
    };

    // ── Guardar (con confirmación) ────────────────────────────────────────────
    const handleConfirmarGuardar = () => {
        if (!validar()) return;
        setConfirmando(true);
    };

    const handleGuardar = async () => {
        setConfirmando(false);
        setGuardando(true);
        try {
            const res = registro
                ? await editarOficio(registro.id, form)
                : await crearOficio(form);
            if (res.data.ok) {
                showToast(registro ? 'Oficio actualizado' : 'Oficio registrado correctamente');
                await cargar();
                window.dispatchEvent(new CustomEvent('oficios-contadores-cambio'));
                setVista('lista');
            } else {
                showToast(res.data.message || 'Error al guardar', 'error');
            }
        } catch { showToast('Error al guardar el oficio', 'error'); }
        finally  { setGuardando(false); }
    };

    // ── Eliminar ──────────────────────────────────────────────────────────────
    const handleEliminar = async () => {
        setEliminando(true);
        try {
            const res = await eliminarOficio(modalEliminar.id);
            if (res.data.ok) {
                showToast('Oficio eliminado');
                setModalEliminar(null);
                await cargar();
                window.dispatchEvent(new CustomEvent('oficios-contadores-cambio'));
            } else showToast(res.data.message || 'Error al eliminar', 'error');
        } catch { showToast('Error al eliminar', 'error'); }
        finally  { setEliminando(false); }
    };

    // ── Cambiar estado ────────────────────────────────────────────────────────
    const handleCambiarEstado = async (r, nuevoEstado) => {
        try {
            const res = await cambiarEstado(r.id, nuevoEstado);
            if (res.data.ok) {
                // Actualizar UI inmediatamente sin esperar recarga
                setRegistro(prev => prev ? { ...prev, estado: nuevoEstado } : prev);
                setLista(prev => prev.map(o => o.id === r.id ? { ...o, estado: nuevoEstado } : o));
                showToast('Estado actualizado');
                window.dispatchEvent(new CustomEvent('oficios-contadores-cambio'));
                cargar(); // sin await — recarga en segundo plano
            } else showToast(res.data.message || 'Error', 'error');
        } catch { showToast('Error al cambiar estado', 'error'); }
    };

    // ── Exportar Excel ────────────────────────────────────────────────────────
    const handleExportar = async () => {
        try {
            const res = await exportarExcel();
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a'); a.href = url;
            a.download = 'control-oficios.xlsx'; a.click();
            window.URL.revokeObjectURL(url);
        } catch { showToast('Error al exportar', 'error'); }
    };

    // ── Render formulario ─────────────────────────────────────────────────────
    if (vista === 'form') return (
        <div className="co-container">
            <div className="co-header">
                <button className="co-btn-back" onClick={() => setVista('lista')}>
                    <i className="bi bi-arrow-left" /> Cancelar
                </button>
            </div>

            <div className="co-form-card">
                <div className="co-form-hero">
                    <i className="bi bi-file-earmark-text-fill co-form-hero-icon" />
                    <div>
                        <div className="co-form-hero-titulo">{registro ? 'Editar Oficio' : 'Nuevo Oficio'}</div>
                        <div className="co-form-hero-sub">
                            {registro ? `No. ${registro.noOficio}` : 'El número de oficio se asignará automáticamente'}
                        </div>
                    </div>
                </div>

                <div className="co-form-body">
                    {/* Destinatario */}
                    <div className={`co-field ${errores.destinatario ? 'co-field-error' : ''}`}>
                        <label>Destinatario y Cargo *</label>
                        <input type="text" value={form.destinatario}
                            onChange={e => { setForm(f => ({ ...f, destinatario: e.target.value })); setErrores(er => ({ ...er, destinatario: '' })); }}
                            placeholder="Nombre y cargo del destinatario" />
                        {errores.destinatario && <span className="co-field-msg-error">{errores.destinatario}</span>}
                    </div>

                    {/* Asunto */}
                    <div className={`co-field ${errores.asunto ? 'co-field-error' : ''}`}>
                        <label>Asunto *</label>
                        <textarea value={form.asunto} rows={3}
                            onChange={e => { setForm(f => ({ ...f, asunto: e.target.value })); setErrores(er => ({ ...er, asunto: '' })); }}
                            placeholder="Descripción del asunto u motivo del oficio" />
                        {errores.asunto && <span className="co-field-msg-error">{errores.asunto}</span>}
                    </div>

                    {/* Supervisado */}
                    <div className={`co-field ${errores.supervisado ? 'co-field-error' : ''}`}>
                        <label>Supervisado *</label>
                        <input type="text" value={form.supervisado}
                            onChange={e => { setForm(f => ({ ...f, supervisado: e.target.value })); setErrores(er => ({ ...er, supervisado: '' })); }}
                            placeholder="Nombre del supervisado" />
                        {errores.supervisado && <span className="co-field-msg-error">{errores.supervisado}</span>}
                    </div>

                    {/* Info automática */}
                    <div className="co-form-info-auto">
                        <div className="co-info-chip"><i className="bi bi-person-fill" /> Solicitante: <strong>{user?.nombre} {user?.apPaterno}</strong></div>
                        <div className="co-info-chip"><i className="bi bi-calendar-check" /> Fecha: <strong>{fmtFecha(new Date().toISOString().split('T')[0])}</strong></div>
                        <div className="co-info-chip"><i className="bi bi-circle-fill co-dot-pendiente" /> Estado inicial: <strong>Pendiente</strong></div>
                    </div>

                    <button className="co-btn-guardar" onClick={handleConfirmarGuardar} disabled={guardando}>
                        {guardando ? <><i className="bi bi-hourglass-split" /> Guardando...</> : <><i className="bi bi-floppy-fill" /> {registro ? 'Actualizar oficio' : 'Registrar oficio'}</>}
                    </button>
                </div>
            </div>

            {/* Modal confirmación guardar */}
            {confirmando && (
                <div className="co-modal-overlay">
                    <div className="co-modal">
                        <div className="co-modal-titulo"><i className="bi bi-shield-check" /> Confirmar registro</div>
                        <p className="co-modal-texto">
                            ¿Estás seguro de que deseas {registro ? 'actualizar' : 'registrar'} este oficio?
                            {!registro && <><br /><span className="co-modal-aviso"><i className="bi bi-info-circle" /> Solo el administrador podrá editar o eliminar este registro una vez guardado.</span></>}
                        </p>
                        <div className="co-modal-acciones">
                            <button className="co-modal-btn-cancelar" onClick={() => setConfirmando(false)}>Cancelar</button>
                            <button className="co-modal-btn-confirmar" onClick={handleGuardar}>Confirmar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    // ── Render detalle ────────────────────────────────────────────────────────
    if (vista === 'detalle' && registro) {
        const cfg = ESTADO_CONFIG[registro.estado] || {};
        const esPendiente  = registro.estado === 'PENDIENTE';
        const esTramitado  = registro.estado === 'TRAMITADO';
        return (
            <>
            <div className="co-container">
                <div className="co-header">
                    <button className="co-btn-back" onClick={() => setVista('lista')}>
                        <i className="bi bi-arrow-left" /> Volver
                    </button>
                </div>

                <div className="co-detalle-card">
                    <div className="co-detalle-hero">
                        <div>
                            <div className="co-detalle-no">Oficio No. <strong>{registro.noOficio}</strong></div>
                            <div className="co-detalle-fecha">{registro.fecha ? new Date(registro.fecha + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}</div>
                        </div>
                        <span className={`co-badge ${cfg.clase}`}>{cfg.label || registro.estado}</span>
                    </div>

                    <div className="co-detalle-grid">
                        <div className="co-detalle-campo co-det-full"><span className="co-det-label"><i className="bi bi-person" /> Destinatario</span><span className="co-det-valor">{registro.destinatario}</span></div>
                        <div className="co-detalle-campo co-det-full"><span className="co-det-label"><i className="bi bi-chat-text" /> Asunto</span><span className="co-det-valor">{registro.asunto}</span></div>
                        <div className="co-detalle-campo"><span className="co-det-label"><i className="bi bi-person-check" /> Supervisado</span><span className="co-det-valor">{registro.supervisado || '—'}</span></div>
                        <div className="co-detalle-campo"><span className="co-det-label"><i className="bi bi-person-badge" /> Solicitante</span><span className="co-det-valor">{registro.solicitanteNombre}</span></div>
                    </div>

                    {/* Progreso de estado */}
                    <div className="co-progreso-wrap">
                        <div className="co-progreso-titulo"><i className="bi bi-arrow-right-circle" /> Progreso del oficio</div>
                        <div className="co-progreso">
                            <div className={`co-paso ${esPendiente || esTramitado ? 'co-paso-activo' : ''} ${esTramitado ? 'co-paso-completado' : ''}`}>
                                <div className="co-paso-circulo"><i className={`bi ${esTramitado ? 'bi-check-lg' : 'bi-hourglass-split'}`} /></div>
                                <div className="co-paso-label">Pendiente</div>
                            </div>
                            <div className={`co-progreso-linea ${esTramitado ? 'co-linea-activa' : ''}`} />
                            <div className={`co-paso ${esTramitado ? 'co-paso-activo co-paso-completado' : ''}`}>
                                <div className="co-paso-circulo"><i className={`bi ${esTramitado ? 'bi-check-lg' : 'bi-check2-circle'}`} /></div>
                                <div className="co-paso-label">Tramitado</div>
                            </div>
                        </div>

                        {esPendiente && (
                            <button className="co-btn-tramitar" onClick={() => setModalTramitar(registro)}>
                                <i className="bi bi-check2-circle" /> Marcar como Tramitado
                            </button>
                        )}
                        {esTramitado && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                                <div className="co-tramitado-msg"><i className="bi bi-check-circle-fill" /> Este oficio ha sido tramitado.</div>
                                {esAdmin && (
                                    <button className="co-btn-back" style={{ marginBottom: 0 }}
                                        onClick={() => setModalTramitar({ ...registro, _revertir: true })}>
                                        <i className="bi bi-arrow-counterclockwise" /> Revertir a Pendiente
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modales accesibles desde detalle */}
            {modalTramitar && (
                <div className="co-modal-overlay">
                    <div className="co-modal">
                        <div className="co-modal-titulo">
                            <i className={`bi ${modalTramitar._revertir ? 'bi-arrow-counterclockwise' : 'bi-check2-circle'}`}
                               style={{ color: modalTramitar._revertir ? '#b45309' : '#376842' }} />
                            {modalTramitar._revertir ? 'Revertir a Pendiente' : 'Confirmar tramitación'}
                        </div>
                        <p className="co-modal-texto">
                            {modalTramitar._revertir
                                ? <>¿Revertir el <strong>Oficio No. {modalTramitar.noOficio}</strong> a estado <strong>Pendiente</strong>?</>
                                : <>¿Marcar el <strong>Oficio No. {modalTramitar.noOficio}</strong> como <strong>Tramitado</strong>?</>
                            }
                            <span className="co-modal-aviso">
                                {modalTramitar._revertir ? 'Solo los administradores pueden revertir esta acción.' : 'Esta acción cambiará el estado del oficio.'}
                            </span>
                        </p>
                        <div className="co-modal-acciones">
                            <button className="co-modal-btn-cancelar" onClick={() => setModalTramitar(null)}>Cancelar</button>
                            <button className="co-modal-btn-confirmar"
                                onClick={() => { handleCambiarEstado(modalTramitar, modalTramitar._revertir ? 'PENDIENTE' : 'TRAMITADO'); setModalTramitar(null); }}>
                                {modalTramitar._revertir ? 'Sí, revertir' : 'Sí, tramitar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            </>
        );
    }

    // ── Render lista ──────────────────────────────────────────────────────────
    return (
        <div className="co-container">
            {/* Barra superior: contador + paginador */}
            <div className="co-header-top">
                <span className="co-total">
                    Mostrando <strong>{filtrada.length === 0 ? 0 : (pagina - 1) * POR_PAGINA + 1} a {Math.min(pagina * POR_PAGINA, filtrada.length)} de {filtrada.length}</strong> registro{filtrada.length !== 1 ? 's' : ''}
                </span>
                <div className="co-pag-top">
                    <button disabled={pagina === 1} onClick={() => setPagina(p => p - 1)}>‹</button>
                    <span>{pagina} / {totalPags}</span>
                    <button disabled={pagina === totalPags} onClick={() => setPagina(p => p + 1)}>›</button>
                </div>
            </div>

            {/* Contador pendientes */}
            {contador > 0 && (
                <div className="co-alerta-pendientes">
                    <i className="bi bi-exclamation-circle-fill" />
                    Tienes <strong>{contador}</strong> oficio{contador !== 1 ? 's' : ''} pendiente{contador !== 1 ? 's' : ''} por tramitar.
                </div>
            )}

            {/* Barra de búsqueda + botones */}
            <div className="co-buscar-wrap">
                <i className="bi bi-search co-buscar-icon" />
                <input
                    className="co-buscar"
                    placeholder="Buscar por No. oficio, fecha, destinatario, asunto, supervisado o solicitante..."
                    value={buscar}
                    onChange={e => { setBuscar(e.target.value); setPagina(1); }}
                />
                <select className="co-filtro-zona" value={filtroZona}
                    onChange={e => { setFiltroZona(e.target.value); setPagina(1); }}>
                    <option value="">Todas las zonas</option>
                    <option value="XOCHITEPEC">Xochitepec</option>
                    <option value="CUAUTLA">Cuautla</option>
                    <option value="JOJUTLA">Jojutla</option>
                </select>
                <select className="co-filtro-zona" value={filtroEstado}
                    onChange={e => { setFiltroEstado(e.target.value); setPagina(1); }}>
                    <option value="">Todos los estados</option>
                    <option value="PENDIENTE">Pendiente</option>
                    <option value="TRAMITADO">Tramitado</option>
                </select>
                <button className="co-btn-excel" onClick={handleExportar} title="Exportar Excel">
                    <i className="bi bi-file-earmark-excel-fill" /> Exportar
                </button>
                <button className="co-btn-nuevo" onClick={abrirNuevo}>
                    <i className="bi bi-plus-lg" /> Nuevo Oficio
                </button>
            </div>


            {/* Tabla */}
            <div className="co-tabla-wrap">
                <table className="co-tabla">
                    <thead>
                        <tr>
                            <th>NO. OFICIO</th>
                            <th>FECHA</th>
                            <th>DESTINATARIO Y CARGO</th>
                            <th>ASUNTO</th>
                            <th>SUPERVISADO</th>
                            <th>SOLICITANTE</th>
                            <th>ESTADO</th>
                            <th>ACCIONES</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={8} className="co-loading">Cargando...</td></tr>
                        ) : pagActual.length === 0 ? (
                            <tr><td colSpan={8} className="co-sin-datos"><i className="bi bi-inbox" /> Sin registros</td></tr>
                        ) : pagActual.map(r => {
                            const cfg = ESTADO_CONFIG[r.estado] || {};
                            const esPendiente = r.estado === 'PENDIENTE';
                            return (
                                <tr key={r.id} className={esPendiente ? 'co-fila-pendiente' : ''}>
                                    <td className="co-td-no"><strong>{r.noOficio}</strong></td>
                                    <td>{fmtFecha(r.fecha)}</td>
                                    <td>{r.destinatario}</td>
                                    <td className="co-td-asunto" title={r.asunto}>{r.asunto}</td>
                                    <td className="co-td-supervisado" title={r.supervisado || ''}>{r.supervisado || '—'}</td>
                                    <td className="co-td-solicitante">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                            <span title={r.solicitanteNombre} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.solicitanteNombre}</span>
                                            {r.solicitanteZona && (
                                                <span className={`zona-tag zona-tag-${r.solicitanteZona.toLowerCase()}`}>
                                                    {r.solicitanteZona === 'XOCHITEPEC' ? 'Xochi' : r.solicitanteZona === 'CUAUTLA' ? 'Cuat' : 'Jojut'}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td><span className={`co-badge ${cfg.clase}`}>{cfg.label || r.estado}</span></td>
                                    <td className="co-acciones">
                                        <button className="co-btn-ver" title="Ver detalle"
                                            onClick={() => { setRegistro(r); setVista('detalle'); }}>
                                            <i className="bi bi-eye" />
                                        </button>
                                        {esAdmin && (
                                            <button className="co-btn-editar" title="Editar"
                                                onClick={() => abrirEditar(r)}>
                                                <i className="bi bi-pencil" />
                                            </button>
                                        )}
                                        {esAdmin && (
                                            <button className="co-btn-eliminar" title="Eliminar"
                                                onClick={() => setModalEliminar(r)}>
                                                <i className="bi bi-trash" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>


            {/* Modal confirmar tramitar / revertir */}
            {modalTramitar && (
                <div className="co-modal-overlay">
                    <div className="co-modal">
                        <div className="co-modal-titulo">
                            <i className={`bi ${modalTramitar._revertir ? 'bi-arrow-counterclockwise' : 'bi-check2-circle'}`}
                               style={{ color: modalTramitar._revertir ? '#b45309' : '#376842' }} />
                            {modalTramitar._revertir ? 'Revertir a Pendiente' : 'Confirmar tramitación'}
                        </div>
                        <p className="co-modal-texto">
                            {modalTramitar._revertir
                                ? <>¿Revertir el <strong>Oficio No. {modalTramitar.noOficio}</strong> a estado <strong>Pendiente</strong>?</>
                                : <>¿Marcar el <strong>Oficio No. {modalTramitar.noOficio}</strong> como <strong>Tramitado</strong>?</>
                            }
                            <span className="co-modal-aviso">
                                {modalTramitar._revertir
                                    ? 'Solo los administradores pueden revertir esta acción.'
                                    : 'Esta acción cambiará el estado del oficio.'}
                            </span>
                        </p>
                        <div className="co-modal-acciones">
                            <button className="co-modal-btn-cancelar" onClick={() => setModalTramitar(null)}>Cancelar</button>
                            <button className="co-modal-btn-confirmar"
                                onClick={() => { handleCambiarEstado(modalTramitar, modalTramitar._revertir ? 'PENDIENTE' : 'TRAMITADO'); setModalTramitar(null); }}>
                                {modalTramitar._revertir ? 'Sí, revertir' : 'Sí, tramitar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal eliminar */}
            {modalEliminar && (
                <div className="co-modal-overlay">
                    <div className="co-modal">
                        <div className="co-modal-titulo co-modal-titulo-danger"><i className="bi bi-trash" /> Eliminar oficio</div>
                        <p className="co-modal-texto">
                            ¿Eliminar el oficio <strong>No. {modalEliminar.noOficio}</strong>? Esta acción no se puede deshacer.
                        </p>
                        <div className="co-modal-acciones">
                            <button className="co-modal-btn-cancelar" onClick={() => setModalEliminar(null)} disabled={eliminando}>Cancelar</button>
                            <button className="co-modal-btn-eliminar" onClick={handleEliminar} disabled={eliminando}>
                                {eliminando ? 'Eliminando...' : 'Eliminar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
