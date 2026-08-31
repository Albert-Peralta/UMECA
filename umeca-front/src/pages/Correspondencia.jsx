import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useFormGuard } from '../context/FormGuardContext';
import {
    getCorrespondencia, getMisAsignados, getMisRegistros, crearCorrespondencia,
    editarCorrespondencia, eliminarCorrespondencia, cancelarCorrespondencia, revertirCancelacionCorrespondencia,
    getPersonalAsignable, asignarCorrespondencia, quitarAsignacion,
    cambiarEstadoCorrespondencia, getContadoresCorrespondencia, exportarCorrespondenciaExcel,
    SEDES, TIPOS, PRIORIDADES, ESTADOS_PERSONAL, ESTADO_CONFIG, PRIORIDAD_CONFIG,
} from '../api/correspondenciaApi';
import './Correspondencia.css';

const POR_PAGINA = 50;

const FORM_VACIO = {
    sede: '', noOficio: '', fechaOficio: '', fechaRecibido: '',
    tipo: '', remitente: '', asunto: '',
    terminoRespuestaHoras: '', requiereRespuesta: false, prioridad: 'NORMAL',
};

// ── Compresión de imágenes (Canvas, sin librerías) ─────────────────────────
const comprimirImagen = (file, maxPx = 1200, calidad = 0.80) =>
    new Promise(resolve => {
        if (!file.type.startsWith('image/')) { resolve(file); return; }
        const img = new Image();
        img.onload = () => {
            let { width, height } = img;
            if (width > maxPx || height > maxPx) {
                if (width > height) { height = Math.round(height * maxPx / width); width = maxPx; }
                else                { width  = Math.round(width  * maxPx / height); height = maxPx; }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width; canvas.height = height;
            canvas.getContext('2d').drawImage(img, 0, 0, width, height);
            canvas.toBlob(blob => {
                if (!blob) { resolve(file); return; }
                resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }));
            }, 'image/jpeg', calidad);
        };
        img.onerror = () => resolve(file); // fallback: enviar original
        img.src = URL.createObjectURL(file);
    });

