import { useState, useEffect, useCallback, useRef } from 'react';
import {
    getSuspensiones, getSuspensionById, crearSuspension,
    actualizarSuspension, eliminarSuspension, importarSuspensiones, getAniosDisponibles
} from '../api/suspensionApi';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { puedeCrear as _puedeCrear, puedeEditar as _puedeEditar } from '../utils/permisos';
import './SuspensionCondicional.css';

const ITEMS = 50;
const FUERO_OPTS = ['FEDERAL', 'ESTATAL'];

const campoVacio = {
    causa: '', oficio: '', recibido: '', imputado: '',
    asunto: '', plazo: '', delito: '', fuero: '',
    sobreseguimiento: '', observaciones: '', anio: ''
};

export default function SuspensionCondicional() {
    const { showToast } = useToast();
    const { user } = useAuth();
    const esAdmin     = user?.rol === 'ADMINISTRADOR' || user?.rol === 'SUPERADMIN';
    const puedeEditar = _puedeCrear(user, 'SUSPENSION') || _puedeEditar(user, 'SUSPENSION');

    const [lista,   setLista]   = useState([]);
    const [total,   setTotal]   = useState(0);
    const [pagina,  setPagina]  = useState(0);
    const [loading, setLoading] = useState(false);

    const [busqueda,    setBusqueda]    = useState('');
    const [fueroFiltro, setFueroFiltro] = useState('');
    const [anioFiltro,  setAnioFiltro]  = useState('');
    const [anios,       setAnios]       = useState([]);

    // Detalle / formulario
    const [detalle,    setDetalle]    = useState(null);
    const [loadingDet, setLoadingDet] = useState(false);
    const scrollYRef = useRef(0);

    // Modal crear/editar
    const [showForm,  setShowForm]  = useState(false);
    const [editando,  setEditando]  = useState(null); // null = crear, obj = editar
    const [form,      setForm]      = useState(campoVacio);
    const [guardando, setGuardando] = useState(false);

    // Modal importar
    const [showImport,  setShowImport]  = useState(false);
    const [archivo,     setArchivo]     = useState(null);
    const [importando,  setImportando]  = useState(false);
    const [importError, setImportError] = useState(null);
    const [importExito, setImportExito] = useState(null);

    // Confirmar eliminar
    const [confirmId, setConfirmId] = useState(null);
    const [eliminando, setEliminando] = useState(false);

    const totalPaginas = Math.max(1, Math.ceil(total / ITEMS));

    // ── Carga ────────────────────────────────────────────────
    const cargar = useCallback(async (p = 0) => {
        setLoading(true);
        try {
            const res = await getSuspensiones({
                fuero:    fueroFiltro || undefined,
                anio:     anioFiltro  || undefined,
                busqueda: busqueda    || undefined,
                pagina: p, tam: ITEMS,
            });
            const page = res.data?.data;
            setLista(page?.content ?? []);
            setTotal(page?.totalElements ?? 0);
            setPagina(p);
        } catch {
            showToast('Error al cargar registros', 'error');
        } finally {
            setLoading(false);
        }
    }, [fueroFiltro, anioFiltro, busqueda]);

    useEffect(() => { cargar(0); }, [cargar]);

    useEffect(() => {
        getAniosDisponibles().then(r => setAnios(r.data?.data ?? []));
    }, []);

    // ── Detalle ──────────────────────────────────────────────
    const verDetalle = async (id) => {
        scrollYRef.current = window.scrollY;
        setLoadingDet(true);
        try {
            const res = await getSuspensionById(id);
            setDetalle(res.data?.data);
            window.scrollTo(0, 0);
        } catch {
            showToast('Error al cargar el detalle', 'error');
        } finally {
            setLoadingDet(false);
        }
    };

    const volverLista = () => {
        setDetalle(null);
        setShowForm(false);
        setEditando(null);
        requestAnimationFrame(() => window.scrollTo(0, scrollYRef.current));
    };

    // ── Formulario ───────────────────────────────────────────
    const abrirCrear = () => {
        setEditando(null);
        setForm(campoVacio);
        setShowForm(true);
    };

    const abrirEditar = (s) => {
        setEditando(s);
        setForm({
            causa: s.causa || '', oficio: s.oficio || '',
            recibido: s.recibido || '', imputado: s.imputado || '',
            asunto: s.asunto || '', plazo: s.plazo || '',
            delito: s.delito || '', fuero: s.fuero || '',
            sobreseguimiento: s.sobreseguimiento || '',
            observaciones: s.observaciones || '',
            anio: s.anio ?? '',
        });
        setShowForm(true);
    };

    const handleFormChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

    const handleGuardar = async (e) => {
        e.preventDefault();
        if (!form.imputado.trim() && !form.causa.trim())
            return showToast('Ingresa al menos el imputado o la causa', 'warning');
        setGuardando(true);
        try {
            const dto = { ...form, anio: form.anio ? parseInt(form.anio) : null };
            if (editando) {
                await actualizarSuspension(editando.id, dto);
                showToast('Registro actualizado', 'success');
            } else {
                await crearSuspension(dto);
                showToast('Registro creado', 'success');
            }
            setShowForm(false);
            cargar(pagina);
            if (detalle && editando?.id === detalle.id) {
                const res = await getSuspensionById(detalle.id);
                setDetalle(res.data?.data);
            }
        } catch {
            showToast('Error al guardar', 'error');
        } finally {
            setGuardando(false);
        }
    };

    // ── Eliminar ─────────────────────────────────────────────
    const handleEliminar = async () => {
        setEliminando(true);
        try {
            await eliminarSuspension(confirmId);
            showToast('Registro eliminado', 'success');
            setConfirmId(null);
            if (detalle?.id === confirmId) volverLista();
            else cargar(pagina);
        } catch {
            showToast('Error al eliminar', 'error');
        } finally {
            setEliminando(false);
        }
    };

    // ── Importar ─────────────────────────────────────────────
    const handleImportar = async () => {
        if (!archivo) return showToast('Selecciona un archivo', 'warning');
        setImportando(true);
        setImportError(null);
        try {
            const res = await importarSuspensiones(archivo);
            if (res.data?.ok) {
                setImportExito(res.data);
                cargar(0);
                getAniosDisponibles().then(r => setAnios(r.data?.data ?? []));
            } else {
                setImportError(res.data?.message || 'Error desconocido');
            }
        } catch (err) {
            setImportError(err.response?.data?.message || 'Error en la importación');
        } finally {
            setImportando(false);
        }
    };

    const cerrarImport = () => {
        setShowImport(false);
        setArchivo(null);
        setImportError(null);
        setImportExito(null);
    };

    // ── Modal formulario (compartido entre lista y detalle) ──
    const ModalFormulario = showForm && (
        <div className="scp-modal-overlay">
            <div className="scp-modal scp-modal-form">
                <div className="scp-form-header">
                    <div className="scp-form-header-icon">
                        <i className={`bi ${editando ? 'bi-pencil-fill' : 'bi-plus-lg'}`} />
                    </div>
                    <div>
                        <h2>{editando ? 'Editar Registro' : 'Nuevo Registro'}</h2>
                        <p className="scp-form-subtitle">Suspensión Condicional del Proceso</p>
                    </div>
                    <button className="scp-modal-close" onClick={() => setShowForm(false)}>×</button>
                </div>
                <form className="scp-form" onSubmit={handleGuardar}>
                    <div className="scp-form-seccion">
                        <span className="scp-form-seccion-titulo"><i className="bi bi-file-earmark-text" /> Datos del Expediente</span>
                        <div className="scp-form-row">
                            <label>Causa<input name="causa" value={form.causa} onChange={handleFormChange} placeholder="Ej. JC/123/2024" /></label>
                            <label>Oficio<input name="oficio" value={form.oficio} onChange={handleFormChange} placeholder="Número de oficio" /></label>
                        </div>
                        <div className="scp-form-row">
                            <label>Fecha de Recibido<input type="date" name="recibido" value={form.recibido} onChange={handleFormChange} /></label>
                            <label>Fuero
                                <select name="fuero" value={form.fuero} onChange={handleFormChange}>
                                    <option value="">— Seleccionar —</option>
                                    <option value="FEDERAL">Federal</option>
                                    <option value="ESTATAL">Estatal</option>
                                </select>
                            </label>
                        </div>
                        <div className="scp-form-row">
                            <label>Plazo<input name="plazo" value={form.plazo} onChange={handleFormChange} placeholder="Ej. 6 meses" /></label>
                            <label>Año<input type="number" name="anio" value={form.anio} onChange={handleFormChange} placeholder="Ej. 2024" /></label>
                        </div>
                    </div>
                    <div className="scp-form-seccion">
                        <span className="scp-form-seccion-titulo"><i className="bi bi-person-fill" /> Imputado</span>
                        <label>Nombre completo<input name="imputado" value={form.imputado} onChange={handleFormChange} placeholder="Apellido paterno, materno, nombre(s)" /></label>
                        <label>Delito<textarea name="delito" value={form.delito} onChange={handleFormChange} rows={2} placeholder="Descripción del delito" /></label>
                    </div>
                    <div className="scp-form-seccion">
                        <span className="scp-form-seccion-titulo"><i className="bi bi-card-text" /> Detalles</span>
                        <label>Asunto<textarea name="asunto" value={form.asunto} onChange={handleFormChange} rows={3} placeholder="Descripción del asunto" /></label>
                        <label>Sobreseimiento<textarea name="sobreseguimiento" value={form.sobreseguimiento} onChange={handleFormChange} rows={2} placeholder="Información de sobreseimiento" /></label>
                        <label>Observaciones<textarea name="observaciones" value={form.observaciones} onChange={handleFormChange} rows={3} placeholder="Observaciones adicionales" /></label>
                    </div>
                    <div className="scp-form-footer">
                        <button type="button" className="scp-btn-cancel" onClick={() => setShowForm(false)}>
                            <i className="bi bi-x-lg" /> Cancelar
                        </button>
                        <button type="submit" className="scp-btn-save" disabled={guardando}>
                            {guardando ? <><i className="bi bi-hourglass-split" /> Guardando…</> : editando ? <><i className="bi bi-check-lg" /> Guardar cambios</> : <><i className="bi bi-plus-lg" /> Crear registro</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );

    // ── Render ───────────────────────────────────────────────
    if (loadingDet) return <div className="scp-loading"><div className="scp-spinner" /></div>;

    if (detalle) return (
        <div className="scp-detalle-wrap">
            <button className="scp-btn-volver" onClick={volverLista}>
                <i className="bi bi-arrow-left" /> Volver
            </button>

            <div className="scp-detalle-header">
                <div className="scp-detalle-nombre">{detalle.imputado || '—'}</div>
                <div className="scp-detalle-badges">
                    {detalle.fuero && (
                        <span className={`scp-fuero-badge scp-fuero-${detalle.fuero.toLowerCase()}`}>
                            {detalle.fuero}
                        </span>
                    )}
                    {detalle.anio && <span className="scp-anio-badge">{detalle.anio}</span>}
                </div>
                {puedeEditar && (
                    <div className="scp-detalle-acciones">
                        <button className="scp-btn-edit" onClick={() => abrirEditar(detalle)}>
                            <i className="bi bi-pencil-fill" /> Editar
                        </button>
                        {esAdmin && (
                            <button className="scp-btn-del" onClick={() => setConfirmId(detalle.id)}>
                                <i className="bi bi-trash-fill" /> Eliminar
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div className="scp-detalle-grid">
                <div className="scp-seccion">
                    <div className="scp-seccion-titulo"><i className="bi bi-file-earmark-text-fill" /> Datos del Expediente</div>
                    <div className="scp-campos">
                        <Fila label="Causa"    valor={detalle.causa} />
                        <Fila label="Oficio"   valor={detalle.oficio} />
                        <Fila label="Recibido" valor={detalle.recibido} />
                        <Fila label="Plazo"    valor={detalle.plazo} />
                        <Fila label="Delito"   valor={detalle.delito} />
                        <Fila label="Fuero"    valor={detalle.fuero} />
                    </div>
                </div>

                {detalle.asunto && (
                    <div className="scp-seccion">
                        <div className="scp-seccion-titulo"><i className="bi bi-card-text" /> Asunto</div>
                        <p className="scp-texto-libre">{detalle.asunto}</p>
                    </div>
                )}

                {detalle.sobreseguimiento && (
                    <div className="scp-seccion">
                        <div className="scp-seccion-titulo"><i className="bi bi-check-circle-fill" /> Sobreseimiento</div>
                        <p className="scp-texto-libre">{detalle.sobreseguimiento}</p>
                    </div>
                )}

                {detalle.observaciones && (
                    <div className="scp-seccion">
                        <div className="scp-seccion-titulo"><i className="bi bi-chat-left-text-fill" /> Observaciones</div>
                        <p className="scp-texto-libre">{detalle.observaciones}</p>
                    </div>
                )}
            </div>

            {/* Modal confirmar eliminar */}
            {confirmId && (
                <div className="scp-modal-overlay" onClick={() => setConfirmId(null)}>
                    <div className="scp-modal" onClick={e => e.stopPropagation()}>
                        <div className="scp-modal-icon scp-modal-icon-danger"><i className="bi bi-exclamation-triangle-fill" /></div>
                        <h3>¿Eliminar este registro?</h3>
                        <p>Esta acción no se puede deshacer.</p>
                        <div className="scp-modal-btns">
                            <button className="scp-btn-cancel" onClick={() => setConfirmId(null)}>Cancelar</button>
                            <button className="scp-btn-danger" onClick={handleEliminar} disabled={eliminando}>
                                {eliminando ? 'Eliminando…' : 'Sí, eliminar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {ModalFormulario}
        </div>
    );

    return (
        <div className="scp-wrap">
            {/* Topbar */}
            <div className="scp-topbar">
                <div className="scp-topbar-left">
                    <span className="scp-total">Mostrando <b>{pagina * ITEMS + 1}</b> – <b>{Math.min((pagina + 1) * ITEMS, total)}</b> de <b>{total}</b></span>
                    <div className="scp-fuero-pills">
                        {['', ...FUERO_OPTS].map(f => (
                            <button
                                key={f}
                                className={`scp-pill ${!f && !fueroFiltro ? 'scp-pill-active' : ''} ${f && fueroFiltro === f ? 'scp-pill-active' : ''} ${f ? `scp-pill-${f.toLowerCase()}` : ''}`}
                                onClick={() => { setFueroFiltro(f); setPagina(0); }}
                            >
                                {f || 'Todos'}
                            </button>
                        ))}
                    </div>
                    {/* Filtro de año */}
                    {anios.length > 0 && (
                        <select className="scp-select-anio" value={anioFiltro} onChange={e => { setAnioFiltro(e.target.value); setPagina(0); }}>
                            <option value="">Todos los años</option>
                            {anios.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                    )}
                </div>
                <div className="scp-topbar-right">
                    <div className="scp-paginacion">
                        <button disabled={pagina === 0} onClick={() => cargar(pagina - 1)}>‹</button>
                        <span>{pagina + 1} / {totalPaginas}</span>
                        <button disabled={pagina >= totalPaginas - 1} onClick={() => cargar(pagina + 1)}>›</button>
                    </div>
                </div>
            </div>

            {/* Buscador + Nuevo Registro */}
            <div className="scp-search-row">
                <div className="scp-search-box">
                    <i className="bi bi-search" />
                    <input
                        type="text"
                        placeholder="Buscar por imputado, causa, oficio o delito…"
                        value={busqueda}
                        onChange={e => { setBusqueda(e.target.value); setPagina(0); }}
                    />
                    {busqueda && <button className="scp-clear" onClick={() => setBusqueda('')}>×</button>}
                </div>
                {puedeEditar && (
                    <button className="scp-btn-nuevo-grande" onClick={abrirCrear}>
                        <i className="bi bi-plus-lg" /> Nuevo Registro
                    </button>
                )}
            </div>

            {/* Tabla */}
            <div className="scp-table-wrap">
                <table className="scp-table">
                    <thead>
                        <tr>
                            <th>RECIBIDO</th>
                            <th>IMPUTADO</th>
                            <th>CAUSA</th>
                            <th>OFICIO</th>
                            <th>FUERO</th>
                            <th>PLAZO</th>
                            <th>ACCIONES</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={7} className="scp-loading-row"><div className="scp-spinner" /></td></tr>
                        ) : lista.length === 0 ? (
                            <tr><td colSpan={7} className="scp-empty">No hay registros</td></tr>
                        ) : lista.map(s => (
                            <tr key={s.id}>
                                <td className="scp-fecha">{s.recibido || '—'}</td>
                                <td className="scp-imputado">{s.imputado || '—'}</td>
                                <td>{s.causa || '—'}</td>
                                <td>{s.oficio || '—'}</td>
                                <td>
                                    {s.fuero
                                        ? <span className={`scp-fuero-badge scp-fuero-${s.fuero.toLowerCase()}`}>{s.fuero}</span>
                                        : '—'}
                                </td>
                                <td>{s.plazo || '—'}</td>
                                <td className="scp-acciones-cell">
                                    <button className="scp-btn-ver" title="Ver detalle" onClick={() => verDetalle(s.id)}>
                                        <i className="bi bi-eye-fill" />
                                    </button>
                                    {esAdmin && (
                                        <button className="scp-btn-del-sm" title="Eliminar" onClick={() => setConfirmId(s.id)}>
                                            <i className="bi bi-trash-fill" />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal Crear/Editar */}
            {ModalFormulario}

            {/* Modal Importar */}
            {showImport && (
                <div className="scp-modal-overlay" onClick={cerrarImport}>
                    <div className="scp-modal" onClick={e => e.stopPropagation()}>
                        <button className="scp-modal-close" onClick={cerrarImport}>×</button>
                        {!importExito ? (
                            <>
                                <div className="scp-modal-icon"><i className="bi bi-file-earmark-excel-fill" /></div>
                                <h2>Importar Excel</h2>
                                <p className="scp-modal-desc">
                                    El archivo debe tener hojas por año (2018, 2019…) con las columnas:<br />
                                    <b>CAUSA · OFICIO · RECIBIDO · IMPUTADO · ASUNTO · PLAZO · DELITO · FUERO · SOBRESEGUIMIENTO · OBSERVACIONES</b>
                                </p>
                                <label className="scp-file-label">
                                    <i className="bi bi-upload" />
                                    {archivo ? archivo.name : 'Seleccionar archivo .xlsx'}
                                    <input type="file" accept=".xlsx,.xls" onChange={e => setArchivo(e.target.files[0])} hidden />
                                </label>
                                {importError && <div className="scp-import-error">{importError}</div>}
                                <div className="scp-modal-btns">
                                    <button className="scp-btn-cancel" onClick={cerrarImport}>Cancelar</button>
                                    <button className="scp-btn-save" onClick={handleImportar} disabled={importando || !archivo}>
                                        {importando ? 'Importando…' : 'Importar'}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="scp-modal-icon scp-modal-icon-ok"><i className="bi bi-check-circle-fill" /></div>
                                <h2>¡Importación exitosa!</h2>
                                <p>{importExito.message}</p>
                                <button className="scp-btn-save" onClick={cerrarImport}>Cerrar</button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Confirmar eliminar (desde tabla) */}
            {confirmId && !detalle && (
                <div className="scp-modal-overlay" onClick={() => setConfirmId(null)}>
                    <div className="scp-modal" onClick={e => e.stopPropagation()}>
                        <div className="scp-modal-icon scp-modal-icon-danger"><i className="bi bi-exclamation-triangle-fill" /></div>
                        <h3>¿Eliminar este registro?</h3>
                        <p>Esta acción no se puede deshacer.</p>
                        <div className="scp-modal-btns">
                            <button className="scp-btn-cancel" onClick={() => setConfirmId(null)}>Cancelar</button>
                            <button className="scp-btn-danger" onClick={handleEliminar} disabled={eliminando}>
                                {eliminando ? 'Eliminando…' : 'Sí, eliminar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function Fila({ label, valor }) {
    if (!valor) return null;
    return (
        <div className="scp-fila">
            <span className="scp-fila-label">{label}</span>
            <span className="scp-fila-valor">{valor}</span>
        </div>
    );
}
