import { useState, useEffect } from 'react';
import { crearMedida, actualizarMedida, getMedidasByImputado } from '../api/medidasApi';
import './FormularioMedida.css';

// ── Fracciones MC (Art.155) ───────────────────────────────────────────────────
const FRACCIONES_MC = [
    { key: 'I',    nombre: 'Presentación Periódica',            desc: 'La presentación periódica ante el juez o ante autoridad distinta que aquél designe' },
    { key: 'II',   nombre: 'Garantía Económica',                desc: 'La exhibición de una garantía económica' },
    { key: 'III',  nombre: 'Embargo de Bienes',                 desc: 'El embargo de bienes' },
    { key: 'IV',   nombre: 'Inmovilización de Cuentas',         desc: 'La inmovilización de cuentas y demás valores que se encuentren dentro del sistema financiero' },
    { key: 'V',    nombre: 'Prohibición de Salir',              desc: 'La prohibición de salir sin autorización del país, de la localidad en la cual resida o del ámbito territorial que fije el juez' },
    { key: 'VI',   nombre: 'Cuidado o Vigilancia',              desc: 'El sometimiento al cuidado o vigilancia de una persona o institución determinada' },
    { key: 'VII',  nombre: 'Prohibición de Concurrir',          desc: 'La prohibición de concurrir a determinadas reuniones o acercarse a ciertos lugares determinados' },
    { key: 'VIII', nombre: 'Prohibición de Contacto',           desc: 'La prohibición de convivir, acercarse o comunicarse con determinadas personas' },
    { key: 'IX',   nombre: 'Separación del Domicilio',          desc: 'La separación inmediata del domicilio' },
    { key: 'X',    nombre: 'Suspensión de Cargo Público',       desc: 'La suspensión temporal en el ejercicio del cargo cuando se le atribuye un delito cometido por servidores públicos' },
    { key: 'XI',   nombre: 'Suspensión de Actividad Profesional', desc: 'La suspensión temporal en el ejercicio de una determinada actividad profesional o laboral' },
    { key: 'XII',  nombre: 'Localizador Electrónico',           desc: 'La colocación de localizadores electrónicos' },
    { key: 'XIII', nombre: 'Resguardo Domiciliario',            desc: 'El resguardo en su propio domicilio con las modalidades que el juez disponga' },
    { key: 'XIV',  nombre: 'Prisión Preventiva',                desc: 'La prisión preventiva. *No supervisada por esta Unidad' },
];

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

// ── Campos adicionales por fracción MC ───────────────────────────────────────
const DETALLES_MC = {
    I:    [
        { key: 'periodicidad',       label: 'Periodicidad', type: 'select', options: ['Diaria','Semanal','Quincenal','Mensual'] },
        { key: 'lugarPresentacion',  label: 'Lugar de presentación', full: true },
        { key: 'autoridadPresenta',  label: 'Autoridad ante quien se presenta', full: true },
    ],
    II:   [
        { key: 'tipoGarantia',    label: 'Tipo de garantía' },
        { key: 'monto',           label: 'Monto ($)', type: 'number' },
        { key: 'fechaExhibicion', label: 'Fecha de exhibición', type: 'date' },
        { key: 'observaciones',   label: 'Observaciones', type: 'textarea', full: true },
    ],
    III:  [],
    IV:   [],
    V:    [
        { key: 'ambitoTerritorial', label: 'Ámbito territorial', type: 'select', options: ['País','Estado','Municipio','Localidad'] },
        { key: 'especificacion',    label: 'Especificación', placeholder: 'Ej: No puede salir del estado de Morelos' },
        { key: 'procedimiento',     label: 'Procedimiento para autorización', type: 'textarea', full: true },
    ],
    VI:   [],
    VII:  [
        { key: 'lugaresProhibidos',   label: 'Lugares que debe evitar', type: 'textarea', full: true, placeholder: 'Especificar lugares o reuniones prohibidas' },
        { key: 'personasProhibidas',  label: 'Personas de quienes debe alejarse', type: 'textarea', full: true, placeholder: 'Nombres o descripción de las personas' },
    ],
    VIII: [
        { key: 'personasEvitar',      label: 'Personas con quienes no puede comunicarse', type: 'textarea', full: true, placeholder: 'Nombres o descripción de las personas' },
        { key: 'lugaresEvitar',       label: 'Lugares o domicilios a evitar', type: 'textarea', full: true, placeholder: 'Especificar domicilios o lugares' },
    ],
    IX:   [
        { key: 'domicilioSeparacion', label: 'Domicilio del que debe separarse', type: 'textarea', full: true, placeholder: 'Calle, número, colonia, municipio...' },
    ],
    X:    [
        { key: 'cargo',       label: 'Cargo público que ocupa', placeholder: 'Ej: Director de área' },
        { key: 'institucion', label: 'Institución o dependencia', full: true, placeholder: 'Nombre de la institución pública' },
    ],
    XI:   [
        { key: 'actividadProfesional', label: 'Actividad profesional o laboral suspendida', full: true, placeholder: 'Ej: Ejercicio de la medicina, conducción de vehículos...' },
    ],
    XII:  [
        { key: 'procedimientoLocalizador', label: 'Procedimiento para autorización del localizador', type: 'textarea', full: true },
    ],
    XIII: [],
    XIV:  [],
};

