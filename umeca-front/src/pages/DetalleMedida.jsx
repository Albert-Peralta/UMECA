import { useState } from 'react';
import { useToast } from '../context/ToastContext';
import { agregarSeguimiento, registrarLevantamiento, registrarRevocacion, registrarAmpliacion } from '../api/medidasApi';
import { registrarFallecimiento } from '../api/imputadosApi';
import HistorialRegistro from '../components/HistorialRegistro';
import PrintOficioMigracion from './PrintOficioMigracion';
import './FormularioMedida.css';
import './DetalleMedida.css';

// ── Fracciones (reutilizadas para mostrar etiquetas) ──────────────────────────
const FRACCIONES_MC = [
    { key: 'I', nombre: 'Presentación Periódica' }, { key: 'II', nombre: 'Garantía Económica' },
    { key: 'III', nombre: 'Embargo de Bienes' }, { key: 'IV', nombre: 'Inmovilización de Cuentas' },
    { key: 'V', nombre: 'Prohibición de Salir' }, { key: 'VI', nombre: 'Cuidado o Vigilancia' },
    { key: 'VII', nombre: 'Prohibición de Concurrir' }, { key: 'VIII', nombre: 'Prohibición de Contacto' },
    { key: 'IX', nombre: 'Separación del Domicilio' }, { key: 'X', nombre: 'Suspensión de Cargo Público' },
    { key: 'XI', nombre: 'Suspensión de Actividad Profesional' }, { key: 'XII', nombre: 'Localizador Electrónico' },
    { key: 'XIII', nombre: 'Resguardo Domiciliario' }, { key: 'XIV', nombre: 'Prisión Preventiva' },
];
const FRACCIONES_SCP = [
    { key: 'I', nombre: 'Residir en Lugar Determinado' }, { key: 'II', nombre: 'Frecuentar o Evitar Lugares/Personas' },
    { key: 'III', nombre: 'Abstenerse de Consumir Sustancias' }, { key: 'IV', nombre: 'Programas de Prevención' },
    { key: 'V', nombre: 'Aprender Profesión u Oficio' }, { key: 'VI', nombre: 'Servicio Social' },
    { key: 'VII', nombre: 'Tratamiento Médico/Psicológico' }, { key: 'VIII', nombre: 'Tener Empleo' },
    { key: 'IX', nombre: 'Vigilancia Judicial' }, { key: 'X', nombre: 'No Poseer Armas' },
    { key: 'XI', nombre: 'No Conducir Vehículos' }, { key: 'XII', nombre: 'No Viajar al Extranjero' },
    { key: 'XIII', nombre: 'Obligaciones Alimentarias' }, { key: 'XIV', nombre: 'Otras Condiciones' },
];

// ── Helpers de lectura ────────────────────────────────────────────────────────
const Val = ({ label, value, full }) => (
    !value && value !== 0 && value !== false ? null : (
        <div className={`dm-campo${full ? ' dm-campo-full' : ''}`}>
            <span className="dm-label">{label}</span>
            <span className="dm-value">{value === true ? 'Sí' : value === false ? 'No' : value}</span>
        </div>
    )
);

const Sec = ({ titulo, cafe }) => (
    <div className={`fm-seccion${cafe ? ' fm-seccion-cafe' : ''}`}>
        <h3>{titulo}</h3>
    </div>
);

const ESTADO_LABELS = { ACTIVO: 'Activo', SUSPENDIDO: 'Suspendido', FINALIZADO: 'Finalizado', LEVANTADO: 'Levantado', REVOCADO: 'Revocado' };
const ESTADO_CLASE  = { ACTIVO: 'dm-badge-activo', SUSPENDIDO: 'dm-badge-suspendido', FINALIZADO: 'dm-badge-finalizado', LEVANTADO: 'dm-badge-levantado', REVOCADO: 'dm-badge-revocado' };

