import { useState, useEffect, useCallback, useRef } from 'react';
import { getExpedientes, getExpedienteById, importarExpedientesExcel, importarRegistroHistorico, importarSustraidos, importarBaseJojutla, importarBaseCuautla, importarInactivosXochi, getLotes, eliminarLote } from '../api/expedientesApi';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import './ExpedientesAnteriores.css';

const ITEMS_POR_PAGINA = 50;

const SUBTIPO_LABELS = {
    MC: 'MC', SCP: 'SCP', HISTORICO: 'Histórico',
    JOJU_SUSTRAIDO: 'Sustraídos', JOJU_PRISION: 'Prisión Preventiva',
    JOJU_DEFUNCION: 'Defunción', JOJU_SOBRESEIMIENTO: 'Sobreseimiento',
    JOJU_ARCHIVO: 'Archivo', JOJU_CARPETAS_INACTIVAS: 'Carpetas Inactivas',
    CUAT_PRISION: 'Prisión Preventiva', CUAT_ESPERA: 'Espera Sobreseimientos',
    CUAT_CARPETAS_CERRAR: 'Carpetas para Cerrar', CUAT_OFICIOS: 'Oficios Sobreseimientos',
    CUAT_SUSTRAIDO: 'Sustraídos', CUAT_TTA: 'TTA', CUAT_ARCHIVO: 'Archivo',
    XOCHI_MC_INACTIVA: 'MC Inactiva', XOCHI_SCP_INACTIVO: 'SCP Inactivo', XOCHI_HISTORICO_INACTIVO: 'Histórico',
};

const SUBTIPOS_POR_BASE = {
    BASE_XOCHI:         ['MC', 'SCP', 'HISTORICO'],
    BASE_JOJU:          ['JOJU_SUSTRAIDO', 'JOJU_PRISION', 'JOJU_DEFUNCION', 'JOJU_SOBRESEIMIENTO', 'JOJU_ARCHIVO', 'JOJU_CARPETAS_INACTIVAS'],
    BASE_CUAT:          ['CUAT_PRISION', 'CUAT_ESPERA', 'CUAT_CARPETAS_CERRAR', 'CUAT_OFICIOS', 'CUAT_SUSTRAIDO', 'CUAT_TTA', 'CUAT_ARCHIVO'],
    INACTIVOS_XOCHI:    ['XOCHI_MC_INACTIVA', 'XOCHI_SCP_INACTIVO', 'XOCHI_HISTORICO_INACTIVO'],
};

const ZONA_LABELS = { XOCHITEPEC: 'Xochitepec', CUAUTLA: 'Cuautla', JOJUTLA: 'Jojutla' };

const MEDIDAS_LABEL = {
    mcI: 'I', mcIi: 'II', mcIii: 'III', mcIv: 'IV', mcV: 'V',
    mcVi: 'VI', mcVii: 'VII', mcViii: 'VIII', mcIx: 'IX', mcX: 'X',
    mcXi: 'XI', mcXii: 'XII', mcXiii: 'XIII', mcXiv: 'XIV',
};

