import { useState, useEffect, useCallback } from 'react';
import { registrarSeguimiento, getSeguimientosPorImputado, eliminarSeguimiento, TIPOS_ACTIVIDAD } from '../api/seguimientosApi';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from './ConfirmModal';
import './SeguimientosPanel.css';

const SECCION_LABEL = {
    MEDIDA:      'Medidas',
    ENTREVISTA:  'Entrevista',
    EVALUACION:  'Evaluación',
    EXPEDIENTE:  'Expediente',
};

const SECCION_COLOR = {
    MEDIDA:      '#1a3a5c',
    ENTREVISTA:  '#2d6a4f',
    EVALUACION:  '#7b3f00',
    EXPEDIENTE:  '#4a4a4a',
};

export default function SeguimientosPanel({
    imputadoId,
    seccion,        // 'MEDIDA' | 'ENTREVISTA' | 'EVALUACION' | 'EXPEDIENTE'
    referenciaId,   // medidaId | entrevistaId | evaluacionId
    readonly = false,
    onAdded,        // callback opcional para notificar al padre
}) {
    const { showToast } = useToast();
    const { user } = useAuth();

    // Filtra los tipos de actividad según el rol + módulos extra del usuario
    const tiposFiltrados = (() => {
        const rol = user?.rol;
        if (rol === 'SUPERADMIN' || rol === 'ADMINISTRADOR')
            return TIPOS_ACTIVIDAD;

        const grupos = new Set();
        // Grupos base por rol
        if (rol === 'SUPERVISION')
            grupos.add('SUPERVISIÓN');
        if (rol === 'CORRESPONDENCIA')
            grupos.add('CORRESPONDENCIA');

        // Grupos extra por módulos habilitados con crear/editar
        const extras = user?.modulosExtra || [];
        const tieneExtra = (modulo) => extras.some(m => m.modulo === modulo && (m.puedeCrear || m.puedeEditar));
        if (tieneExtra('MEDIDAS') || tieneExtra('SUPERVISION'))
            grupos.add('SUPERVISIÓN');
        if (tieneExtra('CORRESPONDENCIA'))
            grupos.add('CORRESPONDENCIA');

        if (grupos.size === 0) return TIPOS_ACTIVIDAD;
        return TIPOS_ACTIVIDAD.filter(t => grupos.has(t.grupo));
    })();
    const [lista, setLista]           = useState([]);
    const [loading, setLoading]       = useState(true);
    const [mostrarForm, setMostrarForm] = useState(false);
    const [guardando, setGuardando]   = useState(false);
    const [form, setForm] = useState({ tipoActividad: '', otroTipo: '', detalles: '' });
    const [verTodos, setVerTodos]     = useState(false);
    const [confirmEliminar, setConfirmEliminar] = useState(null); // id del seguimiento a eliminar
    const [eliminando, setEliminando] = useState(false);
    const LIMITE = 3;

    const handleEliminar = async () => {
        if (!confirmEliminar) return;
        setEliminando(true);
        try {
            const res = await eliminarSeguimiento(confirmEliminar);
            if (res.data.ok) {
                setLista(prev => prev.filter(s => s.id !== confirmEliminar));
                showToast('Seguimiento eliminado');
                onAdded?.();
            } else showToast(res.data.message || 'Error al eliminar', 'error');
        } catch { showToast('Error de conexión', 'error'); }
        finally {
            setEliminando(false);
            setConfirmEliminar(null);
        }
    };

    const cargar = useCallback(async () => {
        if (!imputadoId) return;
        setLoading(true);
        try {
            const res = await getSeguimientosPorImputado(imputadoId);
            setLista(res.data?.data || []);
        } catch {
            setLista([]);
        } finally {
            setLoading(false);
        }
    }, [imputadoId]);

    useEffect(() => { cargar(); }, [cargar]);

    const handleGuardar = async () => {
        if (!form.tipoActividad) { showToast('Selecciona un tipo de actividad', 'error'); return; }
        const esOtro = form.tipoActividad === 'OTRO' || form.tipoActividad === 'OTRO_SUPERVISION';
        if (esOtro && !form.otroTipo?.trim()) {
            showToast('Especifica qué tipo de actividad es', 'error'); return;
        }
        if (!form.detalles?.trim()) { showToast('Agrega los detalles del seguimiento', 'error'); return; }
        setGuardando(true);
        // Si es OTRO, anteponer el tipo especificado a los detalles
        const detallesFinales = esOtro
            ? `[${form.otroTipo.trim()}] ${form.detalles}`
            : form.detalles;
        try {
            const dto = {
                imputadoId,
                tipoActividad: form.tipoActividad,
                seccion,
                detalles: detallesFinales,
                medidaId:      seccion === 'MEDIDA'      ? referenciaId : null,
                entrevistaId:  seccion === 'ENTREVISTA'  ? referenciaId : null,
                evaluacionId:  seccion === 'EVALUACION'  ? referenciaId : null,
            };
            await registrarSeguimiento(dto);
            showToast('Seguimiento registrado');
            setForm({ tipoActividad: '', otroTipo: '', detalles: '' });
            setMostrarForm(false);
            cargar();
            onAdded?.();
        } catch {
            showToast('Error al registrar el seguimiento', 'error');
        } finally {
            setGuardando(false);
        }
    };

    // Agrupar opciones por grupo para el select
    const grupos = [...new Set(tiposFiltrados.map(t => t.grupo))];

    return (
        <>
        <div className="sp-panel">
            <div className="sp-header">
                <span className="sp-titulo">
                    <i className="bi bi-clock-history" /> Seguimientos
                    <span className="sp-count">{lista.length}</span>
                </span>
                {!readonly && (
                    <button className="sp-btn-add" onClick={() => setMostrarForm(!mostrarForm)}>
                        <i className={`bi bi-${mostrarForm ? 'x-lg' : 'plus-lg'}`} />
                        {mostrarForm ? 'Cancelar' : 'Agregar'}
                    </button>
                )}
            </div>

            {mostrarForm && (
                <div className="sp-form">
                    <div className="sp-form-row">
                        <label>Tipo de actividad *</label>
                        <select
                            value={form.tipoActividad}
                            onChange={e => setForm({ ...form, tipoActividad: e.target.value, otroTipo: '' })}
                        >
                            <option value="">— Selecciona —</option>
                            {grupos.map(g => (
                                <optgroup key={g} label={g}>
                                    {tiposFiltrados.filter(t => t.grupo === g).map(t => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                    </div>
                    {(form.tipoActividad === 'OTRO' || form.tipoActividad === 'OTRO_SUPERVISION') && (
                        <div className="sp-form-row">
                            <label>Especifica cuál *</label>
                            <input
                                type="text"
                                placeholder="Ej: Oficio de autorización, Acuerdo interno..."
                                value={form.otroTipo}
                                onChange={e => setForm({ ...form, otroTipo: e.target.value })}
                                className="sp-input-otro"
                            />
                        </div>
                    )}
                    <div className="sp-form-row">
                        <label>Detalles *</label>
                        <textarea
                            rows={3}
                            placeholder="Describe el seguimiento realizado..."
                            value={form.detalles}
                            onChange={e => setForm({ ...form, detalles: e.target.value })}
                        />
                    </div>
                    <div className="sp-form-actions">
                        <button className="sp-btn-save" onClick={handleGuardar} disabled={guardando}>
                            <i className="bi bi-floppy" /> {guardando ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                </div>
            )}

            <div className="sp-lista">
                {loading ? (
                    <p className="sp-empty">Cargando...</p>
                ) : lista.length === 0 ? (
                    <p className="sp-empty">Sin seguimientos registrados.</p>
                ) : (
                    <>
                        {(verTodos ? lista : lista.slice(0, LIMITE)).map(s => (
                            <div key={s.id} className="sp-item">
                                <div className="sp-item-header">
                                    <span
                                        className="sp-seccion-badge"
                                        style={{ background: SECCION_COLOR[s.seccion] || '#555' }}
                                    >
                                        {SECCION_LABEL[s.seccion] || s.seccion}
                                    </span>
                                    <span className="sp-tipo">{s.tipoActividadLabel}</span>
                                    <span className="sp-fecha">
                                        {s.fechaRegistro
                                            ? new Date(s.fechaRegistro).toLocaleString('es-MX', {
                                                day: '2-digit', month: '2-digit', year: 'numeric',
                                                hour: '2-digit', minute: '2-digit'
                                              })
                                            : '—'}
                                    </span>
                                </div>
                                <p className="sp-detalles">
                                    {(() => {
                                        const match = s.detalles?.match(/^\[([^\]]+)\]\s*([\s\S]*)$/);
                                        if (match) return (
                                            <>
                                                <span className="sp-detalles-otro-tag">{match[1]}</span>
                                                {match[2] && <span> {match[2]}</span>}
                                            </>
                                        );
                                        return s.detalles;
                                    })()}
                                </p>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <p className="sp-autor" style={{ margin: 0 }}>
                                        <i className="bi bi-person-fill" /> {s.registradoPor || '—'}
                                    </p>
                                    {user?.rol === 'SUPERADMIN' && (
                                        <button onClick={() => setConfirmEliminar(s.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem', padding: '1px 4px', borderRadius: 4 }} title="Eliminar seguimiento">
                                            <i className="bi bi-trash3" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                        {lista.length > LIMITE && (
                            <div
                                onClick={() => setVerTodos(v => !v)}
                                style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, cursor: 'pointer', userSelect: 'none' }}
                            >
                                <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
                                <span style={{ fontSize: '0.73rem', fontWeight: 600, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                                    {verTodos ? 'Ver menos' : `${lista.length - LIMITE} más`}
                                </span>
                                <i className={`bi bi-chevron-${verTodos ? 'up' : 'down'}`} style={{ fontSize: '0.7rem', color: '#94a3b8' }} />
                                <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>

        {confirmEliminar && (
            <ConfirmModal
                titulo="¿Eliminar seguimiento?"
                mensaje="Esta acción es permanente y no se puede deshacer."
                onConfirmar={handleEliminar}
                onCancelar={() => setConfirmEliminar(null)}
                cargando={eliminando}
            />
        )}
        </>
    );
}
