import { useState, useEffect, useCallback } from 'react';
import { registrarSeguimiento, getSeguimientosPorImputado, TIPOS_ACTIVIDAD } from '../api/seguimientosApi';
import { useToast } from '../context/ToastContext';
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
}) {
    const { showToast } = useToast();
    const [lista, setLista]           = useState([]);
    const [loading, setLoading]       = useState(true);
    const [mostrarForm, setMostrarForm] = useState(false);
    const [guardando, setGuardando]   = useState(false);
    const [form, setForm] = useState({ tipoActividad: '', otroTipo: '', detalles: '' });

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
        if (form.tipoActividad === 'OTRO' && !form.otroTipo?.trim()) {
            showToast('Especifica qué tipo de actividad es', 'error'); return;
        }
        if (!form.detalles?.trim()) { showToast('Agrega los detalles del seguimiento', 'error'); return; }
        setGuardando(true);
        // Si es OTRO, anteponer el tipo especificado a los detalles
        const detallesFinales = form.tipoActividad === 'OTRO'
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
        } catch {
            showToast('Error al registrar el seguimiento', 'error');
        } finally {
            setGuardando(false);
        }
    };

    // Agrupar opciones por grupo para el select
    const grupos = [...new Set(TIPOS_ACTIVIDAD.map(t => t.grupo))];

    return (
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
                                    {TIPOS_ACTIVIDAD.filter(t => t.grupo === g).map(t => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                    </div>
                    {form.tipoActividad === 'OTRO' && (
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
                    lista.map(s => (
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
                            <p className="sp-detalles">{s.detalles}</p>
                            <p className="sp-autor">
                                <i className="bi bi-person-fill" /> {s.registradoPor || '—'}
                            </p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