export default function ExpedientesAnteriores() {
    const { showToast } = useToast();
    const { user } = useAuth();
    const esAdmin = user?.rol === 'ADMINISTRADOR' || user?.rol === 'SUPERADMIN';

    const [lista,   setLista]   = useState([]);
    const [total,   setTotal]   = useState(0);
    const [pagina,  setPagina]  = useState(0);
    const [loading, setLoading] = useState(false);

    const [busqueda,    setBusqueda]    = useState('');
    const [tipoFiltro,  setTipoFiltro]  = useState('BASE_XOCHI');
    const [subtipoFiltro, setSubtipoFiltro] = useState(null);
    const [zonaFiltro,  setZonaFiltro]  = useState('');

    const [detalle,     setDetalle]     = useState(null);
    const [loadingDet,  setLoadingDet]  = useState(false);
    const scrollYRef = useRef(0);

    // Modal importación
    const [showImport,      setShowImport]      = useState(false);
    const [importArchivo,   setImportArchivo]   = useState(null);
    const [importTipo,      setImportTipo]      = useState('NORMAL'); // NORMAL | REGISTRO_HISTORICO | SUSTRAIDO
    const [importZona,      setImportZona]      = useState('XOCHITEPEC');
    const [importando,      setImportando]      = useState(false);
    const [importError,     setImportError]     = useState(null);
    const [importExito,     setImportExito]     = useState(null);
    const [importPaso,      setImportPaso]      = useState(1); // 1=form, 2=confirmación

    // Modal gestión de lotes
    const [showGestion,     setShowGestion]     = useState(false);
    const [lotes,           setLotes]           = useState([]);
    const [loadingLotes,    setLoadingLotes]    = useState(false);
    const [loteAEliminar,   setLoteAEliminar]   = useState(null);
    const [confirmTexto,    setConfirmTexto]    = useState('');
    const [eliminandoLote,  setEliminandoLote]  = useState(false);

    const totalPaginas = Math.max(1, Math.ceil(total / ITEMS_POR_PAGINA));


    const cargar = useCallback(async (p = pagina) => {
        setLoading(true);
        try {
            // Calcular parámetros de filtro
            let tipo      = undefined;
            let tipoIn    = undefined;
            let zona      = undefined;

            if (SUBTIPOS_POR_BASE[tipoFiltro]) {
                // Es una base (XOCHI/JOJU/CUAT/INACTIVOS_XOCHI)
                zona = tipoFiltro === 'BASE_XOCHI' ? 'XOCHITEPEC'
                     : tipoFiltro === 'BASE_JOJU'  ? 'JOJUTLA'
                     : tipoFiltro === 'BASE_CUAT'  ? 'CUAUTLA'
                     : tipoFiltro === 'INACTIVOS_XOCHI' ? 'XOCHITEPEC'
                     : 'CUAUTLA';
                if (subtipoFiltro) {
                    tipo = subtipoFiltro;
                } else {
                    tipoIn = SUBTIPOS_POR_BASE[tipoFiltro].join(',');
                }
            } else {
                // SUSTRAIDO o REGISTRO_HISTORICO
                tipo = tipoFiltro;
                zona = zonaFiltro || undefined;
            }

            const res = await getExpedientes({
                tipo,
                tipoIn,
                zona,
                busqueda: busqueda || undefined,
                pagina: p,
                tam: ITEMS_POR_PAGINA,
            });
            const page = res.data?.data;
            setLista(page?.content || []);
            setTotal(page?.totalElements || 0);
        } catch {
            showToast('Error al cargar expedientes', 'error');
        } finally {
            setLoading(false);
        }
    }, [pagina, tipoFiltro, subtipoFiltro, zonaFiltro, busqueda]);

    useEffect(() => { cargar(0); setPagina(0); }, [tipoFiltro, subtipoFiltro, zonaFiltro]);

    // Búsqueda con pequeño debounce
    useEffect(() => {
        const t = setTimeout(() => { cargar(0); setPagina(0); }, 500);
        return () => clearTimeout(t);
    }, [busqueda]);

    const cambiarPagina = (nueva) => { setPagina(nueva); cargar(nueva); };

    const handleImportar = async () => {
        if (!importArchivo) return showToast('Selecciona un archivo Excel', 'error');
        setImportando(true);
        setImportError(null);
        setImportExito(null);
        try {
            let res;
            if (importTipo === 'REGISTRO_HISTORICO') {
                res = await importarRegistroHistorico(importArchivo, importZona || undefined);
            } else if (importTipo === 'SUSTRAIDO') {
                res = await importarSustraidos(importArchivo);
            } else if (importTipo === 'BASE_IMPUTADOS') {
                if (importZona === 'JOJUTLA') res = await importarBaseJojutla(importArchivo);
                else if (importZona === 'CUAUTLA') res = await importarBaseCuautla(importArchivo);
                else res = await importarExpedientesExcel(importArchivo, importZona);
            } else if (importTipo === 'INACTIVOS') {
                if (importZona === 'XOCHITEPEC') res = await importarInactivosXochi(importArchivo);
                else res = await importarInactivosXochi(importArchivo); // placeholder para futuras sedes
            } else {
                res = await importarExpedientesExcel(importArchivo, importZona);
            }
            if (res.data?.ok) {
                const { importados, omitidos } = res.data.data;
                let msg = `Se importaron ${importados} expediente${importados !== 1 ? 's' : ''} correctamente.`;
                if (omitidos > 0) msg += ` Se omitieron ${omitidos} fila${omitidos !== 1 ? 's' : ''} sin datos válidos.`;
                setImportExito(msg);
                showToast(msg);
                // Redirigir al filtro correspondiente
                if (importTipo === 'INACTIVOS') {
                    setTipoFiltro('INACTIVOS_XOCHI'); setSubtipoFiltro(null);
                } else if (importTipo === 'BASE_IMPUTADOS') {
                    setTipoFiltro(importZona === 'JOJUTLA' ? 'BASE_JOJU' : importZona === 'CUAUTLA' ? 'BASE_CUAT' : 'BASE_XOCHI');
                    setSubtipoFiltro(null);
                } else if (importTipo === 'SUSTRAIDO') {
                    setTipoFiltro('SUSTRAIDO'); setSubtipoFiltro(null);
                } else if (importTipo === 'REGISTRO_HISTORICO') {
                    setTipoFiltro('REGISTRO_HISTORICO'); setSubtipoFiltro(null);
                }
                cargar(0); setPagina(0);
            } else {
                setImportError(res.data?.message || 'Error al importar el archivo.');
            }
        } catch (e) {
            setImportError('Error de conexión con el servidor. Verifica que el backend esté activo.');
        } finally {
            setImportando(false);
        }
    };

    const cargarLotes = async () => {
        setLoadingLotes(true);
        try {
            const res = await getLotes();
            setLotes(res.data?.data || []);
        } catch {
            showToast('Error al cargar las importaciones', 'error');
        } finally {
            setLoadingLotes(false);
        }
    };

    const abrirGestion = () => {
        setShowGestion(true);
        setLoteAEliminar(null);
        setConfirmTexto('');
        cargarLotes();
    };

    const handleEliminarLote = async () => {
        if (!loteAEliminar || confirmTexto !== 'CONFIRMAR') return;
        setEliminandoLote(true);
        try {
            const res = await eliminarLote(loteAEliminar.id);
            if (res.data?.ok) {
                showToast(`Importación eliminada correctamente (${res.data.data} expedientes borrados)`);
                setLoteAEliminar(null);
                setConfirmTexto('');
                cargarLotes();
                cargar(0); setPagina(0);
            } else {
                showToast(res.data?.message || 'Error al eliminar la importación', 'error');
            }
        } catch {
            showToast('Error de conexión al eliminar la importación', 'error');
        } finally {
            setEliminandoLote(false);
        }
    };

    const verDetalle = async (id) => {
        scrollYRef.current = window.scrollY;
        setLoadingDet(true);
        try {
            const res = await getExpedienteById(id);
            setDetalle(res.data?.data);
            window.scrollTo(0, 0);
        } catch {
            showToast('Error al cargar el detalle', 'error');
        } finally {
            setLoadingDet(false);
        }
    };

    // ── Detalle ───────────────────────────────────────────────
    if (detalle) {
        const medidasActivas = Object.entries(MEDIDAS_LABEL)
            .filter(([k]) => detalle[k])
            .map(([, v]) => v);

        let seguimientos = [];
        try { seguimientos = JSON.parse(detalle.seguimientos || '[]'); } catch {}

        return (
            <div className="exp-container">
                <button className="exp-btn-volver" onClick={() => { setDetalle(null); requestAnimationFrame(() => window.scrollTo(0, scrollYRef.current)); }}>
                    <i className="bi bi-arrow-left" /> Volver
                </button>

                <div className="exp-detalle-header">
                    <div className="exp-detalle-nombre">
                        {detalle.apPaterno
                            ? `${detalle.apPaterno}${detalle.apMaterno ? ' ' + detalle.apMaterno : ''}${detalle.nombre ? ' ' + detalle.nombre : ''}`
                            : detalle.nombre || '—'}
                    </div>
                    <div className="exp-detalle-badges">
                        {detalle.tipo && <span className={`exp-tipo-badge exp-tipo-${detalle.tipo.toLowerCase()}`}>{detalle.tipo}</span>}
                        {detalle.zona && <span className={`zona-tag zona-tag-${detalle.zona.toLowerCase()}`}>
                            {({'XOCHITEPEC':'Xochi','CUAUTLA':'Cuat','JOJUTLA':'Jojut'})[detalle.zona] ?? detalle.zona}
                        </span>}
                        {detalle.estatus && detalle.tipo !== 'SUSTRAIDO' && <span className="exp-estatus-badge">{detalle.estatus}</span>}
                    </div>
                </div>

                <div className="exp-detalle-grid">

                    {/* ── Sección SUSTRAIDO ── */}
                    {detalle.tipo === 'SUSTRAIDO' && (
                        <div className="exp-seccion exp-seccion-sustraido exp-seccion-full">
                            <div className="exp-seccion-titulo"><i className="bi bi-person-dash-fill" /> Datos del Sustraído</div>
                            <div className="exp-campos">
                                <Fila label="No."             valor={detalle.numero} />
                                <Fila label="Causa Penal"     valor={detalle.causaPenal} />
                                <Fila label="MC ó SCP"        valor={detalle.tipoMcScp} />
                                <Fila label="Fecha de Archivo" valor={detalle.archivo} />
                                <Fila label="Fecha de Sustracción" valor={detalle.sustraccion} />
                                <Fila label="Supervisor"      valor={detalle.supervisor} />
                            </div>
                            {detalle.estatus && (
                                <div className="exp-sustraido-estatus">
                                    <span className="exp-sustraido-estatus-label"><i className="bi bi-card-text" /> Modificación de Estatus</span>
                                    <p>{detalle.estatus}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Sección REGISTRO_HISTORICO ── */}
                    {detalle.tipo === 'REGISTRO_HISTORICO' && (
                        <div className="exp-seccion">
                            <div className="exp-seccion-titulo"><i className="bi bi-clock-history" /> Registro Histórico</div>
                            <div className="exp-campos">
                                <Fila label="Causa Penal"       valor={detalle.causaPenal} />
                                <Fila label="Fecha de Registro" valor={detalle.fechaRegistroHist} />
                                <Fila label="Situación Jurídica" valor={detalle.situacionJuridica} />
                            </div>
                        </div>
                    )}

                    {/* ── Sección bases Jojutla / Cuautla ── */}
                    {(detalle.tipo?.startsWith('JOJU_') || detalle.tipo?.startsWith('CUAT_')) && (
                        <div className="exp-seccion exp-seccion-full exp-seccion-base">
                            <div className="exp-seccion-titulo"><i className="bi bi-person-lines-fill" /> Datos del Registro</div>
                            <div className="exp-campos">
                                <Fila label="Causa Penal"   valor={detalle.causaPenal} />
                                <Fila label="Nombre"        valor={detalle.nombre} />
                                {detalle.delito      && <Fila label="Delito"       valor={detalle.delito} />}
                                {detalle.sexo        && <Fila label="Sexo"         valor={detalle.sexo} />}
                                {detalle.resolucion  && <Fila label="Resolución"   valor={detalle.resolucion} />}
                                {detalle.estatus     && <Fila label="Estatus"      valor={detalle.estatus} />}
                                {detalle.tipoMcScp   && <Fila label="MC/SCP"       valor={detalle.tipoMcScp} />}
                                {detalle.juez        && <Fila label="Juez"         valor={detalle.juez} />}
                                {detalle.plazo       && <Fila label="Plazo"        valor={detalle.plazo} />}
                                {detalle.fechaImposicion && <Fila label="Fecha Imposición" valor={detalle.fechaImposicion} />}
                                {detalle.fechaVencimiento && <Fila label="Fecha Vencimiento" valor={detalle.fechaVencimiento} />}
                                {detalle.vencimiento && <Fila label="Vencimiento"  valor={detalle.vencimiento} />}
                                {detalle.asignado    && <Fila label="Asignado"     valor={detalle.asignado} />}
                                {detalle.supervisor  && <Fila label="Supervisor"   valor={detalle.supervisor} />}
                                {detalle.sustraccion && <Fila label="Fecha Sustracción" valor={detalle.sustraccion} />}
                                {detalle.archivo     && <Fila label="Fecha Archivo" valor={detalle.archivo} />}
                                {detalle.cierre      && <Fila label="Cierre"       valor={detalle.cierre} />}
                                {detalle.motivoCierre && <Fila label="Motivo Cierre" valor={detalle.motivoCierre} />}
                                {detalle.bitacora    && <Fila label="Bitácora"     valor={detalle.bitacora} />}
                                {detalle.carpetaXochitepec && <Fila label="Carpeta Xochitepec" valor={detalle.carpetaXochitepec} />}
                                {detalle.numero      && <Fila label="No."          valor={detalle.numero} />}
                            </div>
                            {(detalle.observaciones || detalle.observaciones2) && (
                                <div className="exp-sustraido-estatus">
                                    <span className="exp-sustraido-estatus-label"><i className="bi bi-chat-left-text" /> Observaciones</span>
                                    <p>{[detalle.observaciones, detalle.observaciones2, detalle.observaciones3, detalle.observaciones4, detalle.observaciones5, detalle.observaciones6].filter(Boolean).join(' | ')}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Datos del imputado */}
                    {detalle.tipo !== 'SUSTRAIDO' && detalle.tipo !== 'REGISTRO_HISTORICO' && !detalle.tipo?.startsWith('JOJU_') && !detalle.tipo?.startsWith('CUAT_') && (
                    <div className="exp-seccion">
                        <div className="exp-seccion-titulo"><i className="bi bi-person-fill" /> Datos del Imputado</div>
                        <div className="exp-campos">
                            <Fila label="No." valor={detalle.numero} />
                            <Fila label="Responsable" valor={detalle.responsable} />
                            <Fila label="Género" valor={detalle.genero} />
                            <Fila label="Fecha de nacimiento" valor={detalle.fechaNacimiento} />
                            <Fila label="Edad" valor={detalle.edad} />
                            <Fila label="Ocupación" valor={detalle.ocupacion} />
                        </div>
                    </div>
                    )}

                    {/* Domicilio */}
                    {detalle.tipo !== 'SUSTRAIDO' && detalle.tipo !== 'REGISTRO_HISTORICO' && !detalle.tipo?.startsWith('JOJU_') && !detalle.tipo?.startsWith('CUAT_') && <div className="exp-seccion">
                        <div className="exp-seccion-titulo"><i className="bi bi-house-fill" /> Domicilio</div>
                        <div className="exp-campos">
                            <Fila label="Calle" valor={detalle.calle} />
                            <Fila label="Número" valor={detalle.numeroExt} />
                            <Fila label="Colonia" valor={detalle.colonia} />
                            <Fila label="Municipio" valor={detalle.municipio} />
                            <Fila label="Estado" valor={detalle.estadoDomicilio} />
                            <Fila label="Teléfono 1" valor={detalle.telefono1} />
                            <Fila label="Teléfono 2" valor={detalle.telefono2} />
                            <Fila label="Coordenadas" valor={detalle.coordenadasDomicilio} />
                        </div>
                    </div>}

                    {/* Grupos vulnerables */}
                    {(detalle.indigena || detalle.afrodescendiente || detalle.extranjeroMigrante ||
                      detalle.comunidadLgbt || detalle.discapacidad || detalle.grupoVulnerableOtro) && (
                        <div className="exp-seccion">
                            <div className="exp-seccion-titulo"><i className="bi bi-shield-fill" /> Grupos Vulnerables</div>
                            <div className="exp-vulnerable-chips">
                                {detalle.indigena          && <span className="exp-chip">Indígena{detalle.etniaPueblo ? ` — ${detalle.etniaPueblo}` : ''}</span>}
                                {detalle.afrodescendiente  && <span className="exp-chip">Afrodescendiente</span>}
                                {detalle.extranjeroMigrante && <span className="exp-chip">Extranjero / Migrante</span>}
                                {detalle.comunidadLgbt     && <span className="exp-chip">Comunidad LGBT+</span>}
                                {detalle.discapacidad      && <span className="exp-chip">Discapacidad</span>}
                                {detalle.grupoVulnerableOtro && <span className="exp-chip">Otro: {detalle.grupoVulnerableOtro}</span>}
                            </div>
                        </div>
                    )}

                    {/* Víctimas */}
                    {(detalle.victima1Nombre || detalle.victima2Nombre) && (
                        <div className="exp-seccion">
                            <div className="exp-seccion-titulo"><i className="bi bi-people-fill" /> Víctimas</div>
                            <div className="exp-campos">
                                {detalle.victima1Nombre && <>
                                    <div className="exp-sub-titulo">Víctima 1</div>
                                    <Fila label="Tipo" valor={detalle.victima1Tipo} />
                                    <Fila label="Nombre" valor={detalle.victima1Nombre} />
                                    <Fila label="Género" valor={detalle.victima1Genero} />
                                    <Fila label="Domicilio" valor={detalle.victima1Domicilio} />
                                    <Fila label="Teléfono" valor={detalle.victima1Telefono} />
                                </>}
                                {detalle.victima2Nombre && <>
                                    <div className="exp-sub-titulo" style={{marginTop:'0.6rem'}}>Víctima 2</div>
                                    <Fila label="Tipo" valor={detalle.victima2Tipo} />
                                    <Fila label="Nombre" valor={detalle.victima2Nombre} />
                                    <Fila label="Género" valor={detalle.victima2Genero} />
                                    <Fila label="Domicilio" valor={detalle.victima2Domicilio} />
                                    <Fila label="Teléfono" valor={detalle.victima2Telefono} />
                                </>}
                            </div>
                        </div>
                    )}

                    {/* Oficio de imposición */}
                    {detalle.tipo !== 'SUSTRAIDO' && detalle.tipo !== 'REGISTRO_HISTORICO' && !detalle.tipo?.startsWith('JOJU_') && !detalle.tipo?.startsWith('CUAT_') && <div className="exp-seccion">
                        <div className="exp-seccion-titulo"><i className="bi bi-file-earmark-text-fill" /> Oficio de Imposición</div>
                        <div className="exp-campos">
                            <Fila label="Causa Penal" valor={detalle.causaPenal} />
                            <Fila label="Delito" valor={detalle.delito} />
                            <Fila label="Modalidad" valor={detalle.modalidad} />
                            <Fila label="Sede" valor={detalle.sede} />
                            <Fila label="Juez" valor={detalle.nombreJuez} />
                            <Fila label="Fecha de recepción" valor={detalle.fechaRecepcion} />
                            <Fila label="Fecha formulación" valor={detalle.fechaFormulacion} />
                            <Fila label="Vinculación a proceso" valor={detalle.fechaVinculacionProceso} />
                            <Fila label="Fecha audiencia imposición" valor={detalle.fechaAudienciaImposicion} />
                            <Fila label="Fecha entrevista encuadre" valor={detalle.fechaEntrevistaEncuadre} />
                            <Fila label="Fecha entrevista evaluación" valor={detalle.fechaEntrevistaEvaluacion} />
                        </div>
                    </div>}

                    {/* Evaluación / Riesgos */}
                    {(detalle.riesgoSustraccion || detalle.riesgoObstaculizacion || detalle.riesgoVictima ||
                      detalle.opinionTecnicaRiesgos || detalle.informe ||
                      detalle.noAplicaMpNoSolicito || detalle.noAplicaSinTiempo ||
                      detalle.noAplicaPersonaNoAccedio || detalle.noAplicaSinFuentes || detalle.noAplicaOtro) && (
                        <div className="exp-seccion">
                            <div className="exp-seccion-titulo"><i className="bi bi-exclamation-triangle-fill" /> Evaluación de Riesgos</div>
                            <div className="exp-vulnerable-chips">
                                {detalle.riesgoSustraccion     && <span className="exp-chip exp-chip-riesgo">Sustracción del proceso</span>}
                                {detalle.riesgoObstaculizacion && <span className="exp-chip exp-chip-riesgo">Obstaculización de la investigación</span>}
                                {detalle.riesgoVictima         && <span className="exp-chip exp-chip-riesgo">Riesgo para la víctima</span>}
                            </div>
                            <div className="exp-campos" style={{marginTop:'0.5rem'}}>
                                <Fila label="Opinión técnica" valor={detalle.opinionTecnicaRiesgos} />
                                <Fila label="Informe" valor={detalle.informe} />
                            </div>
                            {(detalle.noAplicaMpNoSolicito || detalle.noAplicaSinTiempo ||
                              detalle.noAplicaPersonaNoAccedio || detalle.noAplicaSinFuentes || detalle.noAplicaOtro) && (
                                <div style={{marginTop:'0.6rem'}}>
                                    <div className="exp-sub-titulo">Motivos de no aplica</div>
                                    <div className="exp-vulnerable-chips" style={{marginTop:'0.3rem'}}>
                                        {detalle.noAplicaMpNoSolicito    && <span className="exp-chip">MP no solicitó</span>}
                                        {detalle.noAplicaSinTiempo       && <span className="exp-chip">Sin tiempo</span>}
                                        {detalle.noAplicaPersonaNoAccedio && <span className="exp-chip">Persona no accedió</span>}
                                        {detalle.noAplicaSinFuentes      && <span className="exp-chip">Sin fuentes</span>}
                                        {detalle.noAplicaOtro            && <span className="exp-chip">Otro: {detalle.noAplicaOtro}</span>}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Campos exclusivos SCP */}
                    {detalle.tipo === 'SCP' && (detalle.fechaImposicionScp || detalle.plazoScp || detalle.fechaConclusionScp || detalle.primeraVisita) && (
                        <div className="exp-seccion">
                            <div className="exp-seccion-titulo"><i className="bi bi-hourglass-split" /> Suspensión Condicional del Proceso</div>
                            <div className="exp-campos">
                                <Fila label="Fecha inicio supervisión"   valor={detalle.fechaInicioSupervision} />
                                <Fila label="Fecha imposición SCP"       valor={detalle.fechaImposicionScp} />
                                <Fila label="Plazo SCP"                  valor={detalle.plazoScp} />
                                <Fila label="Fecha conclusión SCP"       valor={detalle.fechaConclusionScp} />
                                <Fila label="Vencimiento plazo SCP"      valor={detalle.vencimientoPlazoScp} />
                                <Fila label="Primera visita"             valor={detalle.primeraVisita} />
                                <Fila label="Segunda visita"             valor={detalle.segundaVisita} />
                                <Fila label="Tercera visita"             valor={detalle.terceraVisita} />
                                <Fila label="Tipo de servicio"           valor={detalle.tipoServicio} />
                                <Fila label="Último informe SCP"         valor={detalle.ultimoInformeMc} />
                                <Fila label="Fecha informe final"        valor={detalle.fechaInformeFinal} />
                                <Fila label="Oficio de sobreseimiento"   valor={detalle.oficioSobreseimiento} />
                                <Fila label="Resp. cierre de carpeta"    valor={detalle.responsableCierreCarpeta} />
                                <Fila label="No. Expediente archivo"     valor={detalle.numeroExpedienteArchivo} />
                                <Fila label="Ajuste"                     valor={detalle.ajuste} />
                            </div>
                        </div>
                    )}

                    {/* Medidas Cautelares */}
                    {medidasActivas.length > 0 && (
                        <div className="exp-seccion">
                            <div className="exp-seccion-titulo"><i className="bi bi-shield-lock-fill" /> Medidas Cautelares Art. 155</div>
                            <div className="exp-medidas-chips">
                                {medidasActivas.map(m => <span key={m} className="exp-medida-chip">{m}</span>)}
                            </div>
                            <div className="exp-campos" style={{marginTop:'0.8rem'}}>
                                <Fila label="Fecha canalización" valor={detalle.fechaCanalizacion} />
                                <Fila label="¿A disposición?" valor={detalle.aDisposicion} />
                                <Fila label="Presentación periódica" valor={detalle.presentacionPeriodica} />
                                <Fila label="No. Biométrico" valor={detalle.noBiometrico} />
                                <Fila label="No. Libro" valor={detalle.noLibro} />
                                <Fila label="No. Página" valor={detalle.noPagina} />
                                <Fila label="Cumpliendo / Incumpliendo" valor={detalle.cumpliendoIncumpliendo} />
                                <Fila label="Distrito Judicial" valor={detalle.distritoJudicial} />
                                <Fila label="Último informe MC" valor={detalle.ultimoInformeMc} />
                                <Fila label="Acuerdo reparatorio" valor={detalle.acuerdoReparatorio} />
                                <Fila label="Fecha acuerdo reparatorio" valor={detalle.fechaAcuerdoReparatorio} />
                                <Fila label="Fecha cumplimiento acuerdo" valor={detalle.fechaCumplimientoAcuerdo} />
                                <Fila label="Estatus final" valor={detalle.estatusFinal} />
                                <Fila label="Fecha término MC" valor={detalle.fechaTerminoMc} />
                                <Fila label="Estado final" valor={detalle.estadoFinal} />
                            </div>
                        </div>
                    )}

                    {/* Seguimientos */}
                    {seguimientos.length > 0 && (
                        <div className="exp-seccion exp-seccion-full">
                            <div className="exp-seccion-titulo"><i className="bi bi-journal-text" /> Seguimientos</div>
                            <ol className="exp-seguimientos-list">
                                {seguimientos.map((s, i) => (
                                    <li key={i} className="exp-seguimiento-item">
                                        <span className="exp-seg-num">{i + 1}</span>
                                        <span>{s}</span>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    )}

                    {/* Observaciones — solo para tipos que no sean JOJU_* o CUAT_* (esos ya las muestran dentro de su sección) */}
                    {detalle.observaciones && !detalle.tipo?.startsWith('JOJU_') && !detalle.tipo?.startsWith('CUAT_') && (
                        <div className="exp-seccion exp-seccion-full">
                            <div className="exp-seccion-titulo"><i className="bi bi-chat-left-text-fill" /> Observaciones</div>
                            {detalle.observaciones.includes('\n')
                                ? <ol className="exp-obs-list">
                                    {detalle.observaciones.split('\n').filter(Boolean).map((obs, i) => (
                                        <li key={i} className="exp-obs-item">
                                            <span className="exp-obs-num">{i + 1}</span>
                                            <span>{obs}</span>
                                        </li>
                                    ))}
                                  </ol>
                                : <p className="exp-observaciones">{detalle.observaciones}</p>
                            }
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ── Lista ─────────────────────────────────────────────────
    return (
        <div className="exp-container">

            {/* Top bar */}
            <div className="exp-topbar">
                {/* Fila 1: contador + pills principales + botones + paginación */}
                <div className="exp-topbar-row">
                    <span className="exp-topbar-count">
                        Mostrando <b>{total === 0 ? 0 : pagina * ITEMS_POR_PAGINA + 1}</b>–<b>{Math.min((pagina + 1) * ITEMS_POR_PAGINA, total)}</b> de <b>{total}</b>
                    </span>
                    <div className="exp-topbar-sep" />
                    <div className="exp-tipo-pills">
                        {[
                            ['BASE_XOCHI',         'Base Xochi'],
                            ['BASE_JOJU',          'Base Joju'],
                            ['BASE_CUAT',          'Base Cuautla'],
                            ['INACTIVOS_XOCHI',    'Inactivos Xochi'],
                            ['REGISTRO_HISTORICO', 'Reg. Histórico'],
                            ['SUSTRAIDO',          'Sustraídos'],
                        ].map(([v, l]) => (
                            <button key={v}
                                className={`exp-tipo-pill ${tipoFiltro === v ? 'exp-tipo-pill-active' : ''} exp-tipo-pill-${v.toLowerCase()}`}
                                onClick={() => { setTipoFiltro(v); setSubtipoFiltro(null); setZonaFiltro(''); }}>
                                {l}
                            </button>
                        ))}
                    </div>
                    <div className="exp-topbar-spacer" />
                    <div className="exp-topbar-sep" />
                    <div className="exp-paginacion">
                        <button onClick={() => cambiarPagina(pagina - 1)} disabled={pagina === 0}>
                            <i className="bi bi-chevron-left" />
                        </button>
                        <span>{pagina + 1} / {totalPaginas}</span>
                        <button onClick={() => cambiarPagina(pagina + 1)} disabled={pagina + 1 >= totalPaginas}>
                            <i className="bi bi-chevron-right" />
                        </button>
                    </div>
                </div>

                {/* Fila 2: subtipos de la base seleccionada */}
                {SUBTIPOS_POR_BASE[tipoFiltro] && (
                    <div className={`exp-subtipo-bar exp-base-${tipoFiltro === 'BASE_XOCHI' ? 'xochi' : tipoFiltro === 'BASE_JOJU' ? 'joju' : tipoFiltro === 'INACTIVOS_XOCHI' ? 'xochi' : 'cuat'}`}>
                        <span className="exp-subtipo-label">Sección:</span>
                        <button
                            className={`exp-tipo-pill exp-subtipo-pill ${subtipoFiltro === null ? 'exp-tipo-pill-active' : ''}`}
                            onClick={() => setSubtipoFiltro(null)}>
                            Todos
                        </button>
                        {SUBTIPOS_POR_BASE[tipoFiltro].map(st => (
                            <button key={st}
                                className={`exp-tipo-pill exp-subtipo-pill ${subtipoFiltro === st ? 'exp-tipo-pill-active' : ''}`}
                                onClick={() => setSubtipoFiltro(st)}>
                                {SUBTIPO_LABELS[st] || st}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Filtros */}
            <div className="exp-filtros">
                <div className="exp-buscador-wrap">
                    <i className="bi bi-search exp-buscador-icon" />
                    <input
                        className="exp-buscador"
                        placeholder="Buscar por nombre, causa penal o número..."
                        value={busqueda}
                        onChange={e => setBusqueda(e.target.value)}
                    />
                    {loading && <i className="bi bi-arrow-repeat exp-spin exp-buscador-loading" />}
                </div>
                {/* Pills de zona — solo para Reg. Histórico y Sustraídos */}
                {esAdmin && (
                    <div className="exp-acciones-bar">
                        <button className="exp-btn-gestion" onClick={abrirGestion}>
                            <i className="bi bi-archive-fill" /> Gestionar importaciones
                        </button>
                        <button className="exp-btn-importar" onClick={() => { setShowImport(true); setImportTipo(tipoFiltro === 'INACTIVOS_XOCHI' ? 'INACTIVOS' : 'BASE_IMPUTADOS'); setImportZona(tipoFiltro === 'INACTIVOS_XOCHI' ? 'XOCHITEPEC' : 'XOCHITEPEC'); setImportArchivo(null); setImportPaso(1); setImportError(null); setImportExito(null); }}>
                            <i className="bi bi-file-earmark-arrow-up-fill" /> Importar Excel
                        </button>
                    </div>
                )}
                {(tipoFiltro === 'REGISTRO_HISTORICO' || tipoFiltro === 'SUSTRAIDO') && (
                    <div className="zona-pills">
                        {[['', 'Todas'], ['XOCHITEPEC', 'Xochi'], ['CUAUTLA', 'Cuautla'], ['JOJUTLA', 'Jojutla']].map(([v, l]) => (
                            <button key={v}
                                className={`zona-pill ${v ? `zona-pill-${v.toLowerCase()}` : 'zona-pill-todas'} ${zonaFiltro === v ? 'zona-pill-active' : ''}`}
                                onClick={() => setZonaFiltro(v)}>
                                {l}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Tabla */}
            <div className="exp-table-wrapper">
                {loading ? (
                    <div className="exp-estado-vacio"><i className="bi bi-arrow-repeat exp-spin" /> Cargando...</div>
                ) : lista.length === 0 ? (
                    <div className="exp-estado-vacio"><i className="bi bi-inbox" /> No hay expedientes registrados</div>
                ) : null}
                {!loading && lista.length > 0 && (
                <table className="exp-table">
                    <thead>
                        <tr>
                            {tipoFiltro !== 'REGISTRO_HISTORICO'
                                && !(tipoFiltro === 'BASE_CUAT' && subtipoFiltro !== 'CUAT_ARCHIVO')
                                && !(tipoFiltro === 'BASE_JOJU' && subtipoFiltro !== 'JOJU_ARCHIVO')
                                && <th>NO.</th>}
                            {tipoFiltro === 'BASE_CUAT' && subtipoFiltro === 'CUAT_SUSTRAIDO' && <th>CARPETA XOCHI</th>}
                            <th>NOMBRE COMPLETO</th>
                            <th>CAUSA PENAL</th>
                            {tipoFiltro === 'SUSTRAIDO' ? (
                                <>
                                    <th>MC ó SCP</th>
                                    <th>ARCHIVO</th>
                                    <th>SUSTRACCIÓN</th>
                                    <th>ESTATUS</th>
                                    <th>SUPERVISOR</th>
                                </>
                            ) : tipoFiltro === 'REGISTRO_HISTORICO' ? (
                                <>
                                    <th>FECHA</th>
                                    <th>SITUACIÓN JURÍDICA</th>
                                </>
                            ) : SUBTIPOS_POR_BASE[tipoFiltro] ? (
                                <>
                                    <th>TIPO</th>
                                    <th>ZONA</th>
                                    {(tipoFiltro !== 'BASE_CUAT' || subtipoFiltro === 'CUAT_PRISION' || subtipoFiltro === null)
                                        && (tipoFiltro !== 'BASE_JOJU' || subtipoFiltro === 'JOJU_SOBRESEIMIENTO' || subtipoFiltro === null)
                                        && <th>ESTATUS</th>}
                                </>
                            ) : (
                                <>
                                    <th>DELITO</th>
                                    <th>TIPO</th>
                                    <th>ESTATUS</th>
                                    <th>RESPONSABLE</th>
                                </>
                            )}
                            <th>ACCIONES</th>
                        </tr>
                    </thead>
                    <tbody>
                        {lista.map(e => {
                            const nombreCompleto = e.apPaterno
                                ? `${e.apPaterno}${e.apMaterno ? ' ' + e.apMaterno : ''}${e.nombre ? ' ' + e.nombre : ''}`
                                : e.nombre || '—';
                            return (
                            <tr key={e.id}>
                                {tipoFiltro !== 'REGISTRO_HISTORICO'
                                && !(tipoFiltro === 'BASE_CUAT' && subtipoFiltro !== 'CUAT_ARCHIVO')
                                && !(tipoFiltro === 'BASE_JOJU' && subtipoFiltro !== 'JOJU_ARCHIVO')
                                && <td className="exp-num">{e.numero || '—'}</td>}
                                {tipoFiltro === 'BASE_CUAT' && subtipoFiltro === 'CUAT_SUSTRAIDO' && <td>{e.carpetaXochitepec || '—'}</td>}
                                <td>
                                    <div style={{display:'flex', alignItems:'center', gap:'7px'}}>
                                        <span>{nombreCompleto}</span>
                                        {e.zona && (
                                            <span className={`zona-tag zona-tag-${e.zona.toLowerCase()}`}>
                                                {({'XOCHITEPEC':'Xochi','CUAUTLA':'Cuat','JOJUTLA':'Jojut'})[e.zona] ?? e.zona}
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td>{e.causaPenal || '—'}</td>
                                {tipoFiltro === 'SUSTRAIDO' ? (
                                    <>
                                        <td>{e.tipoMcScp || '—'}</td>
                                        <td>{e.archivo || '—'}</td>
                                        <td className="exp-delito">{e.sustraccion || '—'}</td>
                                        <td>{e.estatus || '—'}</td>
                                        <td>{e.supervisor || '—'}</td>
                                    </>
                                ) : tipoFiltro === 'REGISTRO_HISTORICO' ? (
                                    <>
                                        <td>{e.fechaRegistroHist || '—'}</td>
                                        <td className="exp-delito">{e.situacionJuridica || '—'}</td>
                                    </>
                                ) : SUBTIPOS_POR_BASE[tipoFiltro] ? (
                                    <>
                                        <td><span className={`exp-tipo-badge exp-tipo-${(e.tipo||'').toLowerCase()}`}>{SUBTIPO_LABELS[e.tipo] || e.tipo || '—'}</span></td>
                                        <td>{e.zona ? ({'XOCHITEPEC':'Xochi','CUAUTLA':'Cuat','JOJUTLA':'Jojut'})[e.zona] ?? e.zona : '—'}</td>
                                        {(tipoFiltro !== 'BASE_CUAT' || subtipoFiltro === 'CUAT_PRISION' || subtipoFiltro === null)
                                            && (tipoFiltro !== 'BASE_JOJU' || subtipoFiltro === 'JOJU_SOBRESEIMIENTO' || subtipoFiltro === null)
                                            && <td>{e.estatus || '—'}</td>}
                                    </>
                                ) : (
                                    <>
                                        <td className="exp-delito">{e.delito || '—'}</td>
                                        <td>
                                            <span className={`exp-tipo-badge exp-tipo-${(e.tipo||'').toLowerCase()}`}>{e.tipo || '—'}</span>
                                        </td>
                                        <td>{e.estatus || '—'}</td>
                                        <td>{e.responsable || '—'}</td>
                                    </>
                                )}
                                <td>
                                    <button className="exp-btn-ver" onClick={() => verDetalle(e.id)} disabled={loadingDet} title="Ver detalle completo">
                                        <i className="bi bi-eye-fill" />
                                    </button>
                                </td>
                            </tr>
                            );
                        })}
                    </tbody>
                </table>
                )}
            </div>

            {/* Modal gestión de importaciones */}
            {showGestion && (
                <div className="exp-modal-overlay" onClick={() => { if (!eliminandoLote) { setShowGestion(false); setLoteAEliminar(null); setConfirmTexto(''); } }}>
                    <div className="exp-modal-box exp-modal-gestion" onClick={e => e.stopPropagation()}>
                        <div className="exp-modal-icon exp-modal-icon-gestion">
                            <i className="bi bi-archive-fill" />
                        </div>
                        <h3 className="exp-modal-titulo">Gestionar Importaciones</h3>
                        <p className="exp-modal-desc">Historial de importaciones realizadas. Puedes eliminar una importación completa si se cometió un error.</p>

                        {loadingLotes ? (
                            <div className="exp-gestion-loading"><i className="bi bi-arrow-repeat exp-spin" /> Cargando importaciones...</div>
                        ) : lotes.length === 0 ? (
                            <div className="exp-gestion-empty"><i className="bi bi-inbox" /> No hay importaciones registradas.</div>
                        ) : (
                            <div className="exp-lotes-lista">
                                {lotes.map((lote, idx) => {
                                    const fecha = lote.createdAt
                                        ? new Date(lote.createdAt).toLocaleString('es-MX', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })
                                        : '—';
                                    const zonaLabel = lote.zona
                                        ? ({'XOCHITEPEC':'Xochitepec','CUAUTLA':'Cuautla','JOJUTLA':'Jojutla'}[lote.zona] ?? lote.zona)
                                        : 'Múltiples zonas';
                                    const esEste = loteAEliminar?.id === lote.id;
                                    const total = (lote.totalMc ?? 0) + (lote.totalScp ?? 0) + (lote.totalHistorico ?? 0);
                                    return (
                                        <div key={lote.id} className={`exp-lote-card ${esEste ? 'exp-lote-card-activo' : ''}`}>
                                            {/* Cabecera */}
                                            <div className="exp-lote-header">
                                                <div className="exp-lote-header-left">
                                                    <span className="exp-lote-num">Importación #{lotes.length - idx}</span>
                                                    <span className={`zona-tag ${lote.zona ? `zona-tag-${lote.zona.toLowerCase()}` : 'zona-tag-multi'}`}>{zonaLabel}</span>
                                                </div>
                                                <span className="exp-lote-fecha"><i className="bi bi-calendar2-check" /> {fecha}</span>
                                            </div>

                                            {/* Archivo e importador */}
                                            <div className="exp-lote-archivo">
                                                <i className="bi bi-file-earmark-excel-fill" /> {lote.nombreArchivo || '—'}
                                                {lote.importadoPor && <span className="exp-lote-por"> · importado por <b>{lote.importadoPor}</b></span>}
                                            </div>

                                            {/* Contadores */}
                                            <div className="exp-lote-counts">
                                                <span className="exp-lote-count exp-lote-total"><b>{total}</b> total</span>
                                                <span className="exp-lote-sep-count">|</span>
                                                <span className="exp-lote-count exp-lote-mc"><b>{lote.totalMc ?? 0}</b> MC</span>
                                                <span className="exp-lote-count exp-lote-scp"><b>{lote.totalScp ?? 0}</b> SCP</span>
                                                <span className="exp-lote-count exp-lote-hist"><b>{lote.totalHistorico ?? 0}</b> Histórico</span>
                                                {lote.totalOmitidos > 0 && <span className="exp-lote-count exp-lote-omit"><i className="bi bi-dash-circle-fill" style={{fontSize:'0.7rem'}}/> {lote.totalOmitidos} omitidos</span>}
                                            </div>

                                            {!esEste ? (
                                                <div className="exp-lote-btn-del-wrap">
                                                    <button className="exp-lote-btn-del" onClick={() => { setLoteAEliminar(lote); setConfirmTexto(''); }}>
                                                        <i className="bi bi-trash3-fill" /> Eliminar esta importación
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="exp-lote-confirm">
                                                    <div className="exp-lote-confirm-warn">
                                                        <i className="bi bi-exclamation-triangle-fill" />
                                                        <span>Esta acción eliminará <b>{total}</b> expedientes de forma permanente. Escribe <code>CONFIRMAR</code> para continuar.</span>
                                                    </div>
                                                    <input
                                                        className="exp-lote-confirm-input"
                                                        placeholder="Escribe CONFIRMAR"
                                                        value={confirmTexto}
                                                        onChange={e => setConfirmTexto(e.target.value)}
                                                        disabled={eliminandoLote}
                                                    />
                                                    <div className="exp-lote-confirm-btns">
                                                        <button className="exp-modal-btn-cancel" onClick={() => { setLoteAEliminar(null); setConfirmTexto(''); }} disabled={eliminandoLote}>
                                                            Cancelar
                                                        </button>
                                                        <button
                                                            className="exp-lote-btn-del-confirm"
                                                            onClick={handleEliminarLote}
                                                            disabled={confirmTexto !== 'CONFIRMAR' || eliminandoLote}
                                                        >
                                                            {eliminandoLote
                                                                ? <><i className="bi bi-arrow-repeat exp-spin" /> Eliminando...</>
                                                                : <><i className="bi bi-trash3-fill" /> Eliminar permanentemente</>}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <div className="exp-modal-acciones" style={{marginTop:'1rem'}}>
                            <button className="exp-modal-btn-cancel" onClick={() => { setShowGestion(false); setLoteAEliminar(null); setConfirmTexto(''); }}>
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal importación Excel */}
            {showImport && (
                <div className="exp-modal-overlay" onClick={() => { if (!importando) { setShowImport(false); setImportError(null); setImportExito(null); setImportArchivo(null); setImportPaso(1); } }}>
                    <div className="exp-modal-box" onClick={e => e.stopPropagation()}>
                        <div className="exp-modal-icon">
                            <i className="bi bi-file-earmark-excel-fill" />
                        </div>
                        <h3 className="exp-modal-titulo">Importar Expedientes desde Excel</h3>
                        <p className="exp-modal-desc">Selecciona el formato de importación y el archivo Excel.</p>

                        {/* ── Paso 1: Formulario ── */}
                        {importPaso === 1 && (
                            <>
                                <div className="exp-modal-form">
                                    <div className="exp-modal-field">
                                        <label>Formato de importación *</label>
                                        <div className="exp-modal-opts" style={{flexDirection:'column',gap:'8px'}}>
                                            {[
                                                ['BASE_IMPUTADOS',    'bi-people-fill',           'Base de Imputados',        'Archivo de base de imputados por sede (MC/SCP/Histórico, Prisión Preventiva, Sustraídos, etc.)'],
                                                ['INACTIVOS',        'bi-archive-fill',          'Inactivos',                'Expedientes inactivos por sede — hojas: MC INACTIVAS, SCP INACTIVO, HISTORICO.'],
                                                ['REGISTRO_HISTORICO','bi-clock-history',         'Registro Histórico',       'Formato simple: CAUSA PENAL, NOMBRE, FECHA, SITUACIÓN JURÍDICA.'],
                                                ['SUSTRAIDO',         'bi-person-dash-fill',      'Sustraídos',               'Archivo con hojas por zona (Cuernavaca / Jojutla / Cuautla).'],
                                            ].map(([v, icon, titulo, desc]) => (
                                                <button key={v}
                                                    className={`exp-modal-tipo-card ${importTipo === v ? 'exp-modal-tipo-card-active' : ''}`}
                                                    onClick={() => setImportTipo(v)}>
                                                    <i className={`bi ${icon}`} />
                                                    <div>
                                                        <strong>{titulo}</strong>
                                                        <span>{desc}</span>
                                                    </div>
                                                    {importTipo === v && <i className="bi bi-check-circle-fill exp-tipo-check" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    {(importTipo === 'BASE_IMPUTADOS' || importTipo === 'REGISTRO_HISTORICO' || importTipo === 'INACTIVOS') && (
                                    <div className="exp-modal-field">
                                        <label>{importTipo === 'REGISTRO_HISTORICO' ? 'Zona (opcional)' : 'Sede *'}</label>
                                        <div className="exp-modal-opts">
                                            {[['XOCHITEPEC','Xochitepec'],['CUAUTLA','Cuautla'],['JOJUTLA','Jojutla']].map(([v,l]) => (
                                                <button key={v}
                                                    className={`exp-modal-opt ${importZona === v ? 'exp-modal-opt-active' : ''}`}
                                                    onClick={() => setImportZona(v)}>
                                                    {l}
                                                </button>
                                            ))}
                                        </div>
                                        {(importTipo === 'BASE_IMPUTADOS' || importTipo === 'INACTIVOS') && importZona && (
                                            <div className="exp-zona-alerta">
                                                <i className="bi bi-exclamation-triangle-fill" />
                                                Verifica que el archivo corresponde a la sede <strong>{ZONA_LABELS[importZona]}</strong> antes de continuar.
                                            </div>
                                        )}
                                    </div>
                                    )}
                                    {importTipo === 'SUSTRAIDO' && (
                                        <div className="exp-modal-info">
                                            <i className="bi bi-info-circle-fill" />
                                            La zona se detecta automáticamente del nombre de cada hoja del archivo.
                                        </div>
                                    )}
                                    <div className="exp-modal-field">
                                        <label>Archivo Excel (.xlsx)</label>
                                        <label className="exp-dropzone">
                                            <input type="file" accept=".xlsx,.xls"
                                                onChange={e => setImportArchivo(e.target.files[0] || null)} />
                                            {importArchivo ? (
                                                <>
                                                    <i className="bi bi-file-earmark-excel-fill exp-dropzone-icon exp-dropzone-ok" />
                                                    <span className="exp-dropzone-nombre">{importArchivo.name}</span>
                                                    <span className="exp-dropzone-sub">Haz clic para cambiar el archivo</span>
                                                </>
                                            ) : (
                                                <>
                                                    <i className="bi bi-cloud-upload exp-dropzone-icon" />
                                                    <span className="exp-dropzone-nombre">Haz clic para seleccionar el archivo</span>
                                                    <span className="exp-dropzone-sub">Solo archivos .xlsx o .xls</span>
                                                </>
                                            )}
                                        </label>
                                    </div>
                                </div>
                                <div className="exp-modal-acciones">
                                    <button className="exp-modal-btn-cancel" onClick={() => { setShowImport(false); setImportArchivo(null); setImportPaso(1); }}>
                                        Cancelar
                                    </button>
                                    <button className="exp-modal-btn-ok" disabled={!importArchivo}
                                        onClick={() => setImportPaso(2)}>
                                        <i className="bi bi-arrow-right" /> Continuar
                                    </button>
                                </div>
                            </>
                        )}

                        {/* ── Paso 2: Confirmación ── */}
                        {importPaso === 2 && (
                            <>
                                <div className="exp-confirm-banner">
                                    <i className="bi bi-exclamation-triangle-fill exp-confirm-icon" />
                                    <div>
                                        <strong>¿Confirmas la importación?</strong>
                                        {importTipo === 'SUSTRAIDO'
                                            ? <p>El sistema leerá las 3 hojas del archivo y asignará la zona automáticamente a cada registro. <b>Esta acción no podrá revertirse una vez confirmada.</b></p>
                                            : importTipo === 'REGISTRO_HISTORICO'
                                            ? <p>Verifica que el archivo corresponda al formato de Registro Histórico y que la zona sea correcta. <b>Esta acción no podrá revertirse una vez confirmada.</b></p>
                                            : <p>Verifica que la zona y el formato del archivo sean correctos antes de continuar. Esta información será asignada a <b>todos</b> los registros del archivo y <b>no podrá modificarse una vez realizada la importación</b>.</p>
                                        }
                                    </div>
                                </div>

                                <div className="exp-confirm-resumen">
                                    <div className="exp-confirm-fila">
                                        <span className="exp-confirm-label"><i className="bi bi-layers-fill" /> Formato</span>
                                        <span className="exp-confirm-valor">
                                            {importTipo === 'BASE_IMPUTADOS' ? 'Base de Imputados' : importTipo === 'REGISTRO_HISTORICO' ? 'Registro Histórico' : 'Sustraídos'}
                                        </span>
                                    </div>
                                    {importTipo !== 'SUSTRAIDO' && importZona && (
                                    <div className="exp-confirm-fila">
                                        <span className="exp-confirm-label"><i className="bi bi-geo-alt-fill" /> Zona asignada</span>
                                        <span className={`zona-tag zona-tag-${importZona.toLowerCase()}`}>
                                            {({'XOCHITEPEC':'Xochitepec','CUAUTLA':'Cuautla','JOJUTLA':'Jojutla'})[importZona]}
                                        </span>
                                    </div>
                                    )}
                                    {importTipo === 'SUSTRAIDO' && (
                                    <div className="exp-confirm-fila">
                                        <span className="exp-confirm-label"><i className="bi bi-geo-alt-fill" /> Zona</span>
                                        <span className="exp-confirm-valor">Auto-detectada por hoja</span>
                                    </div>
                                    )}
                                    <div className="exp-confirm-fila">
                                        <span className="exp-confirm-label"><i className="bi bi-file-earmark-excel-fill" /> Archivo</span>
                                        <span className="exp-confirm-valor">{importArchivo?.name}</span>
                                    </div>
                                </div>

                                {/* Resultado */}
                                {importExito && (
                                    <div className="exp-import-resultado exp-import-ok">
                                        <i className="bi bi-check-circle-fill" /> {importExito}
                                        <button className="exp-import-cerrar" onClick={() => { setShowImport(false); setImportExito(null); setImportArchivo(null); setImportPaso(1); }}>
                                            Cerrar
                                        </button>
                                    </div>
                                )}
                                {importError && (
                                    <div className="exp-import-resultado exp-import-error">
                                        <i className="bi bi-exclamation-triangle-fill" />
                                        <div>
                                            <strong>Error al importar</strong>
                                            <p>{importError}</p>
                                        </div>
                                    </div>
                                )}

                                {!importExito && (
                                <div className="exp-modal-acciones">
                                    <button className="exp-modal-btn-cancel" onClick={() => { setImportPaso(1); setImportError(null); }} disabled={importando}>
                                        <i className="bi bi-arrow-left" /> Regresar
                                    </button>
                                    <button className="exp-modal-btn-ok" onClick={handleImportar} disabled={importando}>
                                        {importando
                                            ? <><i className="bi bi-arrow-repeat exp-spin" /> Importando...</>
                                            : <><i className="bi bi-upload" /> Confirmar e Importar</>}
                                    </button>
                                </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// Componente auxiliar para cada fila del detalle
function Fila({ label, valor }) {
    if (!valor && valor !== 0) return null;
    return (
        <div className="exp-fila">
            <span className="exp-fila-label">{label}</span>
            <span className="exp-fila-valor">{String(valor)}</span>
        </div>
    );
}