// ── Componente principal ──────────────────────────────────────────────────────
const DetalleMedida = ({ medida: m, puedeRegistrar, onVolver, onEditar, onActualizado, onCambiarSCP }) => {
    const { showToast } = useToast();
    const esMC = m.tipo === 'MEDIDA_CAUTELAR';
    const FRAC_LIST = esMC ? FRACCIONES_MC : FRACCIONES_SCP;

    // ── Alerta de vencimiento SCP ─────────────────────────────────────────────
    const alertaVencimientoDetalle = (() => {
        if (esMC || m.estado !== 'ACTIVO') return null;
        const plazo = m.nuevoPlazoScp || m.vencimientoPlazo || m.plazoScp || null;
        if (!plazo) return null;
        const hoy = new Date(); hoy.setHours(0,0,0,0);
        const fin  = new Date(plazo + 'T00:00:00');
        const dias = Math.ceil((fin - hoy) / (1000 * 60 * 60 * 24));
        if (dias < 0)   return { clase: 'dm-banner-vencido',  msg: `El plazo de esta S.C.P. venció hace ${Math.abs(dias)} día(s) (${plazo}).` };
        if (dias === 0) return { clase: 'dm-banner-proximo',  msg: `El plazo de esta S.C.P. vence hoy (${plazo}).` };
        if (dias <= 30) return { clase: 'dm-banner-proximo',  msg: `El plazo de esta S.C.P. vence en ${dias} día(s) (${plazo}).` };
        return null;
    })();

    // Parsear delitos
    let delitos = [];
    try { delitos = JSON.parse(m.delitosJson || '[]'); } catch {}
    if (!delitos.length && m.delito) delitos = [{ delito: m.delito, modalidad: m.modalidad }];

    // Parsear detalles de fracciones
    let detalles = {};
    try { detalles = JSON.parse(m.detallesFracciones || '{}'); } catch {}

    // ── Seguimientos ─────────────────────────────────────────────────────────
    const [showSegForm, setShowSegForm] = useState(false);
    const [segForm, setSegForm] = useState({ fechaSeguimiento: '', detalles: '' });
    const [loadingSeg, setLoadingSeg] = useState(false);

    const handleGuardarSeguimiento = async () => {
        if (!segForm.fechaSeguimiento || !segForm.detalles) return;
        setLoadingSeg(true);
        try {
            const res = await agregarSeguimiento(m.id, segForm);
            if (res.data.ok) {
                onActualizado(res.data.data);
                setSegForm({ fechaSeguimiento: '', detalles: '' });
                setShowSegForm(false);
                showToast('Seguimiento registrado correctamente');
            }
        } catch {
        } finally { setLoadingSeg(false); }
    };

    // ── Levantamiento ─────────────────────────────────────────────────────────
    const [showLev, setShowLev] = useState(false);
    const [levForm, setLevForm] = useState({ oficioLevantamiento: '', firmaLevantamiento: '', motivoLevantamiento: '', cumplioLevantamiento: null });
    const [levError, setLevError] = useState('');
    const [loadingLev, setLoadingLev] = useState(false);

    const handleLevantamiento = async () => {
        if (!levForm.oficioLevantamiento.trim() || !levForm.firmaLevantamiento.trim() || !levForm.motivoLevantamiento.trim() || levForm.cumplioLevantamiento === null) {
            setLevError('Todos los campos son obligatorios, incluyendo si cumplió o no.'); return;
        }
        setLoadingLev(true); setLevError('');
        try {
            const res = await registrarLevantamiento(m.id, levForm);
            if (res.data.ok) { onActualizado(res.data.data); setShowLev(false); showToast('Levantamiento registrado correctamente'); }
            else { setLevError(res.data.message); }
        } catch { setLevError('Error al registrar el levantamiento.'); }
        finally { setLoadingLev(false); }
    };

    // ── Confirm SCP ───────────────────────────────────────────────────────────
    const [showConfirmSCP, setShowConfirmSCP] = useState(false);

    // ── Revocación SCP ────────────────────────────────────────────────────────
    const [showRevocacion, setShowRevocacion] = useState(false);
    const [revForm, setRevForm] = useState({ oficioRevocacion: '', motivoRevocacion: '' });
    const [revError, setRevError] = useState('');
    const [loadingRev, setLoadingRev] = useState(false);

    const handleRevocacion = async () => {
        if (!revForm.oficioRevocacion.trim() || !revForm.motivoRevocacion.trim()) {
            setRevError('Todos los campos son obligatorios.'); return;
        }
        setLoadingRev(true); setRevError('');
        try {
            const res = await registrarRevocacion(m.id, revForm);
            if (res.data.ok) { onActualizado(res.data.data); setShowRevocacion(false); showToast('Revocación registrada correctamente'); }
            else { setRevError(res.data.message); }
        } catch { setRevError('Error al registrar la revocación.'); }
        finally { setLoadingRev(false); }
    };

    // ── Ampliación SCP ────────────────────────────────────────────────────────
    const [showAmpliacion, setShowAmpliacion] = useState(false);

    // ── Fallecimiento ─────────────────────────────────────────────────────────
    const FALL_VACIO = { fechaFallecimiento: '', quienAviso: '', parentescoInformante: '', comoSeComprobo: '', noActaDefuncion: '', observacionesFallecimiento: '' };
    const [showFallecimiento, setShowFallecimiento] = useState(false);
    const [fallForm, setFallForm] = useState(FALL_VACIO);
    const [loadingFall, setLoadingFall] = useState(false);
    const [fallError, setFallError] = useState('');

    const handleFallecimiento = async () => {
        if (!fallForm.fechaFallecimiento) { setFallError('La fecha de fallecimiento es requerida'); return; }
        if (!fallForm.quienAviso.trim())  { setFallError('Indica quién informó del fallecimiento'); return; }
        if (!fallForm.comoSeComprobo)     { setFallError('Indica cómo se comprobó el fallecimiento'); return; }
        setLoadingFall(true); setFallError('');
        try {
            const res = await registrarFallecimiento(m.imputadoId, fallForm);
            if (res.data.ok) { setShowFallecimiento(false); showToast('Fallecimiento registrado'); onVolver(); }
            else setFallError(res.data.message);
        } catch { setFallError('Error al registrar fallecimiento'); }
        finally { setLoadingFall(false); }
    };
    // ── Oficio Migración (Fracción V MC) ─────────────────────────────────────
    const tieneFraccionV = esMC && (m.fracciones || []).includes('V');
    const detV = detalles['V'] || {};
    const [showOficioMigracion, setShowOficioMigracion] = useState(false);

    const [ampForm, setAmpForm] = useState({ nuevoPlazoScp: '', motivoAmpliacion: '' });
    const [ampError, setAmpError] = useState('');
    const [loadingAmp, setLoadingAmp] = useState(false);

    const handleAmpliacion = async () => {
        if (!ampForm.nuevoPlazoScp || !ampForm.motivoAmpliacion.trim()) {
            setAmpError('Todos los campos son obligatorios.'); return;
        }
        setLoadingAmp(true); setAmpError('');
        try {
            const res = await registrarAmpliacion(m.id, ampForm);
            if (res.data.ok) { onActualizado(res.data.data); setShowAmpliacion(false); showToast('Ampliación registrada correctamente'); }
            else { setAmpError(res.data.message); }
        } catch { setAmpError('Error al registrar la ampliación.'); }
        finally { setLoadingAmp(false); }
    };

    return (
        <>
        {showOficioMigracion && (
            <PrintOficioMigracion
                medida={m}
                detalleV={detV}
                onCerrar={() => setShowOficioMigracion(false)}
            />
        )}
        <div className="dm-wrapper">
            {/* ── Cabecera ── */}
            <div className="dm-header">
                {/* Fila 1: Volver + Título + Badge */}
                <div className="dm-header-top">
                    <div className="dm-header-left">
                        <button className="dm-btn-volver" onClick={onVolver}>
                            <i className="bi bi-arrow-left" /> Volver
                        </button>
                        {localStorage.getItem('volverExpedienteId') && (
                            <button className="dm-btn-volver de-btn-expediente" onClick={() => {
                                const id = localStorage.getItem('volverExpedienteId');
                                localStorage.removeItem('volverExpedienteId');
                                localStorage.setItem('abrirExpedienteId', id);
                                window.dispatchEvent(new CustomEvent('navigate', { detail: 'imputados' }));
                            }}>
                                <i className="bi bi-person-vcard" /> Volver al Expediente
                            </button>
                        )}
                        <div>
                            <h2 className="dm-titulo">
                                {esMC ? 'MEDIDA CAUTELAR' : 'SUSPENSIÓN CONDICIONAL DEL PROCESO'}
                            </h2>
                            <p className="dm-subtitulo">{m.nombreImputado} — {m.causaPenal}</p>
                        </div>
                    </div>
                    <span className={`dm-badge ${ESTADO_CLASE[m.estado]}`}>
                        {ESTADO_LABELS[m.estado] ?? m.estado}
                    </span>
                </div>
                {/* Fila 2: Botones de acción */}
                <div className="dm-header-actions">
                    {puedeRegistrar && !m.imputadoFallecido && (
                        <button className="dm-btn-editar" onClick={onEditar}>
                            <i className="bi bi-pencil" /> Editar
                        </button>
                    )}
                    {puedeRegistrar && m.estado === 'ACTIVO' && !m.imputadoFallecido && (
                        <button className="btn-fallecimiento" onClick={() => { setFallForm(FALL_VACIO); setFallError(''); setShowFallecimiento(true); }}>
                            <i className="bi bi-heartbreak" /> Fallecimiento
                        </button>
                    )}
                    {tieneFraccionV && !m.imputadoFallecido && (
                        <button className="btn-oficio-migracion" onClick={() => setShowOficioMigracion(true)} title="Generar oficio para el INM">
                            <i className="bi bi-file-earmark-text" /> Oficio Migración
                        </button>
                    )}
                    {puedeRegistrar && esMC && m.estado === 'ACTIVO' && !m.imputadoFallecido && (
                        <>
                            {!m.cambiadoAScp && (
                                <button className="btn-scp" onClick={() => setShowConfirmSCP(true)}>
                                    <i className="bi bi-arrow-left-right" /> Cambiar a SCP
                                </button>
                            )}
                            <button className="btn-levantamiento" onClick={() => setShowLev(true)}>
                                <i className="bi bi-file-earmark-check" /> Levantamiento
                            </button>
                        </>
                    )}
                    {puedeRegistrar && !esMC && m.estado === 'ACTIVO' && !m.imputadoFallecido && (
                        <>
                            <button className="btn-amp" onClick={() => setShowAmpliacion(true)}>
                                <i className="bi bi-calendar-plus" /> Ampliación
                            </button>
                            <button className="btn-levantamiento" onClick={() => setShowLev(true)}>
                                <i className="bi bi-file-earmark-check" /> Levantamiento
                            </button>
                            <button className="btn-rev" onClick={() => setShowRevocacion(true)}>
                                <i className="bi bi-x-circle" /> Revocación
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="dm-body">
                {/* ── Banner: alerta de vencimiento SCP ── */}
                {m.imputadoFallecido && (
                    <div className="dm-banner-alerta dm-banner-fallecido">
                        <i className="bi bi-heartbreak-fill" />
                        <span>El imputado <strong>{m.nombreImputado}</strong> ha fallecido. No es posible realizar modificaciones en este expediente.</span>
                    </div>
                )}
                {alertaVencimientoDetalle && (
                    <div className={`dm-banner-alerta ${alertaVencimientoDetalle.clase}`}>
                        <i className="bi bi-exclamation-triangle-fill" />
                        <span>{alertaVencimientoDetalle.msg}</span>
                    </div>
                )}

                {/* ── Banner: cambiado a SCP ── */}
                {esMC && m.cambiadoAScp && (
                    <div className="dm-banner-scp">
                        <i className="bi bi-arrow-left-right" />
                        <span>
                            Esta Medida Cautelar fue cambiada a{' '}
                            <strong>Suspensión Condicional del Proceso</strong>
                            {m.fechaCambioScp ? ` el ${m.fechaCambioScp}` : ''}.
                        </span>
                    </div>
                )}
                {/* ── 1. Datos generales ── */}
                <Sec titulo={esMC ? 'OFICIO DE IMPOSICIÓN' : 'DATOS PROCESALES'} />
                <div className="dm-grid">
                    <Val label="Imputado"       value={m.nombreImputado} />
                    <Val label="Causa Penal"     value={m.causaPenal} />
                    <Val label="Fecha de Recepción" value={m.fechaRecepcion} />
                    <Val label="Sede"            value={m.sede} />
                    <Val label="Nombre del Juez" value={m.nombreJuez} full />
                    <Val label="Fecha de Formulación"          value={m.fechaFormulacion} />
                    <Val label="Fecha de Vinculación al Proceso" value={m.fechaVinculacionProceso} />
                    <Val label="Fecha Entrevista Evaluación"   value={m.fechaEntrevistaEvaluacion} />
                    {m.folioEntrevista && <Val label="Folio Entrevista" value={m.folioEntrevista} />}
                    <Val label="Registrado por"  value={m.registradoPor} />
                </div>

                {/* ── 2. Delitos ── */}
                {delitos.length > 0 && (
                    <>
                        <Sec titulo="DELITO(S)" />
                        <div className="dm-delitos-tabla">
                            <table>
                                <thead><tr><th>#</th><th>Delito</th><th>Modalidad</th></tr></thead>
                                <tbody>
                                    {delitos.map((d, i) => (
                                        <tr key={i}>
                                            <td>{i + 1}</td>
                                            <td>{d.delito || '—'}</td>
                                            <td>{d.modalidad || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {/* ── 3. Específico MC o SCP ── */}
                {esMC ? (
                    <>
                        <Sec titulo="MEDIDAS CAUTELARES ART. 155" />
                        <div className="dm-grid">
                            <Val label="Fecha de Canalización"   value={m.fechaCanalizacion} />
                            <Val label="No. Biométrico"          value={m.noBiometrico} />
                            <Val label="No. Libro"               value={m.noLibro} />
                            <Val label="No. Página"              value={m.noPagina} />
                            <Val label="Presentación Periódica"  value={m.presentacionPeriodica} />
                            <Val label="Distrito Judicial"       value={m.distritoJudicial} full />
                            <Val label="Último Informe M.C."     value={m.descripcionInforme} full />
                            <Val label="¿Acuerdo Reparatorio?"   value={m.acuerdoReparatorio != null ? (m.acuerdoReparatorio ? 'Sí' : 'No') : null} />
                            {m.acuerdoReparatorio && (<>
                                <Val label="Fecha de Celebración del Acuerdo"  value={m.fechaCelebracionAcuerdo} />
                                <Val label="Fecha de Cumplimiento del Acuerdo" value={m.fechaCumplimientoAcuerdo} />
                                <Val label="Descripción del Acuerdo" value={m.descripcionAcuerdo} full />
                                <Val label="Estatus del Acuerdo"     value={m.estatusFinal} />
                            </>)}
                        </div>
                    </>
                ) : (
                    <>
                        <Sec titulo="SUSPENSIÓN CONDICIONAL" />
                        <div className="dm-grid">
                            <Val label="Fecha de Imposición S.C.P."    value={m.fechaImposicionScp} />
                            <Val label="Plazo de la S.C.P."            value={m.plazoScp} />
                            <Val label="Canalización"                   value={m.canalizacion} />
                            <Val label="Tipo de Servicio"               value={m.tipoServicio} />
                            <Val label="Fecha de Canalización"          value={m.fechaCanalizacion} />
                            <Val label="Presentación Periódica"         value={m.presentacionPeriodica} />
                            <Val label="No. Biométrico"                 value={m.noBiometrico} />
                            <Val label="No. Libro"                      value={m.noLibro} />
                            <Val label="No. Página"                     value={m.noPagina} />
                            <Val label="Último Informe S.C.P."          value={m.descripcionInforme} full />
                            <Val label="Vencimiento del Plazo"          value={m.vencimientoPlazo} />
                            <Val label="Oficio de Sobreseimiento"       value={m.oficioSobreseimiento} />
                            <Val label="Responsable de Cierre"          value={m.responsableCierre} />
                            <Val label="Estatus Final"                  value={m.estatusFinal} />
                        </div>
                    </>
                )}

                {/* ── 4. Fracciones / Condiciones ── */}
                {m.fracciones?.length > 0 && (
                    <>
                        <Sec titulo={esMC ? 'FRACCIONES IMPUESTAS' : 'CONDICIONES IMPUESTAS'} />
                        <div className="dm-fracciones">
                            {m.fracciones.map(k => {
                                const info = FRAC_LIST.find(f => f.key === k);
                                return (
                                    <div key={k} className="dm-fraccion-item">
                                        <span className="dm-fraccion-num">Fracción {k}</span>
                                        <span className="dm-fraccion-nombre">{info?.nombre ?? k}</span>
                                        {detalles[k] && Object.keys(detalles[k]).length > 0 && (
                                            <div className="dm-fraccion-detalles">
                                                {Object.entries(detalles[k]).map(([key, val]) => (
                                                    val === true ? <span key={key} className="dm-frac-det dm-frac-det-tag"><i className="bi bi-check-circle-fill" /> {key === 'esTTA' ? 'Programa TTA' : key}</span>
                                                    : val ? <span key={key} className="dm-frac-det"><strong>{key}:</strong> {val}</span>
                                                    : null
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}

                {/* ── 5. Información adicional ── */}
                <Sec titulo="CONCLUSIÓN" />
                <div className="dm-grid">
                    <Val label="Vigencia Inicio"         value={m.vigenciaInicio} />
                    <Val label="Vigencia Fin"            value={m.vigenciaFin} />
                    <Val label="Fecha Próxima Revisión"  value={m.fechaProximaRevision} />
                    <Val label="Responsable Seguimiento" value={m.responsableSeguimiento} />
                    <Val label="Observaciones"           value={m.observaciones} full />
                    <Val label="Observaciones Generales" value={m.observacionesGenerales} full />
                    {m.advertencia && <Val label="Advertencia al Imputado" value={m.advertencia} full />}
                </div>

                {/* ── Datos de ampliación ── */}
                {m.fechaAmpliacion && (
                    <>
                        <Sec titulo="AMPLIACIÓN DE PLAZO" cafe />
                        <div className="dm-grid">
                            <Val label="Fecha de Ampliación"  value={m.fechaAmpliacion} />
                            <Val label="Nuevo Plazo S.C.P."   value={m.nuevoPlazoScp} />
                            <Val label="Motivo de Ampliación" value={m.motivoAmpliacion} full />
                        </div>
                    </>
                )}

                {/* ── Datos de revocación ── */}
                {m.estado === 'REVOCADO' && (
                    <>
                        <Sec titulo="DATOS DE REVOCACIÓN" cafe />
                        <div className="dm-grid">
                            <Val label="Fecha de Revocación" value={m.fechaRevocacion} />
                            <Val label="Número de Oficio"    value={m.oficioRevocacion} />
                            <Val label="Motivo"              value={m.motivoRevocacion} full />
                        </div>
                    </>
                )}

                {/* ── Si levantada, mostrar datos de levantamiento ── */}
                {m.estado === 'LEVANTADO' && (
                    <>
                        <Sec titulo="DATOS DEL LEVANTAMIENTO" cafe />
                        <div className="dm-grid">
                            <Val label="Fecha de Levantamiento" value={m.fechaLevantamiento} />
                            <Val label="Número de Oficio"       value={m.oficioLevantamiento} />
                            <Val label="Firmado por"            value={m.firmaLevantamiento} />
                            <Val label="Cumplimiento"           value={
                                m.cumplioLevantamiento === true  ? '✅ Cumplió' :
                                m.cumplioLevantamiento === false ? '❌ No Cumplió' : '—'
                            } />
                            <Val label="Motivo"                 value={m.motivoLevantamiento} full />
                        </div>
                    </>
                )}

                {/* ── 6. Seguimientos ── */}
                <Sec titulo="SEGUIMIENTOS" />
                <div className="dm-seguimientos">
                    <div className="dm-seg-header">
                        <span className="dm-seg-count">{m.seguimientos?.length ?? 0} registro(s)</span>
                        {puedeRegistrar && (
                            <button className="btn-cargar" onClick={() => setShowSegForm(s => !s)}>
                                <i className="bi bi-plus-lg" /> Agregar seguimiento
                            </button>
                        )}
                    </div>

                    {showSegForm && (
                        <div className="dm-seg-form">
                            <div className="dm-seg-form-row">
                                <div className="modal-field">
                                    <label>FECHA *</label>
                                    <input type="date" value={segForm.fechaSeguimiento}
                                        onChange={e => setSegForm({ ...segForm, fechaSeguimiento: e.target.value })} />
                                </div>
                            </div>
                            <div className="modal-field">
                                <label>DETALLES *</label>
                                <textarea rows={3} value={segForm.detalles}
                                    onChange={e => setSegForm({ ...segForm, detalles: e.target.value })}
                                    placeholder="Detalles del seguimiento realizado..." />
                            </div>
                            <div className="dm-seg-btns">
                                <button className="btn-cancelar" onClick={() => setShowSegForm(false)}>Cancelar</button>
                                <button className="btn-registrar" onClick={handleGuardarSeguimiento} disabled={loadingSeg}>
                                    {loadingSeg ? 'Guardando...' : 'Guardar'}
                                </button>
                            </div>
                        </div>
                    )}

                    {m.seguimientos?.length > 0 ? (
                        <table className="dm-seg-tabla">
                            <thead>
                                <tr><th>#</th><th>Fecha</th><th>Detalles</th><th>Registrado por</th></tr>
                            </thead>
                            <tbody>
                                {m.seguimientos.map((s, i) => (
                                    <tr key={s.id}>
                                        <td>{i + 1}</td>
                                        <td>{s.fechaSeguimiento}</td>
                                        <td>{s.detalles}</td>
                                        <td>{s.registradoPor ?? '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p className="dm-sin-seg">Sin seguimientos registrados.</p>
                    )}
                </div>
            </div>

            {/* ── Modal Levantamiento ──────────────────────────────────────── */}
            {showLev && (
                <div className="modal-overlay">
                    <div className="modal-box" style={{ maxWidth: 480 }}>
                        <div className="modal-header">
                            <h3><i className="bi bi-file-earmark-check" /> LEVANTAMIENTO DE MEDIDA CAUTELAR</h3>
                            <button className="modal-close" onClick={() => { setShowLev(false); setLevError(''); }}>
                                <i className="bi bi-x-lg" />
                            </button>
                        </div>
                        <div className="modal-form">
                            <p style={{ fontSize: 13, color: '#4b5563', marginBottom: 12 }}>
                                Esta acción registrará el levantamiento de la medida cautelar de <strong>{m.nombreImputado}</strong>.
                                La fecha de levantamiento se registrará automáticamente como el día de hoy.
                            </p>
                            <div className="modal-field">
                                <label>NÚMERO DE OFICIO *</label>
                                <input type="text" placeholder="Ej. OF-2026-001"
                                    value={levForm.oficioLevantamiento}
                                    onChange={e => setLevForm({ ...levForm, oficioLevantamiento: e.target.value })} />
                            </div>
                            <div className="modal-field">
                                <label>FIRMADO POR *</label>
                                <input type="text" placeholder="Nombre del funcionario que firma"
                                    value={levForm.firmaLevantamiento}
                                    onChange={e => setLevForm({ ...levForm, firmaLevantamiento: e.target.value })} />
                            </div>
                            <div className="modal-field">
                                <label>MOTIVO DEL LEVANTAMIENTO *</label>
                                <textarea rows={3} placeholder="Describa el motivo del levantamiento..."
                                    value={levForm.motivoLevantamiento}
                                    onChange={e => setLevForm({ ...levForm, motivoLevantamiento: e.target.value })} />
                            </div>
                            <div className="modal-field">
                                <label>CUMPLIMIENTO *</label>
                                <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setLevForm({ ...levForm, cumplioLevantamiento: true })}
                                        style={{
                                            flex: 1, padding: '10px', borderRadius: '8px', border: '2px solid',
                                            borderColor: levForm.cumplioLevantamiento === true ? '#16a34a' : '#d1d5db',
                                            background: levForm.cumplioLevantamiento === true ? '#d1fae5' : '#fff',
                                            color: levForm.cumplioLevantamiento === true ? '#065f46' : '#6b7280',
                                            fontWeight: 700, cursor: 'pointer', fontSize: '13px'
                                        }}
                                    >
                                        <i className="bi bi-check-circle-fill" /> Cumplió
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setLevForm({ ...levForm, cumplioLevantamiento: false })}
                                        style={{
                                            flex: 1, padding: '10px', borderRadius: '8px', border: '2px solid',
                                            borderColor: levForm.cumplioLevantamiento === false ? '#dc2626' : '#d1d5db',
                                            background: levForm.cumplioLevantamiento === false ? '#fee2e2' : '#fff',
                                            color: levForm.cumplioLevantamiento === false ? '#991b1b' : '#6b7280',
                                            fontWeight: 700, cursor: 'pointer', fontSize: '13px'
                                        }}
                                    >
                                        <i className="bi bi-x-circle-fill" /> No Cumplió
                                    </button>
                                </div>
                            </div>
                            {levError && <p className="modal-error">{levError}</p>}
                            <div className="modal-buttons" style={{ padding: 0 }}>
                                <button className="btn-cancelar" onClick={() => { setShowLev(false); setLevError(''); }}>Cancelar</button>
                                <button className="btn-levantamiento" onClick={handleLevantamiento} disabled={loadingLev}>
                                    {loadingLev ? 'Guardando...' : <><i className="bi bi-check-lg" /> Confirmar Levantamiento</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal Ampliación ─────────────────────────────────────────── */}
            {showAmpliacion && (
                <div className="modal-overlay">
                    <div className="modal-box" style={{ maxWidth: 460 }}>
                        <div className="modal-header">
                            <h3><i className="bi bi-calendar-plus" /> AMPLIACIÓN DE PLAZO S.C.P.</h3>
                            <button className="modal-close" onClick={() => { setShowAmpliacion(false); setAmpError(''); }}>
                                <i className="bi bi-x-lg" />
                            </button>
                        </div>
                        <div className="modal-form">
                            <p style={{ fontSize: 13, color: '#4b5563', marginBottom: 12 }}>
                                Registre la ampliación del plazo de la Suspensión Condicional del Proceso de <strong>{m.nombreImputado}</strong>.
                                {m.plazoScp && <> Plazo actual: <strong>{m.plazoScp}</strong>.</>}
                            </p>
                            <div className="modal-field">
                                <label>NUEVO PLAZO (FECHA DE VENCIMIENTO) *</label>
                                <input type="date" value={ampForm.nuevoPlazoScp}
                                    onChange={e => setAmpForm({ ...ampForm, nuevoPlazoScp: e.target.value })} />
                            </div>
                            <div className="modal-field">
                                <label>MOTIVO DE LA AMPLIACIÓN *</label>
                                <textarea rows={3} placeholder="Describa el motivo de la ampliación..."
                                    value={ampForm.motivoAmpliacion}
                                    onChange={e => setAmpForm({ ...ampForm, motivoAmpliacion: e.target.value })} />
                            </div>
                            {ampError && <p className="modal-error">{ampError}</p>}
                            <div className="modal-buttons" style={{ padding: 0 }}>
                                <button className="btn-cancelar" onClick={() => { setShowAmpliacion(false); setAmpError(''); }}>Cancelar</button>
                                <button className="btn-amp" onClick={handleAmpliacion} disabled={loadingAmp}>
                                    {loadingAmp ? 'Guardando...' : <><i className="bi bi-check-lg" /> Confirmar Ampliación</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal Revocación ──────────────────────────────────────────── */}
            {showRevocacion && (
                <div className="modal-overlay">
                    <div className="modal-box" style={{ maxWidth: 460 }}>
                        <div className="modal-header">
                            <h3><i className="bi bi-x-circle" /> REVOCACIÓN DE S.C.P.</h3>
                            <button className="modal-close" onClick={() => { setShowRevocacion(false); setRevError(''); }}>
                                <i className="bi bi-x-lg" />
                            </button>
                        </div>
                        <div className="modal-form">
                            <p style={{ fontSize: 13, color: '#4b5563', marginBottom: 12 }}>
                                Esta acción revocará la Suspensión Condicional del Proceso de <strong>{m.nombreImputado}</strong>. La fecha de revocación se registrará automáticamente.
                            </p>
                            <div className="modal-field">
                                <label>NÚMERO DE OFICIO *</label>
                                <input type="text" placeholder="Ej. OF-2026-001"
                                    value={revForm.oficioRevocacion}
                                    onChange={e => setRevForm({ ...revForm, oficioRevocacion: e.target.value })} />
                            </div>
                            <div className="modal-field">
                                <label>MOTIVO DE LA REVOCACIÓN *</label>
                                <textarea rows={3} placeholder="Describa el motivo de la revocación..."
                                    value={revForm.motivoRevocacion}
                                    onChange={e => setRevForm({ ...revForm, motivoRevocacion: e.target.value })} />
                            </div>
                            {revError && <p className="modal-error">{revError}</p>}
                            <div className="modal-buttons" style={{ padding: 0 }}>
                                <button className="btn-cancelar" onClick={() => { setShowRevocacion(false); setRevError(''); }}>Cancelar</button>
                                <button className="btn-rev" onClick={handleRevocacion} disabled={loadingRev}>
                                    {loadingRev ? 'Guardando...' : <><i className="bi bi-check-lg" /> Confirmar Revocación</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal Confirmación SCP ────────────────────────────────────── */}
            {showConfirmSCP && (
                <div className="modal-overlay">
                    <div className="modal-box" style={{ maxWidth: 420 }}>
                        <div className="modal-header">
                            <h3><i className="bi bi-arrow-left-right" /> CAMBIO A SUSPENSIÓN CONDICIONAL</h3>
                            <button className="modal-close" onClick={() => setShowConfirmSCP(false)}>
                                <i className="bi bi-x-lg" />
                            </button>
                        </div>
                        <div className="modal-form">
                            <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.6 }}>
                                ¿Está seguro que desea registrar una <strong>Suspensión Condicional del Proceso</strong> para <strong>{m.nombreImputado}</strong>?
                            </p>
                            <p style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>
                                Se abrirá el formulario para capturar los datos de la suspensión. La medida cautelar original no será modificada.
                            </p>
                            <div className="modal-buttons" style={{ padding: 0, marginTop: 16 }}>
                                <button className="btn-cancelar" onClick={() => setShowConfirmSCP(false)}>No, cancelar</button>
                                <button className="btn-scp" onClick={() => { setShowConfirmSCP(false); onCambiarSCP(m); }}>
                                    <i className="bi bi-check-lg" /> Sí, continuar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* ── Modal Fallecimiento ── */}
            {showFallecimiento && (
                <div className="modal-overlay">
                    <div className="modal-box" style={{ maxWidth: 500 }}>
                        <div className="modal-header">
                            <h3><i className="bi bi-heartbreak" /> Registrar Fallecimiento</h3>
                            <button className="modal-close" onClick={() => setShowFallecimiento(false)}>
                                <i className="bi bi-x-lg" />
                            </button>
                        </div>
                        <div className="modal-form">
                            <p style={{ fontSize: 13, color: '#444', margin: '0 0 4px' }}>
                                Se registrará el fallecimiento de <strong>{m.nombreImputado}</strong>. Las supervisiones pendientes serán canceladas automáticamente.
                            </p>

                            {/* Fila: fecha */}
                            <div className="modal-field">
                                <label>FECHA DE FALLECIMIENTO *</label>
                                <input type="date"
                                    value={fallForm.fechaFallecimiento}
                                    max={new Date().toISOString().split('T')[0]}
                                    onChange={e => setFallForm(f => ({ ...f, fechaFallecimiento: e.target.value }))} />
                            </div>

                            {/* Fila: quién avisó + parentesco */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                <div className="modal-field">
                                    <label>¿QUIÉN AVISÓ? *</label>
                                    <input type="text" placeholder="Nombre completo del informante"
                                        value={fallForm.quienAviso}
                                        onChange={e => setFallForm(f => ({ ...f, quienAviso: e.target.value }))} />
                                </div>
                                <div className="modal-field">
                                    <label>PARENTESCO / RELACIÓN</label>
                                    <input type="text" placeholder="Ej. Familiar, Abogado, Autoridad..."
                                        value={fallForm.parentescoInformante}
                                        onChange={e => setFallForm(f => ({ ...f, parentescoInformante: e.target.value }))} />
                                </div>
                            </div>

                            {/* Fila: cómo se comprobó + no. acta */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                <div className="modal-field">
                                    <label>¿CÓMO SE COMPROBÓ? *</label>
                                    <select value={fallForm.comoSeComprobo}
                                        onChange={e => setFallForm(f => ({ ...f, comoSeComprobo: e.target.value }))}>
                                        <option value="">-- Seleccionar --</option>
                                        <option value="Acta de Defunción">Acta de Defunción</option>
                                        <option value="Oficio de Autoridad">Oficio de Autoridad</option>
                                        <option value="Declaración Verbal">Declaración Verbal</option>
                                        <option value="Nota Periodística">Nota Periodística</option>
                                        <option value="Otra">Otra</option>
                                    </select>
                                </div>
                                <div className="modal-field">
                                    <label>NO. DE ACTA DE DEFUNCIÓN</label>
                                    <input type="text" placeholder="Si aplica"
                                        value={fallForm.noActaDefuncion}
                                        onChange={e => setFallForm(f => ({ ...f, noActaDefuncion: e.target.value }))} />
                                </div>
                            </div>

                            {/* Observaciones */}
                            <div className="modal-field">
                                <label>OBSERVACIONES</label>
                                <textarea rows={3} placeholder="Información adicional relevante..."
                                    value={fallForm.observacionesFallecimiento}
                                    onChange={e => setFallForm(f => ({ ...f, observacionesFallecimiento: e.target.value }))} />
                            </div>

                            {fallError && <p className="modal-error">{fallError}</p>}
                        </div>
                        <div className="modal-buttons">
                            <button className="btn-cancelar" onClick={() => setShowFallecimiento(false)}>Cancelar</button>
                            <button className="btn-fallecimiento-confirm" onClick={handleFallecimiento} disabled={loadingFall}>
                                {loadingFall ? 'Registrando...' : <><i className="bi bi-check-lg" /> Confirmar Fallecimiento</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Historial de cambios ── */}
            {m?.id && (
                <div style={{ padding: '0 1.5rem 1.5rem' }}>
                    <HistorialRegistro entidad="MEDIDA_CAUTELAR" id={m.id} />
                </div>
            )}

        </div>
        </>
    );
};

export default DetalleMedida;
