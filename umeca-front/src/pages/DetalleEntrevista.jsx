import { useState, useRef, useEffect } from 'react';
import { actualizarEntrevista } from '../api/entrevistasApi';
import { actualizarFotoImputado, getImputadoById } from '../api/imputadosApi';
import { useAuth } from '../context/AuthContext';
import PrintEntrevista from './PrintEntrevista';
import HistorialRegistro from '../components/HistorialRegistro';
import './DetalleEntrevista.css';
import './Imputados.css';

const seccion = (titulo) => (
    <div className="de-seccion-titulo"><h3>{titulo}</h3></div>
);

const campo = (label, valor) => (
    <div className="de-campo">
        <span className="de-label">{label}</span>
        <span className="de-valor">{valor || '—'}</span>
    </div>
);

const campoEdit = (label, value, onChange, type = 'text') => (
    <div className="de-campo-edit">
        <label>{label}</label>
        <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} />
    </div>
);

const campoSelectEdit = (label, value, onChange, opciones) => (
    <div className="de-campo-edit">
        <label>{label}</label>
        <select value={value || ''} onChange={e => onChange(e.target.value)}>
            <option value="">Seleccionar...</option>
            {opciones.map(op => <option key={op} value={op}>{op}</option>)}
        </select>
    </div>
);

const SUSTANCIAS_FIJAS = ['ALCOHOL', 'MARIHUANA', 'COCAÍNA', 'PIEDRA', 'METANFETAMINAS', 'Otra'];
const GRUPOS_VULNERABLES = ['Adulto mayor', 'Menor de edad', 'Discapacidad', 'Indígena', 'LGBTQ+', 'Ninguno'];

const initConsumo = (existing) => {
    return SUSTANCIAS_FIJAS.map(s => {
        const found = existing?.find(c => c.sustancia === s);
        return found
            ? { ...found }
            : { sustancia: s, consume: null, otraEsp: '', desde: '', periodicidad: '', cantidad: '', fechaUltimoConsumo: '' };
    });
};

