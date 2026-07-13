import { useState, useRef, useEffect, useCallback } from 'react';
import { crearEntrevista } from '../api/entrevistasApi';
import './FormularioEntrevista.css';
import './Imputados.css';

const ESTADO_CURP = {
    'Aguascalientes':'AS','Baja California':'BC','Baja California Sur':'BS','Campeche':'CC',
    'Chiapas':'CS','Chihuahua':'CH','Ciudad de México':'DF','Coahuila':'CL','Colima':'CM',
    'Durango':'DG','Estado de México':'MC','Guanajuato':'GT','Guerrero':'GR','Hidalgo':'HG',
    'Jalisco':'JC','Michoacán':'MN','Morelos':'MS','Nayarit':'NT','Nuevo León':'NL',
    'Oaxaca':'OC','Puebla':'PL','Querétaro':'QT','Quintana Roo':'QR','San Luis Potosí':'SP',
    'Sinaloa':'SL','Sonora':'SR','Tabasco':'TC','Tamaulipas':'TS','Tlaxcala':'TL',
    'Veracruz':'VZ','Yucatán':'YN','Zacatecas':'ZS','Extranjero':'NE',
};

const limpiar = str => (str || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^A-Z]/g,'');

const primeraVocal  = str => { const s=limpiar(str).slice(1); for(const c of s) if('AEIOU'.includes(c)) return c; return 'X'; };
const primerConsonante = str => { const s=limpiar(str).slice(1); for(const c of s) if(!'AEIOU'.includes(c)) return c; return 'X'; };

/**
 * Genera los primeros 15 caracteres del CURP a partir de los datos del imputado.
 * No incluye el dígito verificador ni la homoclave (se usan solo como sugerencia).
 * Devuelve cadena vacía si faltan campos obligatorios.
 */
const generarCURP = ({ nombre, apPaterno, apMaterno, fechaNacimiento, estadoNacimiento, genero }) => {
    if (!nombre || !apPaterno || !fechaNacimiento || !estadoNacimiento) return '';
    const n  = limpiar(nombre);
    const ap = limpiar(apPaterno);
    const am = limpiar(apMaterno);
    const [yyyy, mm, dd] = (fechaNacimiento || '').split('-');
    if (!yyyy || !mm || !dd) return '';
    const aa = yyyy.slice(2);
    const sexo = genero === 'Femenino' ? 'M' : genero === 'Masculino' ? 'H' : 'X';
    const edo = ESTADO_CURP[estadoNacimiento] || 'XX';
    const L1 = ap[0]   || 'X';
    const L2 = primeraVocal(ap);
    const L3 = am[0]   || 'X';
    const L4 = n[0]    || 'X';
    const C1 = primerConsonante(ap);
    const C2 = primerConsonante(am) || 'X';
    const C3 = primerConsonante(n);
    return `${L1}${L2}${L3}${L4}${aa}${mm}${dd}${sexo}${edo}${C1}${C2}${C3}`;
};

const ESTADOS_MX = [
    'Aguascalientes','Baja California','Baja California Sur','Campeche','Chiapas','Chihuahua',
    'Ciudad de México','Coahuila','Colima','Durango','Estado de México','Guanajuato','Guerrero',
    'Hidalgo','Jalisco','Michoacán','Morelos','Nayarit','Nuevo León','Oaxaca','Puebla','Querétaro',
    'Quintana Roo','San Luis Potosí','Sinaloa','Sonora','Tabasco','Tamaulipas','Tlaxcala',
    'Veracruz','Yucatán','Zacatecas','Extranjero',
];

const initialForm = {
    causaPenal: '',
    libro: '',
    foja: '',
    curp: '',
    nombre: '',
    apPaterno: '',
    apMaterno: '',
    telefonoCasa: '',
    celular: '',
    email: '',
    fechaNacimiento: '',
    edad: '',
    municipio: '',
    estadoNacimiento: '',
    estadoExtranjero: '',
    pais: 'México',
    enfermedad: '',
    gradoEstudios: '',
    genero: '',
    complexion: '',
    estatura: '',
    colorOjos: '',
    cejas: '',
    tezPiel: '',
    colorCabello: '',
    tamLabios: '',
    senasCara: '',
    tieneTatuajes: false,
    alias: '',
    documentosMigratorios: [],
    estadoCivil: '',
    estadoCivilOtro: '',
    grupoVulnerable: '',
    grupoVulnerableOtro: '',
    conoceVictima: false,
    telVictima: '',
    nombreVictima: '',
    domicilioVictima: '',
    relacionVictima: '',
    relacionVictimaOtro: '',
    empresa: '',
    telEmpresa: '',
    salarioMensual: '',
    puesto: '',
    nombreJefe: '',
    horarioTrabajo: '',
    domicilioTrabajo: '',
    ultimoEmpleo: '',
    tratamientoAdicciones: false,
    tratamientoAdiccionesEsp: '',
    familiaresExterior: false,
    familiaresExteriorEsp: '',
    tipoSeguimiento: '',
};

const seccionTitulo = (titulo) => (
    <div className="fe-seccion-titulo">
        <h3>{titulo}</h3>
    </div>
);

const campo = (label, children, err = false) => (
    <div className={`fe-campo${err ? ' fe-campo-error' : ''}`}>
        <label>{label}</label>
        {children}
        {err && <span className="fe-campo-error-msg">Este campo es obligatorio</span>}
    </div>
);

