import { useState, useEffect } from 'react';
import { crearMedida, actualizarMedida, getMedidasByImputado } from '../api/medidasApi';
import { useAuth } from '../context/AuthContext';
import { useFormGuard } from '../context/FormGuardContext';
import './FormularioMedida.css';

// ── Condiciones SCP (Art.192) ─────────────────────────────────────────────────
const FRACCIONES_SCP = [
    { key: 'I',    nombre: 'Residir en Lugar Determinado',       desc: 'Residir en un lugar determinado' },
    { key: 'II',   nombre: 'Frecuentar o Evitar Lugares/Personas', desc: 'Frecuentar o dejar de frecuentar determinados lugares o personas' },
    { key: 'III',  nombre: 'Abstenerse de Consumir Sustancias',  desc: 'Abstenerse de consumir drogas o estupefacientes o de abusar de las bebidas alcohólicas' },
    { key: 'IV',   nombre: 'Programas de Prevención',            desc: 'Participar en programas especiales para la prevención y el tratamiento de adicciones' },
    { key: 'V',    nombre: 'Aprender Profesión u Oficio',        desc: 'Aprender una profesión u oficio o seguir cursos de capacitación en el lugar o la institución que determine el Juez de control' },
    { key: 'VI',   nombre: 'Servicio Social',                    desc: 'Prestar servicio social a favor del Estado o de instituciones de beneficencia pública' },
    { key: 'VII',  nombre: 'Tratamiento Médico/Psicológico',     desc: 'Someterse a tratamiento médico o psicológico, de preferencia en instituciones públicas' },
    { key: 'VIII', nombre: 'Tener Empleo',                       desc: 'Tener un trabajo o empleo, o adquirir, en el plazo que el Juez determine, un oficio, arte, industria o profesión' },
    { key: 'IX',   nombre: 'Vigilancia Judicial',                desc: 'Someterse a la vigilancia que determine el Juez de control' },
    { key: 'X',    nombre: 'No Poseer Armas',                    desc: 'No poseer ni portar armas' },
    { key: 'XI',   nombre: 'No Conducir Vehículos',              desc: 'No conducir vehículos' },
    { key: 'XII',  nombre: 'No Viajar al Extranjero',            desc: 'Abstenerse de viajar al extranjero' },
    { key: 'XIII', nombre: 'Obligaciones Alimentarias',          desc: 'Cumplir con los deberes de deudor alimentario' },
    { key: 'XIV',  nombre: 'Otras Condiciones',                  desc: 'Cualquier otra condición que, a juicio del Juez de control, logre una efectiva tutela de los derechos de la víctima' },
];

// ── Campos adicionales por condición SCP ────────────────────────────────────
const DETALLES_SCP = {
    I:    [{ key: 'domicilioResidencia', label: 'Domicilio donde debe residir', type: 'textarea', full: true }, { key: 'municipio', label: 'Municipio' }, { key: 'estado', label: 'Estado' }],
    II:   [{ key: 'lugaresEvitar', label: 'Lugares que debe evitar frecuentar', type: 'textarea', full: true }, { key: 'personasEvitar', label: 'Personas que debe evitar', type: 'textarea', full: true }],
    III:  [{ key: 'sustanciasProhibidas', label: 'Sustancias prohibidas (especificar)', type: 'textarea', full: true }],
    IV:   [
        { key: 'programaAsignado', label: 'Programa o institución asignada', full: true },
        { key: 'frecuencia',       label: 'Frecuencia de asistencia' },
        { key: 'esTTA',            label: '¿Pertenece al programa TTA?', type: 'checkbox' },
    ],
    V:    [],
    VI:   [
        { key: 'institucionServicio', label: 'Institución beneficiaria', full: true },
        { key: 'horasSemanales',      label: 'Horas semanales', type: 'number' },
        { key: 'duracion',            label: 'Duración total' },
    ],
    VII:  [
        { key: 'tipoTratamiento',       label: 'Tipo de tratamiento' },
        { key: 'institucionTratamiento', label: 'Institución', full: true },
        { key: 'frecuenciaCitas',        label: 'Frecuencia de citas' },
    ],
    VIII: [
        { key: 'nombreEmpresa',    label: 'Nombre del empleo o empresa', full: true },
        { key: 'domicilioTrabajo', label: 'Domicilio del trabajo', full: true },
        { key: 'horarioTrabajo',   label: 'Horario de trabajo', placeholder: 'Ej: Lunes a Viernes 8:00 – 17:00' },
    ],
    IX:   [
        { key: 'tipoVigilancia', label: 'Tipo o modalidad de vigilancia', full: true, placeholder: 'Ej: Presentación semanal ante el supervisor' },
    ],
    X:    [],
    XI:   [],
    XII:  [],
    XIII: [
        { key: 'montoPension',  label: 'Monto de pensión ($)', type: 'number' },
        { key: 'beneficiarios', label: 'Beneficiarios', full: true },
    ],
    XIV:  [
        { key: 'descripcionOtraCondicion', label: 'Descripción de la condición', type: 'textarea', full: true },
    ],
};