// ── Campos adicionales por condición SCP (solo I,II,III,IV,VI,VII,XIII,XIV) ───
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
    // MC Art.155
    fechaCanalizacion: '', aDisposicion: false, descripcionDomicilio: '',
    presentacionPeriodica: '', noBiometrico: '', noLibro: '', noPagina: '',
    cumpliendoIncumpliendo: '', distritoJudicial: '', descripcionInforme: '',
    acuerdoReparatorio: false, descripcionAcuerdo: '', fechaCelebracionAcuerdo: '',
    fechaCumplimientoAcuerdo: '', estatusFinal: '', fechaTermino: '',
    // SCP
    fechaImposicionScp: '', plazoScp: '', canalizacion: '', tipoServicio: '',
    fechaInformeFinal: '', vencimientoPlazo: '', oficioSobreseimiento: '', responsableCierre: '',
    // info adicional
    advertencia: '', observaciones: '', responsableSeguimiento: '',
    observacionesGenerales: '', fechaProximaRevision: '', vigenciaInicio: '', vigenciaFin: '',
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

const Seccion = ({ titulo, color }) => (
    <div className={`fm-seccion${color === 'cafe' ? ' fm-seccion-cafe' : ''}`}>
        <h3>{titulo}</h3>
    </div>
);

// ── Componente principal ──────────────────────────────────────────────────────
const FormularioMedida = ({ medidaInicial, onVolver, onGuardado }) => {
    const esMC = medidaInicial?.tipo !== 'SUSPENSION_CONDICIONAL';
    const esEdicion = !!medidaInicial?.id;

    const [form, setForm] = useState(() => {
        if (medidaInicial) {
            // Reemplaza null por '' para evitar inputs controlados con value=null
            const sanitized = Object.fromEntries(
                Object.entries({ ...FORM_BASE, ...medidaInicial })
                    .map(([k, v]) => [k, v === null ? '' : v])
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

    const [fracciones, setFracciones] = useState(() =>
        medidaInicial?.fracciones || []
    );
    const [detalles, setDetalles] = useState(() => {
        try { return JSON.parse(medidaInicial?.detallesFracciones || '{}'); }
        catch { return {}; }
    });
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');
    const [errores, setErrores] = useState({});
    const [antecedentes, setAntecedentes] = useState([]);
    const [tieneDraft, setTieneDraft] = useState(false);
    const [draftGuardadoEn, setDraftGuardadoEn] = useState(null);

    const draftKey = esEdicion ? `umeca-draft-medida-${medidaInicial.id}` : `umeca-draft-medida-nuevo-${medidaInicial?.imputadoId || ''}`;

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
            .catch(err => console.warn("Error al cargar datos:", err));
    }, []);

    const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

    const toggleFraccion = (key) => {
        setFracciones(prev =>
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
        );
    };

    const setDetalle = (fracKey, fieldKey, val) => {
        setDetalles(prev => ({
            ...prev,
            [fracKey]: { ...(prev[fracKey] || {}), [fieldKey]: val },
        }));
    };

    // Convierte strings vacíos a null para que Jackson no falle en LocalDate
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

        const hayErrorCampo   = Object.values(nuevosErrores).some(Boolean);
        const hayErrorFraccion = fracciones.length === 0;

        if (hayErrorCampo || hayErrorFraccion) {
            setError(
                hayErrorFraccion
                    ? `Debe seleccionar al menos una ${esMC ? 'fracción' : 'condición'}`
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
        setErrores({});
        setGuardando(true);
        setError('');
        const payload = {
            ...nullifyEmpty(form),
            // compatibilidad hacia atrás: primer delito en campos legacy
            delito:    delitos[0]?.delito    || null,
            modalidad: delitos[0]?.modalidad || null,
            delitosJson: JSON.stringify(delitos),
            imputadoId: medidaInicial?.imputadoId || null,
            entrevistaId: medidaInicial?.entrevistaId || null,
            causaPenal: medidaInicial?.causaPenal,
            tipo: medidaInicial?.tipo || 'MEDIDA_CAUTELAR',
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
            onGuardado?.();
        } catch (e) {
            setError(e.response?.data?.message || 'Error al guardar');
        } finally {
            setGuardando(false);
        }
    };

    const FRACCIONES_LIST = esMC ? FRACCIONES_MC : FRACCIONES_SCP;
    const DETALLES_MAP    = esMC ? DETALLES_MC   : DETALLES_SCP;

    return (
        <div className="fm-container">
            {/* Topbar */}
            <div className="fm-topbar">
                <button className="fm-btn-volver" onClick={onVolver}>
                    <i className="bi bi-arrow-left" /> Cancelar y Volver
                </button>
                <span className="fm-topbar-titulo">
                    {esMC ? 'MEDIDA CAUTELAR (M.C.)' : 'SUSPENSIÓN CONDICIONAL DEL PROCESO (S.C.P.)'}
                </span>
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
            <Seccion titulo={esMC ? 'OFICIO DE IMPOSICIÓN' : 'DATOS PROCESALES'} />
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
                            <tr>
                                <th>#</th>
                                <th>Delito</th>
                                <th>Modalidad</th>
                                <th></th>
                            </tr>
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

            {/* ── SECCIÓN 2: MC o SCP específico ── */}
            {esMC ? (
                <>
                    <Seccion titulo="MEDIDAS CAUTELARES ART. 155" />
                    <div className="fm-grid-4">
                        <Field label="Fecha de canalización">
                            <input type="date" value={form.fechaCanalizacion} onChange={e => set('fechaCanalizacion', e.target.value)} />
                        </Field>
                        <Field label="No. de biométrico">
                            <input type="text" value={form.noBiometrico} onChange={e => set('noBiometrico', e.target.value)} placeholder="Ej: BIO-001" />
                        </Field>
                        <Field label="No. de libro">
                            <input type="text" value={form.noLibro} onChange={e => set('noLibro', e.target.value)} placeholder="Ej: 001" />
                        </Field>
                        <Field label="No. de página">
                            <input type="text" value={form.noPagina} onChange={e => set('noPagina', e.target.value)} placeholder="Ej: 45" />
                        </Field>
                        <Field label="Presentación periódica">
                            <input type="text" value={form.presentacionPeriodica} onChange={e => set('presentacionPeriodica', e.target.value)} />
                        </Field>
                        <Field label="Distrito judicial (declinación)" full>
                            <input type="text" value={form.distritoJudicial} onChange={e => set('distritoJudicial', e.target.value)} placeholder="Ej: Distrito Judicial Norte" />
                        </Field>
                    </div>
                    <div className="fm-grid-1">
                        <Field label="Último informe M.C." full>
                            <textarea rows={3} value={form.descripcionInforme} onChange={e => set('descripcionInforme', e.target.value)} placeholder="Descripción del último informe de medida cautelar..." />
                        </Field>
                    </div>
                    <div className="fm-grid-4">
                        <Field label="¿Acuerdo reparatorio?">
                            <div className="fm-yn">
                                <label><input type="radio" checked={form.acuerdoReparatorio === true} onChange={() => set('acuerdoReparatorio', true)} /> Sí</label>
                                <label><input type="radio" checked={!form.acuerdoReparatorio} onChange={() => set('acuerdoReparatorio', false)} /> No</label>
                            </div>
                        </Field>
                        {form.acuerdoReparatorio && (<>
                            <Field label="Fecha de celebración del acuerdo">
                                <input type="date" value={form.fechaCelebracionAcuerdo} onChange={e => set('fechaCelebracionAcuerdo', e.target.value)} />
                            </Field>
                            <Field label="Fecha de cumplimiento del acuerdo">
                                <input type="date" value={form.fechaCumplimientoAcuerdo} onChange={e => set('fechaCumplimientoAcuerdo', e.target.value)} />
                            </Field>
                            <Field label="Descripción del acuerdo" full>
                                <textarea rows={2} value={form.descripcionAcuerdo} onChange={e => set('descripcionAcuerdo', e.target.value)} placeholder="Descripción del acuerdo reparatorio..." />
                            </Field>
                            <Field label="Estatus del acuerdo">
                                <select value={form.estatusFinal} onChange={e => set('estatusFinal', e.target.value)}>
                                    <option value="">Seleccionar...</option>
                                    <option value="TOTAL">Total</option>
                                    <option value="PARCIAL">Parcial</option>
                                </select>
                            </Field>
                        </>)}
                    </div>
                </>
            ) : (
                <>
                    <Seccion titulo="SUSPENSIÓN CONDICIONAL" />
                    <div className="fm-grid-4">
                        <Field label="Fecha de imposición de la S.C.P.">
                            <input type="date" value={form.fechaImposicionScp} onChange={e => set('fechaImposicionScp', e.target.value)} />
                        </Field>
                        <Field label="Plazo de la S.C.P.">
                            <input type="date" value={form.plazoScp} onChange={e => set('plazoScp', e.target.value)} />
                        </Field>
                        <Field label="Canalización">
                            <input type="text" value={form.canalizacion} onChange={e => set('canalizacion', e.target.value)} />
                        </Field>
                        <Field label="Tipo de servicio">
                            <input type="text" value={form.tipoServicio} onChange={e => set('tipoServicio', e.target.value)} />
                        </Field>
                        <Field label="Fecha de canalización">
                            <input type="date" value={form.fechaCanalizacion} onChange={e => set('fechaCanalizacion', e.target.value)} />
                        </Field>
                        <Field label="Presentación periódica">
                            <input type="text" value={form.presentacionPeriodica} onChange={e => set('presentacionPeriodica', e.target.value)} />
                        </Field>
                        <Field label="No. de biométrico">
                            <input type="text" value={form.noBiometrico} onChange={e => set('noBiometrico', e.target.value)} placeholder="Ej: BIO-001" />
                        </Field>
                        <Field label="No. de libro">
                            <input type="text" value={form.noLibro} onChange={e => set('noLibro', e.target.value)} placeholder="Ej: 001" />
                        </Field>
                        <Field label="No. de página">
                            <input type="text" value={form.noPagina} onChange={e => set('noPagina', e.target.value)} placeholder="Ej: 45" />
                        </Field>
                    </div>
                    <div className="fm-grid-1">
                        <Field label="Último informe S.C.P." full>
                            <textarea rows={3} value={form.descripcionInforme} onChange={e => set('descripcionInforme', e.target.value)} placeholder="Descripción del último informe de suspensión condicional..." />
                        </Field>
                    </div>
                    <div className="fm-grid-4">
                        <Field label="Vencimiento del plazo de la S.C.P.">
                            <input type="date" value={form.vencimientoPlazo} onChange={e => set('vencimientoPlazo', e.target.value)} />
                        </Field>
                        <Field label="Oficio de sobreseimiento">
                            <input type="text" value={form.oficioSobreseimiento} onChange={e => set('oficioSobreseimiento', e.target.value)} placeholder="Especificar..." />
                        </Field>
                        <Field label="Responsable de cierre de carpeta">
                            <input type="text" value={form.responsableCierre} onChange={e => set('responsableCierre', e.target.value)} />
                        </Field>
                        <Field label="Estatus final">
                            <select value={form.estatusFinal} onChange={e => set('estatusFinal', e.target.value)}>
                                <option value="">Seleccionar...</option>
                                <option value="TOTAL">Total</option>
                                <option value="PARCIAL">Parcial</option>
                            </select>
                        </Field>
                    </div>
                </>
            )}

            {/* ── SECCIÓN 3: FRACCIONES / CONDICIONES ── */}
            <div id="fm-fracciones" className="fm-fracciones-header">
                <h3>{esMC ? 'FRACCIONES DE MEDIDAS CAUTELARES IMPUESTAS' : 'CONDICIONES DE SUSPENSIÓN IMPUESTAS'}</h3>
                <p>{esMC ? 'Seleccione las medidas cautelares que el juez impuso según el auto de vinculación' : 'Seleccione las condiciones que el juez impuso para la suspensión condicional del proceso'}</p>
                <span className="fm-fracciones-count">
                    {esMC ? 'Fracción' : 'Condición'}{fracciones.length !== 1 ? 'es' : ''} seleccionada{fracciones.length !== 1 ? 's' : ''}: <strong>{fracciones.length}</strong>
                    {fracciones.length > 0 && (' — ' + fracciones.map(k => `Frac. ${k}`).join(', '))}
                </span>
            </div>
            <div className="fm-fracciones-grid">
                {FRACCIONES_LIST.map(f => {
                    const deshabilitada = esMC && f.key === 'XIV';
                    return (
                        <div
                            key={f.key}
                            className={`fm-fraccion-card${fracciones.includes(f.key) ? ' fm-fraccion-selected' : ''}${deshabilitada ? ' fm-fraccion-disabled' : ''}`}
                            onClick={() => !deshabilitada && toggleFraccion(f.key)}
                        >
                            <div className="fm-fraccion-top">
                                <input type="checkbox" readOnly checked={fracciones.includes(f.key)} disabled={deshabilitada} />
                                <span className="fm-fraccion-num">Fracción {f.key}</span>
                                {deshabilitada && <span className="fm-fraccion-tag-no">No supervisada</span>}
                            </div>
                            <span className="fm-fraccion-nombre">{f.nombre}</span>
                            <span className="fm-fraccion-desc">{f.desc}</span>
                        </div>
                    );
                })}
            </div>

            {/* Campos de detalle por fracción seleccionada */}
            {fracciones.filter(k => DETALLES_MAP[k]?.length > 0).map(fracKey => (
                <div key={fracKey} className="fm-detalle-fraccion">
                    <div className="fm-detalle-titulo">
                        Fracción {fracKey} — {FRACCIONES_LIST.find(f => f.key === fracKey)?.nombre}
                    </div>
                    <div className="fm-grid-4">
                        {DETALLES_MAP[fracKey].map(campo => (
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
                        <option value="FINALIZADO">Finalizado</option>
                    </select>
                </Field>
                <Field label="Vigencia inicio">
                    <input type="date" value={form.vigenciaInicio} onChange={e => set('vigenciaInicio', e.target.value)} />
                </Field>
                <Field label="Vigencia fin">
                    <input type="date" value={form.vigenciaFin} onChange={e => set('vigenciaFin', e.target.value)} />
                </Field>
                <Field label="Fecha próxima revisión">
                    <input type="date" value={form.fechaProximaRevision} onChange={e => set('fechaProximaRevision', e.target.value)} />
                </Field>
                <Field label="Responsable del seguimiento">
                    <input type="text" value={form.responsableSeguimiento} onChange={e => set('responsableSeguimiento', e.target.value)} />
                </Field>
                <Field label="Observaciones" full>
                    <textarea rows={2} value={form.observaciones} onChange={e => set('observaciones', e.target.value)} placeholder="Detalles adicionales y notas importantes..." />
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
                    <p>
                        {esMC
                            ? 'El incumplimiento de cualquiera de las medidas cautelares impuestas puede resultar en la modificación de las mismas, incluyendo la imposición de prisión preventiva, de conformidad con lo establecido en el Código Nacional de Procedimientos Penales.'
                            : 'El incumplimiento de cualquiera de las condiciones impuestas para la suspensión condicional del proceso puede resultar en la revocación de la misma y la reanudación del proceso penal.'}
                    </p>
                    <textarea rows={2} className="fm-advertencia-input" value={form.advertencia}
                        onChange={e => set('advertencia', e.target.value)}
                        placeholder="Observaciones adicionales de advertencia..." />
                </div>
            </div>

            {/* ── ACCIONES ── */}
            <div className="fm-acciones">
                <button className="fm-btn-cancelar" onClick={onVolver}>Cancelar</button>
                <button className="fm-btn-guardar" onClick={handleGuardar} disabled={guardando}>
                    {guardando ? 'Guardando...' : (esMC ? 'Guardar Medida Cautelar' : 'Guardar S.C.P.')}
                </button>
            </div>
        </div>
    );
};

export default FormularioMedida;