/**
 * Formulario de entrevista de encuadre (documento inicial del expediente).
 *
 * Comportamiento clave:
 * - **Draft auto-save**: se guarda en localStorage ante cualquier cambio real
 *   (detectado comparando contra initialForm). Al montar se ofrece recuperarlo.
 * - **CURP auto-generado**: se recalcula con {@link generarCURP} al cambiar nombre,
 *   apellidos, fecha de nacimiento, estado o género, a menos que el usuario lo
 *   haya editado manualmente ({@code curpManual = true}).
 * - **Domicilios dinámicos**: el primer domicilio es obligatorio; se pueden agregar
 *   más. Cada uno incluye campo de coordenadas y link a Google Maps.
 * - **Tatuajes**: se muestran condicionalmente cuando {@code tieneTatuajes = true}.
 * - **Sustancias**: tabla fija con las sustancias predefinidas; las columnas de
 *   detalle se deshabilitan si {@code consume = false}.
 *
 * @param {Function} onCancelar  callback al cancelar
 * @param {Function} onGuardado  callback al guardar exitosamente
 */
const FormularioEntrevista = ({ onCancelar, onGuardado }) => {
    const [form, setForm] = useState(initialForm);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [errores, setErrores] = useState({});
    const [fotoPreview, setFotoPreview] = useState(null);
    const [fotoZoom, setFotoZoom] = useState(false);
    const fotoInputRef = useRef(null);
    const [domicilios, setDomicilios] = useState([{ calle: '', numero: '', colonia: '', ciudad: '', municipio: '', estado: '', cp: '', tipoDomicilio: '', tipoDomicilioOtro: '', coordenadas: '', anios: '', propietario: '', diasDisponibles: '', horaDisponible: '', referencias: '', razon: '' }]);
    const [tatuajes, setTatuajes] = useState([{ parteCuerpo: '', descripcion: '' }]);
    const SUSTANCIAS_FIJAS = ['BEBIDAS ALCOHÓLICAS', 'MARIHUANA', 'COCAÍNA', 'PIEDRA', 'METANFETAMINAS', 'Otra'];
    const [consumoSustancias, setConsumoSustancias] = useState(
        SUSTANCIAS_FIJAS.map(s => ({ sustancia: s, consume: null, otraEsp: '', desde: '', periodicidad: '', cantidad: '', fechaUltimoConsumo: '' }))
    );
    const [personasHabita, setPersonasHabita] = useState([{ nombre: '', parentesco: '', edad: '', telefono: '', escolaridad: '', ocupacion: '' }]);
    const [referencias, setReferencias] = useState([{ nombre: '', parentesco: '', edad: '', telefono: '', direccion: '' }]);

    const [curpManual, setCurpManual] = useState(false);
    const [tieneDraft, setTieneDraft] = useState(false);
    const [draftGuardadoEn, setDraftGuardadoEn] = useState(null);

    const draftKey = 'umeca-draft-entrevista-nuevo';

    /**
     * Retorna true si el formulario tiene al menos un campo que difiere del valor por defecto
     * definido en initialForm. Más preciso que FormularioEvaluacion porque compara contra
     * los defaults explícitos, evitando falsos positivos con cadenas vacías o false.
     */
    const formTieneContenido = (f) => {
        if (!f) return false;
        // Comparar contra initialForm — solo hay contenido si algún campo difiere del valor por defecto
        return Object.keys(initialForm).some(k => {
            const v = f[k];
            const def = initialForm[k];
            if (v === def) return false;
            if (v === null || v === undefined || v === '' || v === false) return false;
            return true;
        });
    };

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
            const { form: f, domicilios: d, tatuajes: t, consumoSustancias: cs, personasHabita: ph, referencias: r } = JSON.parse(raw);
            setForm(f);
            if (d) setDomicilios(d);
            if (t) setTatuajes(t);
            if (cs) setConsumoSustancias(cs);
            if (ph) setPersonasHabita(ph);
            if (r) setReferencias(r);
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
        const draft = { form, domicilios, tatuajes, consumoSustancias, personasHabita, referencias };
        localStorage.setItem(draftKey, JSON.stringify(draft));
        const ahora = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
        localStorage.setItem(draftKey + '-meta', ahora);
        setDraftGuardadoEn(ahora);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form, domicilios, tatuajes, consumoSustancias, personasHabita, referencias]);

    // Auto-genera CURP cuando cambian los campos clave, salvo que el usuario lo haya editado manualmente
    useEffect(() => {
        if (curpManual) return;
        const generado = generarCURP(form);
        if (generado) set('curp', generado);
    }, [form.nombre, form.apPaterno, form.apMaterno, form.fechaNacimiento, form.estadoNacimiento, form.genero]);

    const hoy = new Date().toISOString().split('T')[0];
    const maxFechaNac = (() => {
        const d = new Date(); d.setFullYear(d.getFullYear() - 18); return d.toISOString().split('T')[0];
    })();

    const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

    const handleFechaNacimiento = (fecha) => {
        set('fechaNacimiento', fecha);
        if (fecha) {
            const hoyDate = new Date();
            const nac = new Date(fecha);
            let edad = hoyDate.getFullYear() - nac.getFullYear();
            const m = hoyDate.getMonth() - nac.getMonth();
            if (m < 0 || (m === 0 && hoyDate.getDate() < nac.getDate())) edad--;
            set('edad', edad >= 0 ? edad : '');
        } else {
            set('edad', '');
        }
    };

    const handleFotoChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => setFotoPreview(ev.target.result);
        reader.readAsDataURL(file);
    };

    const setTatuaje = (i, key, val) => {
        const nuevos = [...tatuajes];
        nuevos[i][key] = val;
        setTatuajes(nuevos);
    };

    /**
     * Valida los campos obligatorios (causa penal, nombre, apellido, tipo de seguimiento),
     * construye el payload convirtiendo strings vacíos a null (Spring no puede deserializar
     * "" como LocalDate) y envía la entrevista. Borra el draft al guardar exitosamente.
     */
    const handleGuardar = async () => {
        // Validación con resaltado de campos
        const nuevosErrores = {
            causaPenal: !form.causaPenal,
            nombre: !form.nombre,
            apPaterno: !form.apPaterno,
            tipoSeguimiento: !form.tipoSeguimiento,
        };
        setErrores(nuevosErrores);
        const primerError = Object.keys(nuevosErrores).find(k => nuevosErrores[k]);
        if (primerError) {
            setError('Por favor completa todos los campos obligatorios marcados en rojo');
            const el = document.getElementById(`fe-${primerError}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }
        setLoading(true);
        setError('');
        setErrores({});
        try {
            const payload = Object.fromEntries(
                Object.entries({
                    ...form,
                    documentosMigratorios: form.documentosMigratorios.join(', ') || null,
                    domicilios,
                    consumoSustancias,
                    personasHabita,
                    referencias,
                    fotoImputado: fotoPreview
                }).map(([k, v]) => [k, v === '' ? null : v])
            );
            const res = await crearEntrevista(payload);
            if (res.data.ok) {
                borrarDraft();
                onGuardado();
            } else {
                setError(res.data.message || 'Error al guardar la entrevista');
            }
        } catch (e) {
            setError(e.response?.data?.message || e.message || 'Error al guardar la entrevista');
        }
        setLoading(false);
    };

    const agregarDomicilio = () => {
        setDomicilios([...domicilios, { calle: '', numero: '', colonia: '', ciudad: '', municipio: '', estado: '', cp: '', tipoDomicilio: '', tipoDomicilioOtro: '', coordenadas: '', anios: '', propietario: '', diasDisponibles: '', horaDisponible: '', referencias: '', razon: '' }]);
    };

    const setDomicilio = (i, key, val) => {
        const nuevos = [...domicilios];
        nuevos[i][key] = val;
        setDomicilios(nuevos);
    };

    return (
        <div className="fe-container">
            {/* Barra fija superior */}
            <div className="fe-topbar">
                <span className="fe-topbar-titulo">Nueva Entrevista de Encuadre</span>
                <button className="fe-btn-cancelar" onClick={onCancelar}>← Cancelar y Volver</button>
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

            <div className="fe-titulo-principal">
                {/* <h2>ENTREVISTA DE ENCUADRE</h2> */}
                <div className="fe-libro-foja">
                    <div className="fe-campo-inline">
                        <label>LIBRO:</label>
                        <input value={form.libro} onChange={e => set('libro', e.target.value)} />
                    </div>
                    <div className="fe-campo-inline">
                        <label>FOJA:</label>
                        <input value={form.foja} onChange={e => set('foja', e.target.value)} />
                    </div>
                </div>
            </div>

            {error && <div className="fe-error">{error}</div>}

            {seccionTitulo('DATOS GENERALES')}
            <div className="fe-grid-2">
                {campo('Fecha de Registro', <input type="date" value={form.fechaRegistro} max={hoy} onChange={e => set('fechaRegistro', e.target.value)} />)}
                {campo('Causa Penal *', <input id="fe-causaPenal" value={form.causaPenal} onChange={e => { set('causaPenal', e.target.value); setErrores(p => ({...p, causaPenal: false})); }} placeholder="Causa penal" />, errores.causaPenal)}
            </div>

            {/* Foto del imputado */}
            <div className="fe-foto-row">
                <div
                    className="fe-foto-wrap"
                    onClick={() => !fotoPreview && fotoInputRef.current?.click()}
                    title={fotoPreview ? '' : 'Subir foto'}
                    style={{ cursor: fotoPreview ? 'default' : 'pointer' }}
                >
                    {fotoPreview
                        ? <img src={fotoPreview} alt="Foto" className="fe-foto-img" onClick={() => setFotoZoom(true)} title="Click para ampliar" style={{ cursor: 'zoom-in' }} />
                        : <div className="fe-foto-placeholder"><i className="bi bi-person-fill"></i></div>
                    }
                    {!fotoPreview && <div className="fe-foto-overlay"><i className="bi bi-camera-fill"></i></div>}
                    <input type="file" accept="image/*" ref={fotoInputRef} style={{ display: 'none' }} onChange={handleFotoChange} />
                </div>
                <div className="fe-foto-info">
                    <span className="fe-foto-label">Fotografía del imputado</span>
                    {fotoPreview && <small>Click en la imagen para ampliar</small>}
                </div>
                {fotoPreview && (
                    <button type="button" className="fe-foto-quitar" onClick={() => setFotoPreview(null)} title="Quitar foto">
                        <i className="bi bi-x-circle"></i> Quitar
                    </button>
                )}
            </div>

            {/* Zoom foto formulario */}
            {fotoZoom && fotoPreview && (
                <div className="imp-zoom-overlay" onClick={() => setFotoZoom(false)}>
                    <img src={fotoPreview} alt="Foto ampliada" className="imp-zoom-img" />
                    <button className="imp-zoom-close" onClick={() => setFotoZoom(false)}><i className="bi bi-x-lg"></i></button>
                </div>
            )}

            <div className="fe-grid-3">
                {campo('Nombre(s) *', <input id="fe-nombre" value={form.nombre} onChange={e => { set('nombre', e.target.value); setErrores(p => ({...p, nombre: false})); }} />, errores.nombre)}
                {campo('Apellido Paterno *', <input id="fe-apPaterno" value={form.apPaterno} onChange={e => { set('apPaterno', e.target.value); setErrores(p => ({...p, apPaterno: false})); }} />, errores.apPaterno)}
                {campo('Apellido Materno', <input value={form.apMaterno} onChange={e => set('apMaterno', e.target.value)} />)}
            </div>
            <div className="fe-grid-4" style={{marginTop: '14px'}}>
                {campo('Fecha de Nacimiento', <input type="date" value={form.fechaNacimiento} max={maxFechaNac} onChange={e => handleFechaNacimiento(e.target.value)} />)}
                {campo('Edad', <input type="number" value={form.edad} readOnly style={{background:'#f5f5f5', cursor:'not-allowed'}} title="Se calcula automáticamente" />)}
                {campo('Municipio', <input value={form.municipio} onChange={e => set('municipio', e.target.value)} />)}
                {campo('Estado', (
                    <select value={form.estadoNacimiento} onChange={e => { set('estadoNacimiento', e.target.value); setCurpManual(false); }}>
                        <option value="">Seleccionar...</option>
                        {ESTADOS_MX.map(s => <option key={s}>{s}</option>)}
                    </select>
                ))}
            </div>
            {form.estadoNacimiento === 'Extranjero' && (
                <div className="fe-grid-2">
                    {campo('País de origen', <input value={form.pais === 'México' ? '' : form.pais} onChange={e => set('pais', e.target.value)} placeholder="Especificar país" />)}
                    {campo('Lugar de procedencia', <input value={form.estadoExtranjero} onChange={e => set('estadoExtranjero', e.target.value)} placeholder="Ciudad / Estado / Región" />)}
                </div>
            )}
            <div style={{marginTop: '14px'}}>
                {campo('CURP',
                    <div style={{position:'relative'}}>
                        <input
                            value={form.curp}
                            onChange={e => { setCurpManual(true); set('curp', e.target.value.toUpperCase()); }}
                            className="fe-input-full"
                            placeholder="Se genera automáticamente"
                            maxLength={18}
                            style={{textTransform:'uppercase', paddingRight: curpManual ? 100 : 0}}
                        />
                        {curpManual && (
                            <button
                                type="button"
                                onClick={() => { setCurpManual(false); set('curp', generarCURP(form) || ''); }}
                                style={{position:'absolute', right:6, top:'50%', transform:'translateY(-50%)', fontSize:11, padding:'2px 8px', background:'#e8f5e9', border:'1px solid #376842', borderRadius:4, color:'#376842', cursor:'pointer'}}
                            >↺ Regenerar</button>
                        )}
                    </div>
                )}
            </div>
            <div className="fe-grid-2" style={{marginTop: '14px'}}>
                {campo('Teléfono Casa', <input value={form.telefonoCasa} onChange={e => set('telefonoCasa', e.target.value)} />)}
                {campo('Celular', <input value={form.celular} onChange={e => set('celular', e.target.value)} />)}
            </div>
            <div style={{marginTop: '14px'}}>
                {campo('E-mail', <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className="fe-input-full" />)}
            </div>
            <div className="fe-grid-3" style={{marginTop: '14px'}}>
                {campo('País', <input value={form.pais} onChange={e => set('pais', e.target.value)} />)}
                {campo('Enfermedad', <input value={form.enfermedad} onChange={e => set('enfermedad', e.target.value)} />)}
                {campo('Grado de Estudios', (
                    <select value={form.gradoEstudios} onChange={e => set('gradoEstudios', e.target.value)}>
                        <option value="">Seleccionar...</option>
                        <option>Sin estudios</option>
                        <option>Primaria</option>
                        <option>Secundaria</option>
                        <option>Preparatoria</option>
                        <option>Licenciatura</option>
                        <option>Posgrado</option>
                    </select>
                ))}
            </div>

            {seccionTitulo('DATOS BIOMÉTRICOS')}
            <div className="fe-grid-2">
                {campo('Género', (
                    <select value={form.genero} onChange={e => set('genero', e.target.value)}>
                        <option value="">Seleccionar...</option>
                        <option>Masculino</option>
                        <option>Femenino</option>
                        <option>No binario</option>
                        <option>Prefiero no decir</option>
                    </select>
                ))}
                {campo('Complexión', (
                    <select value={form.complexion} onChange={e => set('complexion', e.target.value)}>
                        <option value="">Seleccionar...</option>
                        <option>Delgada</option>
                        <option>Regular</option>
                        <option>Robusta</option>
                        <option>Obesa</option>
                    </select>
                ))}
            </div>
            <div className="fe-grid-2">
                {campo('Estatura (cm)', <input type="number" value={form.estatura} onChange={e => set('estatura', e.target.value)} placeholder="cm" />)}
                {campo('Tamaño y Color de Ojos', <input value={form.colorOjos} onChange={e => set('colorOjos', e.target.value)} />)}
            </div>
            <div className="fe-grid-3">
                {campo('Cejas', (
                    <select value={form.cejas} onChange={e => set('cejas', e.target.value)}>
                        <option value="">Seleccionar...</option>
                        <option>Delgadas</option>
                        <option>Medianas</option>
                        <option>Gruesas</option>
                        <option>Arqueadas</option>
                        <option>Rectas</option>
                    </select>
                ))}
                {campo('Tez de Piel', (
                    <select value={form.tezPiel} onChange={e => set('tezPiel', e.target.value)}>
                        <option value="">Seleccionar...</option>
                        <option>Clara</option>
                        <option>Morena clara</option>
                        <option>Morena</option>
                        <option>Morena oscura</option>
                        <option>Negra</option>
                    </select>
                ))}
                {campo('Color y Tamaño de Cabello', <input value={form.colorCabello} onChange={e => set('colorCabello', e.target.value)} />)}
            </div>
            <div className="fe-grid-2">
                {campo('Tamaño de Labios', (
                    <select value={form.tamLabios} onChange={e => set('tamLabios', e.target.value)}>
                        <option value="">Seleccionar...</option>
                        <option>Delgados</option>
                        <option>Medianos</option>
                        <option>Gruesos</option>
                    </select>
                ))}
                {campo('Señas en la Cara', <input value={form.senasCara} onChange={e => set('senasCara', e.target.value)} />)}
            </div>

            <div className="fe-radio-grupo">
                <label>¿Tiene tatuajes y/o cicatrices?</label>
                <div className="fe-radio-opciones">
                    <label><input type="radio" checked={form.tieneTatuajes === true} onChange={() => set('tieneTatuajes', true)} /> Sí</label>
                    <label><input type="radio" checked={form.tieneTatuajes === false} onChange={() => set('tieneTatuajes', false)} /> No</label>
                </div>
            </div>

            {form.tieneTatuajes && (
                <div className="fe-tatuajes">
                    <table className="fe-tatuajes-table">
                        <thead>
                            <tr>
                                <th>Parte del Cuerpo</th>
                                <th>Descripción del Tatuaje/Cicatriz</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {tatuajes.map((t, i) => (
                                <tr key={i}>
                                    <td><input value={t.parteCuerpo} onChange={e => setTatuaje(i, 'parteCuerpo', e.target.value)} placeholder="Ej: Brazo izquierdo" /></td>
                                    <td><input value={t.descripcion} onChange={e => setTatuaje(i, 'descripcion', e.target.value)} placeholder="Descripción detallada" /></td>
                                    <td>
                                        {tatuajes.length > 1 && (
                                            <button className="fe-btn-eliminar-dom" onClick={() => setTatuajes(tatuajes.filter((_, idx) => idx !== i))}>✕</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <button className="fe-btn-agregar-dom" onClick={() => setTatuajes([...tatuajes, { parteCuerpo: '', descripcion: '' }])}>
                        + Agregar fila
                    </button>
                </div>
            )}

            <div className="fe-grid-2">
                {campo('Alias', <input value={form.alias} onChange={e => set('alias', e.target.value)} />)}
                {campo('Documentos Migratorios', (
                    <div className="fe-checkbox-grupo">
                        {['Visa', 'Pasaporte', 'Residencia'].map(doc => (
                            <label key={doc} className="fe-checkbox-item">
                                <input
                                    type="checkbox"
                                    checked={form.documentosMigratorios.includes(doc)}
                                    onChange={() => {
                                        const arr = form.documentosMigratorios.includes(doc)
                                            ? form.documentosMigratorios.filter(d => d !== doc)
                                            : [...form.documentosMigratorios, doc];
                                        set('documentosMigratorios', arr);
                                    }}
                                /> {doc}
                            </label>
                        ))}
                    </div>
                ))}
            </div>

            {seccionTitulo('ESTADO CIVIL Y TEMPORALIDAD')}
            <div className="fe-radio-grupo">
                <div className="fe-radio-opciones fe-radio-wrap">
                    {['Soltero', 'Casado', 'Concubinato', 'Divorciado', 'Viudo', 'Otro'].map(op => (
                        <label key={op}>
                            <input type="radio" name="estadoCivil" checked={form.estadoCivil === op} onChange={() => set('estadoCivil', op)} /> {op}
                        </label>
                    ))}
                </div>
                {form.estadoCivil === 'Otro' && (
                    <input
                        className="fe-input-full fe-esp-input"
                        placeholder="Especificar estado civil..."
                        value={form.estadoCivilOtro}
                        onChange={e => set('estadoCivilOtro', e.target.value)}
                        style={{ marginTop: 8 }}
                    />
                )}
            </div>

            <div className="fe-radio-grupo" style={{ marginTop: '14px' }}>
                <label>¿Te identificas con alguno de los siguientes grupos vulnerables?</label>
                <div className="fe-radio-opciones fe-radio-wrap">
                    {['Indígena', 'Afrodescendiente', 'LGBTTTIQ+', 'Discapacidad', 'Otro'].map(op => {
                        const vals = form.grupoVulnerable ? form.grupoVulnerable.split(',').map(v => v.trim()) : [];
                        const checked = vals.includes(op);
                        const toggle = () => {
                            const next = checked ? vals.filter(v => v !== op) : [...vals, op];
                            set('grupoVulnerable', next.join(', '));
                        };
                        return (
                            <label key={op}>
                                <input type="checkbox" checked={checked} onChange={toggle} /> {op}
                            </label>
                        );
                    })}
                </div>
                {form.grupoVulnerable?.split(',').map(v => v.trim()).includes('Otro') && (
                    <input
                        className="fe-input-full fe-esp-input"
                        placeholder="Especificar grupo vulnerable..."
                        value={form.grupoVulnerableOtro}
                        onChange={e => set('grupoVulnerableOtro', e.target.value)}
                        style={{ marginTop: 8 }}
                    />
                )}
            </div>

            {seccionTitulo('DATOS DE CONTACTO')}
            <div className="fe-radio-grupo">
                <label>¿Conoce a la víctima y/o algún dato de contacto de ella?</label>
                <div className="fe-radio-opciones">
                    <label><input type="radio" checked={form.conoceVictima === true} onChange={() => set('conoceVictima', true)} /> Sí</label>
                    <label><input type="radio" checked={form.conoceVictima === false} onChange={() => set('conoceVictima', false)} /> No</label>
                </div>
            </div>
            {form.conoceVictima && (
                <>
                    <div className="fe-grid-2">
                        {campo('Nombre de la víctima', <input value={form.nombreVictima} onChange={e => set('nombreVictima', e.target.value)} />)}
                        {campo('Tel', <input value={form.telVictima} onChange={e => set('telVictima', e.target.value)} />)}
                    </div>
                    {campo('Domicilio y Referencias', <textarea value={form.domicilioVictima} onChange={e => set('domicilioVictima', e.target.value)} className="fe-textarea" />)}
                    <div style={{ marginTop: '14px' }}>
                    {campo('Relación con la víctima', (
                        <div className="fe-relacion-row">
                            <select value={form.relacionVictima} onChange={e => set('relacionVictima', e.target.value)}>
                                <option value="">Seleccionar...</option>
                                {['Esposo/a', 'Pareja', 'Familiar', 'Vecino/a', 'Amigo/a', 'Compañero/a de trabajo', 'Otro'].map(op => (
                                    <option key={op}>{op}</option>
                                ))}
                            </select>
                            {form.relacionVictima === 'Otro' && (
                                <input
                                    value={form.relacionVictimaOtro}
                                    onChange={e => set('relacionVictimaOtro', e.target.value)}
                                    placeholder="Especificar relación..."
                                    style={{ marginTop: 6 }}
                                />
                            )}
                        </div>
                    ))}
                    </div>
                </>
            )}

            {seccionTitulo('DOMICILIO')}
            {domicilios.map((dom, i) => (
                <div key={i} className="fe-domicilio-bloque">
                    <div className="fe-domicilio-header">
                        <h4>Domicilio {i + 1}</h4>
                        {i > 0 && (
                            <button className="fe-btn-eliminar-dom" onClick={() => setDomicilios(domicilios.filter((_, idx) => idx !== i))}>✕</button>
                        )}
                    </div>
                    {i > 0 && campo('Razón', <input value={dom.razon} onChange={e => setDomicilio(i, 'razon', e.target.value)} placeholder="Razón del segundo domicilio" />)}
                    <div className="fe-grid-4">
                        {campo('Calle', <input value={dom.calle} onChange={e => setDomicilio(i, 'calle', e.target.value)} />)}
                        {campo('Número', <input value={dom.numero} onChange={e => setDomicilio(i, 'numero', e.target.value)} />)}
                        {campo('Colonia', <input value={dom.colonia} onChange={e => setDomicilio(i, 'colonia', e.target.value)} />)}
                        {campo('Ciudad', <input value={dom.ciudad} onChange={e => setDomicilio(i, 'ciudad', e.target.value)} />)}
                        {campo('Municipio', <input value={dom.municipio} onChange={e => setDomicilio(i, 'municipio', e.target.value)} />)}
                        {campo('Estado', <input value={dom.estado} onChange={e => setDomicilio(i, 'estado', e.target.value)} />)}
                        {campo('C.P.', <input value={dom.cp} onChange={e => setDomicilio(i, 'cp', e.target.value)} />)}
                        <div className="fe-campo">
                            <label className="fe-label">Tipo</label>
                            <select value={dom.tipoDomicilio} onChange={e => setDomicilio(i, 'tipoDomicilio', e.target.value)} className="fe-input">
                                <option value="">Seleccionar...</option>
                                <option value="Propio">Propio</option>
                                <option value="Rentado">Rentado</option>
                                <option value="Prestado">Prestado</option>
                                <option value="Familiar">Familiar</option>
                                <option value="En comodato">En comodato</option>
                                <option value="Vecindad">Vecindad</option>
                                <option value="Albergue / Casa hogar">Albergue / Casa hogar</option>
                                <option value="Otro">Otro</option>
                            </select>
                            {dom.tipoDomicilio === 'Otro' && (
                                <input
                                    value={dom.tipoDomicilioOtro}
                                    onChange={e => setDomicilio(i, 'tipoDomicilioOtro', e.target.value)}
                                    className="fe-input"
                                    style={{ marginTop: 6 }}
                                    placeholder="Especifique el tipo..."
                                />
                            )}
                        </div>
                        <div className="fe-campo-coords-grid">
                            {/* Columna izquierda: label con hint integrado + input */}
                            <div className="fe-campo">
                                <label className="fe-label">
                                    Coordenadas <span className="fe-label-hint"> — Clic derecho en Google Maps sobre el lugar exacto → copia las coordenadas → pégalas aquí.</span>
                                </label>
                                <input
                                    value={dom.coordenadas || ''}
                                    onChange={e => setDomicilio(i, 'coordenadas', e.target.value)}
                                    className="fe-input"
                                    placeholder="ej. 18.738241, -99.227822"
                                />
                            </div>
                            {/* Columna derecha: solo botón alineado abajo */}
                            <div className="fe-campo fe-coords-btn-col">
                                <label className="fe-label" style={{visibility:'hidden', userSelect:'none'}}>·</label>
                                <a
                                    href={dom.coordenadas
                                        ? `https://www.google.com/maps?q=${dom.coordenadas.trim()}`
                                        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([dom.calle, dom.numero, dom.colonia, dom.ciudad, dom.municipio, dom.estado].filter(Boolean).join(', '))}`}
                                    target="_blank" rel="noopener noreferrer"
                                    className="fe-btn-maps fe-btn-maps-full"
                                >
                                    <i className="bi bi-geo-alt-fill" />
                                    {dom.coordenadas ? 'Abrir en Google Maps' : 'Buscar ubicación en mapa'}
                                </a>
                            </div>
                        </div>
                    </div>
                    <div className="fe-grid-4">
                        {campo('Años', <input type="number" value={dom.anios} onChange={e => setDomicilio(i, 'anios', e.target.value)} />)}
                        {campo('Propietario', <input value={dom.propietario} onChange={e => setDomicilio(i, 'propietario', e.target.value)} />)}
                        {campo('Días disponibles', <input value={dom.diasDisponibles} onChange={e => setDomicilio(i, 'diasDisponibles', e.target.value)} />)}
                        {campo('Hora disponible', <input value={dom.horaDisponible} onChange={e => setDomicilio(i, 'horaDisponible', e.target.value)} />)}
                    </div>
                    {campo('Referencias del Domicilio', <textarea value={dom.referencias} onChange={e => setDomicilio(i, 'referencias', e.target.value)} className="fe-textarea" />)}
                </div>
            ))}
            <button className="fe-btn-agregar-dom" onClick={agregarDomicilio}>+ Agregar Otro Domicilio</button>

            {seccionTitulo('PERSONAS CON LAS QUE HABITA')}
            <div className="fe-tabla-wrap">
                <table className="fe-tabla">
                    <thead>
                        <tr><th>Nombre</th><th>Parentesco</th><th>Edad</th><th>Teléfono</th><th>Escolaridad</th><th>Ocupación</th><th></th></tr>
                    </thead>
                    <tbody>
                        {personasHabita.map((p, i) => (
                            <tr key={i}>
                                <td><input value={p.nombre}      onChange={e => { const n=[...personasHabita]; n[i]={...n[i],nombre:e.target.value};      setPersonasHabita(n); }} /></td>
                                <td><input value={p.parentesco}  onChange={e => { const n=[...personasHabita]; n[i]={...n[i],parentesco:e.target.value};  setPersonasHabita(n); }} /></td>
                                <td><input value={p.edad}        onChange={e => { const n=[...personasHabita]; n[i]={...n[i],edad:e.target.value};        setPersonasHabita(n); }} type="number" /></td>
                                <td><input value={p.telefono}    onChange={e => { const n=[...personasHabita]; n[i]={...n[i],telefono:e.target.value};    setPersonasHabita(n); }} /></td>
                                <td>
                                    <select value={p.escolaridad} onChange={e => { const n=[...personasHabita]; n[i]={...n[i],escolaridad:e.target.value}; setPersonasHabita(n); }}>
                                        <option value="">Seleccionar...</option>
                                        {['Sin estudios','Primaria','Secundaria','Preparatoria','Licenciatura','Posgrado'].map(o => <option key={o}>{o}</option>)}
                                    </select>
                                </td>
                                <td><input value={p.ocupacion}   onChange={e => { const n=[...personasHabita]; n[i]={...n[i],ocupacion:e.target.value};   setPersonasHabita(n); }} /></td>
                                <td>{personasHabita.length > 1 && <button className="fe-btn-eliminar-dom" onClick={() => setPersonasHabita(personasHabita.filter((_,idx)=>idx!==i))}>✕</button>}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <button className="fe-btn-agregar-dom" onClick={() => setPersonasHabita([...personasHabita, { nombre:'', parentesco:'', edad:'', telefono:'', escolaridad:'', ocupacion:'' }])}>+ Agregar fila</button>
            </div>

            {seccionTitulo('REFERENCIAS PERSONALES')}
            <div className="fe-tabla-wrap">
                <table className="fe-tabla">
                    <thead>
                        <tr><th>Nombre</th><th>Parentesco</th><th>Edad</th><th>Teléfono</th><th>Dirección</th><th></th></tr>
                    </thead>
                    <tbody>
                        {referencias.map((r, i) => (
                            <tr key={i}>
                                <td><input value={r.nombre}     onChange={e => { const n=[...referencias]; n[i]={...n[i],nombre:e.target.value};     setReferencias(n); }} /></td>
                                <td><input value={r.parentesco} onChange={e => { const n=[...referencias]; n[i]={...n[i],parentesco:e.target.value}; setReferencias(n); }} /></td>
                                <td><input value={r.edad}       onChange={e => { const n=[...referencias]; n[i]={...n[i],edad:e.target.value};       setReferencias(n); }} type="number" /></td>
                                <td><input value={r.telefono}   onChange={e => { const n=[...referencias]; n[i]={...n[i],telefono:e.target.value};   setReferencias(n); }} /></td>
                                <td><input value={r.direccion}  onChange={e => { const n=[...referencias]; n[i]={...n[i],direccion:e.target.value};  setReferencias(n); }} /></td>
                                <td>{referencias.length > 1 && <button className="fe-btn-eliminar-dom" onClick={() => setReferencias(referencias.filter((_,idx)=>idx!==i))}>✕</button>}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <button className="fe-btn-agregar-dom" onClick={() => setReferencias([...referencias, { nombre:'', parentesco:'', edad:'', telefono:'', direccion:'' }])}>+ Agregar fila</button>
            </div>

            {seccionTitulo('INFORMACIÓN LABORAL')}
            <div className="fe-grid-3">
                {campo('Actividad laboral / Empresa', <input value={form.empresa} onChange={e => set('empresa', e.target.value)} />)}
                {campo('Teléfono', <input value={form.telEmpresa} onChange={e => set('telEmpresa', e.target.value)} />)}
                {campo('Salario Mensual', <input type="number" value={form.salarioMensual} onChange={e => set('salarioMensual', e.target.value)} />)}
            </div>
            <div className="fe-grid-3">
                {campo('Puesto', <input value={form.puesto} onChange={e => set('puesto', e.target.value)} />)}
                {campo('Nombre del Jefe', <input value={form.nombreJefe} onChange={e => set('nombreJefe', e.target.value)} />)}
                {campo('Horario', <input value={form.horarioTrabajo} onChange={e => set('horarioTrabajo', e.target.value)} />)}
            </div>
            {campo('Domicilio', <input value={form.domicilioTrabajo} onChange={e => set('domicilioTrabajo', e.target.value)} className="fe-input-full" />)}
            {campo('En caso de no contar con empleo, mencionar el último empleo', <textarea value={form.ultimoEmpleo} onChange={e => set('ultimoEmpleo', e.target.value)} className="fe-textarea" />)}

            {seccionTitulo('CONSUMO DE SUSTANCIAS')}
            <div className="fe-tabla-wrap">
                <table className="fe-tabla">
                    <thead>
                        <tr>
                            <th>Sustancia</th>
                            <th>Sí</th>
                            <th>No</th>
                            <th>Desde</th>
                            <th>Periodicidad</th>
                            <th>Cantidad</th>
                            <th>Último Consumo</th>
                        </tr>
                    </thead>
                    <tbody>
                        {consumoSustancias.map((row, i) => (
                            <tr key={i}>
                                <td>
                                    <strong>{row.sustancia}</strong>
                                    {row.sustancia === 'Otra' && row.consume && (
                                        <input style={{marginTop:'4px',display:'block'}} placeholder="¿Cuál?" value={row.otraEsp} onChange={e => { const n=[...consumoSustancias]; n[i]={...n[i],otraEsp:e.target.value}; setConsumoSustancias(n); }} />
                                    )}
                                </td>
                                <td className="fe-td-center"><input type="radio" checked={row.consume === true}  onChange={() => { const n=[...consumoSustancias]; n[i]={...n[i],consume:true};  setConsumoSustancias(n); }} /></td>
                                <td className="fe-td-center"><input type="radio" checked={row.consume === false} onChange={() => { const n=[...consumoSustancias]; n[i]={...n[i],consume:false}; setConsumoSustancias(n); }} /></td>
                                <td><input value={row.desde}              disabled={!row.consume} onChange={e => { const n=[...consumoSustancias]; n[i]={...n[i],desde:e.target.value};              setConsumoSustancias(n); }} /></td>
                                <td><input value={row.periodicidad}       disabled={!row.consume} onChange={e => { const n=[...consumoSustancias]; n[i]={...n[i],periodicidad:e.target.value};       setConsumoSustancias(n); }} /></td>
                                <td><input value={row.cantidad}           disabled={!row.consume} onChange={e => { const n=[...consumoSustancias]; n[i]={...n[i],cantidad:e.target.value};           setConsumoSustancias(n); }} /></td>
                                <td><input value={row.fechaUltimoConsumo} disabled={!row.consume} onChange={e => { const n=[...consumoSustancias]; n[i]={...n[i],fechaUltimoConsumo:e.target.value}; setConsumoSustancias(n); }} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {seccionTitulo('PREGUNTAS GENERALES')}
            {[
                { key: 'tratamientoAdicciones', esp: 'tratamientoAdiccionesEsp', label: '¿Se encuentra en un tratamiento de adicciones?' },
                { key: 'familiaresExterior',    esp: 'familiaresExteriorEsp',    label: '¿Tiene familiares fuera del estado o del país?' },
            ].map(({ key, esp, label }) => (
                <div key={key} className="fe-pregunta-bloque">
                    <div className="fe-radio-grupo">
                        <label>{label}</label>
                        <div className="fe-radio-opciones">
                            <label><input type="radio" checked={form[key] === true}  onChange={() => set(key, true)}  /> Sí</label>
                            <label><input type="radio" checked={form[key] === false} onChange={() => set(key, false)} /> No</label>
                        </div>
                    </div>
                    {form[key] && (
                        <input
                            className="fe-input-full fe-esp-input"
                            placeholder="Especificar..."
                            value={form[esp] || ''}
                            onChange={e => set(esp, e.target.value)}
                        />
                    )}
                </div>
            ))}

            {seccionTitulo('SELECCIONE EL TIPO DE SEGUIMIENTO')}
            <p className="fe-subtitulo">Según lo dictaminado por el juez, seleccione el proceso de seguimiento:</p>
            <div id="fe-tipoSeguimiento" className={`fe-tipo-seguimiento${errores.tipoSeguimiento ? ' fe-tipo-seguimiento-error' : ''}`}>
                <div className={`fe-tipo-card ${form.tipoSeguimiento === 'MC' ? 'fe-tipo-selected' : ''}`} onClick={() => { set('tipoSeguimiento', 'MC'); setErrores(p => ({...p, tipoSeguimiento: false})); }}>
                    <h4>M.C.</h4>
                    <p className="fe-tipo-label">MEDIDA CAUTELAR</p>
                    <p className="fe-tipo-desc">Proceso de seguimiento con medidas cautelares establecidas por el juez.</p>
                </div>
                <div className={`fe-tipo-card ${form.tipoSeguimiento === 'SCP' ? 'fe-tipo-selected' : ''}`} onClick={() => { set('tipoSeguimiento', 'SCP'); setErrores(p => ({...p, tipoSeguimiento: false})); }}>
                    <h4>S.C.P.</h4>
                    <p className="fe-tipo-label">SUSPENSIÓN CONDICIONAL DEL PROCESO</p>
                    <p className="fe-tipo-desc">Proceso alternativo donde se suspende el procedimiento de manera condicional.</p>
                </div>
            </div>
            {errores.tipoSeguimiento && <span className="fe-campo-error-msg">Debes seleccionar un tipo de seguimiento</span>}

            <div className="fe-botones">
                <button className="fe-btn-cancelar" onClick={onCancelar}>← Cancelar y Volver</button>
                <button className="fe-btn-guardar" onClick={handleGuardar} disabled={loading}>
                    {loading ? 'Guardando...' : 'Guardar Entrevista'}
                </button>
            </div>
        </div>
    );
};

export default FormularioEntrevista;