const DetalleEntrevista = ({ entrevista, onVolver }) => {
    const { user } = useAuth();
    const [editando, setEditando] = useState(false);
    const [form, setForm] = useState({ ...entrevista });
    const [domicilios, setDomicilios] = useState(entrevista.domicilios?.length ? [...entrevista.domicilios] : []);
    const [personasHabita, setPersonasHabita] = useState(entrevista.personasHabita?.length ? [...entrevista.personasHabita] : []);
    const [referencias, setReferencias] = useState(entrevista.referencias?.length ? [...entrevista.referencias] : []);
    const [consumoSustancias, setConsumoSustancias] = useState(initConsumo(entrevista.consumoSustancias));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const puedeEditar = user?.rol === 'ADMINISTRADOR' || user?.rol === 'SUPERVISION';
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

    // ── Foto ──
    const [fotoSrc, setFotoSrc] = useState(entrevista.imputado?.foto || null);
    const [subiendoFoto, setSubiendoFoto] = useState(false);
    const [zoomFoto, setZoomFoto] = useState(false);
    const fotoInputRef = useRef(null);

    // Cargar foto desde el imputado si no vino en el payload de la entrevista
    useEffect(() => {
        const imputadoId = entrevista.imputado?.id;
        if (!fotoSrc && imputadoId) {
            getImputadoById(imputadoId)
                .then(res => { if (res.data.ok && res.data.data.foto) setFotoSrc(res.data.data.foto); })
                .catch(err => console.warn("Error al cargar datos:", err));
        }
    }, [entrevista.imputado?.id]);

    const handleFotoChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const base64 = ev.target.result;
            setSubiendoFoto(true);
            try {
                const imputadoId = entrevista.imputado?.id;
                if (imputadoId) {
                    const res = await actualizarFotoImputado(imputadoId, base64);
                    if (res.data.ok) setFotoSrc(base64);
                } else {
                    setFotoSrc(base64);
                }
            } catch (err) {
                // silenced
            } finally {
                setSubiendoFoto(false);
            }
        };
        reader.readAsDataURL(file);
    };

    const iniciales = () => {
        const n = entrevista.nombre?.[0] ?? '';
        const a = entrevista.apPaterno?.[0] ?? '';
        return (n + a).toUpperCase();
    };

    const cancelarEdicion = () => {
        setEditando(false);
        setForm({ ...entrevista });
        setDomicilios(entrevista.domicilios?.length ? [...entrevista.domicilios] : []);
        setPersonasHabita(entrevista.personasHabita?.length ? [...entrevista.personasHabita] : []);
        setReferencias(entrevista.referencias?.length ? [...entrevista.referencias] : []);
        setConsumoSustancias(initConsumo(entrevista.consumoSustancias));
    };

    const handleGuardar = async () => {
        setLoading(true);
        setError('');
        try {
            const payload = Object.fromEntries(
                Object.entries({ ...form, domicilios, personasHabita, referencias, consumoSustancias })
                    .map(([k, v]) => [k, v === '' ? null : v])
            );
            await actualizarEntrevista(entrevista.id, payload);
            setEditando(false);
            onVolver();
        } catch (e) {
            setError(e.response?.data?.message || 'Error al actualizar');
        }
        setLoading(false);
    };

    const getBadgeClass = (estado) => {
        switch (estado) {
            case 'COMPLETADO': return 'ee-badge-completado';
            case 'EN_REVISION': return 'ee-badge-revision';
            case 'PENDIENTE': return 'ee-badge-pendiente';
            default: return '';
        }
    };

    // ── helpers de colecciones ──
    const addDom = () => setDomicilios(p => [...p, { calle: '', numero: '', colonia: '', ciudad: '', estado: '', cp: '', tipoDomicilio: '' }]);
    const removeDom = (i) => setDomicilios(p => p.filter((_, idx) => idx !== i));
    const setDom = (i, k, v) => setDomicilios(p => p.map((d, idx) => idx === i ? { ...d, [k]: v } : d));

    const addPer = () => setPersonasHabita(p => [...p, { nombre: '', parentesco: '', edad: '', telefono: '', escolaridad: '', ocupacion: '' }]);
    const removePer = (i) => setPersonasHabita(p => p.filter((_, idx) => idx !== i));
    const setPer = (i, k, v) => setPersonasHabita(p => p.map((r, idx) => idx === i ? { ...r, [k]: v } : r));

    const addRef = () => setReferencias(p => [...p, { nombre: '', parentesco: '', edad: '', telefono: '', direccion: '' }]);
    const removeRef = (i) => setReferencias(p => p.filter((_, idx) => idx !== i));
    const setRef = (i, k, v) => setReferencias(p => p.map((r, idx) => idx === i ? { ...r, [k]: v } : r));

    const setConsumo = (i, k, v) => setConsumoSustancias(p => p.map((c, idx) => idx === i ? { ...c, [k]: v } : c));

    const grupoArr = form.grupoVulnerable ? form.grupoVulnerable.split(',').map(s => s.trim()).filter(Boolean) : [];
    const toggleGrupo = (g) => {
        const arr = grupoArr.includes(g) ? grupoArr.filter(x => x !== g) : [...grupoArr, g];
        set('grupoVulnerable', arr.join(', '));
    };

    const [imprimiendo, setImprimiendo] = useState(false);

    return (
        <div className="de-container">
            {imprimiendo && <PrintEntrevista entrevista={form} onCerrar={() => setImprimiendo(false)} />}
            <div className="de-toolbar">
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="de-btn-volver" onClick={onVolver}>← Volver</button>
                    {localStorage.getItem('volverExpedienteId') && (
                        <button className="de-btn-volver de-btn-expediente" onClick={() => {
                            const id = localStorage.getItem('volverExpedienteId');
                            localStorage.removeItem('volverExpedienteId');
                            localStorage.setItem('abrirExpedienteId', id);
                            window.dispatchEvent(new CustomEvent('navigate', { detail: 'imputados' }));
                        }}>
                            <i className="bi bi-person-vcard"></i> Volver al Expediente
                        </button>
                    )}
                </div>
                <div className="de-toolbar-right">
                    <span className={`ee-badge ${getBadgeClass(form.estado)}`}>{form.estado}</span>
                    {!editando && (
                        <button className="de-btn-imprimir" onClick={() => setImprimiendo(true)}>
                            <i className="bi bi-printer" /> Imprimir
                        </button>
                    )}
                    {puedeEditar && !editando && (
                        <button className="de-btn-editar" onClick={() => setEditando(true)}>✎ Editar</button>
                    )}
                    {editando && (
                        <span className="de-editando-badge">Modo edición</span>
                    )}
                </div>
            </div>

            <div className="de-header-info">
                {/* Foto imputado */}
                <div className="de-foto-wrap">
                    {fotoSrc ? (
                        <img
                            src={fotoSrc}
                            alt="Foto imputado"
                            className="de-foto-img"
                            onClick={() => setZoomFoto(true)}
                            title="Click para ampliar"
                            style={{ cursor: 'zoom-in' }}
                        />
                    ) : (
                        <div
                            className="de-foto-iniciales"
                            onClick={() => setZoomFoto(true)}
                            title="Click para ampliar"
                            style={{ cursor: 'pointer' }}
                        >
                            {iniciales()}
                        </div>
                    )}
                    {puedeEditar && editando && (
                        <button
                            className="de-foto-btn"
                            onClick={() => fotoInputRef.current?.click()}
                            title="Cambiar foto"
                            disabled={subiendoFoto}
                        >
                            {subiendoFoto
                                ? <i className="bi bi-arrow-repeat imp-spin"></i>
                                : <i className="bi bi-camera-fill"></i>}
                        </button>
                    )}
                    <input type="file" accept="image/*" ref={fotoInputRef} style={{ display: 'none' }} onChange={handleFotoChange} />
                </div>

                <div>
                    <h2>{entrevista.folio}</h2>
                    <p>{entrevista.nombre} {entrevista.apPaterno} {entrevista.apMaterno}</p>
                </div>
                <div>
                    {editando && (
                        <select value={form.estado} onChange={e => set('estado', e.target.value)} className="de-select-estado">
                            <option value="PENDIENTE">Pendiente</option>
                            <option value="EN_REVISION">En Revisión</option>
                            <option value="COMPLETADO">Completado</option>
                        </select>
                    )}
                </div>
            </div>

            {error && <div className="de-error">{error}</div>}

            {/* ── DATOS GENERALES ── */}
            {seccion('DATOS GENERALES')}
            <div className="de-grid-2">
                {editando ? (
                    <>
                        {campoEdit('Causa Penal', form.causaPenal, v => set('causaPenal', v))}
                        {campoEdit('Fecha Registro', form.fechaRegistro, v => set('fechaRegistro', v), 'date')}
                        {campoEdit('Nombre(s)', form.nombre, v => set('nombre', v))}
                        {campoEdit('Apellido Paterno', form.apPaterno, v => set('apPaterno', v))}
                        {campoEdit('Apellido Materno', form.apMaterno, v => set('apMaterno', v))}
                        {campoEdit('Teléfono Casa', form.telefonoCasa, v => set('telefonoCasa', v))}
                        {campoEdit('Celular', form.celular, v => set('celular', v))}
                        {campoEdit('Email', form.email, v => set('email', v))}
                        <div className="de-campo-edit">
                            <label>Fecha Nacimiento</label>
                            <input type="date" value={form.fechaNacimiento || ''} max={(() => { const d = new Date(); d.setFullYear(d.getFullYear() - 18); return d.toISOString().split('T')[0]; })()} onChange={e => handleFechaNacimiento(e.target.value)} />
                        </div>
                        <div className="de-campo">
                            <span className="de-campo-label">Edad</span>
                            <input type="number" value={form.edad || ''} readOnly style={{background:'#f5f5f5', cursor:'not-allowed'}} title="Se calcula automáticamente" />
                        </div>
                        {campoEdit('Municipio', form.municipio, v => set('municipio', v))}
                        {campoEdit('Estado', form.estadoNacimiento, v => set('estadoNacimiento', v))}
                        {campoEdit('País', form.pais, v => set('pais', v))}
                        {campoEdit('CURP', form.curp, v => set('curp', v.toUpperCase()))}
                        {campoEdit('Enfermedad', form.enfermedad, v => set('enfermedad', v))}
                        {campoSelectEdit('Grado de Estudios', form.gradoEstudios, v => set('gradoEstudios', v),
                            ['Sin estudios', 'Primaria', 'Secundaria', 'Preparatoria', 'Licenciatura', 'Posgrado'])}
                    </>
                ) : (
                    <>
                        {campo('Causa Penal', entrevista.causaPenal)}
                        {campo('Fecha Registro', entrevista.fechaRegistro)}
                        {campo('Nombre(s)', entrevista.nombre)}
                        {campo('Apellido Paterno', entrevista.apPaterno)}
                        {campo('Apellido Materno', entrevista.apMaterno)}
                        {campo('Teléfono Casa', entrevista.telefonoCasa)}
                        {campo('Celular', entrevista.celular)}
                        {campo('Email', entrevista.email)}
                        {campo('Fecha Nacimiento', entrevista.fechaNacimiento)}
                        {campo('Edad', entrevista.edad)}
                        {campo('Municipio', entrevista.municipio)}
                        {campo('Estado', entrevista.estadoNacimiento)}
                        {campo('País', entrevista.pais)}
                        {campo('CURP', entrevista.curp)}
                        {campo('Enfermedad', entrevista.enfermedad)}
                        {campo('Grado Estudios', entrevista.gradoEstudios)}
                    </>
                )}
            </div>

            {/* ── DATOS BIOMÉTRICOS ── */}
            {seccion('DATOS BIOMÉTRICOS')}
            <div className="de-grid-2">
                {editando ? (
                    <>
                        {campoSelectEdit('Género', form.genero, v => set('genero', v),
                            ['Masculino', 'Femenino', 'No binario', 'Prefiero no decir'])}
                        {campoSelectEdit('Complexión', form.complexion, v => set('complexion', v),
                            ['Delgada', 'Regular', 'Robusta', 'Obesa'])}
                        {campoEdit('Estatura (cm)', form.estatura, v => set('estatura', v), 'number')}
                        {campoEdit('Color y Tamaño de Ojos', form.colorOjos, v => set('colorOjos', v))}
                        {campoSelectEdit('Cejas', form.cejas, v => set('cejas', v),
                            ['Delgadas', 'Medianas', 'Gruesas', 'Arqueadas', 'Rectas'])}
                        {campoSelectEdit('Tez de Piel', form.tezPiel, v => set('tezPiel', v),
                            ['Blanca', 'Morena clara', 'Morena', 'Morena oscura', 'Negra'])}
                        {campoEdit('Color y Tamaño de Cabello', form.colorCabello, v => set('colorCabello', v))}
                        {campoSelectEdit('Tamaño de Labios', form.tamLabios, v => set('tamLabios', v),
                            ['Delgados', 'Medianos', 'Gruesos'])}
                        {campoEdit('Señas en la Cara', form.senasCara, v => set('senasCara', v))}
                        <div className="de-campo-edit">
                            <label>¿Tiene tatuajes/cicatrices?</label>
                            <select value={form.tieneTatuajes ? 'true' : 'false'} onChange={e => set('tieneTatuajes', e.target.value === 'true')}>
                                <option value="false">No</option>
                                <option value="true">Sí</option>
                            </select>
                        </div>
                        {campoEdit('Alias', form.alias, v => set('alias', v))}
                        {campoEdit('Documentos Migratorios', form.documentosMigratorios, v => set('documentosMigratorios', v))}
                    </>
                ) : (
                    <>
                        {campo('Género', entrevista.genero)}
                        {campo('Complexión', entrevista.complexion)}
                        {campo('Estatura', entrevista.estatura ? `${entrevista.estatura} cm` : null)}
                        {campo('Color de Ojos', entrevista.colorOjos)}
                        {campo('Cejas', entrevista.cejas)}
                        {campo('Tez de Piel', entrevista.tezPiel)}
                        {campo('Color de Cabello', entrevista.colorCabello)}
                        {campo('Tamaño de Labios', entrevista.tamLabios)}
                        {campo('Señas en la Cara', entrevista.senasCara)}
                        {campo('Tatuajes/Cicatrices', entrevista.tieneTatuajes ? 'Sí' : 'No')}
                        {campo('Alias', entrevista.alias)}
                        {campo('Documentos Migratorios', entrevista.documentosMigratorios)}
                    </>
                )}
            </div>

            {/* ── ESTADO CIVIL ── */}
            {seccion('ESTADO CIVIL Y TEMPORALIDAD')}
            <div className="de-grid-2">
                {editando ? (
                    <>
                        {campoSelectEdit('Estado Civil', form.estadoCivil, v => set('estadoCivil', v),
                            ['Soltero', 'Casado', 'Unión Libre', 'Divorciado', 'Viudo'])}
                        <div className="de-campo-edit de-col-2">
                            <label>¿Te identificas con alguno de los siguientes grupos minoritarios?</label>
                            <div className="de-checkboxes">
                                {GRUPOS_VULNERABLES.map(g => (
                                    <label key={g} className="de-check-label">
                                        <input type="checkbox" checked={grupoArr.includes(g)} onChange={() => toggleGrupo(g)} />
                                        {g}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        {campo('Estado Civil', entrevista.estadoCivil)}
                        <div className="de-campo">
                            <span className="de-label">Grupos minoritarios</span>
                            {entrevista.grupoVulnerable
                                ? <div className="de-chips">{entrevista.grupoVulnerable.split(',').map(g => <span key={g} className="de-chip">{g.trim()}</span>)}</div>
                                : <span className="de-valor">—</span>}
                        </div>
                    </>
                )}
            </div>

            {/* ── DOMICILIOS ── */}
            {seccion('DOMICILIOS')}
            {editando ? (
                <>
                    {domicilios.map((d, i) => (
                        <div key={i} className="de-bloque">
                            <div className="de-bloque-header">
                                <span className="de-bloque-titulo">Domicilio {i + 1}</span>
                                <button className="de-btn-remove" onClick={() => removeDom(i)}>✕</button>
                            </div>
                            <div className="de-grid-2">
                                {campoEdit('Calle', d.calle, v => setDom(i, 'calle', v))}
                                {campoEdit('Número', d.numero, v => setDom(i, 'numero', v))}
                                {campoEdit('Colonia', d.colonia, v => setDom(i, 'colonia', v))}
                                {campoEdit('Ciudad', d.ciudad, v => setDom(i, 'ciudad', v))}
                                {campoEdit('Municipio', d.municipio, v => setDom(i, 'municipio', v))}
                                {campoEdit('Estado', d.estado, v => setDom(i, 'estado', v))}
                                {campoEdit('C.P.', d.cp, v => setDom(i, 'cp', v))}
                                <div className="de-campo">
                                    <label className="de-campo-label">TIPO</label>
                                    <select className="de-input-edit" value={d.tipoDomicilio || ''} onChange={e => setDom(i, 'tipoDomicilio', e.target.value)}>
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
                                    {d.tipoDomicilio === 'Otro' && (
                                        <input
                                            className="de-input-edit"
                                            style={{ marginTop: 6 }}
                                            value={d.tipoDomicilioOtro || ''}
                                            onChange={e => setDom(i, 'tipoDomicilioOtro', e.target.value)}
                                            placeholder="Especifique el tipo..."
                                        />
                                    )}
                                </div>
                                <div className="de-campo" style={{gridColumn:'1/-1'}}>
                                    <label className="de-campo-label">COORDENADAS <span style={{fontWeight:400, color:'#888', fontSize:11}}>(opcional — pega las coordenadas de Google Maps)</span></label>
                                    <div className="fe-coords-row">
                                        <input
                                            className="de-input-edit"
                                            value={d.coordenadas || ''}
                                            onChange={e => setDom(i, 'coordenadas', e.target.value)}
                                            placeholder="ej. 18.738241, -99.227822"
                                        />
                                        <a
                                            href={d.coordenadas
                                                ? `https://www.google.com/maps?q=${d.coordenadas.trim()}`
                                                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([d.calle, d.numero, d.colonia, d.ciudad, d.municipio, d.estado].filter(Boolean).join(', '))}`}
                                            target="_blank" rel="noopener noreferrer"
                                            className="de-btn-maps"
                                        >
                                            <i className="bi bi-map-fill" />
                                            {d.coordenadas ? 'Ver pin exacto' : 'Verificar en mapa'}
                                        </a>
                                    </div>
                                    <span className="fe-coords-hint">Clic derecho en Google Maps sobre el lugar exacto → copia las coordenadas → pégalas aquí.</span>
                                </div>
                            </div>
                        </div>
                    ))}
                    <button className="de-btn-add-row" onClick={addDom}>+ Agregar domicilio</button>
                </>
            ) : (
                domicilios.length === 0
                    ? <p className="de-sin-datos">Sin domicilios registrados.</p>
                    : domicilios.map((d, i) => {
                        const partes = [d.calle, d.numero, d.colonia, d.ciudad, d.municipio, d.estado].filter(Boolean);
                        const direccionCompleta = partes.length > 0 ? partes.join(', ') : (d.calleNumero ? [d.calleNumero, d.colonia, d.municipio, d.estado].filter(Boolean).join(', ') : null);
                        return (
                        <div key={i} className="de-bloque de-bloque-view">
                            <div className="de-bloque-header">
                                <span className="de-bloque-titulo">Domicilio {i + 1}</span>
                                {d.coordenadas ? (
                                    <a
                                        href={`https://www.google.com/maps?q=${d.coordenadas.trim()}`}
                                        target="_blank" rel="noopener noreferrer"
                                        className="de-btn-maps"
                                    >
                                        <i className="bi bi-map-fill" /> Ver pin exacto
                                    </a>
                                ) : direccionCompleta ? (
                                    <a
                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccionCompleta)}`}
                                        target="_blank" rel="noopener noreferrer"
                                        className="de-btn-maps"
                                    >
                                        <i className="bi bi-map-fill" /> Ver en mapa
                                    </a>
                                ) : null}
                            </div>
                            <div className="de-grid-2">
                                {campo('Calle', d.calle)}
                                {campo('Número', d.numero)}
                                {campo('Colonia', d.colonia)}
                                {campo('Ciudad', d.ciudad)}
                                {campo('Municipio', d.municipio)}
                                {campo('Estado', d.estado)}
                                {campo('C.P.', d.cp)}
                                {campo('Tipo', d.tipoDomicilio === 'Otro' && d.tipoDomicilioOtro ? `Otro: ${d.tipoDomicilioOtro}` : d.tipoDomicilio)}
                            </div>
                        </div>
                        );
                    })
            )}

            {/* ── PERSONAS CON LAS QUE HABITA ── */}
            {seccion('PERSONAS CON LAS QUE HABITA')}
            <div className="de-tabla-dinamica-wrap">
                <table className="de-tabla">
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Parentesco</th>
                            <th>Edad</th>
                            <th>Teléfono</th>
                            <th>Escolaridad</th>
                            <th>Ocupación</th>
                            {editando && <th></th>}
                        </tr>
                    </thead>
                    <tbody>
                        {personasHabita.length === 0 && !editando && (
                            <tr><td colSpan="6" className="de-td-empty">Sin registros</td></tr>
                        )}
                        {personasHabita.map((p, i) => (
                            <tr key={i}>
                                {editando ? (
                                    <>
                                        <td><input value={p.nombre || ''} onChange={e => setPer(i, 'nombre', e.target.value)} /></td>
                                        <td><input value={p.parentesco || ''} onChange={e => setPer(i, 'parentesco', e.target.value)} /></td>
                                        <td><input type="number" value={p.edad || ''} onChange={e => setPer(i, 'edad', e.target.value)} /></td>
                                        <td><input value={p.telefono || ''} onChange={e => setPer(i, 'telefono', e.target.value)} /></td>
                                        <td><input value={p.escolaridad || ''} onChange={e => setPer(i, 'escolaridad', e.target.value)} /></td>
                                        <td><input value={p.ocupacion || ''} onChange={e => setPer(i, 'ocupacion', e.target.value)} /></td>
                                        <td><button className="de-btn-remove" onClick={() => removePer(i)}>✕</button></td>
                                    </>
                                ) : (
                                    <>
                                        <td>{p.nombre || '—'}</td>
                                        <td>{p.parentesco || '—'}</td>
                                        <td>{p.edad || '—'}</td>
                                        <td>{p.telefono || '—'}</td>
                                        <td>{p.escolaridad || '—'}</td>
                                        <td>{p.ocupacion || '—'}</td>
                                    </>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
                {editando && <button className="de-btn-add-row" onClick={addPer}>+ Agregar persona</button>}
            </div>

            {/* ── REFERENCIAS PERSONALES ── */}
            {seccion('REFERENCIAS PERSONALES')}
            <div className="de-tabla-dinamica-wrap">
                <table className="de-tabla">
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Parentesco</th>
                            <th>Edad</th>
                            <th>Teléfono</th>
                            <th>Dirección</th>
                            {editando && <th></th>}
                        </tr>
                    </thead>
                    <tbody>
                        {referencias.length === 0 && !editando && (
                            <tr><td colSpan="5" className="de-td-empty">Sin registros</td></tr>
                        )}
                        {referencias.map((r, i) => (
                            <tr key={i}>
                                {editando ? (
                                    <>
                                        <td><input value={r.nombre || ''} onChange={e => setRef(i, 'nombre', e.target.value)} /></td>
                                        <td><input value={r.parentesco || ''} onChange={e => setRef(i, 'parentesco', e.target.value)} /></td>
                                        <td><input type="number" value={r.edad || ''} onChange={e => setRef(i, 'edad', e.target.value)} /></td>
                                        <td><input value={r.telefono || ''} onChange={e => setRef(i, 'telefono', e.target.value)} /></td>
                                        <td><input value={r.direccion || ''} onChange={e => setRef(i, 'direccion', e.target.value)} /></td>
                                        <td><button className="de-btn-remove" onClick={() => removeRef(i)}>✕</button></td>
                                    </>
                                ) : (
                                    <>
                                        <td>{r.nombre || '—'}</td>
                                        <td>{r.parentesco || '—'}</td>
                                        <td>{r.edad || '—'}</td>
                                        <td>{r.telefono || '—'}</td>
                                        <td>{r.direccion || '—'}</td>
                                    </>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
                {editando && <button className="de-btn-add-row" onClick={addRef}>+ Agregar referencia</button>}
            </div>

            {/* ── DATOS DE CONTACTO (VÍCTIMA) ── */}
            {seccion('DATOS DE CONTACTO (VÍCTIMA)')}
            <div className="de-grid-2">
                {editando ? (
                    <>
                        <div className="de-campo-edit">
                            <label>¿Conoce a la víctima?</label>
                            <select value={form.conoceVictima ? 'true' : 'false'} onChange={e => set('conoceVictima', e.target.value === 'true')}>
                                <option value="false">No</option>
                                <option value="true">Sí</option>
                            </select>
                        </div>
                        {campoEdit('Tel. Víctima', form.telVictima, v => set('telVictima', v))}
                        {campoEdit('Nombre Víctima', form.nombreVictima, v => set('nombreVictima', v))}
                        {campoEdit('Domicilio Víctima', form.domicilioVictima, v => set('domicilioVictima', v))}
                    </>
                ) : (
                    <>
                        {campo('¿Conoce a la víctima?', entrevista.conoceVictima ? 'Sí' : 'No')}
                        {campo('Tel. Víctima', entrevista.telVictima)}
                        {campo('Nombre Víctima', entrevista.nombreVictima)}
                        {campo('Domicilio Víctima', entrevista.domicilioVictima)}
                    </>
                )}
            </div>

            {/* ── INFORMACIÓN LABORAL ── */}
            {seccion('INFORMACIÓN LABORAL')}
            <div className="de-grid-2">
                {editando ? (
                    <>
                        {campoEdit('Empresa', form.empresa, v => set('empresa', v))}
                        {campoEdit('Teléfono Empresa', form.telEmpresa, v => set('telEmpresa', v))}
                        {campoEdit('Salario Mensual', form.salarioMensual, v => set('salarioMensual', v), 'number')}
                        {campoEdit('Puesto', form.puesto, v => set('puesto', v))}
                        {campoEdit('Nombre del Jefe', form.nombreJefe, v => set('nombreJefe', v))}
                        {campoEdit('Horario', form.horarioTrabajo, v => set('horarioTrabajo', v))}
                        {campoEdit('Domicilio Trabajo', form.domicilioTrabajo, v => set('domicilioTrabajo', v))}
                        <div className="de-campo-edit de-col-2">
                            <label>Último empleo (si no tiene empleo actual)</label>
                            <textarea value={form.ultimoEmpleo || ''} onChange={e => set('ultimoEmpleo', e.target.value)} className="de-textarea" />
                        </div>
                    </>
                ) : (
                    <>
                        {campo('Empresa', entrevista.empresa)}
                        {campo('Teléfono Empresa', entrevista.telEmpresa)}
                        {campo('Salario Mensual', entrevista.salarioMensual)}
                        {campo('Puesto', entrevista.puesto)}
                        {campo('Nombre del Jefe', entrevista.nombreJefe)}
                        {campo('Horario', entrevista.horarioTrabajo)}
                        {campo('Domicilio Trabajo', entrevista.domicilioTrabajo)}
                        {campo('Último Empleo', entrevista.ultimoEmpleo)}
                    </>
                )}
            </div>

            {/* ── CONSUMO DE SUSTANCIAS ── */}
            {seccion('CONSUMO DE SUSTANCIAS')}
            <div className="de-tabla-dinamica-wrap">
                <table className="de-tabla">
                    <thead>
                        <tr>
                            <th>Sustancia</th>
                            <th>¿Consume?</th>
                            <th>Desde</th>
                            <th>Periodicidad</th>
                            <th>Cantidad</th>
                            <th>Último Consumo</th>
                        </tr>
                    </thead>
                    <tbody>
                        {consumoSustancias.map((c, i) => (
                            <tr key={i}>
                                <td>
                                    <strong>{c.sustancia}</strong>
                                    {c.sustancia === 'Otra' && editando && c.consume === true && (
                                        <input
                                            placeholder="¿Cuál?"
                                            value={c.otraEsp || ''}
                                            onChange={e => setConsumo(i, 'otraEsp', e.target.value)}
                                            style={{ marginTop: 4 }}
                                        />
                                    )}
                                    {c.sustancia === 'Otra' && !editando && c.otraEsp && (
                                        <span style={{ fontSize: 12, color: '#666' }}> ({c.otraEsp})</span>
                                    )}
                                </td>
                                <td>
                                    {editando ? (
                                        <select value={c.consume === null ? '' : c.consume ? 'true' : 'false'}
                                            onChange={e => setConsumo(i, 'consume', e.target.value === '' ? null : e.target.value === 'true')}>
                                            <option value="">—</option>
                                            <option value="true">Sí</option>
                                            <option value="false">No</option>
                                        </select>
                                    ) : (
                                        c.consume === null ? '—'
                                            : c.consume
                                                ? <span className="de-resp-badge de-resp-si">Sí</span>
                                                : <span className="de-resp-badge de-resp-no">No</span>
                                    )}
                                </td>
                                <td>
                                    {editando
                                        ? <input value={c.desde || ''} disabled={!c.consume} onChange={e => setConsumo(i, 'desde', e.target.value)} />
                                        : c.desde || '—'}
                                </td>
                                <td>
                                    {editando
                                        ? <input value={c.periodicidad || ''} disabled={!c.consume} onChange={e => setConsumo(i, 'periodicidad', e.target.value)} />
                                        : c.periodicidad || '—'}
                                </td>
                                <td>
                                    {editando
                                        ? <input value={c.cantidad || ''} disabled={!c.consume} onChange={e => setConsumo(i, 'cantidad', e.target.value)} />
                                        : c.cantidad || '—'}
                                </td>
                                <td>
                                    {editando
                                        ? <input value={c.fechaUltimoConsumo || ''} disabled={!c.consume} onChange={e => setConsumo(i, 'fechaUltimoConsumo', e.target.value)} />
                                        : c.fechaUltimoConsumo || '—'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* ── PREGUNTAS GENERALES ── */}
            {seccion('PREGUNTAS GENERALES')}
            <div className="de-preguntas">
                {[
                    { key: 'tratamientoAdicciones', espKey: 'tratamientoAdiccionesEsp', label: '¿Ha recibido tratamiento para adicciones?' },
                    { key: 'familiaresConsumo', espKey: 'familiaresConsumoEsp', label: '¿Algún familiar tiene problemas de consumo de sustancias?' },
                    { key: 'buenaBase', espKey: 'buenaBaseEsp', label: '¿Cuenta con una buena base de apoyo familiar/social?' },
                    { key: 'obligacionesDificiles', espKey: 'obligacionesDificilesEsp', label: '¿Tiene obligaciones que dificulten el cumplimiento de las medidas?' },
                ].map(({ key, espKey, label }) => (
                    <div key={key} className="de-pregunta-row">
                        <span className="de-pregunta-label">{label}</span>
                        <div className="de-pregunta-controls">
                            {editando ? (
                                <>
                                    <label className="de-radio">
                                        <input type="radio" checked={form[key] === true} onChange={() => set(key, true)} /> Sí
                                    </label>
                                    <label className="de-radio">
                                        <input type="radio" checked={form[key] === false} onChange={() => set(key, false)} /> No
                                    </label>
                                    {form[key] === true && (
                                        <input
                                            className="de-pregunta-esp"
                                            placeholder="Especificar..."
                                            value={form[espKey] || ''}
                                            onChange={e => set(espKey, e.target.value)}
                                        />
                                    )}
                                </>
                            ) : (
                                <>
                                    {entrevista[key] === true
                                        ? <span className="de-resp-badge de-resp-si">Sí</span>
                                        : entrevista[key] === false
                                            ? <span className="de-resp-badge de-resp-no">No</span>
                                            : <span className="de-resp-badge" style={{ background: '#f5f5f5', color: '#aaa' }}>—</span>}
                                    {entrevista[key] === true && entrevista[espKey] && (
                                        <span className="de-resp-esp">{entrevista[espKey]}</span>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* ── TIPO DE SEGUIMIENTO ── */}
            {seccion('TIPO DE SEGUIMIENTO')}
            <div className="de-grid-2">
                {editando && !entrevista.tipoSeguimiento ? (
                    /* Sin tipo asignado aún: permite seleccionar */
                    <div className="de-tipo-seguimiento">
                        <div className={`fe-tipo-card ${form.tipoSeguimiento === 'MC' ? 'fe-tipo-selected' : ''}`}
                            onClick={() => set('tipoSeguimiento', 'MC')}>
                            <h4>M.C.</h4>
                            <p className="fe-tipo-label">MEDIDA CAUTELAR</p>
                        </div>
                        <div className={`fe-tipo-card ${form.tipoSeguimiento === 'SCP' ? 'fe-tipo-selected' : ''}`}
                            onClick={() => set('tipoSeguimiento', 'SCP')}>
                            <h4>S.C.P.</h4>
                            <p className="fe-tipo-label">SUSPENSIÓN CONDICIONAL DEL PROCESO</p>
                        </div>
                    </div>
                ) : (
                    /* Ya asignado: solo lectura (tanto en vista como en edición) */
                    <div className="de-campo">
                        <span className="de-campo-label">Tipo de Seguimiento</span>
                        <span className="de-campo-valor" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {{ MC: 'Medida Cautelar', SCP: 'Suspensión Condicional del Proceso' }[entrevista.tipoSeguimiento ?? form.tipoSeguimiento] ?? (entrevista.tipoSeguimiento ?? form.tipoSeguimiento ?? '—')}
                            {(entrevista.tipoSeguimiento || form.tipoSeguimiento) && editando && (
                                <span style={{ fontSize: 11, color: '#9ca3af', fontStyle: 'italic' }}>
                                    (no modificable una vez asignado)
                                </span>
                            )}
                        </span>
                    </div>
                )}
            </div>

            {/* Zoom foto */}
            {zoomFoto && (
                <div className="imp-zoom-overlay" onClick={() => setZoomFoto(false)}>
                    {fotoSrc
                        ? <img src={fotoSrc} alt="Foto ampliada" className="imp-zoom-img" />
                        : <div className="imp-zoom-iniciales">{iniciales()}</div>
                    }
                    <button className="imp-zoom-close" onClick={() => setZoomFoto(false)}>
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>
            )}

            {editando && (
                <div className="de-footer-actions">
                    <button className="de-btn-cancelar" onClick={cancelarEdicion}>Cancelar</button>
                    <button className="de-btn-guardar" onClick={handleGuardar} disabled={loading}>
                        {loading ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                </div>
            )}

            {/* ── Historial de cambios ── */}
            {entrevista?.id && (
                <div style={{ marginTop: '1rem' }}>
                    <HistorialRegistro entidad="ENTREVISTA" id={entrevista.id} />
                </div>
            )}
        </div>
    );
};

export default DetalleEntrevista;
