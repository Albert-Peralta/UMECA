import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { crearEvaluacion, actualizarEvaluacion, getEvaluacionesByImputado } from '../api/evaluacionesApi';
import { getImputados, getImputadoById, getImputadosPorCausaPenal } from '../api/imputadosApi';
import { getEntrevistaById } from '../api/entrevistasApi';
import './FormularioEvaluacion.css';

const SUSTANCIAS = ['Alcohol', 'Tabaco', 'Marihuana', 'Cocaína', 'Pastillas', 'Otras'];
const SUSTANCIAS_INIT = SUSTANCIAS.map(s => ({ sustancia: s, consume: false, inicio: '', grms: '', meses: '', cantidad: '', fechaUltimoConsumo: '' }));
const DOM_ANT_FILA = { direccion: '', casaPropia: false, tiempoResidencia: '', motivoMudanza: '' };
const EMPLEO_ANT_FILA = { empresa: '', puesto: '', nombreJefe: '', razon: '', inicio: '', conclusion: '' };

const FORM_BASE = {
  // Solicitud
  fechaSolicitud: '', nombreSolicitante: '', cargo: '', dependencia: '',
  // Imputado
  causaPenal: '', nombreImputado: '', apPaternoImputado: '', apMaternoImputado: '', delito: '', ubicacionFisica: '', lugarNacimiento: '',
  puestaDisposicion: '', fechaAudiencia: '',
  // Metadatos
  horaInicio: '', horaFinal: '', lugarEntrevista: '',
  // S1 extras
  genero: '', fechaNacimiento: '', edad: '', municipio: '', estadoNacimiento: '', pais: '',
  curp: '', estadoCivil: '', hijos: false, numHijos: '', numHijosMenores: '',
  domicilioActualCalle: '', domicilioActualNo: '', domicilioActualColonia: '', domicilioActualMunicipio: '', domicilioActualEstado: '',
  tiempoEnDomicilio: '', tipoDomicilioActual: '', nombreArrendador: '', montoDomicilio: '', telefonoDomicilio: '', celularDomicilio: '',
  calleSecundaria: '', noSecundaria: '', coloniaSecundaria: '', municipioSecundario: '',
  razonDomicilio: '',
  // S6 empleo actual
  empresa: '', telEmpresa: '', puesto: '', nombreJefe: '', horarioTrabajo: '', domicilioTrabajo: '', salarioMensual: '', ultimoEmpleo: '',
  // S7
  gradoEstudios: '', nombreEscuela: '', anioEscolar: '', atrasoEscolar: '',
  // S5
  tiempoEnMorelos: '', familiaresOtroPais: '', mediosComunicacion: '', dondeHabitanFamiliares: '',
  tieneVisa: false, tienePasaporte: false, personasDependientes: '', dondeHabitanDependientes: '',
  // S9
  enfermedades: '', hobbies: '', enfermedadFamiliar: '', organizaciones: '', observacionesGenerales: '',
  // S10
  sabeDenunciante: false, viveConImputado: false, sabenDondeVive: false,
  nombreDenunciante: '', basesVictima: '', tipoSolicitud: '',
  // S11
  articuloDelito: '', reincidencia: false, relacionVictima: '', descripcionCompromiso: '',
  // S12
  procesosAnteriores: '',
  // Datos oficio
  numOficio: '', folioEscrito: '', fiscalia: '',
  // S13
  resultado: '', justificacionResultado: '',
  conclusionGeneral: '',
  riesgosProcesales: Array(7).fill(''),
  factoresEstabilidad: Array(7).fill(''),
  // Verificaciones por sección (s1–s11)
  verif_s1_metodo: '', verif_s1_resultado: '',
  verif_s2_metodo: '', verif_s2_resultado: '',
  verif_s3_metodo: '', verif_s3_resultado: '',
  verif_s4_metodo: '', verif_s4_resultado: '',
  verif_s5_metodo: '', verif_s5_resultado: '',
  verif_s6_metodo: '', verif_s6_resultado: '',
  verif_s7_metodo: '', verif_s7_resultado: '',
  verif_s8_metodo: '', verif_s8_resultado: '',
  verif_s9_metodo: '', verif_s9_resultado: '',
  verif_s10_metodo: '', verif_s10_resultado: '',
  verif_s11_metodo: '', verif_s11_resultado: '',
};