export default function Correspondencia() {
    const { user } = useAuth();
    const { showToast } = useToast();
    const { setFormDirty } = useFormGuard();
    const esAdmin           = user?.rol === 'ADMINISTRADOR' || user?.rol === 'SUPERADMIN';
    const esCorrespondencia = user?.rol === 'CORRESPONDENCIA'; // solo para ver "mis registros"
    const puedeRegistrar    = esCorrespondencia || esAdmin;    // puede crear nuevo oficio
    const esPersonal        = user?.rol === 'SUPERVISION' || user?.rol === 'EVALUADOR_RIESGO';

    const [lista,    setLista]    = useState([]);
    const [buscar,          setBuscar]          = useState('');
    const [filtroPrioridad, setFiltroPrioridad] = useState('');
    const [filtroEstado,    setFiltroEstado]    = useState('');
    const [pagina,          setPagina]          = useState(1);
    const [loading,  setLoading]  = useState(false);

    // Vista activa: 'lista' | 'form' | 'detalle'
    const [vista,    setVista]    = useState('lista');
    useEffect(() => { setFormDirty(vista === 'form'); return () => setFormDirty(false); }, [vista]);
    const [registro, setRegistro] = useState(null);

    // Form nuevo registro
    const [form,     setForm]     = useState(FORM_VACIO);
    const [archivo,  setArchivo]  = useState(null);
    const [dragging, setDragging] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loadingGuardar, setLoadingGuardar] = useState(false);
    const [erroresCampo, setErroresCampo] = useState({});

    // Asignación (admin)
    const [personal,      setPersonal]      = useState([]);
    const [asignadoSel,   setAsignadoSel]   = useState('');
    const [loadingAsig,   setLoadingAsig]   = useState(false);
    const [showAsigModal,   setShowAsigModal]   = useState(false);
    const [registroAsig,    setRegistroAsig]    = useState(null);
    const [showQuitarModal, setShowQuitarModal] = useState(false);
    const [registroQuitar,  setRegistroQuitar]  = useState(null);

    // Editar / Eliminar (solo admin y superadmin)
    const [modoEditar,       setModoEditar]       = useState(false);
    const [registroEditar,   setRegistroEditar]   = useState(null);
    const [showEliminarModal,setShowEliminarModal] = useState(false);
    const [registroEliminar, setRegistroEliminar] = useState(null);
    const [loadingEliminar,  setLoadingEliminar]  = useState(false);
    const [showCancelarModal,setShowCancelarModal] = useState(false);
    const [registroCancelar, setRegistroCancelar] = useState(null);
    const [motivoCancelar,   setMotivoCancelar]   = useState('');
    const [motivoError,      setMotivoError]      = useState('');
    const [loadingCancelar,  setLoadingCancelar]  = useState(false);

    // PDF con auth
    const [loadingPdf, setLoadingPdf] = useState(false);

    // Contadores de alertas
    const [contadores, setContadores] = useState({ pendientesAdmin: 0, misAsignados: 0 });

    // Exportar
    const [exportando, setExportando] = useState(false);

    // Filtro contador
    const [filtroCont,     setFiltroCont]     = useState('hoy');
    const [fechaCont,      setFechaCont]      = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; });
    const [showContMenu,   setShowContMenu]   = useState(false);

    // ── Cargar lista ────────────────────────────────────────────────────────
    const cargar = useCallback(async () => {
        setLoading(true);
        try {
            let res;
            if (esPersonal) res = await getMisAsignados();
            else            res = await getCorrespondencia(); // admin + CORRESPONDENCIA ven todos
            setLista(res.data?.data || []);
            // Contadores de pendientes (solo admin y personal, no CORRESPONDENCIA)
            if (!esCorrespondencia) {
                const cnt = await getContadoresCorrespondencia();
                if (cnt.data?.ok) setContadores(cnt.data.data || {});
            }
        } catch { showToast('Error al cargar registros', 'error'); }
        finally { setLoading(false); }
    }, [esPersonal, esCorrespondencia]);

    useEffect(() => { cargar(); }, [cargar]);

    // ── Filtrado y paginación ───────────────────────────────────────────────
    const filtrada = lista.filter(r => {
        const coincideTexto = !buscar || [r.noTurno, r.noOficio, r.remitente, r.asunto, r.asignadoANombre]
            .some(v => v?.toLowerCase().includes(buscar.toLowerCase()));
        const coincidePrioridad = !filtroPrioridad || r.prioridad === filtroPrioridad;
        const coincideEstado    = !filtroEstado    || r.estado    === filtroEstado;
        return coincideTexto && coincidePrioridad && coincideEstado;
    });
    const totalPags = Math.max(1, Math.ceil(filtrada.length / POR_PAGINA));
    const pagActual = filtrada.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

    // ── Guardar nuevo registro ──────────────────────────────────────────────
    const handleGuardar = async () => {
        setLoadingGuardar(true);
        try {
            const res = await crearCorrespondencia(
                { ...form, terminoRespuestaHoras: form.terminoRespuestaHoras || null },
                archivo
            );
            if (res.data.ok) {
                showToast('Registro enviado al administrador');
                setFormDirty(false);
                setVista('lista');
                setForm(FORM_VACIO);
                setArchivo(null);
                setShowConfirm(false);
                cargar();
            } else showToast(res.data.message || 'Error al guardar', 'error');
        } catch (err) {
            const status = err?.response?.status;
            if (status === 413) showToast('El archivo supera el tamaño permitido (PDF: máx. 10 MB, imágenes: máx. 2 MB)', 'error');
            else if (status === 403) showToast('No tienes permiso para realizar esta acción', 'error');
            else showToast('Error de conexión. Verifica tu red e intenta de nuevo.', 'error');
        }
        finally { setLoadingGuardar(false); }
    };

    const validarForm = () => {
        const errs = {};
        if (!form.sede)              errs.sede      = 'Selecciona una sede';
        if (!form.tipo)              errs.tipo      = 'Selecciona el tipo';
        if (!form.remitente?.trim()) errs.remitente = 'El remitente es requerido';
        if (!form.asunto?.trim())    errs.asunto    = 'El asunto es requerido';
        if (!form.prioridad)         errs.prioridad = 'Selecciona la prioridad';
        if (!modoEditar && !archivo) errs.archivo   = 'El archivo adjunto es obligatorio';
        setErroresCampo(errs);
        const primerCampo = Object.keys(errs)[0];
        if (primerCampo) {
            const el = document.getElementById(`corr-field-${primerCampo}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return Object.values(errs)[0];
        }
        return null;
    };

    // ── Editar (admin/superadmin) ───────────────────────────────────────────
    const abrirEditar = (reg) => {
        setRegistroEditar(reg);
        setForm({
            sede:                reg.sede || '',
            noOficio:            reg.noOficio || '',
            fechaOficio:         reg.fechaOficio || '',
            fechaRecibido:       reg.fechaRecibido || '',
            tipo:                reg.tipo || '',
            remitente:           reg.remitente || '',
            asunto:              reg.asunto || '',
            terminoRespuestaHoras: reg.terminoRespuestaHoras || '',
            requiereRespuesta:   reg.requiereRespuesta || false,
            prioridad:           reg.prioridad || '',
        });
        setArchivo(null);
        setModoEditar(true);
        setVista('form');
    };

    const handleEditar = async () => {
        setLoadingGuardar(true);
        try {
            const res = await editarCorrespondencia(
                registroEditar.id,
                { ...form, terminoRespuestaHoras: form.terminoRespuestaHoras || null },
                archivo
            );
            if (res.data.ok) {
                showToast('Registro actualizado correctamente');
                setFormDirty(false);
                setVista('lista');
                setForm(FORM_VACIO);
                setArchivo(null);
                setModoEditar(false);
                setRegistroEditar(null);
                cargar();
            } else showToast(res.data.message || 'Error al editar', 'error');
        } catch (err) {
            const status = err?.response?.status;
            if (status === 413) showToast('El archivo supera el tamaño permitido (PDF: máx. 10 MB, imágenes: máx. 2 MB)', 'error');
            else if (status === 403) showToast('No tienes permiso para realizar esta acción', 'error');
            else showToast('Error de conexión. Verifica tu red e intenta de nuevo.', 'error');
        }
        finally { setLoadingGuardar(false); }
    };

    // ── Eliminar (admin/superadmin) ─────────────────────────────────────────
    const abrirEliminar = (reg) => {
        setRegistroEliminar(reg);
        setShowEliminarModal(true);
    };

    const handleEliminar = async () => {
        setLoadingEliminar(true);
        try {
            const res = await eliminarCorrespondencia(registroEliminar.id);
            if (res.data.ok) {
                showToast('Registro eliminado correctamente');
                setShowEliminarModal(false);
                setRegistroEliminar(null);
                cargar();
            } else showToast(res.data.message || 'Error al eliminar', 'error');
        } catch { showToast('Error de conexión', 'error'); }
        finally { setLoadingEliminar(false); }
    };

    // ── Cancelar (admin) ────────────────────────────────────────────────────
    const abrirCancelar = (reg) => {
        setRegistroCancelar(reg);
        setMotivoCancelar('');
        setMotivoError('');
        setShowCancelarModal(true);
    };

    const handleCancelar = async () => {
        if (!motivoCancelar.trim()) { setMotivoError('El motivo es obligatorio'); return; }
        setLoadingCancelar(true);
        try {
            const res = await cancelarCorrespondencia(registroCancelar.id, motivoCancelar.trim());
            if (res.data.ok) {
                showToast('Registro cancelado correctamente');
                setShowCancelarModal(false);
                setRegistroCancelar(null);
                setMotivoCancelar('');
                cargar();
            } else showToast(res.data.message || 'Error al cancelar', 'error');
        } catch { showToast('Error de conexión', 'error'); }
        finally { setLoadingCancelar(false); }
    };

    // ── Asignar (admin) ─────────────────────────────────────────────────────
    const abrirAsignar = async (reg) => {
        setRegistroAsig(reg);
        setAsignadoSel(reg.asignadoAId ? String(reg.asignadoAId) : '');
        if (!personal.length) {
            const res = await getPersonalAsignable();
            setPersonal(res.data?.data || []);
        }
        setShowAsigModal(true);
    };

    const handleAsignar = async () => {
        if (!asignadoSel) return;
        setLoadingAsig(true);
        try {
            const res = await asignarCorrespondencia(registroAsig.id, Number(asignadoSel));
            if (res.data.ok) {
                showToast('Asignado correctamente');
                setShowAsigModal(false);
                await cargar();
                window.dispatchEvent(new CustomEvent('corr-contadores-cambio'));
            } else showToast(res.data.message || 'Error', 'error');
        } catch { showToast('Error de conexión', 'error'); }
        finally { setLoadingAsig(false); }
    };

    const handleQuitarAsignacion = (reg) => {
        setRegistroQuitar(reg);
        setShowQuitarModal(true);
    };

    const confirmarQuitarAsignacion = async () => {
        try {
            const res = await quitarAsignacion(registroQuitar.id);
            if (res.data.ok) {
                showToast('Asignación removida');
                await cargar();
                window.dispatchEvent(new CustomEvent('corr-contadores-cambio'));
            } else showToast(res.data.message || 'Error', 'error');
        } catch { showToast('Error de conexión', 'error'); }
        finally { setShowQuitarModal(false); setRegistroQuitar(null); }
    };

    // ── Cambiar estado (personal) ───────────────────────────────────────────
    const handleCambiarEstado = async (reg, estado) => {
        try {
            const res = await cambiarEstadoCorrespondencia(reg.id, estado);
            if (res.data.ok) {
                showToast('Estado actualizado');
                await cargar();
                // Actualizar el registro del detalle en tiempo real sin salir
                setRegistro(prev => prev ? { ...prev, estado } : prev);
                window.dispatchEvent(new CustomEvent('corr-contadores-cambio'));
            } else showToast(res.data.message || 'Error', 'error');
        } catch { showToast('Error de conexión', 'error'); }
    };

    // ── Exportar Excel ──────────────────────────────────────────────────────
    const handleExportar = async () => {
        setExportando(true);
        try {
            const res = await exportarCorrespondenciaExcel();
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = `correspondencia_${new Date().toISOString().slice(0,10)}.xlsx`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch { showToast('Error al exportar', 'error'); }
        finally { setExportando(false); }
    };

    // ── Contador filtrado ────────────────────────────────────────────────────
    const contFiltrado = (() => {
        const ref = fechaCont ? new Date(fechaCont + 'T00:00:00') : new Date();
        return lista.filter(r => {
            if (!r.createdAt) return false;
            const d = new Date(r.createdAt);
            if (filtroCont === 'hoy' || filtroCont === 'fecha') {
                // Comparar en hora local (no UTC) para evitar desfase de zona horaria
                const dLocal = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                return dLocal === fechaCont;
            }
            if (filtroCont === 'semana') {
                // Semana ISO: lunes a domingo de la semana que contiene `fechaCont`
                const lunes = new Date(ref);
                lunes.setDate(ref.getDate() - ((ref.getDay() + 6) % 7));
                lunes.setHours(0, 0, 0, 0);
                const domingo = new Date(lunes);
                domingo.setDate(lunes.getDate() + 6);
                domingo.setHours(23, 59, 59, 999);
                return d >= lunes && d <= domingo;
            }
            if (filtroCont === 'mes') {
                return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
            }
            return false;
        }).length;
    })();

    // Helpers de navegación
    const hoyLocal = () => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`; };
    const moverSemana = (dir) => {
        const d = new Date(fechaCont + 'T00:00:00');
        d.setDate(d.getDate() + dir * 7);
        setFechaCont(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
    };
    const moverMes = (dir) => {
        const d = new Date(fechaCont + 'T00:00:00');
        d.setMonth(d.getMonth() + dir);
        setFechaCont(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
    };
    const refDate = new Date(fechaCont + 'T00:00:00');
    const lunesSemana = new Date(refDate);
    lunesSemana.setDate(refDate.getDate() - ((refDate.getDay() + 6) % 7));
    const domingoSemana = new Date(lunesSemana);
    domingoSemana.setDate(lunesSemana.getDate() + 6);
    const fmtDia = (d) => `${d.getDate()} ${d.toLocaleString('es-MX', { month: 'short' })}`;
    const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

    const contLabel = filtroCont === 'hoy'
        ? 'hoy'
        : filtroCont === 'semana'
            ? `${fmtDia(lunesSemana)} – ${fmtDia(domingoSemana)}`
            : filtroCont === 'mes'
                ? `${MESES[refDate.getMonth()]} ${refDate.getFullYear()}`
                : fechaCont;

    // ── Vista: Formulario nuevo ─────────────────────────────────────────────
    if (vista === 'form') {
        return (
            <div className="corr-container">
                <div className="corr-form-header">
                    <button className="corr-btn-volver" onClick={() => { setFormDirty(false); setVista('lista'); setForm(FORM_VACIO); setArchivo(null); setModoEditar(false); setRegistroEditar(null); setErroresCampo({}); }}>
                        <i className="bi bi-arrow-left" /> Cancelar
                    </button>
                </div>

                {/* Banner */}
                <div className="corr-form-banner">
                    <div className="corr-form-banner-icon">
                        <i className={`bi ${modoEditar ? 'bi-pencil-square' : 'bi-envelope-paper-fill'}`} />
                    </div>
                    <div className="corr-form-banner-texto">
                        <h3>{modoEditar ? `Editar Registro — ${registroEditar?.noTurno}` : 'Nuevo Registro de Correspondencia'}</h3>
                        <p>{modoEditar ? 'Modifica los datos del oficio o documento' : 'Completa los datos del oficio o documento recibido'}</p>
                    </div>
                </div>

                <div className="corr-form-card">
                <div className="corr-form-grid">

                    {/* Sección: Identificación */}
                    <div className="corr-form-seccion"><span><i className="bi bi-building" /> Identificación del documento</span></div>

                    <div id="corr-field-sede" className={`corr-field ${erroresCampo.sede ? 'corr-field-error' : ''}`}>
                        <label><i className="bi bi-geo-alt" /> Sede *</label>
                        <select value={form.sede} onChange={e => { setForm(f => ({ ...f, sede: e.target.value })); setErroresCampo(er => ({ ...er, sede: '' })); }}>
                            <option value="">Seleccionar sede...</option>
                            {SEDES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                        {erroresCampo.sede && <span className="corr-field-msg-error">{erroresCampo.sede}</span>}
                    </div>
                    <div className="corr-field">
                        <label><i className="bi bi-hash" /> No. de Oficio</label>
                        <input value={form.noOficio} onChange={e => setForm(f => ({ ...f, noOficio: e.target.value }))} placeholder="Ej: OFI-2026-001" />
                    </div>
                    <div className="corr-field">
                        <label><i className="bi bi-calendar3" /> Fecha del Oficio</label>
                        <input type="date" value={form.fechaOficio} onChange={e => setForm(f => ({ ...f, fechaOficio: e.target.value }))} />
                    </div>
                    <div className="corr-field">
                        <label><i className="bi bi-calendar-check" /> Fecha de Recibido</label>
                        <input type="date" value={form.fechaRecibido} onChange={e => setForm(f => ({ ...f, fechaRecibido: e.target.value }))} />
                    </div>
                    <div id="corr-field-tipo" className={`corr-field ${erroresCampo.tipo ? 'corr-field-error' : ''}`}>
                        <label><i className="bi bi-tag" /> Tipo *</label>
                        <select value={form.tipo} onChange={e => { setForm(f => ({ ...f, tipo: e.target.value })); setErroresCampo(er => ({ ...er, tipo: '' })); }}>
                            <option value="">Seleccionar tipo...</option>
                            {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                        {erroresCampo.tipo && <span className="corr-field-msg-error">{erroresCampo.tipo}</span>}
                    </div>
                    <div id="corr-field-prioridad" className={`corr-field ${erroresCampo.prioridad ? 'corr-field-error' : ''}`}>
                        <label><i className="bi bi-flag" /> Prioridad *</label>
                        <select value={form.prioridad} onChange={e => { setForm(f => ({ ...f, prioridad: e.target.value })); setErroresCampo(er => ({ ...er, prioridad: '' })); }}>
                            {PRIORIDADES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                        </select>
                        {erroresCampo.prioridad && <span className="corr-field-msg-error">{erroresCampo.prioridad}</span>}
                    </div>

                    {/* Sección: Contenido */}
                    <div className="corr-form-seccion"><span><i className="bi bi-file-text" /> Contenido</span></div>

                    <div id="corr-field-remitente" className={`corr-field corr-field-full ${erroresCampo.remitente ? 'corr-field-error' : ''}`}>
                        <label><i className="bi bi-person" /> Remitente *</label>
                        <input value={form.remitente} onChange={e => { setForm(f => ({ ...f, remitente: e.target.value })); setErroresCampo(er => ({ ...er, remitente: '' })); }} placeholder="Nombre o institución que envía" />
                        {erroresCampo.remitente && <span className="corr-field-msg-error">{erroresCampo.remitente}</span>}
                    </div>
                    <div id="corr-field-asunto" className={`corr-field corr-field-full ${erroresCampo.asunto ? 'corr-field-error' : ''}`}>
                        <label><i className="bi bi-chat-text" /> Asunto *</label>
                        <textarea rows={3} value={form.asunto} onChange={e => { setForm(f => ({ ...f, asunto: e.target.value })); setErroresCampo(er => ({ ...er, asunto: '' })); }} placeholder="Descripción del asunto o motivo del documento..." />
                        {erroresCampo.asunto && <span className="corr-field-msg-error">{erroresCampo.asunto}</span>}
                    </div>

                    {/* Sección: Respuesta y archivo */}
                    <div className="corr-form-seccion"><span><i className="bi bi-clock" /> Respuesta y Archivo</span></div>

                    <div className="corr-field corr-requiere-wrap corr-field-full">
                        <button
                            className={`corr-toggle ${form.requiereRespuesta ? 'corr-toggle-si' : 'corr-toggle-no'}`}
                            onClick={() => setForm(f => ({ ...f, requiereRespuesta: !f.requiereRespuesta }))}
                            type="button"
                        >
                            <i className={`bi ${form.requiereRespuesta ? 'bi-check-circle-fill' : 'bi-x-circle'}`} />
                            {form.requiereRespuesta ? 'Requiere Término de Respuesta: SÍ' : 'Requiere Término de Respuesta: NO'}
                        </button>
                    </div>
                    <div id="corr-field-archivo" className={`corr-field corr-field-full ${erroresCampo.archivo ? 'corr-field-error' : ''}`}>
                        <label><i className="bi bi-file-earmark-arrow-up" /> Archivo adjunto {!modoEditar && '*'}</label>
                        <label
                            className={`corr-dropzone ${erroresCampo.archivo ? 'corr-dropzone-error' : ''} ${dragging ? 'corr-dropzone-dragging' : ''}`}
                            onDragOver={e => { e.preventDefault(); setDragging(true); }}
                            onDragEnter={e => { e.preventDefault(); setDragging(true); }}
                            onDragLeave={e => { e.preventDefault(); setDragging(false); }}
                            onDrop={e => {
                                e.preventDefault();
                                setDragging(false);
                                const file = e.dataTransfer.files[0];
                                const TIPOS_VALIDOS = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
                                if (!file) return;
                                if (!TIPOS_VALIDOS.includes(file.type)) return;
                                const maxSize = file.type === 'application/pdf' ? 10 * 1024 * 1024 : 2 * 1024 * 1024;
                                const maxLabel = file.type === 'application/pdf' ? '10 MB' : '2 MB';
                                if (file.size > maxSize) {
                                    setErroresCampo(er => ({ ...er, archivo: `El archivo no puede superar ${maxLabel}` }));
                                    return;
                                }
                                comprimirImagen(file).then(f => { setArchivo(f); setErroresCampo(er => ({ ...er, archivo: '' })); });
                            }}
                        >
                            <input type="file" accept="application/pdf,image/jpeg,image/jpg,image/png,image/webp"
                                onChange={e => {
                                    const file = e.target.files[0] || null;
                                    if (file) {
                                        const maxSize = file.type === 'application/pdf' ? 10 * 1024 * 1024 : 2 * 1024 * 1024;
                                        const maxLabel = file.type === 'application/pdf' ? '10 MB' : '2 MB';
                                        if (file.size > maxSize) {
                                            setErroresCampo(er => ({ ...er, archivo: `El archivo no puede superar ${maxLabel}` }));
                                            e.target.value = '';
                                            return;
                                        }
                                        comprimirImagen(file).then(f => { setArchivo(f); setErroresCampo(er => ({ ...er, archivo: '' })); });
                                        return;
                                    }
                                    setArchivo(null);
                                    setErroresCampo(er => ({ ...er, archivo: '' }));
                                }} />
                            {archivo ? (
                                <>
                                    <i className={`bi ${archivo.type.startsWith('image/') ? 'bi-file-earmark-image-fill' : 'bi-file-earmark-pdf-fill'} corr-dropzone-icon corr-dropzone-icon-ok`} />
                                    <span className="corr-dropzone-nombre">{archivo.name}</span>
                                    <span className="corr-dropzone-sub">
                                        {modoEditar
                                            ? '✅ Este archivo reemplazará al adjunto actual al guardar'
                                            : 'Haz clic para cambiar el archivo'}
                                    </span>
                                    {modoEditar && registroEditar?.archivoPdf && (
                                        <button
                                            className="corr-btn-quitar-pdf"
                                            onClick={e => { e.preventDefault(); e.stopPropagation(); setArchivo(null); }}
                                        >
                                            <i className="bi bi-arrow-counterclockwise" /> Restaurar archivo original
                                        </button>
                                    )}
                                </>
                            ) : modoEditar && registroEditar?.archivoPdf ? (
                                <>
                                    <i className="bi bi-file-earmark-fill corr-dropzone-icon" style={{ color: '#2d6a4f' }} />
                                    <span className="corr-dropzone-nombre">
                                        {registroEditar.archivoPdf.split('/').pop().split('_').slice(1).join('_') || registroEditar.archivoPdf.split('/').pop()}
                                    </span>
                                    <span className="corr-dropzone-sub">📎 Archivo actual · Haz clic para reemplazarlo</span>
                                </>
                            ) : (
                                <>
                                    <i className={`bi ${dragging ? 'bi-box-arrow-in-down' : 'bi-cloud-upload'} corr-dropzone-icon`} />
                                    <span className="corr-dropzone-titulo">{dragging ? 'Suelta el archivo aquí' : 'Arrastra o haz clic para subir'}</span>
                                    <span className="corr-dropzone-sub">PDF · JPG · PNG · WEBP · {modoEditar ? 'Sin archivo adjunto actualmente' : 'Obligatorio'}</span>
                                </>
                            )}
                        </label>
                        {erroresCampo.archivo && <span className="corr-field-msg-error">{erroresCampo.archivo}</span>}
                    </div>
                </div>
                </div>

                <div className="corr-form-actions">
                    <button className="corr-btn-guardar" onClick={() => {
                        const err = modoEditar
                            ? (!form.sede || !form.tipo || !form.remitente?.trim() || !form.asunto?.trim() || !form.prioridad ? 'Completa los campos obligatorios' : null)
                            : validarForm();
                        if (err) { showToast(err, 'error'); return; }
                        if (modoEditar) handleEditar();
                        else setShowConfirm(true);
                    }} disabled={loadingGuardar}>
                        {loadingGuardar
                            ? <><i className="bi bi-arrow-repeat corr-spin" /> Guardando...</>
                            : modoEditar
                                ? <><i className="bi bi-floppy-fill" /> Guardar Cambios</>
                                : <><i className="bi bi-send-fill" /> Enviar al Administrador</>
                        }
                    </button>
                </div>

                {/* Modal confirmación */}
                {showConfirm && (
                    <div className="corr-modal-overlay" onClick={() => !loadingGuardar && setShowConfirm(false)}>
                        <div className="corr-modal-box" onClick={e => e.stopPropagation()}>
                            <div className="corr-modal-icon">
                                <i className="bi bi-send-check-fill" />
                            </div>
                            <h3 className="corr-modal-titulo">¿Confirmar envío?</h3>
                            <p className="corr-modal-desc">
                                El registro será enviado al administrador para su revisión y asignación.<br />
                                Asunto: <strong>{form.asunto}</strong>
                            </p>
                            {archivo && (
                                <p className="corr-modal-archivo">
                                    <i className="bi bi-paperclip" /> {archivo.name}
                                </p>
                            )}
                            <div className="corr-modal-acciones">
                                <button className="corr-modal-btn-cancelar" onClick={() => setShowConfirm(false)} disabled={loadingGuardar}>
                                    Cancelar
                                </button>
                                <button className="corr-modal-btn-confirmar" onClick={handleGuardar} disabled={loadingGuardar}>
                                    {loadingGuardar ? 'Enviando...' : 'Sí, enviar'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ── Abrir PDF con token ─────────────────────────────────────────────────
    const esImagen = (ruta) => /\.(jpe?g|png|webp|gif)$/i.test(ruta || '');

    const getMimeImagen = (ruta) => {
        const ext = (ruta || '').split('.').pop().toLowerCase();
        return { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' }[ext] || 'image/jpeg';
    };

    const abrirArchivo = async (ruta) => {
        setLoadingPdf(true);
        try {
            const token = localStorage.getItem('token');
            const base = `http://${window.location.hostname}:8089/api`;
            const url = `${base}/correspondencia/pdf?ruta=${encodeURIComponent(ruta)}`;
            const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
            if (!res.ok) { showToast('No se pudo cargar el archivo', 'error'); return; }
            const blob = await res.blob();

            if (esImagen(ruta)) {
                // Para imágenes: crear página HTML wrapper para evitar el visor de PDF del navegador
                const imgBlob = new Blob([blob], { type: getMimeImagen(ruta) });
                const imgUrl = URL.createObjectURL(imgBlob);
                const html = `<!DOCTYPE html><html><head><title>Imagen adjunta</title><style>*{margin:0;padding:0}body{background:#111;display:flex;justify-content:center;align-items:center;min-height:100vh}img{max-width:100vw;max-height:100vh;object-fit:contain}</style></head><body><img src="${imgUrl}"></body></html>`;
                const htmlBlob = new Blob([html], { type: 'text/html' });
                window.open(URL.createObjectURL(htmlBlob), '_blank');
            } else {
                const pdfBlob = new Blob([blob], { type: 'application/pdf' });
                window.open(URL.createObjectURL(pdfBlob), '_blank');
            }
        } catch { showToast('Error al abrir el archivo', 'error'); }
        finally { setLoadingPdf(false); }
    };

    // ── Vista: Detalle ──────────────────────────────────────────────────────
    if (vista === 'detalle' && registro) {
        const cfg  = ESTADO_CONFIG[registro.estado]   || {};
        const pcfg = PRIORIDAD_CONFIG[registro.prioridad] || {};
        return (
            <div className="corr-container">
                {/* Barra superior con botón volver */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.6rem' }}>
                    <button className="corr-btn-volver" onClick={() => { setVista('lista'); setRegistro(null); }}>
                        <i className="bi bi-arrow-left" /> Volver a la lista
                    </button>
                </div>

                {/* Banner detalle */}
                <div className="corr-form-banner" style={{ marginBottom: 0, borderRadius: '12px 12px 0 0' }}>
                    <div className="corr-form-banner-icon">
                        <i className="bi bi-envelope-open-fill" />
                    </div>
                    <div className="corr-form-banner-texto" style={{ flex: 1 }}>
                        <h3>{registro.noTurno}</h3>
                        <p>Detalle del registro de correspondencia</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span className={`corr-badge corr-badge-banner ${cfg.clase}`}>{cfg.label}</span>
                        <span className={`corr-prior-badge ${pcfg.clase}`}>{pcfg.label}</span>
                    </div>
                </div>

                <div className="corr-form-card" style={{ borderRadius: '0 0 12px 12px' }}>
                    {/* Sección identificación */}
                    <div className="corr-detalle-seccion"><span><i className="bi bi-building" /> Identificación</span></div>
                    <div className="corr-detalle-grid">
                        <div className="corr-detalle-campo">
                            <span className="corr-detalle-label"><i className="bi bi-hash" /> No. de Oficio</span>
                            <span className="corr-detalle-valor">{registro.noOficio || '—'}</span>
                        </div>
                        <div className="corr-detalle-campo">
                            <span className="corr-detalle-label"><i className="bi bi-geo-alt" /> Sede</span>
                            <span className="corr-detalle-valor">{registro.sede || '—'}</span>
                        </div>
                        <div className="corr-detalle-campo">
                            <span className="corr-detalle-label"><i className="bi bi-tag" /> Tipo</span>
                            <span className="corr-detalle-valor">{TIPOS.find(t => t.value === registro.tipo)?.label || registro.tipo || '—'}</span>
                        </div>
                        <div className="corr-detalle-campo">
                            <span className="corr-detalle-label"><i className="bi bi-flag" /> Prioridad</span>
                            <span className="corr-detalle-valor">{pcfg.label || registro.prioridad}</span>
                        </div>
                        <div className="corr-detalle-campo">
                            <span className="corr-detalle-label"><i className="bi bi-calendar3" /> Fecha Oficio</span>
                            <span className="corr-detalle-valor">{registro.fechaOficio || '—'}</span>
                        </div>
                        <div className="corr-detalle-campo">
                            <span className="corr-detalle-label"><i className="bi bi-calendar-check" /> Fecha Recibido</span>
                            <span className="corr-detalle-valor">{registro.fechaRecibido || '—'}</span>
                        </div>
                        <div className="corr-detalle-campo">
                            <span className="corr-detalle-label"><i className="bi bi-person" /> Registrado por</span>
                            <span className="corr-detalle-valor">{registro.registradoPorNombre || '—'}</span>
                        </div>
                        <div className="corr-detalle-campo">
                            <span className="corr-detalle-label"><i className="bi bi-person-check" /> Asignado a</span>
                            <span className="corr-detalle-valor">{registro.asignadoANombre || '—'}</span>
                        </div>
                        <div className="corr-detalle-campo">
                            <span className="corr-detalle-label"><i className="bi bi-circle-fill" style={{ fontSize: '8px', verticalAlign: 'middle' }} /> Estado</span>
                            <span className="corr-detalle-valor">
                                <span className={`corr-badge corr-badge-lg ${cfg.clase}`}>{cfg.label}</span>
                            </span>
                        </div>
                    </div>

                    {/* Motivo de cancelación */}
                    {registro.estado === 'CANCELADO' && registro.motivoCancelacion && (
                        <div style={{ margin: '1rem 0', padding: '10px 14px', background: '#f3f4f6', borderRadius: 8, borderLeft: '3px solid #9ca3af' }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 4 }}>
                                <i className="bi bi-x-circle" /> Motivo de cancelación
                            </span>
                            <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{registro.motivoCancelacion}</span>
                        </div>
                    )}

                    {/* Sección contenido */}
                    <div className="corr-detalle-seccion" style={{ marginTop: '1.2rem' }}><span><i className="bi bi-file-text" /> Contenido</span></div>
                    <div className="corr-detalle-campo" style={{ marginBottom: '1rem' }}>
                        <span className="corr-detalle-label"><i className="bi bi-person" /> Remitente</span>
                        <span className="corr-detalle-valor">{registro.remitente || '—'}</span>
                    </div>
                    <div className="corr-detalle-campo corr-detalle-full" style={{ marginBottom: '1rem' }}>
                        <span className="corr-detalle-label"><i className="bi bi-chat-text" /> Asunto</span>
                        <span className="corr-detalle-valor" style={{ lineHeight: 1.6 }}>{registro.asunto || '—'}</span>
                    </div>

                    {/* Requiere respuesta — badge informativo */}
                    <div style={{ marginTop: '0.8rem' }}>
                        <span className={`corr-info-badge ${registro.requiereRespuesta ? 'corr-info-badge-si' : 'corr-info-badge-no'}`}>
                            <i className={`bi ${registro.requiereRespuesta ? 'bi-check-circle-fill' : 'bi-x-circle'}`} />
                            Requiere Término de Respuesta: {registro.requiereRespuesta ? 'SÍ' : 'NO'}
                        </span>
                    </div>

                    {/* Archivo adjunto — botón de acción */}
                    {registro.archivoPdf && (
                        <div style={{ marginTop: '1rem' }}>
                            <button className="corr-btn-pdf-action" onClick={() => abrirArchivo(registro.archivoPdf)} disabled={loadingPdf}>
                                {loadingPdf
                                    ? <><span className="corr-pdf-spinner" /> Cargando...</>
                                    : esImagen(registro.archivoPdf)
                                        ? <><i className="bi bi-file-earmark-image-fill" /> Ver imagen</>
                                        : <><i className="bi bi-file-earmark-pdf-fill" /> Ver documento PDF</>
                                }
                            </button>
                        </div>
                    )}
                </div>

                {/* Pasos de estado para personal */}
                {esPersonal && registro.asignadoAId === user?.id && (() => {
                    const flujo = ['LEIDO', 'EN_ESPERA', 'FINALIZADO'];
                    const etiquetas = { LEIDO: 'Leído', EN_ESPERA: 'En Espera', FINALIZADO: 'Finalizado' };
                    const idxActual = flujo.indexOf(registro.estado);
                    return (
                    <div className="corr-estado-acciones" style={{ marginTop: '1rem' }}>
                        <p className="corr-estado-label">Actualizar estado:</p>
                        <div className="corr-estado-stepper">
                            {flujo.map((paso, idx) => {
                                const completado = idx < idxActual;
                                const actual     = idx === idxActual;
                                const siguiente  = idx === idxActual + 1;
                                return (
                                    <>
                                        {idx > 0 && (
                                            <div key={`line-${paso}`} className={`corr-step-line ${idx <= idxActual ? 'corr-step-line-done' : ''}`} />
                                        )}
                                        <button
                                            key={paso}
                                            className={`corr-step-btn ${completado ? 'corr-step-done' : ''} ${actual ? 'corr-step-actual' : ''} ${siguiente ? 'corr-step-siguiente' : ''}`}
                                            onClick={() => siguiente && handleCambiarEstado(registro, paso)}
                                            disabled={!siguiente}
                                            title={completado ? 'Completado' : actual ? 'Estado actual' : siguiente ? `Pasar a ${etiquetas[paso]}` : 'No disponible aún'}
                                        >
                                            {completado
                                                ? <><i className="bi bi-check-lg" /> {etiquetas[paso]}</>
                                                : actual
                                                    ? <><i className="bi bi-record-circle" /> {etiquetas[paso]}</>
                                                    : <>{etiquetas[paso]}</>
                                            }
                                        </button>
                                    </>
                                );
                            })}
                        </div>
                    </div>
                    );
                })()}

            </div>
        );
    }

    // ── Vista: Lista ────────────────────────────────────────────────────────
    return (
        <div className="corr-container">
            {/* Fila superior: contador + paginación */}
            <div className="corr-header-top">
                <span className="corr-total">
                    Mostrando <strong>{filtrada.length === 0 ? 0 : (pagina - 1) * POR_PAGINA + 1} a {Math.min(pagina * POR_PAGINA, filtrada.length)} de {filtrada.length}</strong> registro{filtrada.length !== 1 ? 's' : ''}
                </span>
                <div className="corr-header-right">
                    <div className="corr-pag-top">
                        <button disabled={pagina === 1} onClick={() => setPagina(p => p - 1)}>‹</button>
                        <span>{pagina} / {totalPags}</span>
                        <button disabled={pagina === totalPags} onClick={() => setPagina(p => p + 1)}>›</button>
                    </div>
                </div>
            </div>
            {/* Alertas de pendientes */}
            {esAdmin && contadores.pendientesAdmin > 0 && (
                <div className="corr-alerta corr-alerta-admin">
                    <i className="bi bi-envelope-exclamation-fill" />
                    <span>
                        Tienes <strong>{contadores.pendientesAdmin}</strong> oficio{contadores.pendientesAdmin !== 1 ? 's' : ''} pendiente{contadores.pendientesAdmin !== 1 ? 's' : ''} por asignar
                    </span>
                </div>
            )}
            {esPersonal && contadores.misAsignados > 0 && (
                <div className="corr-alerta corr-alerta-personal">
                    <i className="bi bi-bell-fill" />
                    <span>
                        Tienes <strong>{contadores.misAsignados}</strong> oficio{contadores.misAsignados !== 1 ? 's' : ''} asignado{contadores.misAsignados !== 1 ? 's' : ''} pendiente{contadores.misAsignados !== 1 ? 's' : ''} de atender
                    </span>
                </div>
            )}

            {/* Barra de búsqueda + contador hoy + botones */}
            <div className="corr-header-search">
                <i className="bi bi-search corr-search-icon" />
                <input
                    className="corr-buscar"
                    placeholder="Buscar por turno, oficio, remitente, asunto o asignado..."
                    value={buscar}
                    onChange={e => { setBuscar(e.target.value); setPagina(1); }}
                />
                <select
                    className="corr-filtro-prioridad"
                    value={filtroPrioridad}
                    onChange={e => { setFiltroPrioridad(e.target.value); setPagina(1); }}
                >
                    <option value="">Todas las prioridades</option>
                    {PRIORIDADES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
                <select
                    className="corr-filtro-prioridad"
                    value={filtroEstado}
                    onChange={e => { setFiltroEstado(e.target.value); setPagina(1); }}
                >
                    <option value="">Todos los estados</option>
                    {Object.entries(ESTADO_CONFIG).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                    ))}
                </select>
                {/* Contador con filtro de periodo — solo admin y correspondencia */}
                {puedeRegistrar && <div className="corr-hoy-wrap" onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setShowContMenu(false); }} tabIndex={-1}>
                    <button className="corr-hoy-badge" onClick={() => setShowContMenu(v => !v)}>
                        <div className="corr-hoy-top">
                            <i className="bi bi-calendar-day" />
                            <span className="corr-hoy-num">{contFiltrado}</span>
                        </div>
                        <div className="corr-hoy-sep" />
                        <div className="corr-hoy-desc">
                            <span className="corr-hoy-desc-top">No. de oficios</span>
                            <span className="corr-hoy-desc-sub">{contLabel}</span>
                        </div>
                        <i className={`bi bi-chevron-${showContMenu ? 'up' : 'down'} corr-hoy-chevron`} />
                    </button>
                    {showContMenu && (
                        <div className="corr-hoy-menu">
                            {[
                                { v: 'hoy',    ico: 'bi-calendar-check', txt: 'Hoy' },
                                { v: 'semana', ico: 'bi-calendar-week',  txt: 'Semana' },
                                { v: 'mes',    ico: 'bi-calendar-month', txt: 'Mes' },
                                { v: 'fecha',  ico: 'bi-calendar3',      txt: 'Fecha específica' },
                            ].map(({ v, ico, txt }) => (
                                <div key={v}>
                                    <button
                                        className={`corr-hoy-opt ${filtroCont === v ? 'corr-hoy-opt-active' : ''}`}
                                        onClick={() => {
                                            setFiltroCont(v);
                                            if (v === 'hoy') setFechaCont(hoyLocal());
                                            if (v !== 'fecha' && v !== 'semana' && v !== 'mes') setShowContMenu(false);
                                        }}>
                                        <i className={`bi ${ico}`} />
                                        {txt}
                                    </button>
                                    {/* Navegador de semana */}
                                    {v === 'semana' && filtroCont === 'semana' && (
                                        <div className="corr-nav-periodo">
                                            <button className="corr-nav-btn" onClick={() => moverSemana(-1)}><i className="bi bi-chevron-left" /></button>
                                            <span className="corr-nav-label">{fmtDia(lunesSemana)} – {fmtDia(domingoSemana)}</span>
                                            <button className="corr-nav-btn" onClick={() => moverSemana(1)}><i className="bi bi-chevron-right" /></button>
                                        </div>
                                    )}
                                    {/* Navegador de mes */}
                                    {v === 'mes' && filtroCont === 'mes' && (
                                        <div className="corr-nav-periodo">
                                            <button className="corr-nav-btn" onClick={() => moverMes(-1)}><i className="bi bi-chevron-left" /></button>
                                            <span className="corr-nav-label">{MESES[refDate.getMonth()]} {refDate.getFullYear()}</span>
                                            <button className="corr-nav-btn" onClick={() => moverMes(1)}><i className="bi bi-chevron-right" /></button>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {filtroCont === 'fecha' && (
                                <div className="corr-hoy-date-wrap">
                                    <input
                                        type="date"
                                        className="corr-hoy-date"
                                        value={fechaCont}
                                        onChange={e => { setFechaCont(e.target.value); setShowContMenu(false); }}
                                        autoFocus
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>}
                {/* Exportar Excel — solo admin y correspondencia */}
                {puedeRegistrar && <button className="corr-btn-exportar" onClick={handleExportar} disabled={exportando} title="Exportar a Excel">
                    {exportando
                        ? <><i className="bi bi-arrow-repeat corr-spin" /> Exportando...</>
                        : <><i className="bi bi-file-earmark-excel" /> Excel</>}
                </button>}
                {puedeRegistrar && (
                    <button className="corr-btn-nuevo" onClick={() => setVista('form')}>
                        <i className="bi bi-plus-lg" /> Nuevo Registro
                    </button>
                )}
            </div>

            {/* Tabla */}
            <div className="corr-tabla-wrap">
                <table className="corr-tabla">
                    <thead>
                        <tr>
                            <th>NO. TURNO</th>
                            <th>FECHA RECIBIDO</th>
                            <th>TIPO</th>
                            <th>REMITENTE</th>
                            <th>ASUNTO</th>
                            <th>TÉRMINO</th>
                            <th>PRIORIDAD</th>
                            {esAdmin && <th>ASIGNADO A</th>}
                            <th>ESTADO</th>
                            <th>ACCIONES</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={esAdmin ? 10 : 9} className="corr-cargando">Cargando...</td></tr>
                        ) : pagActual.length === 0 ? (
                            <tr><td colSpan={esAdmin ? 10 : 9} className="corr-vacio">Sin registros</td></tr>
                        ) : pagActual.map((r) => {
                            const cfg  = ESTADO_CONFIG[r.estado] || {};
                            const pcfg = PRIORIDAD_CONFIG[r.prioridad] || {};
                            const filaRoja = r.requiereRespuesta && r.estado !== 'CANCELADO';
                            const filaPendiente = r.estado === 'PENDIENTE';
                            const filaCancelada = r.estado === 'CANCELADO';
                            const filaSinAsignar = esAdmin && !r.asignadoAId && !filaCancelada;
                            const filaPorAtender = esPersonal && r.estado !== 'FINALIZADO' && !filaCancelada;
                            return (
                                <tr key={r.id} className={`${filaRoja ? 'corr-fila-alerta' : ''} ${filaPendiente ? 'corr-fila-pendiente' : ''} ${filaCancelada ? 'corr-fila-cancelada' : ''} ${filaSinAsignar ? 'corr-fila-sin-asignar' : ''} ${filaPorAtender ? 'corr-fila-por-atender' : ''}`}>
                                    <td className="corr-turno">
                                        <span className="corr-turno-seq">{r.noTurno?.split('-')[2]}</span>
                                    </td>
                                    <td>{r.fechaRecibido || '—'}</td>
                                    <td>{TIPOS.find(t => t.value === r.tipo)?.label || r.tipo || '—'}</td>
                                    <td className="corr-remitente">{r.remitente || '—'}</td>
                                    <td className="corr-asunto">{r.asunto || '—'}</td>
                                    <td>
                                        {r.requiereRespuesta
                                            ? <span className="corr-respuesta-si">SÍ</span>
                                            : <span className="corr-respuesta-no">NO</span>
                                        }
                                    </td>
                                    <td><span className={`corr-prior-badge ${pcfg.clase}`}>{pcfg.label}</span></td>
                                    {esAdmin && (
                                        <td className="corr-asignado-cell">
                                            {r.asignadoANombre
                                                ? <span className="corr-asignado-nombre"><i className="bi bi-person-fill" /> {r.asignadoANombre}</span>
                                                : <span className="corr-asignado-vacio">—</span>
                                            }
                                        </td>
                                    )}
                                    <td><span className={`corr-badge ${cfg.clase}`}>{cfg.label}</span></td>
                                    <td className="corr-acciones">
                                        <button className="corr-btn-ver" title="Ver detalle"
                                            onClick={() => { setRegistro(r); setVista('detalle'); }}>
                                            <i className="bi bi-eye" />
                                        </button>
                                        {esAdmin && r.prioridad !== 'TURNO' && r.prioridad !== 'CIRCULAR' && (
                                            r.asignadoAId ? (
                                                <button className="corr-btn-quitar" title="Quitar asignación"
                                                    onClick={() => handleQuitarAsignacion(r)}>
                                                    <i className="bi bi-person-x" />
                                                </button>
                                            ) : (
                                                <button className="corr-btn-asignar" title="Asignar"
                                                    onClick={() => abrirAsignar(r)}>
                                                    <i className="bi bi-person-check" />
                                                </button>
                                            )
                                        )}
                                        {esAdmin && (
                                            <>
                                                {r.estado !== 'CANCELADO' && (
                                                    <button className="corr-btn-editar" title="Editar"
                                                        onClick={() => abrirEditar(r)}>
                                                        <i className="bi bi-pencil-fill" />
                                                    </button>
                                                )}
                                                {r.estado !== 'CANCELADO' ? (
                                                    <button className="corr-btn-cancelar" title="Cancelar registro"
                                                        onClick={() => abrirCancelar(r)}>
                                                        <i className="bi bi-x-circle-fill" />
                                                    </button>
                                                ) : (
                                                    <button className="corr-btn-revertir" title="Revertir cancelación"
                                                        onClick={async () => {
                                                            try {
                                                                const res = await revertirCancelacionCorrespondencia(r.id);
                                                                if (res.data.ok) { showToast('Cancelación revertida'); cargar(); }
                                                                else showToast(res.data.message || 'Error al revertir', 'error');
                                                            } catch { showToast('Error de conexión', 'error'); }
                                                        }}>
                                                        <i className="bi bi-arrow-counterclockwise" />
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>


            {/* Modal asignación */}
            {showAsigModal && (
                <div className="corr-modal-overlay" onClick={() => !loadingAsig && setShowAsigModal(false)}>
                    <div className="corr-modal-box" onClick={e => e.stopPropagation()}>
                        <div className="corr-modal-icon corr-modal-icon-asig">
                            <i className="bi bi-person-check-fill" />
                        </div>
                        <h3 className="corr-modal-titulo">Asignar correspondencia</h3>

                        {/* Info del oficio */}
                        <div className="corr-modal-info-card">
                            <div className="corr-modal-info-row">
                                <span className="corr-modal-info-label"><i className="bi bi-hash" /> Turno</span>
                                <span className="corr-modal-info-val">{registroAsig?.noTurno?.split('-')[2]}</span>
                            </div>
                            <div className="corr-modal-info-row">
                                <span className="corr-modal-info-label"><i className="bi bi-tag" /> Tipo</span>
                                <span className="corr-modal-info-val">{registroAsig?.tipo}</span>
                            </div>
                            <div className="corr-modal-info-row">
                                <span className="corr-modal-info-label"><i className="bi bi-person" /> Remitente</span>
                                <span className="corr-modal-info-val">{registroAsig?.remitente}</span>
                            </div>
                            <div className="corr-modal-info-row corr-modal-info-row-full">
                                <span className="corr-modal-info-label"><i className="bi bi-chat-left-text" /> Asunto</span>
                                <span className="corr-modal-info-val corr-modal-info-asunto">{registroAsig?.asunto}</span>
                            </div>
                        </div>

                        <label className="corr-modal-select-label">Asignar a:</label>
                        <div className="corr-personal-lista">
                            {personal.map(p => {
                                const pendientes = lista.filter(r =>
                                    r.asignadoAId === p.id && (r.estado === 'PENDIENTE' || r.estado === 'EN_PROCESO')
                                ).length;
                                const seleccionado = String(p.id) === asignadoSel;
                                return (
                                    <div
                                        key={p.id}
                                        className={`corr-personal-opcion ${seleccionado ? 'corr-personal-sel' : ''} ${pendientes > 0 ? 'corr-personal-con-carga' : ''}`}
                                        onClick={() => setAsignadoSel(String(p.id))}
                                    >
                                        <div className="corr-personal-info">
                                            <span className="corr-personal-nombre">
                                                <i className="bi bi-person-fill" /> {p.nombre}
                                            </span>
                                            <span className="corr-personal-sub">
                                                {p.rol === 'SUPERVISION' ? 'Supervisión' : 'Evaluación'}{p.zona ? ` · ${p.zona}` : ''}
                                            </span>
                                        </div>
                                        {pendientes > 0 ? (
                                            <span className="corr-personal-carga corr-personal-carga-activa" title="Registros pendientes asignados">
                                                {pendientes} pendiente{pendientes !== 1 ? 's' : ''}
                                            </span>
                                        ) : (
                                            <span className="corr-personal-carga corr-personal-carga-libre">
                                                Libre
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <div className="corr-modal-acciones">
                            <button className="corr-modal-btn-cancelar" onClick={() => setShowAsigModal(false)} disabled={loadingAsig}>
                                Cancelar
                            </button>
                            <button className="corr-modal-btn-confirmar" onClick={handleAsignar}
                                disabled={loadingAsig || !asignadoSel}>
                                {loadingAsig ? 'Asignando...' : 'Asignar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal confirmar quitar asignación */}
            {showQuitarModal && (
                <div className="corr-modal-overlay" onClick={() => setShowQuitarModal(false)}>
                    <div className="corr-modal-box corr-modal-box-danger" onClick={e => e.stopPropagation()}>
                        <div className="corr-modal-icon corr-modal-icon-danger">
                            <i className="bi bi-person-x-fill"></i>
                        </div>
                        <h3 className="corr-modal-titulo">¿Quitar asignación?</h3>

                        <div className="corr-modal-info-card" style={{ borderColor: '#fca5a5' }}>
                            <div className="corr-modal-info-row">
                                <span className="corr-modal-info-label" style={{ background: '#fee2e2', color: '#b91c1c' }}><i className="bi bi-hash" /> Turno</span>
                                <span className="corr-modal-info-val">{registroQuitar?.noTurno?.split('-')[2]}</span>
                            </div>
                            <div className="corr-modal-info-row">
                                <span className="corr-modal-info-label" style={{ background: '#fee2e2', color: '#b91c1c' }}><i className="bi bi-person-fill" /> Asignado</span>
                                <span className="corr-modal-info-val">{registroQuitar?.asignadoANombre}</span>
                            </div>
                            <div className="corr-modal-info-row corr-modal-info-row-full">
                                <span className="corr-modal-info-label" style={{ background: '#fee2e2', color: '#b91c1c' }}><i className="bi bi-chat-left-text" /> Asunto</span>
                                <span className="corr-modal-info-asunto">{registroQuitar?.asunto}</span>
                            </div>
                        </div>

                        <p className="corr-modal-desc" style={{ fontSize: '0.82rem', marginBottom: '0.5rem' }}>
                            El oficio quedará sin personal asignado y regresará a estado <strong>Pendiente</strong>.
                        </p>
                        <div className="corr-modal-acciones">
                            <button className="corr-modal-btn-cancelar" onClick={() => setShowQuitarModal(false)}>
                                Cancelar
                            </button>
                            <button className="corr-modal-btn-danger" onClick={confirmarQuitarAsignacion}>
                                Sí, quitar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        {/* Modal eliminar */}
            {/* ── Modal Cancelar ── */}
            {showCancelarModal && (
                <div className="corr-modal-overlay">
                    <div className="corr-modal-box corr-modal-box-danger" style={{ borderTop: '4px solid #6b7280', maxWidth: 480 }}>
                        {/* Header gris */}
                        <div className="corr-modal-danger-header" style={{ background: 'linear-gradient(135deg,#f3f4f6,#e5e7eb)', borderRadius: '8px 8px 0 0' }}>
                            <div className="corr-modal-danger-icon" style={{ background: '#fff', color: '#4b5563', boxShadow: '0 2px 8px rgba(0,0,0,0.10)' }}>
                                <i className="bi bi-x-circle-fill" style={{ fontSize: 22 }} />
                            </div>
                            <div>
                                <h3 className="corr-modal-danger-titulo" style={{ color: '#1f2937' }}>Cancelar registro</h3>
                                <p className="corr-modal-danger-sub" style={{ color: '#6b7280' }}>El registro cambiará a estado <strong>Cancelado</strong></p>
                            </div>
                        </div>

                        <div className="corr-modal-danger-body">
                            {/* Card info registro */}
                            <div className="corr-modal-danger-card" style={{ marginBottom: 18 }}>
                                <div className="corr-modal-danger-row">
                                    <span className="corr-modal-danger-lbl"><i className="bi bi-hash" /> No. Turno</span>
                                    <span className="corr-modal-danger-val corr-modal-danger-turno">{registroCancelar?.noTurno || '—'}</span>
                                </div>
                                <div className="corr-modal-danger-divider" />
                                <div className="corr-modal-danger-row corr-modal-danger-row-col">
                                    <span className="corr-modal-danger-lbl"><i className="bi bi-chat-left-text" /> Asunto</span>
                                    <span className="corr-modal-danger-val">{registroCancelar?.asunto || '—'}</span>
                                </div>
                                {registroCancelar?.remitente && (<>
                                    <div className="corr-modal-danger-divider" />
                                    <div className="corr-modal-danger-row corr-modal-danger-row-col">
                                        <span className="corr-modal-danger-lbl"><i className="bi bi-person" /> Remitente</span>
                                        <span className="corr-modal-danger-val">{registroCancelar.remitente}</span>
                                    </div>
                                </>)}
                            </div>

                            {/* Campo motivo */}
                            <div style={{ background: '#fafafa', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 16px', marginBottom: 24 }}>
                                <label style={{ fontSize: 11, fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                    <i className="bi bi-pencil-square" style={{ color: '#6b7280' }} />
                                    Motivo de cancelación <span style={{ color: '#dc2626' }}>*</span>
                                </label>
                                <textarea
                                    autoFocus
                                    rows={3}
                                    value={motivoCancelar}
                                    onChange={e => { setMotivoCancelar(e.target.value); if (e.target.value.trim()) setMotivoError(''); }}
                                    placeholder="Describe el motivo por el que se cancela este registro..."
                                    style={{ width: '100%', borderRadius: 7, border: motivoError ? '1.5px solid #dc2626' : '1.5px solid #d1d5db', padding: '9px 11px', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', background: '#fff', outline: 'none', lineHeight: 1.5 }}
                                />
                                {motivoError
                                    ? <span style={{ fontSize: 12, color: '#dc2626', marginTop: 5, display: 'flex', alignItems: 'center', gap: 4 }}><i className="bi bi-exclamation-circle-fill" /> {motivoError}</span>
                                    : <span style={{ fontSize: 11, color: '#9ca3af', marginTop: 5, display: 'block' }}>Mínimo 10 caracteres recomendados</span>
                                }
                            </div>

                            {/* Separador */}
                            <div style={{ height: 1, background: '#e5e7eb', margin: '0 0 20px' }} />

                            {/* Acciones */}
                            <div className="corr-modal-acciones">
                                <button className="corr-modal-btn-cancelar" onClick={() => setShowCancelarModal(false)} disabled={loadingCancelar}
                                    style={{ flex: 1 }}>
                                    <i className="bi bi-x-lg" /> Cerrar
                                </button>
                                <button onClick={handleCancelar} disabled={loadingCancelar}
                                    style={{ flex: 1.4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '9px 16px', borderRadius: 8, border: 'none', background: loadingCancelar ? '#9ca3af' : '#4b5563', color: '#fff', fontWeight: 700, fontSize: 13, cursor: loadingCancelar ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}>
                                    {loadingCancelar
                                        ? <><i className="bi bi-hourglass-split" /> Cancelando...</>
                                        : <><i className="bi bi-x-circle-fill" /> Confirmar cancelación</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showEliminarModal && (
                <div className="corr-modal-overlay">
                    <div className="corr-modal-box corr-modal-box-danger">
                        {/* Header rojo */}
                        <div className="corr-modal-danger-header">
                            <div className="corr-modal-danger-icon">
                                <i className="bi bi-trash3-fill" />
                            </div>
                            <div>
                                <h3 className="corr-modal-danger-titulo">Eliminar registro</h3>
                                <p className="corr-modal-danger-sub">Esta acción es permanente y no se puede deshacer</p>
                            </div>
                        </div>

                        {/* Cuerpo */}
                        <div className="corr-modal-danger-body">
                            <p className="corr-modal-danger-aviso">
                                <i className="bi bi-exclamation-triangle-fill" /> Estás a punto de eliminar el siguiente registro del sistema:
                            </p>

                            <div className="corr-modal-danger-card">
                                <div className="corr-modal-danger-row">
                                    <span className="corr-modal-danger-lbl"><i className="bi bi-hash" /> No. Turno</span>
                                    <span className="corr-modal-danger-val corr-modal-danger-turno">{registroEliminar?.noTurno || '—'}</span>
                                </div>
                                <div className="corr-modal-danger-divider" />
                                <div className="corr-modal-danger-row corr-modal-danger-row-col">
                                    <span className="corr-modal-danger-lbl"><i className="bi bi-chat-left-text" /> Asunto</span>
                                    <span className="corr-modal-danger-val">{registroEliminar?.asunto || '—'}</span>
                                </div>
                                {registroEliminar?.remitente && (
                                    <>
                                        <div className="corr-modal-danger-divider" />
                                        <div className="corr-modal-danger-row corr-modal-danger-row-col">
                                            <span className="corr-modal-danger-lbl"><i className="bi bi-person" /> Remitente</span>
                                            <span className="corr-modal-danger-val">{registroEliminar.remitente}</span>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="corr-modal-acciones">
                                <button className="corr-modal-btn-cancelar" onClick={() => setShowEliminarModal(false)} disabled={loadingEliminar}>
                                    <i className="bi bi-x-lg" /> Cancelar
                                </button>
                                <button className="corr-modal-btn-danger" onClick={handleEliminar} disabled={loadingEliminar}>
                                    {loadingEliminar
                                        ? <><i className="bi bi-hourglass-split" /> Eliminando...</>
                                        : <><i className="bi bi-trash3-fill" /> Sí, eliminar</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