const FORM_BASE = {
    // procesales
    fechaRecepcion: '', delito: '', modalidad: '', sede: '', nombreJuez: '',
    delitosJson: '',
    fechaFormulacion: '', fechaVinculacionProceso: '', fechaEntrevistaEvaluacion: '',
    // SCP
    fechaImposicionScp: '', plazoScp: '', presentacionPeriodica: '',
    tieneCanalizacion: false, canalizacion: '', tipoServicio: '', fechaCanalizacion: '', canalizacionObservaciones: '',
    descripcionInforme: '',
    fechaInformeFinal: '', vencimientoPlazo: '', tieneSobreseimiento: false, oficioSobreseimiento: '', responsableCierre: '',
    estatusFinal: '',
    // conclusión
    advertencia: '', observaciones: '', responsableSeguimiento: '',
    observacionesGenerales: '', vigenciaInicio: '', vigenciaFin: '',
    estado: 'ACTIVO',
};

// ── helpers ───────────────────────────────────────────────────────────────────
const Field = ({ label, children, full, err, id }) => (
    <div id={id} className={`fm-field${full ? ' fm-field-full' : ''}${err ? ' fm-field-error' : ''}`}>
        <label>{label}</label>
        {children}
        {err && <span className="fm-campo-error-msg">Este campo es obligatorio</span>}
    </div>
);

const Seccion = ({ titulo }) => (
    <div className="fm-seccion">
        <h3>{titulo}</h3>
    </div>
);