const sec = (titulo) => <div className="fev-seccion"><h3>{titulo}</h3></div>;
const field = (label, children, full = false, err = false, id = undefined) => (
  <div id={id} className={`fev-field${full ? ' fev-field-full' : ''}${err ? ' fev-field-error' : ''}`}>
    <label>{label}</label>
    {children}
    {err && <span className="fev-campo-error-msg">Este campo es obligatorio</span>}
  </div>
);
const inp = (value, onChange, type = 'text', extra = {}) => (
  <input type={type} value={value ?? ''} onChange={e => onChange(e.target.value)} {...extra} />
);
const sel = (value, onChange, opts) => (
  <select value={value ?? ''} onChange={e => onChange(e.target.value)}>
    <option value="">Seleccionar...</option>
    {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
  </select>
);
const yn = (value, onChange) => (
  <div className="fev-yn">
    <label><input type="radio" checked={!!value} onChange={() => onChange(true)} /> Sí</label>
    <label><input type="radio" checked={!value} onChange={() => onChange(false)} /> No</label>
  </div>
);

const BloqueVerificacion = ({ secId, form, s }) => (
  <div className="fev-verificacion">
    <div className="fev-verif-titulo">
      <i className="bi bi-clipboard2-check-fill" /> Verificación de la información
    </div>
    <div className="fev-verif-grid">
      <div className="fev-field">
        <label>Método y Fuentes de verificación</label>
        <textarea
          value={form[`verif_${secId}_metodo`] || ''}
          onChange={e => s(`verif_${secId}_metodo`, e.target.value)}
          placeholder="Ej. Llamada telefónica, visita domiciliaria..."
          rows={3}
        />
      </div>
      <div className="fev-field">
        <label>Resultado de verificación</label>
        <textarea
          value={form[`verif_${secId}_resultado`] || ''}
          onChange={e => s(`verif_${secId}_resultado`, e.target.value)}
          placeholder="Describe consistencias o inconsistencias encontradas..."
          rows={3}
        />
      </div>
    </div>
  </div>
);

/**
 * Formulario de evaluación de riesgos procesales (13 secciones).
 *
 * Comportamiento clave:
 * - **Draft auto-save**: cada vez que el formulario tiene contenido real se guarda
 *   en localStorage (clave `umeca-draft-eval-nuevo` o `umeca-draft-eval-{id}`).
 *   Al montar, si existe un draft con contenido, se ofrece recuperarlo.
 * - **Pre-llenado**: al seleccionar un imputado se busca su última entrevista y se
 *   llaman `preLlenarDesdeEntrevista` para copiar datos personales, domicilio,
 *   sustancias, personas y referencias, sin pisar campos ya editados (en edición).
 * - **Validación**: `handleGuardar` verifica campos obligatorios, resalta el primero
 *   con error y hace scroll hasta él antes de bloquear el envío.
 * - **Mapeo doble**: los nombres de campos del formulario difieren de los del backend
 *   (ej. `empresa` → `empresaImp`, verificaciones snake_case → camelCase). El mapeo
 *   se aplica al armar el payload en `handleGuardar`.
 *
 * @param {object} evaluacion  objeto de evaluación para edición, o null si es nueva
 * @param {Function} onVolver  callback al cancelar
 * @param {Function} onGuardado callback al guardar exitosamente
 */
const FormularioEvaluacion = ({ evaluacion, onVolver, onGuardado }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const esEdicion = !!evaluacion;

  const [form, setForm] = useState(() => {
    if (esEdicion) return {
      ...FORM_BASE,
      ...evaluacion,
      // nombreImputado trae solo el nombre, apPaternoImputado el apellido
      nombreImputado: evaluacion.nombreImputado || '',
      apPaternoImputado: evaluacion.apPaternoImputado || '',
      apMaternoImputado: evaluacion.apMaternoImputado || '',
      // Mapeo de campos _imp del backend a nombres del formulario
      lugarNacimiento: evaluacion.lugarNacimientoImp || '',
      municipio: evaluacion.municipioImp || '',
      pais: evaluacion.paisImp || '',
      empresa: evaluacion.empresaImp || '',
      telEmpresa: evaluacion.telEmpresaImp || '',
      puesto: evaluacion.puestoImp || '',
      nombreJefe: evaluacion.nombreJefeImp || '',
      horarioTrabajo: evaluacion.horarioTrabajoImp || '',
      domicilioTrabajo: evaluacion.domicilioTrabajoImp || '',
      salarioMensual: evaluacion.salarioMensualImp || '',
      ultimoEmpleo: evaluacion.ultimoEmpleoImp || '',
      // Mapeo de verificaciones camelCase (backend) → snake_case (formulario)
      verif_s1_metodo:  evaluacion.verifS1Metodo   || '',  verif_s1_resultado:  evaluacion.verifS1Resultado  || '',
      verif_s2_metodo:  evaluacion.verifS2Metodo   || '',  verif_s2_resultado:  evaluacion.verifS2Resultado  || '',
      verif_s3_metodo:  evaluacion.verifS3Metodo   || '',  verif_s3_resultado:  evaluacion.verifS3Resultado  || '',
      verif_s4_metodo:  evaluacion.verifS4Metodo   || '',  verif_s4_resultado:  evaluacion.verifS4Resultado  || '',
      verif_s5_metodo:  evaluacion.verifS5Metodo   || '',  verif_s5_resultado:  evaluacion.verifS5Resultado  || '',
      verif_s6_metodo:  evaluacion.verifS6Metodo   || '',  verif_s6_resultado:  evaluacion.verifS6Resultado  || '',
      verif_s7_metodo:  evaluacion.verifS7Metodo   || '',  verif_s7_resultado:  evaluacion.verifS7Resultado  || '',
      verif_s8_metodo:  evaluacion.verifS8Metodo   || '',  verif_s8_resultado:  evaluacion.verifS8Resultado  || '',
      verif_s9_metodo:  evaluacion.verifS9Metodo   || '',  verif_s9_resultado:  evaluacion.verifS9Resultado  || '',
      verif_s10_metodo: evaluacion.verifS10Metodo  || '',  verif_s10_resultado: evaluacion.verifS10Resultado || '',
      verif_s11_metodo: evaluacion.verifS11Metodo  || '',  verif_s11_resultado: evaluacion.verifS11Resultado || '',
      numOficio: evaluacion.numOficio || '',
      folioEscrito: evaluacion.folioEscrito || '',
      fiscalia: evaluacion.fiscalia || '',
      conclusionGeneral: evaluacion.conclusionGeneral || '',
      riesgosProcesales: (() => { try { const a = JSON.parse(evaluacion.riesgosProcesalesJson || '[]'); return [...a, ...Array(7)].slice(0,7).map(v=>v||''); } catch { return Array(7).fill(''); } })(),
      factoresEstabilidad: (() => { try { const a = JSON.parse(evaluacion.factoresEstabilidadJson || '[]'); return [...a, ...Array(7)].slice(0,7).map(v=>v||''); } catch { return Array(7).fill(''); } })(),
    };
    return { ...FORM_BASE };
  });
  const [domAnteriores, setDomAnteriores] = useState(
    esEdicion && evaluacion.domiciliosAnterioresJson
      ? JSON.parse(evaluacion.domiciliosAnterioresJson)
      : [{ ...DOM_ANT_FILA }]
  );
  const [empleosAnt, setEmpleosAnt] = useState(
    esEdicion && evaluacion.empleosAnterioresJson
      ? JSON.parse(evaluacion.empleosAnterioresJson)
      : [{ ...EMPLEO_ANT_FILA }]
  );
  const [personasHabita, setPersonasHabita] = useState([]);
  const [referencias, setReferencias] = useState([]);
  const [sustancias, setSustancias] = useState([...SUSTANCIAS_INIT]);

  const [imputadoBusq, setImputadoBusq] = useState('');
  const [imputadoOpts, setImputadoOpts] = useState([]);
  const [entrevistaId, setEntrevistaId] = useState(esEdicion ? evaluacion.entrevistaId : null);
  const [preLlenado, setPreLlenado] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errores, setErrores] = useState({});
  const [evaluacionesPrevias, setEvaluacionesPrevias] = useState([]);
  const [imputadoSelId, setImputadoSelId] = useState(null);
  const [tieneDraft, setTieneDraft] = useState(false);
  const [draftGuardadoEn, setDraftGuardadoEn] = useState(null);

  // Selección de imputado cuando hay varios con la misma causa penal
  const [imputadosCausaPenal, setImputadosCausaPenal] = useState([]);
  const [showSeleccionImputado, setShowSeleccionImputado] = useState(false);

  /** Al salir del campo causa penal, busca si ya hay imputados con ese número */
  const handleCausaPenalBlur = async (causaPenal) => {
    if (!causaPenal?.trim() || esEdicion) return;
    try {
      const res = await getImputadosPorCausaPenal(causaPenal.trim());
      const lista = res.data?.data || [];
      if (lista.length >= 1) {
        // Siempre preguntar — puede ser la misma persona u otra diferente
        setImputadosCausaPenal(lista);
        setShowSeleccionImputado(true);
      }
    } catch { /* búsqueda fallida — el usuario captura manualmente */ }
  };

  // ── Draft localStorage ──────────────────────────────────────────────────────
  const draftKey = esEdicion ? `umeca-draft-eval-${evaluacion.id}` : 'umeca-draft-eval-nuevo';

  /**
   * Determina si el formulario tiene contenido real (algún campo distinto de vacío/false/null).
   * Se usa para decidir si vale la pena guardar o mostrar el banner de borrador.
   */
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

  // Cargar draft al montar (solo formulario nuevo)
  useEffect(() => {
    if (esEdicion) return;
    const raw = localStorage.getItem(draftKey);
    const meta = localStorage.getItem(draftKey + '-meta');
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (formTieneContenido(parsed.form)) {
        setTieneDraft(true);
        setDraftGuardadoEn(meta);
      } else {
        localStorage.removeItem(draftKey);
        localStorage.removeItem(draftKey + '-meta');
      }
    } catch { localStorage.removeItem(draftKey); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recuperarDraft = () => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const { form: f, domAnteriores: da, empleosAnt: ea } = JSON.parse(raw);
      setForm(f);
      if (da) setDomAnteriores(da);
      if (ea) setEmpleosAnt(ea);
      setTieneDraft(false);
    } catch { borrarDraft(); }
  };

  // Auto-guardar solo cuando el form tiene contenido real
  useEffect(() => {
    if (!formTieneContenido(form)) return;
    const draft = { form, domAnteriores, empleosAnt };
    localStorage.setItem(draftKey, JSON.stringify(draft));
    const ahora = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    localStorage.setItem(draftKey + '-meta', ahora);
    setDraftGuardadoEn(ahora);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, domAnteriores, empleosAnt]);

  const s = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const hoy = new Date().toISOString().split('T')[0];
  const maxFechaNac = (() => {
    const d = new Date(); d.setFullYear(d.getFullYear() - 18); return d.toISOString().split('T')[0];
  })();

  // Al editar: re-cargar datos de la entrevista vinculada para llenar campos de la entrevista
  useEffect(() => {
    if (esEdicion && evaluacion.entrevistaId) {
      getEntrevistaById(evaluacion.entrevistaId).then(res => {
        if (res.data.ok) preLlenarDesdeEntrevista(res.data.data, evaluacion.entrevistaId);
      }).catch(err => console.warn('No se pudo cargar la entrevista vinculada:', err));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Buscar imputados
  useEffect(() => {
    if (imputadoBusq.trim().length < 2) { setImputadoOpts([]); return; }
    getImputados(imputadoBusq).then(res => {
      if (res.data.ok) setImputadoOpts(res.data.data || []);
    }).catch(err => console.warn('Error al buscar imputados:', err));
  }, [imputadoBusq]);

  const seleccionarImputado = async (imp) => {
    setImputadoBusq('');
    setImputadoOpts([]);
    setForm(prev => ({
      ...prev,
      causaPenal: imp.causaPenal || '',
      nombreImputado: imp.nombre || '',
      apPaternoImputado: imp.apPaterno || '',
      apMaternoImputado: imp.apMaterno || '',
      delito: imp.delito || '',
      ubicacionFisica: imp.ubicacionFisica || '',
    }));
    setImputadoSelId(imp.id);
    // Fetch previous evaluations for this imputado
    try {
      const evRes = await getEvaluacionesByImputado(imp.id);
      if (evRes.data.ok) setEvaluacionesPrevias(evRes.data.data || []);
    } catch { /* sin antecedentes */ }
    // Fetch full imputado to get linked entrevistas
    try {
      const res = await getImputadoById(imp.id);
      if (res.data.ok) {
        const full = res.data.data;
        if (full.entrevistas?.length) {
          const ultima = full.entrevistas[full.entrevistas.length - 1];
          const eres = await getEntrevistaById(ultima.id);
          if (eres.data.ok) preLlenarDesdeEntrevista(eres.data.data, ultima.id);
        }
      }
    } catch { /* continuar sin pre-llenado */ }
  };

  /**
   * Copia los datos de una entrevista de encuadre al formulario de evaluación.
   * Solo sobreescribe campos que aún estén vacíos en modo edición, para no perder
   * datos ya guardados. Los documentos migratorios se infieren del campo de texto libre
   * buscando las palabras clave "visa" y "pasaporte".
   */
  const preLlenarDesdeEntrevista = (e, eId) => {
    setEntrevistaId(eId);
    setPreLlenado(true);

    // Detectar documentos migratorios desde texto libre
    const docsMig = (e.documentosMigratorios || '').toLowerCase();
    const tieneVisa      = docsMig.includes('visa');
    const tienePasaporte = docsMig.includes('pasaporte');

    setForm(prev => ({
      ...prev,
      // Datos personales
      genero:          e.genero          || prev.genero,
      fechaNacimiento: e.fechaNacimiento || prev.fechaNacimiento,
      edad:            e.edad            || prev.edad,
      municipio:       e.municipio       || prev.municipio,
      estadoNacimiento: e.estadoNacimiento || prev.estadoNacimiento,
      pais:            e.pais            || prev.pais,
      curp:            e.curp            || prev.curp,
      estadoCivil:     e.estadoCivil     || prev.estadoCivil,
      // Contacto
      telefonoDomicilio: e.telefonoCasa  || prev.telefonoDomicilio,
      celularDomicilio:  e.celular       || prev.celularDomicilio,
      // Documentos migratorios
      tieneVisa:      tieneVisa      || prev.tieneVisa,
      tienePasaporte: tienePasaporte || prev.tienePasaporte,
      // Familiares exterior
      familiaresOtroPais: e.familiaresExteriorEsp || e.familiaresExterior ? 'Sí' : prev.familiaresOtroPais,
      // Salud
      enfermedades:    e.enfermedad   || prev.enfermedades,
      // Relación con víctima
      relacionVictima: e.relacionVictima || prev.relacionVictima,
      // Laboral
      gradoEstudios:   e.gradoEstudios   || prev.gradoEstudios,
      empresa:         e.empresa         || prev.empresa,
      telEmpresa:      e.telEmpresa      || prev.telEmpresa,
      puesto:          e.puesto          || prev.puesto,
      nombreJefe:      e.nombreJefe      || prev.nombreJefe,
      horarioTrabajo:  e.horarioTrabajo  || prev.horarioTrabajo,
      domicilioTrabajo: e.domicilioTrabajo || prev.domicilioTrabajo,
      salarioMensual:  e.salarioMensual  || prev.salarioMensual,
      ultimoEmpleo:    e.ultimoEmpleo    || prev.ultimoEmpleo,
    }));

    if (e.domicilios?.length) {
      const d = e.domicilios[0];
      setForm(prev => ({
        ...prev,
        // Solo pre-llenar domicilio si el campo aún está vacío (no pisar valores guardados en edición)
        domicilioActualCalle:     prev.domicilioActualCalle     || d.calle       || d.calleNumero || '',
        domicilioActualNo:        prev.domicilioActualNo        || d.numero      || '',
        domicilioActualColonia:   prev.domicilioActualColonia   || d.colonia     || '',
        domicilioActualMunicipio: prev.domicilioActualMunicipio || d.municipio   || '',
        domicilioActualEstado:    prev.domicilioActualEstado    || d.estado      || '',
        tiempoEnDomicilio:        prev.tiempoEnDomicilio        || (d.anios ? `${d.anios} año(s)` : ''),
        tipoDomicilioActual:      prev.tipoDomicilioActual      || d.tipoDomicilio || '',
      }));
    }

    if (e.personasHabita?.length)    setPersonasHabita(e.personasHabita);
    if (e.referencias?.length)       setReferencias(e.referencias);
    if (e.consumoSustancias?.length) {
      setSustancias(SUSTANCIAS_INIT.map(si => {
        const match = e.consumoSustancias.find(cs => cs.sustancia === si.sustancia);
        return match ? { ...si, ...match } : si;
      }));
    }
  };

  const handleImprimir = () => {
    const domAntHTML = domAnteriores.map(d =>
      `<tr><td>${d.direccion||''}</td><td>${d.casaPropia?'Sí':'No'}</td><td>${d.tiempoResidencia||''}</td><td>${d.motivoMudanza||''}</td></tr>`
    ).join('');
    const personasHTML = personasHabita.map(p =>
      `<tr><td>${p.nombre||''}</td><td>${p.parentesco||''}</td><td>${p.tiempoCohabitar||''}</td><td>${p.edad||''}</td><td>${p.telefono||''}</td><td>${p.identificacion||''}</td></tr>`
    ).join('');
    const refHTML = referencias.map(r =>
      `<tr><td>${r.nombre||''}</td><td>${r.parentesco||''}</td><td>${r.telefono||''}</td><td>${r.direccion||''}</td></tr>`
    ).join('');
    const empAntHTML = empleosAnt.map(e =>
      `<tr><td>${e.empresa||''}</td><td>${e.puesto||''}</td><td>${e.nombreJefe||''}</td><td>${e.razon||''}</td><td>${e.inicio||''}</td><td>${e.conclusion||''}</td></tr>`
    ).join('');
    const sustHTML = sustancias.map(s2 =>
      `<tr><td><b>${s2.sustancia}</b></td><td>${s2.consume?'Sí':'No'}</td><td>${s2.consume?s2.inicio||'':''}</td><td>${s2.consume?s2.grms||'':''}</td><td>${s2.consume?s2.meses||'':''}</td><td>${s2.consume?s2.cantidad||'':''}</td><td>${s2.consume?s2.fechaUltimoConsumo||'':''}</td></tr>`
    ).join('');
    const resultadoLabel = form.resultado === 'FLEXIBLE' ? 'Flexible — Bajo Riesgo' : form.resultado === 'ESTRICTO' ? 'Estricto — Medio Riesgo' : form.resultado === 'DIFICIL_CUMPLIR' ? 'Difícil de Cumplir — Alto Riesgo' : '—';
    const resultadoColor = form.resultado === 'FLEXIBLE' ? '#1a7a2e' : form.resultado === 'ESTRICTO' ? '#b45309' : form.resultado === 'DIFICIL_CUMPLIR' ? '#b91c1c' : '#333';

    const verifBloque = (label, secId) => {
      const metodo = form[`verif_${secId}_metodo`] || '';
      const resultado = form[`verif_${secId}_resultado`] || '';
      if (!metodo && !resultado) return '';
      return `
        <div class="verif">
          <div class="verif-titulo">✔ Verificación de la información — ${label}</div>
          <div class="verif-grid">
            <div><b>Método y Fuentes:</b><br>${metodo||'—'}</div>
            <div><b>Resultado:</b><br>${resultado||'—'}</div>
          </div>
        </div>`;
    };

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<title>Evaluación de Riesgos — ${form.apPaternoImputado} ${form.nombreImputado}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 10px; color: #111; background: #fff; }
  .page { max-width: 800px; margin: 0 auto; padding: 18px 24px; }
  .header { text-align: center; border-bottom: 2px solid #166534; padding-bottom: 8px; margin-bottom: 12px; }
  .header h1 { font-size: 13px; font-weight: bold; color: #166534; text-transform: uppercase; }
  .header p  { font-size: 10px; color: #555; margin-top: 3px; }
  .meta-row  { display: flex; gap: 20px; margin-bottom: 10px; font-size: 10px; }
  .meta-row .item { flex: 1; }
  .meta-row .item label { font-weight: bold; display: block; color: #444; font-size: 9px; text-transform: uppercase; }
  .seccion { background: #166534; color: #fff; font-weight: bold; font-size: 10px;
             padding: 4px 10px; margin: 12px 0 6px; text-transform: uppercase; letter-spacing: 0.5px; }
  .grid { display: grid; gap: 6px 12px; margin-bottom: 6px; }
  .g2 { grid-template-columns: 1fr 1fr; }
  .g3 { grid-template-columns: 1fr 1fr 1fr; }
  .g4 { grid-template-columns: 1fr 1fr 1fr 1fr; }
  .f { }
  .f label { font-size: 8.5px; color: #555; display: block; text-transform: uppercase; font-weight: bold; }
  .f span  { display: block; border-bottom: 1px solid #ccc; min-height: 14px; padding: 1px 2px; font-size: 10px; }
  .f-full  { grid-column: 1 / -1; }
  .sub { font-weight: bold; font-size: 9.5px; color: #166534; text-transform: uppercase;
         border-bottom: 1px solid #ddd; margin: 8px 0 4px; padding-bottom: 2px; }
  table { width: 100%; border-collapse: collapse; font-size: 9px; margin-bottom: 6px; }
  th { background: #e8f5e9; color: #166534; font-weight: bold; padding: 3px 5px; text-align: left; border: 1px solid #ccc; }
  td { padding: 3px 5px; border: 1px solid #ddd; }
  .yn { display: inline-block; background: #166534; color: #fff; padding: 1px 6px; border-radius: 3px; font-size: 9px; }
  .verif { border-left: 3px solid #4ade80; background: #f0fdf4; padding: 5px 8px; margin: 6px 0; border-radius: 4px; }
  .verif-titulo { font-size: 9px; font-weight: bold; color: #166534; margin-bottom: 4px; }
  .verif-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 9.5px; }
  .criterio { font-size: 13px; font-weight: bold; color: ${resultadoColor}; padding: 6px 10px;
              border: 2px solid ${resultadoColor}; display: inline-block; border-radius: 6px; margin: 6px 0; }
  .footer { margin-top: 20px; border-top: 1px solid #ccc; padding-top: 10px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; }
  .footer .f-line { border-bottom: 1px solid #000; min-height: 16px; margin-top: 14px; }
  .footer label { font-size: 8.5px; color: #555; display: block; }
  @media print { body { font-size: 9.5px; } .page { padding: 10px 14px; } }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <h1>Formato de entrevista para la evaluación de riesgos procesales</h1>
    <p>Unidad de Medidas Cautelares para Adultos del Estado de Morelos, SG, CRS &nbsp;|&nbsp; Versión 5 (16 MAR 2022)</p>
  </div>

  <div class="meta-row">
    <div class="item"><label>No. Carpeta / Causa Penal</label>${form.causaPenal||'—'}</div>
    <div class="item"><label>Hora inicio</label>${form.horaInicio||'—'}</div>
    <div class="item"><label>Hora final</label>${form.horaFinal||'—'}</div>
    <div class="item"><label>Lugar de entrevista</label>${form.lugarEntrevista||'—'}</div>
  </div>

  <div class="seccion">Datos de la Solicitud</div>
  <div class="grid g4">
    <div class="f"><label>Fecha Solicitud</label><span>${form.fechaSolicitud||'—'}</span></div>
    <div class="f"><label>Puesta a Disposición</label><span>${form.puestaDisposicion||'—'}</span></div>
    <div class="f"><label>Fecha Audiencia</label><span>${form.fechaAudiencia||'—'}</span></div>
    <div class="f"><label>Solicitante</label><span>${form.nombreSolicitante||'—'}</span></div>
    <div class="f"><label>Cargo</label><span>${form.cargo||'—'}</span></div>
    <div class="f"><label>Dependencia</label><span>${form.dependencia||'—'}</span></div>
  </div>

  <div class="seccion">1. Datos Generales</div>
  <div class="grid g4">
    <div class="f"><label>Apellido Paterno</label><span>${form.apPaternoImputado||'—'}</span></div>
    <div class="f"><label>Nombre(s)</label><span>${form.nombreImputado||'—'}</span></div>
    <div class="f"><label>Género</label><span>${form.genero||'—'}</span></div>
    <div class="f"><label>Fecha Nacimiento</label><span>${form.fechaNacimiento||'—'}</span></div>
    <div class="f"><label>Edad</label><span>${form.edad||'—'}</span></div>
    <div class="f"><label>Municipio Nac.</label><span>${form.municipio||'—'}</span></div>
    <div class="f"><label>Estado Nac.</label><span>${form.estadoNacimiento||'—'}</span></div>
    <div class="f"><label>País</label><span>${form.pais||'—'}</span></div>
    <div class="f"><label>CURP</label><span>${form.curp||'—'}</span></div>
    <div class="f"><label>Estado Civil</label><span>${form.estadoCivil||'—'}</span></div>
    <div class="f"><label>Hijos</label><span>${form.hijos?'Sí':'No'}${form.hijos?' ('+form.numHijos+', menores: '+form.numHijosMenores+')':''}</span></div>
    <div class="f"><label>Delito</label><span>${form.delito||'—'}</span></div>
  </div>
  <div class="sub">Domicilio actual</div>
  <div class="grid g4">
    <div class="f"><label>Calle</label><span>${form.domicilioActualCalle||'—'}</span></div>
    <div class="f"><label>No.</label><span>${form.domicilioActualNo||'—'}</span></div>
    <div class="f"><label>Colonia</label><span>${form.domicilioActualColonia||'—'}</span></div>
    <div class="f"><label>Municipio</label><span>${form.domicilioActualMunicipio||'—'}</span></div>
    <div class="f"><label>Estado</label><span>${form.domicilioActualEstado||'—'}</span></div>
    <div class="f"><label>Tiempo en domicilio</label><span>${form.tiempoEnDomicilio||'—'}</span></div>
    <div class="f"><label>Tipo domicilio</label><span>${form.tipoDomicilioActual||'—'}</span></div>
    <div class="f"><label>Teléfono</label><span>${form.telefonoDomicilio||'—'}</span></div>
    <div class="f"><label>Celular</label><span>${form.celularDomicilio||'—'}</span></div>
  </div>
  ${form.calleSecundaria ? `<div class="sub">Domicilio secundario</div>
  <div class="grid g4">
    <div class="f"><label>Calle</label><span>${form.calleSecundaria||'—'}</span></div>
    <div class="f"><label>No.</label><span>${form.noSecundaria||'—'}</span></div>
    <div class="f"><label>Colonia</label><span>${form.coloniaSecundaria||'—'}</span></div>
    <div class="f"><label>Municipio</label><span>${form.municipioSecundario||'—'}</span></div>
  </div>` : ''}
  ${form.razonDomicilio ? `<div class="f f-full"><label>¿Por qué tiene ahí su domicilio?</label><span>${form.razonDomicilio}</span></div>` : ''}
  ${verifBloque('S1', 's1')}

  <div class="seccion">2. Domicilios Anteriores</div>
  <table><thead><tr><th>Dirección</th><th>Casa Propia</th><th>Tiempo Residencia</th><th>Motivo Mudanza</th></tr></thead>
  <tbody>${domAntHTML}</tbody></table>
  ${verifBloque('S2', 's2')}

  <div class="seccion">3. Personas con Quién Habita</div>
  <table><thead><tr><th>Nombre</th><th>Parentesco</th><th>Tiempo Cohabit.</th><th>Edad</th><th>Teléfono</th><th>Identificación</th></tr></thead>
  <tbody>${personasHTML}</tbody></table>
  ${verifBloque('S3', 's3')}

  <div class="seccion">4. Referencias Personales e Información de Localización</div>
  <table><thead><tr><th>Nombre</th><th>Parentesco / Relación</th><th>Teléfono</th><th>Dirección</th></tr></thead>
  <tbody>${refHTML}</tbody></table>
  ${verifBloque('S4', 's4')}

  <div class="seccion">5. Facilidad de Abandonar el Estado/País o Permanecer Oculto</div>
  <div class="grid g2">
    <div class="f"><label>Tiempo en Morelos</label><span>${form.tiempoEnMorelos||'—'}</span></div>
    <div class="f"><label>Familiares fuera del Estado/País</label><span>${form.familiaresOtroPais||'—'}</span></div>
    <div class="f"><label>Medios de comunicación</label><span>${form.mediosComunicacion||'—'}</span></div>
    <div class="f"><label>¿Dónde habitan?</label><span>${form.dondeHabitanFamiliares||'—'}</span></div>
    <div class="f"><label>Dependientes económicos</label><span>${form.personasDependientes||'—'}</span></div>
    <div class="f"><label>¿Dónde habitan dependientes?</label><span>${form.dondeHabitanDependientes||'—'}</span></div>
    <div class="f"><label>Visa</label><span>${form.tieneVisa?'Sí':'No'}</span></div>
    <div class="f"><label>Pasaporte</label><span>${form.tienePasaporte?'Sí':'No'}</span></div>
  </div>
  ${verifBloque('S5', 's5')}

  <div class="seccion">6. Información Laboral / Ocupacional</div>
  <div class="sub">Empleo actual</div>
  <div class="grid g4">
    <div class="f"><label>Empresa</label><span>${form.empresa||'—'}</span></div>
    <div class="f"><label>Puesto</label><span>${form.puesto||'—'}</span></div>
    <div class="f"><label>Nombre Jefe</label><span>${form.nombreJefe||'—'}</span></div>
    <div class="f"><label>Teléfono</label><span>${form.telEmpresa||'—'}</span></div>
    <div class="f"><label>Horario</label><span>${form.horarioTrabajo||'—'}</span></div>
    <div class="f"><label>Salario Mensual</label><span>${form.salarioMensual||'—'}</span></div>
    <div class="f f-full"><label>Domicilio</label><span>${form.domicilioTrabajo||'—'}</span></div>
  </div>
  ${form.ultimoEmpleo ? `<div class="f"><label>Último empleo</label><span>${form.ultimoEmpleo}</span></div>` : ''}
  <div class="sub">Empleos anteriores</div>
  <table><thead><tr><th>Empresa</th><th>Puesto</th><th>Nombre Jefe</th><th>Razón Cambio</th><th>Inicio</th><th>Conclusión</th></tr></thead>
  <tbody>${empAntHTML}</tbody></table>
  ${verifBloque('S6', 's6')}

  <div class="seccion">7. Consumo de Sustancias</div>
  <table><thead><tr><th>Sustancia</th><th>¿Consume?</th><th>Inicio</th><th>Grms</th><th>Meses</th><th>Cantidad</th><th>Últ. Consumo</th></tr></thead>
  <tbody>${sustHTML}</tbody></table>
  ${verifBloque('S8', 's8')}

  <div class="seccion">8. Entorno Social</div>
  <div class="grid g2">
    <div class="f"><label>Enfermedades</label><span>${form.enfermedades||'—'}</span></div>
    <div class="f"><label>Enfermedad familiar</label><span>${form.enfermedadFamiliar||'—'}</span></div>
    <div class="f f-full"><label>Hobbies / Asociaciones / Deporte</label><span>${form.hobbies||'—'}</span></div>
    <div class="f f-full"><label>Organizaciones</label><span>${form.organizaciones||'—'}</span></div>
    <div class="f f-full"><label>Observaciones generales</label><span>${form.observacionesGenerales||'—'}</span></div>
  </div>
  ${verifBloque('S9', 's9')}

  <div class="seccion">9. Datos sobre el Denunciante</div>
  <div class="grid g3">
    <div class="f"><label>¿Sabe quién lo denunció?</label><span class="yn">${form.sabeDenunciante?'Sí':'No'}</span></div>
    <div class="f"><label>¿Vive con el imputado?</label><span class="yn">${form.viveConImputado?'Sí':'No'}</span></div>
    <div class="f"><label>¿Saben dónde vive?</label><span class="yn">${form.sabenDondeVive?'Sí':'No'}</span></div>
    ${form.sabeDenunciante ? `<div class="f"><label>Nombre denunciante</label><span>${form.nombreDenunciante||'—'}</span></div>` : ''}
    <div class="f"><label>Tipo de solicitud</label><span>${form.tipoSolicitud||'—'}</span></div>
  </div>
  ${form.basesVictima ? `<div class="f"><label>Bases para esta víctima</label><span>${form.basesVictima}</span></div>` : ''}
  ${verifBloque('S10', 's10')}

  <div class="seccion">10. Información del Proceso Actual</div>
  <div class="grid g4">
    <div class="f"><label>Delito</label><span>${form.delito||'—'}</span></div>
    <div class="f"><label>Reincidencia</label><span class="yn">${form.reincidencia?'Sí':'No'}</span></div>
    <div class="f"><label>Ubicación Física</label><span>${form.ubicacionFisica||'—'}</span></div>
    <div class="f f-full"><label>Relación con la víctima</label><span>${form.relacionVictima||'—'}</span></div>
    <div class="f f-full"><label>Descripción del compromiso</label><span>${form.descripcionCompromiso||'—'}</span></div>
  </div>
  ${verifBloque('S11', 's11')}

  <div class="seccion">11. Procesos Pendientes / Anteriores</div>
  <div class="f"><label>Expediente</label><span>${form.procesosAnteriores||'—'}</span></div>

  <div class="seccion">12. Conclusión / Criterio de Riesgo</div>
  <div class="criterio">${resultadoLabel}</div>
  <div class="f" style="margin-top:6px"><label>Justificación</label><span>${form.justificacionResultado||'—'}</span></div>

  <div class="footer">
    <div>
      <div class="f-line"></div>
      <label>Nombre del Evaluador</label>
    </div>
    <div>
      <div class="f-line"></div>
      <label>Firma</label>
    </div>
    <div>
      <div class="f-line"></div>
      <label>Fecha y Lugar</label>
    </div>
  </div>
</div>
<script>window.onload = () => { window.print(); }</script>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (!win) {
      showToast('El navegador bloqueó la ventana emergente. Permite ventanas emergentes para este sitio e inténtalo de nuevo.', 'error');
      return;
    }
    win.document.write(html);
    win.document.close();
  };

  /**
   * Valida, construye el payload y llama a la API (crear o actualizar).
   * - En caso de error del servidor o de red, mantiene el usuario en el formulario con mensaje.
   * - En caso de éxito, borra el draft y llama onGuardado().
   * El payload traduce los nombres de campo del frontend al esquema del backend
   * (campos _imp, verificaciones camelCase, listas como JSON).
   */
  const handleGuardar = async () => {
    const nuevosErrores = {
      causaPenal:        !form.causaPenal,
      nombreImputado:    !form.nombreImputado,
      fechaSolicitud:    !form.fechaSolicitud,
      nombreSolicitante: !form.nombreSolicitante,
      fechaAudiencia:    false,
      puestaDisposicion: false,
      ubicacionFisica:   !form.ubicacionFisica,
      delito:            !form.delito,
      resultado:         !form.resultado,
    };
    setErrores(nuevosErrores);
    const primerError = Object.keys(nuevosErrores).find(k => nuevosErrores[k]);
    if (primerError) {
      setError('Por favor completa todos los campos obligatorios marcados en rojo');
      const el = document.getElementById(`fev-${primerError}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setLoading(true);
    setError('');
    setErrores({});
    try {
      const payload = {
        ...form,
        entrevistaId,
        imputadoId: imputadoSelId || null,
        // Fechas vacías → null (Spring no puede deserializar "" como LocalDate)
        fechaSolicitud:     form.fechaSolicitud     || null,
        puestaDisposicion:  form.puestaDisposicion  || null,
        fechaAudiencia:     form.fechaAudiencia     || null,
        fechaNacimiento:    form.fechaNacimiento     || null,
        domiciliosAnterioresJson: JSON.stringify(domAnteriores),
        empleosAnterioresJson: JSON.stringify(empleosAnt),
        // Mapeo de nombres del formulario a nombres del DTO backend
        lugarNacimientoImp: form.lugarNacimiento,
        municipioImp: form.municipio,
        estadoNacimiento: form.estadoNacimiento,
        paisImp: form.pais,
        estadoCivil: form.estadoCivil,
        gradoEstudios: form.gradoEstudios,
        empresaImp: form.empresa,
        telEmpresaImp: form.telEmpresa,
        puestoImp: form.puesto,
        nombreJefeImp: form.nombreJefe,
        horarioTrabajoImp: form.horarioTrabajo,
        domicilioTrabajoImp: form.domicilioTrabajo,
        salarioMensualImp: form.salarioMensual,
        ultimoEmpleoImp: form.ultimoEmpleo,
        // Mapeo verificaciones snake_case (formulario) → camelCase (backend)
        verifS1Metodo:  form.verif_s1_metodo,   verifS1Resultado:  form.verif_s1_resultado,
        verifS2Metodo:  form.verif_s2_metodo,   verifS2Resultado:  form.verif_s2_resultado,
        verifS3Metodo:  form.verif_s3_metodo,   verifS3Resultado:  form.verif_s3_resultado,
        verifS4Metodo:  form.verif_s4_metodo,   verifS4Resultado:  form.verif_s4_resultado,
        verifS5Metodo:  form.verif_s5_metodo,   verifS5Resultado:  form.verif_s5_resultado,
        verifS6Metodo:  form.verif_s6_metodo,   verifS6Resultado:  form.verif_s6_resultado,
        verifS7Metodo:  form.verif_s7_metodo,   verifS7Resultado:  form.verif_s7_resultado,
        verifS8Metodo:  form.verif_s8_metodo,   verifS8Resultado:  form.verif_s8_resultado,
        verifS9Metodo:  form.verif_s9_metodo,   verifS9Resultado:  form.verif_s9_resultado,
        verifS10Metodo: form.verif_s10_metodo,  verifS10Resultado: form.verif_s10_resultado,
        verifS11Metodo: form.verif_s11_metodo,  verifS11Resultado: form.verif_s11_resultado,
        // Datos del oficio y conclusión
        numOficio: form.numOficio,
        folioEscrito: form.folioEscrito,
        fiscalia: form.fiscalia,
        conclusionGeneral: form.conclusionGeneral,
        riesgosProcesalesJson: JSON.stringify(form.riesgosProcesales),
        factoresEstabilidadJson: JSON.stringify(form.factoresEstabilidad),
      };
      let res;
      if (esEdicion) {
        res = await actualizarEvaluacion(evaluacion.id, payload);
      } else {
        res = await crearEvaluacion(payload);
      }
      if (res.data.ok) {
        // Guardado exitoso → limpiar draft y notificar al padre
        borrarDraft();
        onGuardado?.();
      } else {
        // Error del servidor → quedarse en el formulario con mensaje
        const msg = res.data.message || 'No se pudo guardar el registro. Intenta de nuevo.';
        setError(msg);
        showToast(msg, 'error');
        document.querySelector('.fev-container')?.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (e) {
      // Error de red / inesperado → quedarse en el formulario con mensaje
      const msg = e.response?.data?.message || 'No se pudo conectar con el servidor. Verifica tu conexión.';
      setError(msg);
      showToast(msg, 'error');
      document.querySelector('.fev-container')?.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fev-container">

      {/* Barra fija superior */}
      <div className="fev-topbar">
        <span className="fev-topbar-titulo">{esEdicion ? 'Editar Evaluación' : 'Nueva Evaluación'}</span>
        <div className="fev-topbar-acciones">
          <button className="fev-btn-cancelar" onClick={onVolver}>← Cancelar y Volver</button>
        </div>
      </div>

      {/* Banner de borrador guardado */}
      {tieneDraft && !esEdicion && (
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

      {/* Indicador de auto-guardado (siempre visible durante edición) */}
      {draftGuardadoEn && (
        <div style={{ textAlign: 'right', fontSize: 11, color: '#888', padding: '4px 28px 0' }}>
          <i className="bi bi-cloud-check" style={{ marginRight: 4, color: '#4caf50' }} />
          Borrador guardado a las {draftGuardadoEn}
        </div>
      )}

      {/* Buscador de imputado — visible solo en creación */}
      {!esEdicion && (
        <div className="fev-buscar-bloque">
          <div className="fev-buscar-label">
            <i className="bi bi-person-fill-check"></i>
            ¿El imputado ya tiene entrevista de encuadre? Búscalo para pre-llenar el formulario automáticamente
          </div>
          <div className="fev-buscar-row">
            <i className="bi bi-search fev-search-icon"></i>
            <input
              placeholder="Buscar por nombre o causa penal..."
              value={imputadoBusq}
              onChange={e => setImputadoBusq(e.target.value)}
            />
            {imputadoOpts.length > 0 && (
              <ul className="fev-imp-opts">
                {imputadoOpts.map(imp => (
                  <li key={imp.id} onClick={() => seleccionarImputado(imp)}>
                    <strong>{imp.nombre} {imp.apPaterno}</strong> — {imp.causaPenal}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {preLlenado && (
            <div className="fev-prellenado-row">
              <p className="fev-prellenado-aviso">✓ Campos pre-llenados desde la entrevista de encuadre</p>
              <button className="fev-btn-limpiar" onClick={() => {
                setForm({ ...FORM_BASE });
                setPersonasHabita([]);
                setReferencias([]);
                setSustancias([...SUSTANCIAS_INIT]);
                setDomAnteriores([{ ...DOM_ANT_FILA }]);
                setEmpleosAnt([{ ...EMPLEO_ANT_FILA }]);
                setEntrevistaId(null);
                setPreLlenado(false);
                setEvaluacionesPrevias([]);
                setImputadoSelId(null);
              }}>
                <i className="bi bi-x-circle"></i> Limpiar pre-llenado
              </button>
            </div>
          )}
        </div>
      )}

      {/* Alerta de antecedentes */}
      {!esEdicion && evaluacionesPrevias.length > 0 && (
        <div className="fev-alerta-antecedentes">
          <div className="fev-alerta-header">
            <i className="bi bi-exclamation-triangle-fill"></i>
            <strong>Antecedentes detectados:</strong> este imputado ya cuenta con {evaluacionesPrevias.length} evaluacion{evaluacionesPrevias.length > 1 ? 'es' : ''} previa{evaluacionesPrevias.length > 1 ? 's' : ''} registrada{evaluacionesPrevias.length > 1 ? 's' : ''}.
          </div>
          <ul className="fev-alerta-lista">
            {evaluacionesPrevias.map(ev => (
              <li key={ev.id}>
                <span className="fev-alerta-item"><span className="fev-alerta-lbl">Fecha:</span> {ev.fechaSolicitud || '—'}</span>
                <span className="fev-alerta-item"><span className="fev-alerta-lbl">Estatus:</span> <span className={`fev-alerta-estatus fev-est-${(ev.estatus || '').toLowerCase()}`}>{ev.estatus}</span></span>
                {ev.resultado && <span className="fev-alerta-item"><span className="fev-alerta-lbl">Resultado:</span> <span className="fev-alerta-resultado">{ev.resultado}</span></span>}
                {ev.delito && <span className="fev-alerta-item"><span className="fev-alerta-lbl">Delito:</span> {ev.delito}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="fev-header-bar">
        <div className="fev-header-titles">
          <h2 className="fev-titulo">FORMATO DE ENTREVISTA PARA LA EVALUACIÓN DE RIESGOS PROCESALES <span className="fev-version">— Versión 5 (16 MAR 2022)</span></h2>
          <p className="fev-subtitulo">Unidad de Medidas Cautelares para Adultos del Estado de Morelos, SG, CRS</p>
        </div>
        <div className="fev-header-box">
          <div className="fev-header-row1">
            {field('No. de Carpeta de Investigación *', inp(form.causaPenal, v => { s('causaPenal', v); setImputadoSelId(null); }, 'text', { onBlur: e => handleCausaPenalBlur(e.target.value) }), false, errores.causaPenal, 'fev-causaPenal')}
            {field('Hora de inicio:', inp(form.horaInicio, v => s('horaInicio', v), 'time'))}
            {field('Hora final:', inp(form.horaFinal, v => s('horaFinal', v), 'time'))}
          </div>
        </div>
      </div>

      {/* Datos del Oficio */}
      {sec('DATOS DEL OFICIO / CARTA')}
      <div className="fev-grid-4">
        {field('Número de Oficio', inp(form.numOficio, v => s('numOficio', v)))}
        {field('Folio del Escrito (párrafo intro)', inp(form.folioEscrito, v => s('folioEscrito', v)))}
        {field('Fiscalía', inp(form.fiscalia, v => s('fiscalia', v)))}
      </div>

      {/* 0. Datos de la solicitud */}
      {sec('DATOS DE LA SOLICITUD')}
      <div className="fev-grid-4">
        {field('Fecha de Solicitud *', inp(form.fechaSolicitud, v => s('fechaSolicitud', v), 'date', { max: hoy }), false, errores.fechaSolicitud, 'fev-fechaSolicitud')}
        {field('Puesta a Disposición', inp(form.puestaDisposicion, v => s('puestaDisposicion', v), 'date', { max: hoy }), false, null, 'fev-puestaDisposicion')}
        {field('Fecha de Audiencia', inp(form.fechaAudiencia, v => s('fechaAudiencia', v), 'date'), false, null, 'fev-fechaAudiencia')}
        {field('Nombre del Solicitante *', inp(form.nombreSolicitante, v => s('nombreSolicitante', v)), false, errores.nombreSolicitante, 'fev-nombreSolicitante')}
        {field('Cargo', inp(form.cargo, v => s('cargo', v)))}
        {field('Dependencia', inp(form.dependencia, v => s('dependencia', v)))}
      </div>

      {/* 1. Datos generales */}
      {sec('1. DATOS GENERALES')}
      <div className="fev-grid-4">
        {field('Nombre(s) *', inp(form.nombreImputado, v => s('nombreImputado', v)), false, errores.nombreImputado, 'fev-nombreImputado')}
        {field('Apellido Paterno *', inp(form.apPaternoImputado, v => s('apPaternoImputado', v)), false, errores.apPaternoImputado, 'fev-apPaternoImputado')}
        {field('Apellido Materno', inp(form.apMaternoImputado, v => s('apMaternoImputado', v)), false, null, 'fev-apMaternoImputado')}
        {field('Género', sel(form.genero, v => s('genero', v), [['Masculino','Masculino'],['Femenino','Femenino'],['No binario','No binario']]))}
        {field('Fecha de Nacimiento', <input type="date" max={maxFechaNac} value={form.fechaNacimiento ?? ''} onChange={e => {
          const val = e.target.value;
          s('fechaNacimiento', val);
          if (val) {
            const edad = Math.floor((new Date() - new Date(val)) / (365.25 * 24 * 60 * 60 * 1000));
            s('edad', edad);
          }
        }} />)}
        {field('Edad', inp(form.edad, v => s('edad', v), 'number'))}
        {field('Lugar de Nacimiento', inp(form.lugarNacimiento, v => s('lugarNacimiento', v)))}
        {field('Municipio', inp(form.municipio, v => s('municipio', v)))}
        {field('Estado', inp(form.estadoNacimiento, v => s('estadoNacimiento', v)))}
        {field('País', inp(form.pais, v => s('pais', v)))}
        {field('CURP', inp(form.curp, v => s('curp', v)))}
        {field('Estado Civil', sel(form.estadoCivil, v => s('estadoCivil', v), [['Soltero','Soltero'],['Casado','Casado'],['Unión Libre','Unión Libre'],['Divorciado','Divorciado'],['Viudo','Viudo']]))}
        <div className="fev-field">
          <label>Hijos</label>
          {yn(form.hijos, v => s('hijos', v))}
        </div>
        {form.hijos && field('Número de hijos', inp(form.numHijos, v => s('numHijos', v), 'number'))}
        {form.hijos && field('Menores de 18 años', inp(form.numHijosMenores, v => s('numHijosMenores', v), 'number'))}
      </div>
      <div className="fev-seccion-sub">Domicilio actual</div>
      <div className="fev-grid-4">
        {field('Calle', inp(form.domicilioActualCalle, v => s('domicilioActualCalle', v)))}
        {field('No.', inp(form.domicilioActualNo, v => s('domicilioActualNo', v)))}
        {field('Colonia', inp(form.domicilioActualColonia, v => s('domicilioActualColonia', v)))}
        {field('Municipio', inp(form.domicilioActualMunicipio, v => s('domicilioActualMunicipio', v)))}
        {field('Estado', inp(form.domicilioActualEstado, v => s('domicilioActualEstado', v)))}
        {field('Tiempo en domicilio', inp(form.tiempoEnDomicilio, v => s('tiempoEnDomicilio', v)))}
        {field('Tipo domicilio', sel(form.tipoDomicilioActual, v => s('tipoDomicilioActual', v), [['Propiedad','Propiedad'],['Arrendado','Arrendado'],['Familiar','Familiar'],['Otro','Otro']]))}
        {form.tipoDomicilioActual === 'Arrendado' && field('Nombre arrendador', inp(form.nombreArrendador, v => s('nombreArrendador', v)))}
        {form.tipoDomicilioActual === 'Arrendado' && field('Monto $', inp(form.montoDomicilio, v => s('montoDomicilio', v), 'number'))}
        {field('Teléfono fijo', inp(form.telefonoDomicilio, v => s('telefonoDomicilio', v)))}
        {field('Celular', inp(form.celularDomicilio, v => s('celularDomicilio', v)))}
      </div>
      <div className="fev-seccion-sub">Domicilio secundario (si aplica)</div>
      <div className="fev-grid-4">
        {field('Calle', inp(form.calleSecundaria, v => s('calleSecundaria', v)))}
        {field('No.', inp(form.noSecundaria, v => s('noSecundaria', v)))}
        {field('Colonia', inp(form.coloniaSecundaria, v => s('coloniaSecundaria', v)))}
        {field('Municipio', inp(form.municipioSecundario, v => s('municipioSecundario', v)))}
      </div>
      {field('¿Por qué tiene ahí su domicilio?', <textarea value={form.razonDomicilio || ''} onChange={e => s('razonDomicilio', e.target.value)} />, true)}
      <BloqueVerificacion secId="s1" form={form} s={s} />

      {/* 2. Domicilios anteriores */}
      {sec('2. DOMICILIOS ANTERIORES')}
      <div className="fev-tabla-wrap">
        <table className="fev-tabla">
          <thead><tr><th>Dirección</th><th>Casa Propia</th><th>Tiempo de Residencia</th><th>Motivo de la Mudanza</th><th></th></tr></thead>
          <tbody>
            {domAnteriores.map((d, i) => (
              <tr key={i}>
                <td><input value={d.direccion} onChange={e => { const n=[...domAnteriores]; n[i]={...n[i],direccion:e.target.value}; setDomAnteriores(n); }} /></td>
                <td className="fev-td-center"><input type="checkbox" checked={!!d.casaPropia} onChange={e => { const n=[...domAnteriores]; n[i]={...n[i],casaPropia:e.target.checked}; setDomAnteriores(n); }} /></td>
                <td><input value={d.tiempoResidencia} onChange={e => { const n=[...domAnteriores]; n[i]={...n[i],tiempoResidencia:e.target.value}; setDomAnteriores(n); }} /></td>
                <td><input value={d.motivoMudanza} onChange={e => { const n=[...domAnteriores]; n[i]={...n[i],motivoMudanza:e.target.value}; setDomAnteriores(n); }} /></td>
                <td><button className="fev-btn-rm" onClick={() => setDomAnteriores(domAnteriores.filter((_,j)=>j!==i))}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className="fev-btn-add" onClick={() => setDomAnteriores([...domAnteriores, {...DOM_ANT_FILA}])}>+ Agregar fila</button>
      </div>
      <BloqueVerificacion secId="s2" form={form} s={s} />

      {/* 3. Personas con quién habita */}
      {sec('3. PERSONAS CON QUIÉN HABITA')}
      <div className="fev-tabla-wrap">
        <table className="fev-tabla">
          <thead><tr><th>Nombre</th><th>Parentesco</th><th>Tiempo de Cohabitar</th><th>Edad</th><th>Teléfono</th><th>Identificación</th><th></th></tr></thead>
          <tbody>
            {personasHabita.map((p, i) => (
              <tr key={i}>
                {['nombre','parentesco','tiempoCohabitar','edad','telefono','identificacion'].map(f => (
                  <td key={f}><input value={p[f]||''} onChange={e => { const n=[...personasHabita]; n[i]={...n[i],[f]:e.target.value}; setPersonasHabita(n); }} /></td>
                ))}
                <td><button className="fev-btn-rm" onClick={() => setPersonasHabita(personasHabita.filter((_,j)=>j!==i))}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className="fev-btn-add" onClick={() => setPersonasHabita([...personasHabita, {nombre:'',parentesco:'',tiempoCohabitar:'',edad:'',telefono:'',identificacion:''}])}>+ Agregar persona</button>
      </div>
      <BloqueVerificacion secId="s3" form={form} s={s} />

      {/* 4. Referencias personales */}
      {sec('4. REFERENCIAS PERSONALES E INFORMACIÓN DE LOCALIZACIÓN')}
      <div className="fev-tabla-wrap">
        <table className="fev-tabla">
          <thead><tr><th>Nombre</th><th>Parentesco / Relación</th><th>Teléfono</th><th>Dirección</th><th></th></tr></thead>
          <tbody>
            {referencias.map((r, i) => (
              <tr key={i}>
                {['nombre','parentesco','telefono','direccion'].map(f => (
                  <td key={f}><input value={r[f]||''} onChange={e => { const n=[...referencias]; n[i]={...n[i],[f]:e.target.value}; setReferencias(n); }} /></td>
                ))}
                <td><button className="fev-btn-rm" onClick={() => setReferencias(referencias.filter((_,j)=>j!==i))}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className="fev-btn-add" onClick={() => setReferencias([...referencias, {nombre:'',parentesco:'',telefono:'',direccion:''}])}>+ Agregar referencia</button>
      </div>
      <BloqueVerificacion secId="s4" form={form} s={s} />

      {/* 5. Facilidad de abandonar */}
      {sec('5. FACILIDAD DE ABANDONAR EL ESTADO/PAÍS O PERMANECER OCULTO')}
      <div className="fev-grid-2">
        {field('¿Desde hace cuánto tiempo vive en el estado de Morelos?',
          inp(form.tiempoEnMorelos, v => s('tiempoEnMorelos', v), 'text', { placeholder: 'Ej. 5 años' }))}
        {field('Familiares fuera del Estado u Otro País',
          inp(form.familiaresOtroPais, v => s('familiaresOtroPais', v), 'text', { placeholder: 'Especificar país o estado' }))}
        {field('Medio de comunicación',
          inp(form.mediosComunicacion, v => s('mediosComunicacion', v), 'text', { placeholder: 'Teléfono, correo, redes sociales...' }))}
        {field('¿Dónde habitan?',
          inp(form.dondeHabitanFamiliares, v => s('dondeHabitanFamiliares', v), 'text', { placeholder: 'Estado o país de residencia' }))}
        {field('¿Cuántas personas dependen económicamente? ¿Quiénes son?',
          inp(form.personasDependientes, v => s('personasDependientes', v), 'text', { placeholder: 'Número y quiénes son' }))}
        {field('¿Dónde habitan los dependientes?',
          inp(form.dondeHabitanDependientes, v => s('dondeHabitanDependientes', v), 'text', { placeholder: 'Estado o país' }))}
        <div className="fev-field">
          <label>¿Cuenta con documentos migratorios?</label>
          <div className="fev-docs">
            <label><input type="checkbox" checked={!!form.tieneVisa} onChange={e => s('tieneVisa', e.target.checked)} /> Visa</label>
            <label><input type="checkbox" checked={!!form.tienePasaporte} onChange={e => s('tienePasaporte', e.target.checked)} /> Pasaporte</label>
          </div>
        </div>
      </div>
      <BloqueVerificacion secId="s5" form={form} s={s} />

      {/* 6. Información laboral */}
      {sec('6. INFORMACIÓN LABORAL / OCUPACIONAL')}
      <div className="fev-seccion-sub">Empleo actual</div>
      <div className="fev-grid-4">
        {field('Actividad laboral / Empresa', inp(form.empresa, v => s('empresa', v)))}
        {field('Domicilio del empleador', inp(form.domicilioTrabajo, v => s('domicilioTrabajo', v)))}
        {field('Puesto', inp(form.puesto, v => s('puesto', v)))}
        {field('Nombre del Jefe', inp(form.nombreJefe, v => s('nombreJefe', v)))}
        {field('Teléfono', inp(form.telEmpresa, v => s('telEmpresa', v)))}
        {field('Horario', inp(form.horarioTrabajo, v => s('horarioTrabajo', v)))}
        {field('Salario Mensual', inp(form.salarioMensual, v => s('salarioMensual', v), 'number'))}
      </div>
      {field('Último empleo (si no tiene empleo actual)', <textarea value={form.ultimoEmpleo||''} onChange={e => s('ultimoEmpleo', e.target.value)} />, true)}
      <div className="fev-seccion-sub">Empleos anteriores</div>
      <div className="fev-tabla-wrap">
        <table className="fev-tabla">
          <thead><tr><th>Empresa</th><th>Puesto</th><th>Nombre del Jefe</th><th>Razón del Cambio</th><th>Inicio</th><th>Conclusión</th><th></th></tr></thead>
          <tbody>
            {empleosAnt.map((e, i) => (
              <tr key={i}>
                {['empresa','puesto','nombreJefe','razon','inicio','conclusion'].map(f => (
                  <td key={f}><input value={e[f]||''} onChange={ev => { const n=[...empleosAnt]; n[i]={...n[i],[f]:ev.target.value}; setEmpleosAnt(n); }} /></td>
                ))}
                <td><button className="fev-btn-rm" onClick={() => setEmpleosAnt(empleosAnt.filter((_,j)=>j!==i))}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className="fev-btn-add" onClick={() => setEmpleosAnt([...empleosAnt, {...EMPLEO_ANT_FILA}])}>+ Agregar empleo</button>
      </div>
      <BloqueVerificacion secId="s6" form={form} s={s} />

      {/* 8. Consumo de sustancias */}
      {sec('7. CONSUMO DE SUSTANCIAS')}
      <div className="fev-tabla-wrap">
        <table className="fev-tabla">
          <thead><tr><th>Sustancia</th><th>¿Consume?</th><th>Inicio</th><th>Grms</th><th>Meses</th><th>Cantidad</th><th>Fecha Último Consumo</th></tr></thead>
          <tbody>
            {sustancias.map((s2, i) => (
              <tr key={i}>
                <td><strong>{s2.sustancia}</strong></td>
                <td className="fev-td-center">
                  <select value={s2.consume ? 'true' : 'false'} onChange={e => { const n=[...sustancias]; n[i]={...n[i],consume:e.target.value==='true'}; setSustancias(n); }}>
                    <option value="false">No</option>
                    <option value="true">Sí</option>
                  </select>
                </td>
                {['inicio','grms','meses','cantidad','fechaUltimoConsumo'].map(f => (
                  <td key={f}><input value={s2[f]||''} disabled={!s2.consume} onChange={e => { const n=[...sustancias]; n[i]={...n[i],[f]:e.target.value}; setSustancias(n); }} /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <BloqueVerificacion secId="s8" form={form} s={s} />

      {/* 9. Entorno social */}
      {sec('8. ENTORNO SOCIAL')}
      <div className="fev-grid-2">
        {field('Enfermedades (Hipertensión, Hepatitis, Alergias, Embarazo, etc.)', <textarea value={form.enfermedades||''} onChange={e => s('enfermedades', e.target.value)} />)}
        {field('Enfermedad de familiar que depende económicamente', <textarea value={form.enfermedadFamiliar||''} onChange={e => s('enfermedadFamiliar', e.target.value)} />)}
        {field('Hobbies / Asociaciones / Deporte', <textarea value={form.hobbies||''} onChange={e => s('hobbies', e.target.value)} />, true)}
        {field('Organizaciones (cooperativas, sindicatos, etc.)', <textarea value={form.organizaciones||''} onChange={e => s('organizaciones', e.target.value)} />, true)}
        {field('Observaciones generales de la evaluación', <textarea value={form.observacionesGenerales||''} onChange={e => s('observacionesGenerales', e.target.value)} />, true)}
      </div>

      <BloqueVerificacion secId="s9" form={form} s={s} />

      {/* 10. Datos sobre el denunciante */}
      {sec('9. DATOS SOBRE EL DENUNCIANTE')}
      <div className="fev-preguntas">
        <div className="fev-pregunta-fila">
          <span>¿Sabe quién lo denunció?</span>
          {yn(form.sabeDenunciante, v => s('sabeDenunciante', v))}
          {form.sabeDenunciante && field('Nombre del denunciante', inp(form.nombreDenunciante, v => s('nombreDenunciante', v)))}
        </div>
        <div className="fev-pregunta-fila">
          <span>¿Vive con el imputado?</span>
          {yn(form.viveConImputado, v => s('viveConImputado', v))}
        </div>
        <div className="fev-pregunta-fila">
          <span>¿Saben dónde vive el imputado?</span>
          {yn(form.sabenDondeVive, v => s('sabenDondeVive', v))}
        </div>
      </div>
      <div className="fev-grid-2">
        {field('Bases para esta víctima', <textarea value={form.basesVictima||''} onChange={e => s('basesVictima', e.target.value)} />)}
        {field('Tipo de solicitud', inp(form.tipoSolicitud, v => s('tipoSolicitud', v)))}
      </div>

      <BloqueVerificacion secId="s10" form={form} s={s} />

      {/* 11. Información del proceso actual */}
      {sec('10. INFORMACIÓN DEL PROCESO ACTUAL')}
      <div className="fev-grid-4">
        {field('Delito *', inp(form.delito, v => s('delito', v)), false, errores.delito, 'fev-delito')}
        <div className="fev-field">
          <label>¿Reincidencia?</label>
          {yn(form.reincidencia, v => s('reincidencia', v))}
        </div>
        {field('Ubicación Física *', inp(form.ubicacionFisica, v => s('ubicacionFisica', v)), false, errores.ubicacionFisica, 'fev-ubicacionFisica')}
      </div>
      {field('Relación con la víctima', inp(form.relacionVictima, v => s('relacionVictima', v)), true)}
      {field('Descripción del compromiso', <textarea value={form.descripcionCompromiso||''} onChange={e => s('descripcionCompromiso', e.target.value)} />, true)}
      <BloqueVerificacion secId="s11" form={form} s={s} />

      {/* 12. Procesos pendientes / anteriores */}
      {sec('11. PROCESOS PENDIENTES / ANTERIORES')}
      {field('Expediente', <textarea value={form.procesosAnteriores||''} onChange={e => s('procesosAnteriores', e.target.value)} />, true)}

      {/* 13. Conclusión */}
      {sec('12. CONCLUSIÓN / CRITERIO DE RIESGO *')}
      <div className={`fev-criterios${errores.resultado ? ' fev-criterios-error' : ''}`}>
        {[['FLEXIBLE','Flexible — Bajo Riesgo','fev-criterio-bajo'],['ESTRICTO','Estricto — Medio Riesgo','fev-criterio-medio'],['DIFICIL_CUMPLIR','Difícil de Cumplir — Alto Riesgo','fev-criterio-alto']].map(([val, lbl, cls]) => (
          <label key={val} className={`fev-criterio ${cls} ${form.resultado === val ? 'selected' : ''}`}>
            <input type="radio" name="resultado" value={val} checked={form.resultado === val} onChange={() => { s('resultado', val); setErrores(p => ({...p, resultado: false})); }} />
            {lbl}
          </label>
        ))}
      </div>
      {errores.resultado && <p className="fev-error-msg">Este campo es obligatorio</p>}
      {field('Justificación', <textarea value={form.justificacionResultado||''} onChange={e => s('justificacionResultado', e.target.value)} />, true)}

      {/* Conclusión General */}
      {sec('CONCLUSIÓN GENERAL')}
      {field('Texto de la conclusión general',
        <textarea rows={5} value={form.conclusionGeneral||''} onChange={e => s('conclusionGeneral', e.target.value)}
          placeholder="Basado en los análisis en la evaluación de los datos socio ambiental proporcionados por el entrevistado y verificados por las fuentes y métodos citados; los riesgos procesales y los factores de estabilidad son los siguientes:" />, true)}

      <div className="fev-riesgos-tabla">
        <div className="fev-riesgos-header">
          <span>RIESGOS PROCESALES</span>
          <span>FACTORES DE ESTABILIDAD</span>
        </div>
        {Array.from({length:7}, (_,i) => (
          <div key={i} className="fev-riesgos-row">
            <span className="fev-riesgos-num">{i+1}</span>
            <input type="text" value={form.riesgosProcesales[i]||''} onChange={e => { const a=[...form.riesgosProcesales]; a[i]=e.target.value; s('riesgosProcesales',a); }}
              placeholder="Riesgo procesal..." />
            <input type="text" value={form.factoresEstabilidad[i]||''} onChange={e => { const a=[...form.factoresEstabilidad]; a[i]=e.target.value; s('factoresEstabilidad',a); }}
              placeholder="Factor de estabilidad..." />
          </div>
        ))}
      </div>

      {/* Footer evaluador */}
      <div className="fev-footer-eval">
        <div className="fev-grid-3">
          {field('Nombre del Evaluador', <span className="fev-eval-nombre">{user?.nombre} {user?.apPaterno}</span>)}
          {field('Fecha', inp(form.fechaSolicitud, v => s('fechaSolicitud', v), 'date'))}
          {field('Lugar de Entrevista', inp(form.lugarEntrevista, v => s('lugarEntrevista', v)))}
        </div>
      </div>

      {error && <div className="fev-error">{error}</div>}

      <div className="fev-acciones">
        <button className="fev-btn-cancelar" onClick={onVolver}>✕ Cancelar</button>
        <button className="fev-btn-guardar" onClick={handleGuardar} disabled={loading}>
          {loading ? 'Guardando...' : '✔ Guardar registro'}
        </button>
      </div>

      {/* Modal: seleccionar imputado cuando hay varios con la misma causa penal */}
      {showSeleccionImputado && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 480, maxWidth: '95vw', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: 16, color: '#1a1a1a' }}>Imputados con la misma causa penal</h3>
            <p style={{ margin: '0 0 18px', fontSize: 13, color: '#666' }}>
              Se encontraron <strong>{imputadosCausaPenal.length}</strong> personas con esa causa penal. Selecciona a cuál corresponde esta evaluación, o elige "Es uno nuevo".
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
              {imputadosCausaPenal.map(imp => (
                <button key={imp.id} onClick={() => {
                  setImputadoSelId(imp.id);
                  s('nombreImputado', imp.nombre || '');
                  s('apPaternoImputado', imp.apPaterno || '');
                  s('apMaternoImputado', imp.apMaterno || '');
                  s('delito', imp.delito || '');
                  setShowSeleccionImputado(false);
                }} style={{ background: '#f0f7f0', border: '1.5px solid #2d6a4f', borderRadius: 8, padding: '10px 16px', cursor: 'pointer', textAlign: 'left', fontSize: 13 }}>
                  <strong>{imp.nombre} {imp.apPaterno} {imp.apMaterno || ''}</strong>
                  <span style={{ marginLeft: 10, color: '#555', fontSize: 12 }}>{imp.delito || '—'}</span>
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button onClick={() => { setImputadoSelId(null); setShowSeleccionImputado(false); }}
                style={{ background: 'none', border: '1px solid #ccc', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, color: '#555' }}>
                Es uno nuevo
              </button>
              <button onClick={() => setShowSeleccionImputado(false)}
                style={{ background: 'none', border: '1px solid #ccc', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, color: '#555' }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormularioEvaluacion;