// ── Componente principal ──────────────────────────────────────────────────────
const FormularioSCP = ({ medidaInicial, onVolver, onGuardado }) => {
    const esEdicion = !!medidaInicial?.id;
    const { user } = useAuth();
    const { setFormDirty } = useFormGuard();

    useEffect(() => { setFormDirty(true); return () => setFormDirty(false); }, []);

    const [form, setForm] = useState(() => {
        if (medidaInicial) {
            const sanitized = Object.fromEntries(
                Object.entries({ ...FORM_BASE, ...medidaInicial })
                    .map(([k, v]) => {
                        if (k === 'tieneSobreseimiento') return [k, !!v];
                        if (k === 'tieneCanalizacion') return [k, !!v];
                        return [k, v === null ? '' : v];
                    })
            );
            return sanitized;
        }
        return { ...FORM_BASE };
    });

    const [delitos, setDelitos] = useState(() => {
        try {
            const parsed = JSON.parse(medidaInicial?.delitosJson || '[]');
            return parsed.length > 0 ? parsed : [{ delito: medidaInicial?.delito || '', modalidad: medidaInicial?.modalidad || '' }];
        } catch {
            return [{ delito: medidaInicial?.delito || '', modalidad: medidaInicial?.modalidad || '' }];
        }
    });

    const setDelito = (i, key, val) => {
        const arr = [...delitos];
        arr[i] = { ...arr[i], [key]: val };
        setDelitos(arr);
    };
    const agregarDelito = () => setDelitos([...delitos, { delito: '', modalidad: '' }]);
    const quitarDelito  = (i) => setDelitos(delitos.filter((_, idx) => idx !== i));

    const [fracciones, setFracciones] = useState(() => medidaInicial?.fracciones || []);
    const [detalles, setDetalles] = useState(() => {
        try { return JSON.parse(medidaInicial?.detallesFracciones || '{}'); }
        catch { return {}; }
    });
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');
    const [errores, setErrores] = useState({});
    const [errorFraccion, setErrorFraccion] = useState(false);
    const [antecedentes, setAntecedentes] = useState([]);
    const [tieneDraft, setTieneDraft] = useState(false);
    const [draftGuardadoEn, setDraftGuardadoEn] = useState(null);

    const draftKey = esEdicion
        ? `umeca-draft-scp-${medidaInicial.id}`
        : `umeca-draft-scp-nuevo-${medidaInicial?.imputadoId || ''}`;

    const formTieneContenido = (f) => f && Object.values(f).some(v =>
        v !== null && v !== undefined && v !== '' && v !== false &&
        !(Array.isArray(v) && v.every(x => x === '' || x === null || x === false))
    );

    const borrarDraft = () => {
        localStorage.removeItem(draftKey);
        localStorage.removeItem(draftKey + '-meta');
        setTieneDraft(false);
        setDraftGuardadoEn(null);
    };

    const recuperarDraft = () => {
        try {
            const raw = localStorage.getItem(draftKey);
            if (!raw) return;
            const { form: f, delitos: d, fracciones: fr, detalles: det } = JSON.parse(raw);
            setForm(f);
            if (d) setDelitos(d);
            if (fr) setFracciones(fr);
            if (det) setDetalles(det);
            setTieneDraft(false);
        } catch { borrarDraft(); }
    };

    // Auto-fill responsableSeguimiento con el usuario logueado (solo en nuevos registros)
    useEffect(() => {
        if (!esEdicion && user) {
            const nombreCompleto = [user.nombre, user.apPaterno, user.apMaterno].filter(Boolean).join(' ');
            if (nombreCompleto) setForm(f => ({ ...f, responsableSeguimiento: nombreCompleto }));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    useEffect(() => {
        const raw = localStorage.getItem(draftKey);
        const meta = localStorage.getItem(draftKey + '-meta');
        if (!raw) return;
        try {
            const parsed = JSON.parse(raw);
            if (formTieneContenido(parsed.form)) { setTieneDraft(true); setDraftGuardadoEn(meta); }
            else { localStorage.removeItem(draftKey); localStorage.removeItem(draftKey + '-meta'); }
        } catch { localStorage.removeItem(draftKey); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!formTieneContenido(form)) return;
        const draft = { form, delitos, fracciones, detalles };
        localStorage.setItem(draftKey, JSON.stringify(draft));
        const ahora = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
        localStorage.setItem(draftKey + '-meta', ahora);
        setDraftGuardadoEn(ahora);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form, delitos, fracciones, detalles]);

    useEffect(() => {
        const imputadoId = medidaInicial?.imputadoId;
        if (!imputadoId || esEdicion) return;
        getMedidasByImputado(imputadoId)
            .then(res => { if (res.data.ok) setAntecedentes(res.data.data || []); })
            .catch(err => console.warn('Error al cargar antecedentes:', err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

    const toggleFraccion = (key) => {
        setFracciones(prev => {
            const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key];
            if (next.length > 0) setErrorFraccion(false);
            return next;
        });
    };

    const setDetalle = (fracKey, fieldKey, val) => {
        setDetalles(prev => ({
            ...prev,
            [fracKey]: { ...(prev[fracKey] || {}), [fieldKey]: val },
        }));
    };

    const nullifyEmpty = (obj) => Object.fromEntries(
        Object.entries(obj).map(([k, v]) => [k, v === '' ? null : v])
    );

    const handleGuardar = async () => {
        const primerDelitoVacio = !delitos[0]?.delito;
        const nuevosErrores = {
            delito:         primerDelitoVacio,
            fechaRecepcion: !form.fechaRecepcion,
        };
        setErrores(nuevosErrores);

        const hayErrorCampo    = Object.values(nuevosErrores).some(Boolean);
        const hayErrorFraccion = fracciones.length === 0;

        setErrorFraccion(hayErrorFraccion);
        if (hayErrorCampo || hayErrorFraccion) {
            setError(
                hayErrorFraccion
                    ? 'Debe seleccionar al menos una condición'
                    : 'Por favor completa todos los campos obligatorios marcados en rojo'
            );
            const primerError = Object.keys(nuevosErrores).find(k => nuevosErrores[k]);
            if (primerError) {
                const el = document.getElementById(`fm-${primerError}`);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                const el = document.getElementById('fm-fracciones');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }
        if ((form.canalizacionObservaciones || '').length > 700) {
            setError('Las observaciones de canalización exceden el límite de 700 caracteres. Reduce el texto para continuar.');
            return;
        }
        setErrores({});
        setGuardando(true);
        setError('');

        const payload = {
            ...nullifyEmpty(form),
            delito:    delitos[0]?.delito    || null,
            modalidad: delitos[0]?.modalidad || null,
            delitosJson: JSON.stringify(delitos),
            imputadoId: medidaInicial?.imputadoId || null,
            entrevistaId: medidaInicial?.entrevistaId || null,
            causaPenal: medidaInicial?.causaPenal,
            tipo: 'SUSPENSION_CONDICIONAL',
            medidaOrigenId: medidaInicial?.medidaOrigenId || null,
            fracciones,
            detallesFracciones: JSON.stringify(detalles),
        };
        try {
            if (esEdicion) {
                await actualizarMedida(medidaInicial.id, payload);
            } else {
                await crearMedida(payload);
            }
            borrarDraft();
            setFormDirty(false);
            onGuardado?.();
        } catch (e) {
            setError(e.response?.data?.message || 'Error al guardar');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="fm-container">
            {/* Topbar */}
            <div className="fm-topbar">
                <button className="fm-btn-volver" onClick={() => { setFormDirty(false); onVolver?.(); }}>
                    <i className="bi bi-arrow-left" /> Cancelar y Volver
                </button>
                <span className="fm-topbar-titulo">SUSPENSIÓN CONDICIONAL DEL PROCESO (S.C.P.)</span>
                <span className="fm-topbar-sub">Vinculado a la Entrevista de Encuadre</span>
            </div>

            {/* Banner borrador */}
            {tieneDraft && (
                <div style={{ background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 8, padding: '10px 18px', margin: '12px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: 13 }}>
                    <span style={{ color: '#7b5e00' }}>
                        <i className="bi bi-floppy2-fill" style={{ marginRight: 6 }} />
                        Tienes un borrador guardado {draftGuardadoEn ? `a las ${draftGuardadoEn}` : ''}. ¿Deseas recuperarlo?
                    </span>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={recuperarDraft} style={{ background: '#f9a825', border: 'none', color: '#fff', borderRadius: 6, padding: '5px 14px', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}>
                            <i className="bi bi-arrow-counterclockwise" /> Recuperar
                        </button>
                        <button onClick={borrarDraft} style={{ background: 'none', border: '1px solid #ccc', borderRadius: 6, padding: '5px 14px', cursor: 'pointer', fontSize: 12, color: '#666' }}>
                            Descartar
                        </button>
                    </div>
                </div>
            )}

            {/* Indicador auto-guardado */}
            {draftGuardadoEn && !tieneDraft && (
                <div style={{ textAlign: 'right', fontSize: 11, color: '#888', padding: '4px 28px 0' }}>
                    <i className="bi bi-cloud-check" style={{ marginRight: 4, color: '#4caf50' }} />
                    Borrador guardado a las {draftGuardadoEn}
                </div>
            )}

            {error && <div className="fm-error">{error}</div>}

            {/* ── ANTECEDENTES ── */}
            {!esEdicion && antecedentes.length > 0 && (
                <div className="fm-antecedentes">
                    <div className="fm-antecedentes-header">
                        <i className="bi bi-info-circle-fill" />
                        <strong>Antecedentes:</strong> este imputado ya cuenta con {antecedentes.length} {antecedentes.length === 1 ? 'registro previo' : 'registros previos'} de medida o suspensión.
                    </div>
                    <ul className="fm-antecedentes-lista">
                        {antecedentes.map(m => (
                            <li key={m.id}>
                                <span className="fm-ant-item">
                                    <span className="fm-ant-lbl">Tipo:</span>
                                    <span className={`fm-ant-tipo fm-ant-tipo-${m.tipo === 'MEDIDA_CAUTELAR' ? 'mc' : 'scp'}`}>
                                        {m.tipo === 'MEDIDA_CAUTELAR' ? 'M.C.' : 'S.C.P.'}
                                    </span>
                                </span>
                                {m.createdAt && <span className="fm-ant-item"><span className="fm-ant-lbl">Registro:</span> {new Date(m.createdAt).toLocaleDateString('es-MX')}</span>}
                                {m.fechaRecepcion && <span className="fm-ant-item"><span className="fm-ant-lbl">Recepción:</span> {m.fechaRecepcion}</span>}
                                {m.delito && <span className="fm-ant-item"><span className="fm-ant-lbl">Delito:</span> {m.delito}</span>}
                                <span className="fm-ant-item">
                                    <span className="fm-ant-lbl">Estado:</span>
                                    <span className={`fm-ant-estado fm-ant-est-${(m.estado || '').toLowerCase()}`}>{m.estado}</span>
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* ── SECCIÓN 1: DATOS PROCESALES ── */}
            <Seccion titulo="DATOS PROCESALES" />
            <div className="fm-grid-4">
                <Field label="Fecha de recepción *" id="fm-fechaRecepcion" err={errores.fechaRecepcion}>
                    <input type="date" value={form.fechaRecepcion} onChange={e => set('fechaRecepcion', e.target.value)} />
                </Field>
                <Field label="Sede">
                    <input type="text" value={form.sede} onChange={e => set('sede', e.target.value)} placeholder="Ej: Cuernavaca" />
                </Field>
                <Field label="Nombre del Juez" full>
                    <input type="text" value={form.nombreJuez} onChange={e => set('nombreJuez', e.target.value)} placeholder="Apellido Paterno, Apellido Materno, Nombre(s)" />
                </Field>
                <Field label="Fecha de formulación">
                    <input type="date" value={form.fechaFormulacion} onChange={e => set('fechaFormulacion', e.target.value)} />
                </Field>
                <Field label="Fecha de vinculación al proceso">
                    <input type="date" value={form.fechaVinculacionProceso} onChange={e => set('fechaVinculacionProceso', e.target.value)} />
                </Field>
                <Field label="Fecha entrevista evaluación de riesgo">
                    <input type="date" value={form.fechaEntrevistaEvaluacion} onChange={e => set('fechaEntrevistaEvaluacion', e.target.value)} />
                </Field>
                {medidaInicial?.folioEntrevista && (
                    <Field label="Entrevista de encuadre">
                        <input type="text" value={medidaInicial.folioEntrevista} disabled />
                    </Field>
                )}
            </div>

            {/* ── DELITOS ── */}
            <div id="fm-delito" className={`fm-delitos-bloque${errores.delito ? ' fm-field-error' : ''}`}>
                <div className="fm-delitos-header">
                    <span className="fm-delitos-titulo">Delito(s) *</span>
                    <button type="button" className="fm-btn-agregar-delito" onClick={agregarDelito}>
                        + Agregar delito
                    </button>
                </div>
                {errores.delito && <span className="fm-campo-error-msg">Debe ingresar al menos un delito</span>}
                <div className="fm-delitos-tabla-wrap">
                    <table className="fm-delitos-tabla">
                        <thead>
                            <tr><th>#</th><th>Delito</th><th>Modalidad</th><th></th></tr>
                        </thead>
                        <tbody>
                            {delitos.map((d, i) => (
                                <tr key={i}>
                                    <td className="fm-delito-num">{i + 1}</td>
                                    <td>
                                        <input
                                            value={d.delito}
                                            onChange={e => { setDelito(i, 'delito', e.target.value); if (i === 0) setErrores(p => ({...p, delito: false})); }}
                                            placeholder="Ej: Robo con violencia"
                                        />
                                    </td>
                                    <td>
                                        <input
                                            value={d.modalidad}
                                            onChange={e => setDelito(i, 'modalidad', e.target.value)}
                                            placeholder="Ej: Con arma de fuego"
                                        />
                                    </td>
                                    <td>
                                        {delitos.length > 1 && (
                                            <button type="button" className="fm-btn-quitar-delito" onClick={() => quitarDelito(i)}>✕</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── SECCIÓN 2: SUSPENSIÓN CONDICIONAL ── */}
            <Seccion titulo="SUSPENSIÓN CONDICIONAL" />
            <div className="fm-grid-4">
                <Field label="Fecha de imposición de la S.C.P.">
                    <input type="date" value={form.fechaImposicionScp} onChange={e => set('fechaImposicionScp', e.target.value)} />
                </Field>
                <Field label="Plazo de la S.C.P. (meses)">
                    <input type="number" min="1" max="120" value={form.plazoScp} onChange={e => set('plazoScp', e.target.value)} placeholder="Ej: 12" />
                </Field>
                <Field label="Presentación periódica">
                    <input type="text" value={form.presentacionPeriodica} onChange={e => set('presentacionPeriodica', e.target.value)} />
                </Field>
            </div>

            <div className="fm-grid-4">
                <Field label="Vencimiento del plazo de la S.C.P.">
                    <input type="date" value={form.vencimientoPlazo} onChange={e => set('vencimientoPlazo', e.target.value)} />
                </Field>
                <Field label="Responsable de cierre de carpeta">
                    <input type="text" value={form.responsableCierre} onChange={e => set('responsableCierre', e.target.value)} />
                </Field>
            </div>

            <div className="fm-grid-1">
                <Field label="Último informe S.C.P." full>
                    <textarea rows={3} value={form.descripcionInforme} onChange={e => set('descripcionInforme', e.target.value)} placeholder="Descripción del último informe de suspensión condicional..." />
                </Field>
            </div>

            {/* ── SECCIÓN: CANALIZACIÓN ── */}
            <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                margin: '18px 24px 0',
                overflow: 'hidden',
            }}>
                {/* Header de sección con switch integrado */}
                <div style={{
                    background: 'linear-gradient(90deg, #1e3a5f 0%, #2d5986 100%)',
                    padding: '12px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}>
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase' }}>
                        Canalización
                    </span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', margin: 0 }}>
                        <span style={{ fontSize: 12, color: '#cbd5e1', fontWeight: 600 }}>
                            {form.tieneCanalizacion ? 'Activa' : 'Sin canalización'}
                        </span>
                        <div
                            onClick={() => set('tieneCanalizacion', !form.tieneCanalizacion)}
                            style={{
                                width: 44, height: 24, borderRadius: 12, cursor: 'pointer',
                                background: form.tieneCanalizacion ? '#22c55e' : '#475569',
                                position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                            }}
                        >
                            <div style={{
                                position: 'absolute', top: 3, left: form.tieneCanalizacion ? 23 : 3,
                                width: 18, height: 18, borderRadius: '50%', background: '#fff',
                                transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.25)'
                            }} />
                        </div>
                    </label>
                </div>

                {/* Contenido colapsable */}
                {form.tieneCanalizacion ? (
                    <div style={{ padding: '16px 20px 20px' }}>
                        <div className="fm-grid-4" style={{ margin: 0 }}>
                            <Field label="Canalización">
                                <input type="text" value={form.canalizacion} onChange={e => set('canalizacion', e.target.value)} />
                            </Field>
                            <Field label="Tipo de servicio">
                                <input type="text" value={form.tipoServicio} onChange={e => set('tipoServicio', e.target.value)} />
                            </Field>
                            <Field label="Fecha de canalización">
                                <input type="date" value={form.fechaCanalizacion} onChange={e => set('fechaCanalizacion', e.target.value)} />
                            </Field>
                        </div>
                        <div style={{ marginTop: 14 }}>
                            <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: 0.5, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                                Observaciones de canalización
                            </label>
                            {(() => {
                                const len = (form.canalizacionObservaciones || '').length;
                                const excedido = len > 700;
                                const cerca = len >= 600 && len <= 700;
                                const color = excedido ? '#ef4444' : cerca ? '#f59e0b' : '#cbd5e1';
                                const bg    = excedido ? '#fff5f5' : '#fff';
                                return (
                                    <>
                                        <textarea
                                            rows={3}
                                            value={form.canalizacionObservaciones || ''}
                                            onChange={e => set('canalizacionObservaciones', e.target.value)}
                                            placeholder="Observaciones sobre la canalización..."
                                            style={{
                                                width: '100%', resize: 'vertical', borderRadius: 6, padding: '8px 10px', fontSize: 13,
                                                border: `1px solid ${color}`, outline: 'none', boxSizing: 'border-box',
                                                background: bg, transition: 'border-color 0.2s, background 0.2s',
                                            }}
                                        />
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                                            {excedido ? (
                                                <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>
                                                    <i className="bi bi-exclamation-triangle-fill" style={{ marginRight: 4 }} />
                                                    Límite de 700 caracteres excedido — reduce el texto para poder guardar
                                                </span>
                                            ) : cerca ? (
                                                <span style={{ fontSize: 11, color: '#b45309', fontWeight: 600 }}>
                                                    <i className="bi bi-info-circle-fill" style={{ marginRight: 4 }} />
                                                    Acercándote al límite máximo de 700 caracteres
                                                </span>
                                            ) : <span />}
                                            <span style={{
                                                fontSize: 11, fontWeight: excedido ? 700 : 400,
                                                color: excedido ? '#ef4444' : cerca ? '#b45309' : '#94a3b8',
                                            }}>
                                                {len} / 700
                                            </span>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                ) : (
                    <div style={{ padding: '14px 20px', color: '#94a3b8', fontSize: 13, fontStyle: 'italic' }}>
                        Activa la canalización para registrar los datos correspondientes.
                    </div>
                )}
            </div>

            {/* ── SECCIÓN 3: CONDICIONES DE SUSPENSIÓN ── */}
            <div id="fm-fracciones" className={`fm-fracciones-header${errorFraccion ? ' fm-fracciones-error' : ''}`}>
                <h3>CONDICIONES DE SUSPENSIÓN IMPUESTAS</h3>
                <p>Seleccione las condiciones que el juez impuso para la suspensión condicional del proceso</p>
                <span className="fm-fracciones-count">
                    Condición{fracciones.length !== 1 ? 'es' : ''} seleccionada{fracciones.length !== 1 ? 's' : ''}: <strong>{fracciones.length}</strong>
                    {fracciones.length > 0 && (' — ' + fracciones.map(k => `Cond. ${k}`).join(', '))}
                </span>
            </div>
            <div className="fm-fracciones-grid">
                {FRACCIONES_SCP.map(f => (
                    <div
                        key={f.key}
                        className={`fm-fraccion-card${fracciones.includes(f.key) ? ' fm-fraccion-selected' : ''}`}
                        onClick={() => toggleFraccion(f.key)}
                    >
                        <div className="fm-fraccion-top">
                            <input type="checkbox" readOnly checked={fracciones.includes(f.key)} />
                            <span className="fm-fraccion-num">Condición {f.key}</span>
                        </div>
                        <span className="fm-fraccion-nombre">{f.nombre}</span>
                        <span className="fm-fraccion-desc">{f.desc}</span>
                    </div>
                ))}
            </div>

            {/* Campos de detalle por condición seleccionada */}
            {fracciones.filter(k => DETALLES_SCP[k]?.length > 0).map(fracKey => (
                <div key={fracKey} className="fm-detalle-fraccion">
                    <div className="fm-detalle-titulo">
                        Condición {fracKey} — {FRACCIONES_SCP.find(f => f.key === fracKey)?.nombre}
                    </div>
                    <div className="fm-grid-4">
                        {DETALLES_SCP[fracKey].map(campo => (
                            campo.type === 'checkbox' ? (
                                <div key={campo.key} className="fm-field fm-field-checkbox">
                                    <label className="fm-checkbox-label">
                                        <input
                                            type="checkbox"
                                            checked={!!detalles[fracKey]?.[campo.key]}
                                            onChange={e => setDetalle(fracKey, campo.key, e.target.checked)}
                                        />
                                        <span>{campo.label}</span>
                                    </label>
                                </div>
                            ) : (
                                <Field key={campo.key} label={campo.label} full={campo.full}>
                                    {campo.type === 'select' ? (
                                        <select value={detalles[fracKey]?.[campo.key] || ''}
                                            onChange={e => setDetalle(fracKey, campo.key, e.target.value)}>
                                            <option value="">Seleccionar...</option>
                                            {campo.options?.map(o => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                    ) : campo.type === 'textarea' ? (
                                        <textarea rows={2} value={detalles[fracKey]?.[campo.key] || ''}
                                            onChange={e => setDetalle(fracKey, campo.key, e.target.value)}
                                            placeholder={campo.placeholder} />
                                    ) : (
                                        <input type={campo.type || 'text'}
                                            value={detalles[fracKey]?.[campo.key] || ''}
                                            onChange={e => setDetalle(fracKey, campo.key, e.target.value)}
                                            placeholder={campo.placeholder} />
                                    )}
                                </Field>
                            )
                        ))}
                    </div>
                </div>
            ))}

            {/* ── SECCIÓN 4: CONCLUSIÓN ── */}
            <Seccion titulo="CONCLUSIÓN" />
            <div className="fm-grid-4">
                <Field label="Estado">
                    <select value={form.estado} onChange={e => set('estado', e.target.value)}>
                        <option value="ACTIVO">Activo</option>
                        <option value="SUSPENDIDO">Suspendido</option>
                    </select>
                </Field>
                <Field label="Fecha de inicio">
                    <input type="date" value={form.vigenciaInicio} onChange={e => set('vigenciaInicio', e.target.value)} />
                </Field>
                <Field label="Fecha de fin">
                    <input type="date" value={form.vigenciaFin} onChange={e => set('vigenciaFin', e.target.value)} />
                </Field>
                <Field label="Responsable del seguimiento">
                    <input type="text" value={form.responsableSeguimiento} readOnly disabled style={{ background: '#f5f5f5', cursor: 'not-allowed' }} />
                </Field>
                <Field label="Observaciones" full>
                    <textarea rows={3} value={form.observaciones} onChange={e => set('observaciones', e.target.value)} placeholder="Detalles adicionales y notas importantes..." />
                </Field>
                <Field label="Observaciones generales" full>
                    <textarea rows={3} value={form.observacionesGenerales} onChange={e => set('observacionesGenerales', e.target.value)} placeholder="Notas adicionales, instrucciones especiales del juez, acuerdos, etc." />
                </Field>
            </div>

            {/* ── ADVERTENCIA ── */}
            <div className="fm-advertencia">
                <i className="bi bi-exclamation-triangle-fill" />
                <div>
                    <strong>ADVERTENCIA AL IMPUTADO:</strong>
                    <p>El incumplimiento de cualquiera de las condiciones impuestas para la suspensión condicional del proceso puede resultar en la revocación de la misma y la reanudación del proceso penal.</p>
                    <textarea rows={2} className="fm-advertencia-input" value={form.advertencia}
                        onChange={e => set('advertencia', e.target.value)}
                        placeholder="Observaciones adicionales de advertencia..." />
                </div>
            </div>

            {/* ── ACCIONES ── */}
            <div className="fm-acciones">
                <button className="fm-btn-cancelar" onClick={() => { setFormDirty(false); onVolver?.(); }}>Cancelar</button>
                <button className="fm-btn-guardar" onClick={handleGuardar} disabled={guardando}>
                    {guardando ? 'Guardando...' : 'Guardar S.C.P.'}
                </button>
            </div>
        </div>
    );
};

export default FormularioSCP;
