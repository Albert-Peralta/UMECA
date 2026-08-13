import { useState, useEffect, useRef } from 'react';
import { getImputados, getImputadoById, actualizarFotoImputado, registrarFallecimiento, registrarCierreCarpeta, revertirCierreCarpeta } from '../api/imputadosApi';
import { getSeguimientosPorImputado } from '../api/seguimientosApi';
import { cambiarCumplimiento } from '../api/medidasApi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import SeguimientosPanel from '../components/SeguimientosPanel';
import './Historico.css';
import './Imputados.css';
import { ESTATUS_CIERRE_LABEL } from '../constants/estatusCierre';

const ITEMS_POR_PAGINA = 50;

// Estatus que solo finalizan la medida activa sin cerrar la carpeta completa
// Estatus que solo finalizan la medida activa sin cerrar la carpeta completa
// MC: Auto no vinculación, Arraigo, Cambio MC→SCP
// SCP: Nueva condena
const ESTATUS_SOLO_MEDIDA = new Set([
    'AUTO_NO_VINCULACION',
    'ARRAIGO_DOMICILIARIO',
    'CAMBIO_MC_A_SCP',
    'NUEVA_CONDENA',
]);

const estatusEntrevistaConfig = {
    PENDIENTE:   { label: 'Pendiente',   clase: 'estatus-pendiente' },
    EN_REVISION: { label: 'En Revisión', clase: 'estatus-proceso' },
    COMPLETADO:  { label: 'Completado',  clase: 'estatus-atendido' },
};

const estatusEvalConfig = {
    PENDIENTE:  { label: 'Pendiente',  clase: 'estatus-pendiente' },
    TRABAJANDO: { label: 'En Proceso', clase: 'estatus-proceso' },
    FINALIZADO: { label: 'Finalizado', clase: 'estatus-atendido' },
};

const resultadoConfig = {
    FLEXIBLE:        { label: 'Bajo Riesgo',  clase: 'riesgo-bajo' },
    ESTRICTO:        { label: 'Medio Riesgo', clase: 'riesgo-medio' },
    DIFICIL_CUMPLIR: { label: 'Alto Riesgo',  clase: 'riesgo-alto' },
};

const FALLECIMIENTO_INIT = {
    fechaFallecimiento: '', quienAviso: '', parentesco: '',
    comoSeComprobo: '', noActaDefuncion: '', observacionesFallecimiento: ''
};

const CIERRE_INIT = {
    motivoCierreCarpeta: '',
    estatusCumplimientoCierre: '',
    fechaIngresoCierre: '',
    notasCierre: ''
};

const Imputados = ({ onNavigarEntrevista }) => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const puedeEditarFoto    = user?.rol === 'ADMINISTRADOR' || user?.rol === 'SUPERADMIN' || user?.rol === 'SUPERVISION';
    const puedeFallecimiento = user?.rol === 'ADMINISTRADOR' || user?.rol === 'SUPERADMIN' || user?.rol === 'SUPERVISION';
    const puedeCierreCarpeta = user?.rol === 'ADMINISTRADOR' || user?.rol === 'SUPERADMIN' || user?.rol === 'SUPERVISION';

    const [datos, setDatos] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [tabVista, setTabVista] = useState('activos'); // 'activos' | 'cerrados'
    const [zonaFiltro, setZonaFiltro] = useState('TODAS');
    const [pagina, setPagina] = useState(1);
    const [cargando, setCargando] = useState(true);

    const [showPerfil, setShowPerfil] = useState(false);
    const [perfil, setPerfil] = useState(null);
    const [cargandoPerfil, setCargandoPerfil] = useState(false);
    const [tabActiva, setTabActiva] = useState('entrevistas');
    const [subiendoFoto, setSubiendoFoto] = useState(false);
    const [fotoMsg, setFotoMsg] = useState(null); // { tipo: 'ok'|'error', texto }
    const [zoomFoto, setZoomFoto] = useState(false);
    const fotoInputRef = useRef(null);

    // Fallecimiento
    const [conteoSeg, setConteoSeg] = useState(0);
    const [showFallecimiento, setShowFallecimiento] = useState(false);
    const [formFall, setFormFall] = useState(FALLECIMIENTO_INIT);
    const [guardandoFall, setGuardandoFall] = useState(false);
    const [fallMsg, setFallMsg] = useState(null);

    // Cumplimiento
    const [showCumplimientoMenu, setShowCumplimientoMenu] = useState(false);
    const [guardandoCumplimiento, setGuardandoCumplimiento] = useState(false);

    const handleCambiarCumplimiento = async (medidaId, valor) => {
        setGuardandoCumplimiento(true);
        setShowCumplimientoMenu(false);
        try {
            const res = await cambiarCumplimiento(medidaId, valor);
            if (res.data.ok) {
                const [resPerfil] = await Promise.all([
                    getImputadoById(perfil.id),
                    cargarDatos(),
                ]);
                if (resPerfil.data.ok) setPerfil(resPerfil.data.data);
                showToast(`Estatus actualizado: ${valor === 'CUMPLIMIENTO' ? 'Cumplimiento' : valor === 'INCUMPLIMIENTO' ? 'Incumplimiento' : 'Sin estatus'}`);
            }
        } catch { showToast('No se pudo actualizar el estatus', 'error'); }
        finally { setGuardandoCumplimiento(false); }
    };

    // Cierre de carpeta
    const [showCierre, setShowCierre] = useState(false);
    const [formCierre, setFormCierre] = useState(CIERRE_INIT);
    const [guardandoCierre, setGuardandoCierre] = useState(false);
    const [cierreMsg, setCierreMsg] = useState(null);
    const [cierreConfirmando, setCierreConfirmando] = useState(false);
    const [confirmRevertir, setConfirmRevertir] = useState(false);
    const [reviertiendo, setReviertiendo] = useState(false);

    const handleRevertirCierre = async () => {
        setReviertiendo(true);
        try {
            const res = await revertirCierreCarpeta(perfil.id);
            if (res.data.ok) {
                const resPerfil = await getImputadoById(perfil.id);
                if (resPerfil.data.ok) setPerfil(resPerfil.data.data);
                await cargarDatos();
                showToast('Cierre de carpeta revertido. El imputado volvió a activos.');
            } else {
                showToast(res.data.message || 'No se pudo revertir el cierre', 'error');
            }
        } catch { showToast('Error al revertir el cierre', 'error'); }
        finally { setReviertiendo(false); setConfirmRevertir(false); }
    };

    useEffect(() => { cargarDatos(); }, []);

    // Auto-reabrir drawer si volvemos desde un detalle externo
    useEffect(() => {
        const id = localStorage.getItem('abrirExpedienteId');
        if (id) {
            localStorage.removeItem('abrirExpedienteId');
            const tab = localStorage.getItem('abrirExpedienteTab') || 'entrevistas';
            localStorage.removeItem('abrirExpedienteTab');
            cargarDatos().then ? null : null; // asegurar datos cargados
            Promise.all([
                getImputadoById(Number(id)),
                getSeguimientosPorImputado(Number(id)).catch(() => ({ data: { data: [] } })),
            ]).then(([res, resSeg]) => {
                if (res.data.ok) { setPerfil(res.data.data); setShowPerfil(true); }
                setConteoSeg(resSeg.data?.data?.length ?? 0);
                setTabActiva(tab);
            }).catch(err => console.warn("Error al cargar datos:", err));
        }
    }, []);

    useEffect(() => {
        document.body.style.overflow = showPerfil ? 'hidden' : 'unset';
        return () => { document.body.style.overflow = 'unset'; };
    }, [showPerfil]);

    const cargarDatos = async () => {
        setCargando(true);
        try {
            const res = await getImputados();
            if (res.data.ok) setDatos(res.data.data);
        } catch (err) {
            showToast('Error al cargar imputados. Verifica la conexión.', 'error');
        } finally {
            setCargando(false);
        }
    };

    const filtrados = datos
        .filter(i => {
            if (tabVista === 'activos'  && (i.fallecido || i.carpetaCerrada)) return false;
            if (tabVista === 'cerrados' && !i.carpetaCerrada && !i.fallecido)  return false;
            if (zonaFiltro !== 'TODAS' && i.zona !== zonaFiltro) return false;
            return (
                i.nombreCompleto?.toLowerCase().includes(busqueda.toLowerCase()) ||
                i.causaPenal?.toLowerCase().includes(busqueda.toLowerCase()) ||
                i.delito?.toLowerCase().includes(busqueda.toLowerCase())
            );
        })
        .sort((a, b) => {
            if (tabVista === 'cerrados') {
                return (b.numeroCierreCarpeta || b.fechaFallecimiento || '').localeCompare(a.numeroCierreCarpeta || a.fechaFallecimiento || '');
            }
            return 0;
        });

    const totalPaginas = Math.max(1, Math.ceil(filtrados.length / ITEMS_POR_PAGINA));
    const inicio = (pagina - 1) * ITEMS_POR_PAGINA;
    const paginados = filtrados.slice(inicio, inicio + ITEMS_POR_PAGINA);

    const handleVerPerfil = async (item) => {
        setShowPerfil(true);
        setCargandoPerfil(true);
        setTabActiva('entrevistas');
        setConteoSeg(0);
        try {
            const [resPerfil, resSeg] = await Promise.all([
                getImputadoById(item.id),
                getSeguimientosPorImputado(item.id).catch(() => ({ data: { data: [] } })),
            ]);
            if (resPerfil.data.ok) setPerfil(resPerfil.data.data);
            setConteoSeg(resSeg.data?.data?.length ?? 0);
        } catch (err) {
            showToast('Error al cargar el perfil del imputado.', 'error');
        } finally {
            setCargandoPerfil(false);
        }
    };

    const handleFotoChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 3 * 1024 * 1024) {
            setFotoMsg({ tipo: 'error', texto: 'La imagen no debe superar 3 MB' });
            setTimeout(() => setFotoMsg(null), 4000);
            return;
        }
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const base64 = ev.target.result;
            setSubiendoFoto(true);
            setFotoMsg(null);
            try {
                const res = await actualizarFotoImputado(perfil.id, base64);
                if (res.data.ok) {
                    setPerfil(p => ({ ...p, foto: base64 }));
                    setDatos(prev => prev.map(d => d.id === perfil.id ? { ...d, foto: base64 } : d));
                    setFotoMsg({ tipo: 'ok', texto: 'Foto actualizada correctamente' });
                } else {
                    setFotoMsg({ tipo: 'error', texto: res.data.message || 'Error al guardar la foto' });
                }
            } catch {
                setFotoMsg({ tipo: 'error', texto: 'No se pudo conectar con el servidor' });
            } finally {
                setSubiendoFoto(false);
                setTimeout(() => setFotoMsg(null), 4000);
            }
        };
        reader.readAsDataURL(file);
    };

    const inicialesFoto = (p) => {
        if (!p) return '?';
        return ((p.nombre?.[0] ?? '') + (p.apPaterno?.[0] ?? '')).toUpperCase();
    };

    const handleGuardarFallecimiento = async () => {
        if (!formFall.fechaFallecimiento) {
            setFallMsg({ tipo: 'error', texto: 'La fecha de fallecimiento es requerida' });
            return;
        }
        setGuardandoFall(true);
        setFallMsg(null);
        try {
            const res = await registrarFallecimiento(perfil.id, {
                fechaFallecimiento:        formFall.fechaFallecimiento,
                quienAviso:                formFall.quienAviso || null,
                parentescoInformante:      formFall.parentesco || null,
                comoSeComprobo:            formFall.comoSeComprobo || null,
                noActaDefuncion:           formFall.noActaDefuncion || null,
                observacionesFallecimiento:formFall.observacionesFallecimiento || null,
            });
            if (res.data.ok) {
                setShowFallecimiento(false);
                setFormFall(FALLECIMIENTO_INIT);
                setShowPerfil(false);
                setPerfil(null);
                cargarDatos();
                showToast('Fallecimiento registrado correctamente');
            } else {
                setFallMsg({ tipo: 'error', texto: res.data.message || 'No se pudo registrar el fallecimiento' });
            }
        } catch {
            setFallMsg({ tipo: 'error', texto: 'No se pudo conectar con el servidor' });
        } finally {
            setGuardandoFall(false);
        }
    };

    const handleGuardarCierre = async () => {
        if (!formCierre.motivoCierreCarpeta.trim()) {
            setCierreMsg({ tipo: 'error', texto: 'El motivo del cierre es requerido' });
            return;
        }
        if (!formCierre.estatusCumplimientoCierre) {
            setCierreMsg({ tipo: 'error', texto: 'Selecciona el estatus de cumplimiento al cierre' });
            return;
        }
        setGuardandoCierre(true);
        setCierreMsg(null);
        try {
            const res = await registrarCierreCarpeta(perfil.id, {
                motivoCierreCarpeta:       formCierre.motivoCierreCarpeta,
                estatusCumplimientoCierre: formCierre.estatusCumplimientoCierre,
                fechaIngresoCierre:        formCierre.fechaIngresoCierre || null,
                notasCierre:               formCierre.notasCierre || null,
            });
            if (res.data.ok) {
                setShowCierre(false);
                setFormCierre(CIERRE_INIT);
                setShowPerfil(false);
                setPerfil(null);
                cargarDatos();
                showToast(res.data.message || 'Cierre registrado correctamente');
            } else {
                setCierreMsg({ tipo: 'error', texto: res.data.message || 'No se pudo registrar el cierre' });
            }
        } catch {
            setCierreMsg({ tipo: 'error', texto: 'No se pudo conectar con el servidor' });
        } finally {
            setGuardandoCierre(false);
        }
    };

    const handleExportarPDF = () => {
        if (!perfil) return;

        const fmtFecha = (f) => f ? new Date(f + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';
        const riesgoLabel = { FLEXIBLE: 'Bajo Riesgo', ESTRICTO: 'Medio Riesgo', DIFICIL_CUMPLIR: 'Alto Riesgo' };
        const estatusEntLabel = { PENDIENTE: 'Pendiente', EN_REVISION: 'En Revisión', COMPLETADO: 'Completado' };
        const estatusEvalLabel = { PENDIENTE: 'Pendiente', TRABAJANDO: 'En Proceso', FINALIZADO: 'Finalizado' };
        const estadoMedidaLabel = { ACTIVO: 'Activo', SUSPENDIDO: 'Suspendido', FINALIZADO: 'Finalizado', LEVANTADO: 'Levantado', REVOCADO: 'Revocado' };

        const filaEntrevistas = (perfil.entrevistas || []).map(e => `
            <tr><td>${e.folio}</td><td>${e.fechaRegistro ?? '—'}</td><td>${e.tipoSeguimiento ?? '—'}</td>
            <td>${e.registradoPor ?? '—'}</td><td>${estatusEntLabel[e.estado] ?? e.estado}</td></tr>`).join('') || '<tr><td colspan="5" style="text-align:center;color:#aaa">Sin entrevistas</td></tr>';

        const filaEvaluaciones = (perfil.evaluaciones || []).map(e => `
            <tr><td>${e.fechaSolicitud ?? '—'}</td><td>${e.evaluador ?? '—'}</td>
            <td>${riesgoLabel[e.resultado] ?? '—'}</td><td>${estatusEvalLabel[e.estatus] ?? e.estatus}</td></tr>`).join('') || '<tr><td colspan="4" style="text-align:center;color:#aaa">Sin evaluaciones</td></tr>';

        const filaMedidas = (perfil.medidas || []).map(m => `
            <tr><td>${m.tipo === 'MEDIDA_CAUTELAR' ? 'Medida Cautelar (MC)' : 'Suspensión Condicional (SCP)'}</td>
            <td>${estadoMedidaLabel[m.estado] ?? m.estado}</td><td>${m.fechaRecepcion ?? '—'}</td><td>${m.fechaTermino ?? '—'}</td></tr>`).join('') || '<tr><td colspan="4" style="text-align:center;color:#aaa">Sin medidas</td></tr>';

        const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
        <title>Expediente — ${perfil.nombreCompleto}</title>
        <style>
            * { margin:0; padding:0; box-sizing:border-box; }
            body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 32px; }
            .header { display:flex; align-items:center; gap:20px; border-bottom:3px solid #1a3a5c; padding-bottom:16px; margin-bottom:20px; }
            .avatar { width:72px; height:72px; border-radius:50%; background:#1a3a5c; color:#fff; font-size:24px; font-weight:800; display:flex; align-items:center; justify-content:center; flex-shrink:0; overflow:hidden; }
            .avatar img { width:100%; height:100%; object-fit:cover; }
            .header-info h1 { font-size:20px; color:#0f172a; }
            .header-info .sub { font-size:11px; color:#6b7280; margin-top:3px; }
            .badge { display:inline-block; padding:2px 10px; border-radius:10px; font-size:10px; font-weight:700; margin-right:6px; }
            .badge-causa { background:#e0e7ff; color:#3730a3; }
            .badge-riesgo { background:#fef3c7; color:#92400e; }
            .grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:20px; }
            .card { border:1px solid #e5e7eb; border-radius:8px; padding:10px 14px; }
            .card .lbl { font-size:9px; text-transform:uppercase; letter-spacing:.5px; color:#9ca3af; font-weight:700; }
            .card .val { font-size:12px; font-weight:600; color:#111; margin-top:2px; }
            .section-title { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:#1a3a5c; border-bottom:2px solid #e5e7eb; padding-bottom:5px; margin:18px 0 10px; }
            table { width:100%; border-collapse:collapse; }
            th { background:#f1f5f9; font-size:9px; text-transform:uppercase; letter-spacing:.4px; color:#64748b; padding:7px 10px; text-align:left; border-bottom:2px solid #e2e8f0; }
            td { padding:7px 10px; border-bottom:1px solid #f1f5f9; font-size:11px; color:#374151; }
            .footer { margin-top:24px; border-top:1px solid #e5e7eb; padding-top:10px; font-size:10px; color:#9ca3af; display:flex; justify-content:space-between; }
            @media print { body { padding:20px; } }
        </style></head><body>
        <div class="header">
            <div class="avatar">${perfil.foto ? `<img src="${perfil.foto}" />` : ((perfil.nombre?.[0] ?? '') + (perfil.apPaterno?.[0] ?? '')).toUpperCase()}</div>
            <div class="header-info">
                <h1>${perfil.nombreCompleto}</h1>
                <div class="sub" style="margin-top:6px">
                    <span class="badge badge-causa">${perfil.causaPenal}</span>
                    ${perfil.evaluaciones?.find(e=>e.resultado) ? `<span class="badge badge-riesgo">${riesgoLabel[perfil.evaluaciones.find(e=>e.resultado).resultado]}</span>` : ''}
                    ${perfil.fallecido ? '<span class="badge" style="background:#fee2e2;color:#b91c1c">Fallecido</span>' : ''}
                </div>
                <div class="sub">${perfil.delito ?? ''}</div>
            </div>
        </div>
        <div class="grid">
            <div class="card"><div class="lbl">Ubicación física</div><div class="val">${perfil.ubicacionFisica ?? '—'}</div></div>
            <div class="card"><div class="lbl">Teléfono / Celular</div><div class="val">${perfil.celular || '—'}</div></div>
            <div class="card"><div class="lbl">Fecha de registro</div><div class="val">${perfil.createdAt ? new Date(perfil.createdAt).toLocaleDateString('es-MX',{day:'2-digit',month:'long',year:'numeric'}) : '—'}</div></div>
            <div class="card"><div class="lbl">${perfil.fallecido ? 'Fecha de fallecimiento' : 'Última actividad'}</div><div class="val">${perfil.fallecido ? fmtFecha(perfil.fechaFallecimiento) : ([...(perfil.entrevistas||[]).map(e=>e.fechaRegistro), ...(perfil.evaluaciones||[]).map(e=>e.fechaSolicitud)].filter(Boolean).sort().reverse()[0] ? fmtFecha([...(perfil.entrevistas||[]).map(e=>e.fechaRegistro),...(perfil.evaluaciones||[]).map(e=>e.fechaSolicitud)].filter(Boolean).sort().reverse()[0]) : 'Sin actividad')}</div></div>
        </div>
        <div class="section-title">Entrevistas de Encuadre (${perfil.entrevistas?.length ?? 0})</div>
        <table><thead><tr><th>Folio</th><th>Fecha</th><th>Tipo</th><th>Registrado por</th><th>Estado</th></tr></thead><tbody>${filaEntrevistas}</tbody></table>
        <div class="section-title">Evaluaciones de Riesgo (${perfil.evaluaciones?.length ?? 0})</div>
        <table><thead><tr><th>Fecha solicitud</th><th>Evaluador</th><th>Resultado</th><th>Estatus</th></tr></thead><tbody>${filaEvaluaciones}</tbody></table>
        <div class="section-title">Medidas Cautelares / SCP (${perfil.medidas?.length ?? 0})</div>
        <table><thead><tr><th>Tipo</th><th>Estado</th><th>Fecha recepción</th><th>Fecha término</th></tr></thead><tbody>${filaMedidas}</tbody></table>
        <div class="footer">
            <span>UMECA — Dirección de la Unidad de Medidas Cautelares</span>
            <span>Generado: ${new Date().toLocaleDateString('es-MX',{day:'2-digit',month:'long',year:'numeric'})}</span>
        </div>
        </body></html>`;

        const win = window.open('', '_blank');
        if (!win) {
            showToast('El navegador bloqueó la ventana emergente. Permite ventanas emergentes para este sitio e inténtalo de nuevo.', 'error');
            return;
        }
        win.document.write(html);
        win.document.close();
    };

    const totalActivos  = datos.filter(i => !i.fallecido && !i.carpetaCerrada).length;
    const totalCerrados = datos.filter(i =>  i.carpetaCerrada || i.fallecido).length;

    return (
        <div className="historico-wrapper">

            {/* ── Tabs ── */}
            <div className="imp-tabs">
                <button
                    className={`imp-tab${tabVista === 'activos' ? ' imp-tab-activa' : ''}`}
                    onClick={() => { setTabVista('activos'); setPagina(1); setBusqueda(''); }}
                >
                    <i className="bi bi-person-check"></i> Activos
                    <span className="imp-tab-count">{totalActivos}</span>
                </button>
                <button
                    className={`imp-tab${tabVista === 'cerrados' ? ' imp-tab-activa imp-tab-cerrada' : ''}`}
                    onClick={() => { setTabVista('cerrados'); setPagina(1); setBusqueda(''); }}
                >
                    <i className="bi bi-folder-x"></i> Cierre de Carpeta
                    <span className="imp-tab-count">{totalCerrados}</span>
                </button>
            </div>

            <div className="historico-toolbar">
                <span className="historico-count">
                    Mostrando <b>{filtrados.length > 0 ? inicio + 1 : 0}</b> a{' '}
                    <b>{Math.min(inicio + ITEMS_POR_PAGINA, filtrados.length)}</b> de{' '}
                    <b>{filtrados.length}</b> registros
                </span>
                <div className="historico-paginacion">
                    <button onClick={() => setPagina(p => Math.max(p - 1, 1))} disabled={pagina === 1}>
                        <i className="bi bi-chevron-left"></i>
                    </button>
                    <span>{pagina} / {totalPaginas}</span>
                    <button onClick={() => setPagina(p => Math.min(p + 1, totalPaginas))} disabled={pagina === totalPaginas}>
                        <i className="bi bi-chevron-right"></i>
                    </button>
                </div>
            </div>

            <div className="imp-toolbar">
                <div className="historico-search imp-search-grow">
                    <i className="bi bi-search"></i>
                    <input
                        type="text"
                        placeholder="Buscar por nombre, causa penal o delito..."
                        value={busqueda}
                        onChange={e => { setBusqueda(e.target.value); setPagina(1); }}
                    />
                </div>
                <button className="btn-refresh" onClick={cargarDatos} title="Actualizar lista">
                    <i className="bi bi-arrow-clockwise"></i>
                </button>
                <div className="zona-pills">
                    {['TODAS','XOCHITEPEC','CUAUTLA','JOJUTLA'].map(z => (
                        <button key={z}
                            className={`zona-pill zona-pill-${z.toLowerCase()} ${zonaFiltro === z ? 'zona-pill-active' : ''}`}
                            onClick={() => { setZonaFiltro(z); setPagina(1); }}>
                            {z === 'TODAS' ? 'Todas' : z.charAt(0) + z.slice(1).toLowerCase()}
                        </button>
                    ))}
                </div>
            </div>

            {/* Leyenda de medidas */}
            <div className="imp-leyenda">
                <span className="imp-leyenda-titulo">Estado de medida:</span>
                <span className="imp-leyenda-item"><span className="medida-estado-dot medida-estado-activo"></span> Activo</span>
                <span className="imp-leyenda-item"><span className="medida-estado-dot medida-estado-suspendido"></span> Suspendido</span>
                <span className="imp-leyenda-item"><span className="medida-estado-dot medida-estado-levantado"></span> Levantado</span>
                <span className="imp-leyenda-item"><span className="medida-estado-dot medida-estado-finalizado"></span> Finalizado</span>
                <span className="imp-leyenda-item"><span className="medida-estado-dot medida-estado-revocado"></span> Revocado</span>
            </div>

            <div className="historico-tabla-wrapper">
                <table className="historico-tabla imp-tabla-fixed">
                    <colgroup>
                        <col style={{ width: '42px' }} />
                        <col style={{ width: '200px' }} />
                        <col style={{ width: '110px' }} />
                        <col style={{ width: '140px' }} />
                        <col style={{ width: '110px' }} />
                        {tabVista === 'cerrados' && <col style={{ width: '140px' }} />}
                        <col style={{ width: '95px' }} />
                        <col style={{ width: '100px' }} />
                        <col style={{ width: '90px' }} />
                        <col style={{ width: '90px' }} />
                    </colgroup>
                    <thead>
                        <tr>
                            <th>NO.</th>
                            <th>NOMBRE</th>
                            <th>CAUSA PENAL</th>
                            <th>DELITO</th>
                            <th>FECHA REGISTRO</th>
                            {tabVista === 'cerrados' && <th>TIPO / NO. CIERRE</th>}
                            <th style={{ textAlign: 'center' }}>ENTREVISTAS</th>
                            <th style={{ textAlign: 'center', paddingRight: 20 }}>EVALUACIONES</th>
                            <th style={{ textAlign: 'center', paddingLeft: 20 }}>MEDIDA</th>
                            <th style={{ textAlign: 'center', minWidth: 140, whiteSpace: 'nowrap' }}>CUMPLIMIENTO</th>
                            <th style={{ textAlign: 'center', width: 80 }}>EXPEDIENTE</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cargando ? (
                            <tr><td colSpan={tabVista === 'cerrados' ? 10 : 9} className="tabla-vacia">Cargando...</td></tr>
                        ) : paginados.length === 0 ? (
                            <tr><td colSpan={tabVista === 'cerrados' ? 10 : 9} className="tabla-vacia">No hay registros</td></tr>
                        ) : (
                            paginados.map((item, index) => (
                                <tr key={item.id}>
                                    <td>{inicio + index + 1}</td>
                                    <td className="td-nombre">
                                        <div style={{ display:'flex', alignItems:'center', gap:'7px' }}>
                                            {item.nombreCompleto}
                                            {item.zona
                                                ? <span className={`zona-tag zona-tag-${item.zona.toLowerCase()}`}>
                                                    {({'XOCHITEPEC':'Xochi','CUAUTLA':'Cuat','JOJUTLA':'Jojut'})[item.zona] ?? item.zona}
                                                  </span>
                                                : <span className="zona-tag zona-tag-sin">Sin entrevista</span>
                                            }
                                        </div>
                                    </td>
                                    <td>{item.causaPenal}</td>
                                    <td className="td-delito">{item.delito || '—'}</td>
                                    <td>{item.createdAt ? new Date(item.createdAt).toLocaleDateString('es-MX') : '—'}</td>
                                    {tabVista === 'cerrados' && (
                                        <td>
                                            {item.fallecido ? (
                                                <div style={{ lineHeight: 1.3 }}>
                                                    <span style={{ display:'inline-block', background:'#fee2e2', color:'#b91c1c', borderRadius:6, fontSize:11, fontWeight:700, padding:'2px 8px', marginBottom:2 }}>
                                                        <i className="bi bi-heartbreak-fill" /> Fallecido
                                                    </span>
                                                    <div style={{ fontSize: 11, color: '#6b7280' }}>{item.fechaFallecimiento ? new Date(item.fechaFallecimiento + 'T00:00:00').toLocaleDateString('es-MX') : ''}</div>
                                                </div>
                                            ) : (
                                                <div style={{ lineHeight: 1.3 }}>
                                                    <div style={{ fontWeight: 600, fontSize: 12 }}>{item.numeroCierreCarpeta || '—'}</div>
                                                    <div style={{ fontSize: 11, color: '#6b7280' }}>{item.fechaCierreCarpeta ? new Date(item.fechaCierreCarpeta + 'T00:00:00').toLocaleDateString('es-MX') : ''}</div>
                                                </div>
                                            )}
                                        </td>
                                    )}
                                    <td style={{ textAlign: 'center' }}>
                                        <span className={`count-badge ${(item.totalEntrevistas ?? 0) === 0 ? 'count-badge-cero' : ''}`}>
                                            {item.totalEntrevistas ?? 0}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'center', paddingRight: 20 }}>
                                        <span className={`count-badge ${(item.totalEvaluaciones ?? 0) === 0 ? 'count-badge-cero' : ''}`}>
                                            {item.totalEvaluaciones ?? 0}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'center', paddingLeft: 20 }}>
                                        {item.tipoMedidaActiva ? (
                                            <div style={{ display: 'inline-block', textAlign: 'center' }}>
                                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                                    <span className={`tipo-medida-badge ${item.tipoMedidaActiva === 'MEDIDA_CAUTELAR' ? 'tipo-mc' : 'tipo-scp'}`}>
                                                        {item.tipoMedidaActiva === 'MEDIDA_CAUTELAR' ? 'MC' : 'SCP'}
                                                    </span>
                                                    <span className={`medida-estado-dot medida-estado-${item.estadoMedidaActiva?.toLowerCase()}`}
                                                          title={item.estadoMedidaActiva}></span>
                                                </div>
                                                {item.vieneDeMC && (
                                                    <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>M.C. → S.C.P.</div>
                                                )}
                                                {item.vieneDeScp && (
                                                    <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>S.C.P. → M.C.</div>
                                                )}
                                            </div>
                                        ) : (
                                            <span style={{ color: '#d1d5db', fontSize: 13 }}>—</span>
                                        )}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        {(() => {
                                            if (item.carpetaCerrada) {
                                                if (!item.estatusCumplimientoCierre)
                                                    return <span className="cumpl-badge-tabla cumpl-sin-asignar">Sin estatus</span>;
                                                const label = ESTATUS_CIERRE_LABEL[item.estatusCumplimientoCierre] ?? item.estatusCumplimientoCierre;
                                                return <span className="cumpl-badge-cierre-wrap"
                                                    onMouseEnter={e => {
                                                        const t = e.currentTarget.querySelector('.cumpl-tooltip-cierre');
                                                        const r = e.currentTarget.getBoundingClientRect();
                                                        t.style.display = 'block';
                                                        t.style.top = (r.bottom + 6) + 'px';
                                                        t.style.left = (r.left + r.width / 2) + 'px';
                                                    }}
                                                    onMouseLeave={e => {
                                                        e.currentTarget.querySelector('.cumpl-tooltip-cierre').style.display = 'none';
                                                    }}>
                                                    <span className="cumpl-badge-tabla cumpl-cumplimiento cumpl-badge-cierre"
                                                        style={{ fontSize: 10, padding: '4px 8px', maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}>
                                                        {label}
                                                    </span>
                                                    <span className="cumpl-tooltip-cierre">{label}</span>
                                                </span>;
                                            }
                                            if (item.cumplimientoMedidaActiva === 'CUMPLIMIENTO')
                                                return <span className="cumpl-badge-tabla cumpl-cumplimiento"><i className="bi bi-check-circle-fill" /> Cumplimiento</span>;
                                            if (item.cumplimientoMedidaActiva === 'INCUMPLIMIENTO')
                                                return <span className="cumpl-badge-tabla cumpl-incumplimiento"><i className="bi bi-x-circle-fill" /> Incumplimiento</span>;
                                            if (item.tipoMedidaActiva)
                                                return <span className="cumpl-badge-tabla cumpl-sin-asignar">Sin estatus</span>;
                                            return <span style={{ color: '#d1d5db', fontSize: 13 }}>—</span>;
                                        })()}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <div className="imp-tooltip-wrap">
                                            <button className="btn-ver" onClick={() => handleVerPerfil(item)}>
                                                <i className="bi bi-folder2-open"></i>
                                            </button>
                                            <span className="imp-tooltip">Ver expediente</span>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* ── Drawer Expediente ── */}
            {showPerfil && (
                <div className="exp-overlay" onClick={() => { setShowPerfil(false); setPerfil(null); }}>
                    <div className="exp-drawer" onClick={e => e.stopPropagation()}>

                        {/* ── HERO HEADER ── */}
                        <div className="exp-hero">
                            <button className="exp-close" onClick={() => { setShowPerfil(false); setPerfil(null); }}>
                                <i className="bi bi-x-lg"></i>
                            </button>

                            {cargandoPerfil ? (
                                <div className="exp-hero-loading">
                                    <i className="bi bi-arrow-repeat imp-spin"></i> Cargando expediente…
                                </div>
                            ) : perfil ? (
                                <>
                                    <div className="exp-hero-content">
                                        {/* Foto */}
                                        <div className="exp-avatar-wrap">
                                            {perfil.foto ? (
                                                <img
                                                    src={perfil.foto}
                                                    alt="Foto imputado"
                                                    className="exp-avatar-img"
                                                    onClick={() => setZoomFoto(true)}
                                                    title="Click para ampliar"
                                                />
                                            ) : (
                                                <div className="exp-avatar-iniciales" onClick={() => setZoomFoto(true)} title="Click para ampliar">
                                                    {inicialesFoto(perfil)}
                                                </div>
                                            )}
                                            {puedeEditarFoto && (
                                                <button
                                                    className="exp-avatar-cam"
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

                                        {/* Info hero */}
                                        <div className="exp-hero-info">
                                            {(() => {
                                                const ultimaEval = perfil.evaluaciones?.find(e => e.resultado);
                                                const medidaActiva = perfil.medidas?.find(m => m.estado === 'ACTIVO');
                                                return (
                                                    <div className="exp-hero-badges">
                                                        <span className="exp-badge-causa">
                                                            <i className="bi bi-folder2"></i> {perfil.causaPenal}
                                                        </span>
                                                        {ultimaEval && (
                                                            <span className={`exp-badge-riesgo exp-riesgo-${ultimaEval.resultado?.toLowerCase()}`}>
                                                                <i className="bi bi-shield-fill"></i>
                                                                {resultadoConfig[ultimaEval.resultado]?.label ?? ultimaEval.resultado}
                                                            </span>
                                                        )}
                                                        {medidaActiva && (
                                                            <span className="exp-badge-medida">
                                                                <i className="bi bi-card-checklist"></i>
                                                                {medidaActiva.tipo === 'MEDIDA_CAUTELAR' ? 'MC Activa' : 'SCP Activa'}
                                                            </span>
                                                        )}
                                                        {medidaActiva && !perfil.carpetaCerrada && !perfil.fallecido && (
                                                            <div style={{ position: 'relative', display: 'inline-block' }}>
                                                                <button
                                                                    className={`exp-badge-cumplimiento ${medidaActiva.cumpliendoIncumpliendo === 'CUMPLIMIENTO' ? 'badge-cumplimiento' : medidaActiva.cumpliendoIncumpliendo === 'INCUMPLIMIENTO' ? 'badge-incumplimiento' : 'badge-sin-asignar'}`}
                                                                    onClick={() => setShowCumplimientoMenu(v => !v)}
                                                                    disabled={guardandoCumplimiento}
                                                                    title="Cambiar estatus de cumplimiento"
                                                                >
                                                                    <i className={`bi ${medidaActiva.cumpliendoIncumpliendo === 'CUMPLIMIENTO' ? 'bi-check-circle-fill' : medidaActiva.cumpliendoIncumpliendo === 'INCUMPLIMIENTO' ? 'bi-x-circle-fill' : 'bi-dash-circle'}`} />
                                                                    {medidaActiva.cumpliendoIncumpliendo === 'CUMPLIMIENTO' ? 'Cumplimiento' : medidaActiva.cumpliendoIncumpliendo === 'INCUMPLIMIENTO' ? 'Incumplimiento' : 'Sin estatus'}
                                                                    <i className="bi bi-chevron-down" style={{ fontSize: 10 }} />
                                                                </button>
                                                                {showCumplimientoMenu && (
                                                                    <div className="cumplimiento-menu">
                                                                        <button onClick={() => handleCambiarCumplimiento(medidaActiva.id, 'CUMPLIMIENTO')}>
                                                                            <i className="bi bi-check-circle-fill" style={{ color: '#16a34a' }} /> Cumplimiento
                                                                        </button>
                                                                        <button onClick={() => handleCambiarCumplimiento(medidaActiva.id, 'INCUMPLIMIENTO')}>
                                                                            <i className="bi bi-x-circle-fill" style={{ color: '#dc2626' }} /> Incumplimiento
                                                                        </button>
                                                                        <button onClick={() => handleCambiarCumplimiento(medidaActiva.id, 'SIN_ASIGNAR')}>
                                                                            <i className="bi bi-dash-circle" style={{ color: '#6b7280' }} /> Sin estatus
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                        {perfil.fallecido && (
                                                            <span className="exp-badge-fallecido">
                                                                <i className="bi bi-heartbreak-fill"></i> Fallecido
                                                            </span>
                                                        )}
                                                        {perfil.carpetaCerrada && (
                                                            <span className="exp-badge-cierre">
                                                                <i className="bi bi-folder-x"></i> Carpeta Cerrada
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                            <h2 className="exp-hero-nombre">{perfil.nombreCompleto}</h2>
                                            {perfil.delito && (
                                                <p className="exp-hero-delito">
                                                    <i className="bi bi-exclamation-octagon"></i> {perfil.delito}
                                                </p>
                                            )}
                                            {fotoMsg && (
                                                <div className={`imp-foto-msg imp-foto-msg--${fotoMsg.tipo}`} style={{ marginTop: 8 }}>
                                                    <i className={`bi ${fotoMsg.tipo === 'ok' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'}`} />
                                                    {fotoMsg.texto}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Stat chips */}
                                    <div className="exp-stats">
                                        <div className="exp-stat">
                                            <span className="exp-stat-num">{perfil.entrevistas?.length ?? 0}</span>
                                            <span className="exp-stat-lbl"><i className="bi bi-journal-text"></i> Entrevistas</span>
                                        </div>
                                        <div className="exp-stat-divider"></div>
                                        <div className="exp-stat">
                                            <span className="exp-stat-num">{perfil.evaluaciones?.length ?? 0}</span>
                                            <span className="exp-stat-lbl"><i className="bi bi-shield-check"></i> Evaluaciones</span>
                                        </div>
                                        <div className="exp-stat-divider"></div>
                                        <div className="exp-stat">
                                            <span className="exp-stat-num">{perfil.medidas?.length ?? 0}</span>
                                            <span className="exp-stat-lbl"><i className="bi bi-card-checklist"></i> Medidas</span>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="exp-hero-loading">No se pudo cargar el expediente</div>
                            )}
                        </div>

                        {/* ── BODY ── */}
                        {!cargandoPerfil && perfil && (
                            <div className="exp-body">

                                {/* Info cards */}
                                {(() => {
                                    // Última actividad: fecha más reciente entre entrevistas y evaluaciones
                                    const fechasEnt = perfil.entrevistas?.map(e => e.fechaRegistro).filter(Boolean) ?? [];
                                    const fechasEval = perfil.evaluaciones?.map(e => e.fechaSolicitud).filter(Boolean) ?? [];
                                    const todasFechas = [...fechasEnt, ...fechasEval].sort().reverse();
                                    const ultimaActividad = todasFechas[0] ?? null;
                                    return (
                                        <div className="exp-info-grid">
                                            <div className="exp-info-card">
                                                <i className="bi bi-geo-alt-fill exp-info-icon exp-icon-blue"></i>
                                                <div>
                                                    <span className="exp-info-label">Ubicación física</span>
                                                    <span className="exp-info-value">{perfil.ubicacionFisica ?? '—'}</span>
                                                </div>
                                            </div>
                                            <div className="exp-info-card">
                                                <i className="bi bi-telephone-fill exp-info-icon exp-icon-green"></i>
                                                <div>
                                                    <span className="exp-info-label">Teléfono / Celular</span>
                                                    <span className="exp-info-value">{perfil.celular || '—'}</span>
                                                </div>
                                            </div>
                                            <div className="exp-info-card">
                                                <i className="bi bi-calendar3 exp-info-icon exp-icon-purple"></i>
                                                <div>
                                                    <span className="exp-info-label">Fecha de registro</span>
                                                    <span className="exp-info-value">
                                                        {perfil.createdAt ? new Date(perfil.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}
                                                    </span>
                                                </div>
                                            </div>
                                            {perfil.fallecido ? (
                                                <div className="exp-info-card exp-info-card-fallecido">
                                                    <i className="bi bi-heartbreak-fill exp-info-icon exp-icon-dark"></i>
                                                    <div>
                                                        <span className="exp-info-label">Fecha de fallecimiento</span>
                                                        <span className="exp-info-value">
                                                            {perfil.fechaFallecimiento
                                                                ? new Date(perfil.fechaFallecimiento + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })
                                                                : '—'}
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="exp-info-card">
                                                    <i className="bi bi-clock-history exp-info-icon exp-icon-orange"></i>
                                                    <div>
                                                        <span className="exp-info-label">Última actividad</span>
                                                        <span className="exp-info-value">
                                                            {ultimaActividad
                                                                ? new Date(ultimaActividad + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })
                                                                : 'Sin actividad'}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}

                                {/* Banner cierre de carpeta */}
                                {perfil.carpetaCerrada && (
                                    <div className="exp-banner-cierre">
                                        <i className="bi bi-folder-x"></i>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                                                <strong style={{ fontSize: 13 }}>Carpeta Cerrada</strong>
                                                <span className="cierre-banner-num">{perfil.numeroCierreCarpeta}</span>
                                                {perfil.estatusCumplimientoCierre && (
                                                    <span className="cierre-banner-estatus">
                                                        {ESTATUS_CIERRE_LABEL[perfil.estatusCumplimientoCierre] ?? perfil.estatusCumplimientoCierre}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="cierre-banner-meta">
                                                {perfil.fechaCierreCarpeta && (
                                                    <span><i className="bi bi-calendar3"></i> Cierre: {new Date(perfil.fechaCierreCarpeta + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                                                )}
                                                {perfil.fechaIngresoCierre && (
                                                    <span><i className="bi bi-calendar-event"></i> Ingreso: {new Date(perfil.fechaIngresoCierre + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                                                )}
                                                {perfil.responsableCierreCarpeta && (
                                                    <span><i className="bi bi-person-fill"></i> {perfil.responsableCierreCarpeta}</span>
                                                )}
                                            </div>
                                            {perfil.motivoCierreCarpeta && (
                                                <div className="cierre-banner-motivo">"{perfil.motivoCierreCarpeta}"</div>
                                            )}
                                            {perfil.notasCierre && (
                                                <div className="cierre-banner-notas">
                                                    <i className="bi bi-sticky"></i> <strong>Notas:</strong> {perfil.notasCierre}
                                                </div>
                                            )}
                                        </div>
                                        {(user?.rol === 'ADMINISTRADOR' || user?.rol === 'SUPERADMIN') && (
                                            <div style={{ marginTop: 12 }}>
                                                {!confirmRevertir ? (
                                                    <button
                                                        onClick={() => setConfirmRevertir(true)}
                                                        style={{ background: 'none', border: '1.5px solid #dc2626', color: '#dc2626', borderRadius: 7, padding: '5px 14px', fontSize: 12, cursor: 'pointer', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'all 0.15s' }}
                                                        onMouseEnter={e => { e.currentTarget.style.background = '#dc2626'; e.currentTarget.style.color = '#fff'; }}
                                                        onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#dc2626'; }}
                                                    >
                                                        <i className="bi bi-arrow-counterclockwise" /> Revertir cierre
                                                    </button>
                                                ) : (
                                                    <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 8, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                        <span style={{ fontSize: 12, color: '#991b1b', fontWeight: 700 }}>
                                                            <i className="bi bi-exclamation-triangle-fill" style={{ marginRight: 5 }} />
                                                            ¿Revertir el cierre de carpeta? El imputado regresará a activos.
                                                        </span>
                                                        <div style={{ display: 'flex', gap: 8 }}>
                                                            <button onClick={handleRevertirCierre} disabled={reviertiendo}
                                                                style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 7, padding: '5px 14px', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>
                                                                {reviertiendo ? 'Revirtiendo...' : 'Sí, revertir'}
                                                            </button>
                                                            <button onClick={() => setConfirmRevertir(false)}
                                                                style={{ background: '#fff', color: '#555', border: '1px solid #d1d5db', borderRadius: 7, padding: '5px 14px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                                                                Cancelar
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Tabs */}
                                <div className="exp-tabs">
                                    {[
                                        { id: 'entrevistas',  icon: 'bi-journal-text',   label: 'Entrevistas',   count: perfil.entrevistas?.length ?? 0 },
                                        { id: 'evaluaciones', icon: 'bi-shield-check',  label: 'Evaluaciones',  count: perfil.evaluaciones?.length ?? 0 },
                                        { id: 'medidas',      icon: 'bi-card-checklist', label: 'Medidas / SCP', count: perfil.medidas?.length ?? 0 },
                                        { id: 'seguimientos', icon: 'bi-clock-history',  label: 'Seguimientos',  count: conteoSeg },
                                    ].map(t => (
                                        <button
                                            key={t.id}
                                            className={`exp-tab${tabActiva === t.id ? ' exp-tab-active' : ''}`}
                                            onClick={() => setTabActiva(t.id)}
                                        >
                                            <i className={`bi ${t.icon}`}></i>
                                            {t.label}
                                            <span className="exp-tab-count">{t.count}</span>
                                        </button>
                                    ))}
                                </div>

                                {/* Tab content */}
                                <div className="exp-tab-body">
                                    {tabActiva === 'entrevistas' && (
                                        !perfil.entrevistas?.length ? (
                                            <div className="exp-empty">
                                                <i className="bi bi-journal-x"></i>
                                                <span>Sin entrevistas registradas</span>
                                            </div>
                                        ) : (
                                            <table className="exp-tabla">
                                                <thead>
                                                    <tr>
                                                        <th>Folio</th>
                                                        <th>Fecha</th>
                                                        <th>Tipo</th>
                                                        <th>Registrado por</th>
                                                        <th>Estado</th>
                                                        <th style={{ width: 40, textAlign: 'center' }}>VER</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {perfil.entrevistas.map(e => (
                                                        <tr key={e.id} className={`exp-fila-${e.estado?.toLowerCase()}`}>
                                                            <td className="exp-td-mono">{e.folio}</td>
                                                            <td>{e.fechaRegistro}</td>
                                                            <td>{e.tipoSeguimiento ?? '—'}</td>
                                                            <td>{e.registradoPor ?? '—'}</td>
                                                            <td>
                                                                <span className={`estatus-badge ${estatusEntrevistaConfig[e.estado]?.clase}`}>
                                                                    {estatusEntrevistaConfig[e.estado]?.label ?? e.estado}
                                                                </span>
                                                            </td>
                                                            <td>
                                                                <button className="exp-btn-fila-ver" title="Ver formulario completo" onClick={() => {
                                                                    localStorage.setItem('verEntrevistaId', e.id);
                                                                    localStorage.setItem('volverExpedienteId', perfil.id);
                                                                    setShowPerfil(false); setPerfil(null);
                                                                    window.dispatchEvent(new CustomEvent('navigate', { detail: 'entrevista' }));
                                                                }}><i className="bi bi-eye"></i></button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )
                                    )}

                                    {tabActiva === 'evaluaciones' && (
                                        !perfil.evaluaciones?.length ? (
                                            <div className="exp-empty">
                                                <i className="bi bi-shield-slash"></i>
                                                <span>Sin evaluaciones de riesgo registradas</span>
                                            </div>
                                        ) : (
                                            <table className="exp-tabla">
                                                <thead>
                                                    <tr>
                                                        <th>Fecha solicitud</th>
                                                        <th>Evaluador</th>
                                                        <th>Resultado</th>
                                                        <th>Estatus</th>
                                                        <th style={{ width: 40, textAlign: 'center' }}>VER</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {perfil.evaluaciones.map(e => (
                                                        <tr key={e.id} className={`exp-fila-${e.estatus?.toLowerCase()}`}>
                                                            <td>{e.fechaSolicitud}</td>
                                                            <td>{e.evaluador ?? '—'}</td>
                                                            <td>
                                                                {e.resultado
                                                                    ? <span className={`riesgo-badge ${resultadoConfig[e.resultado]?.clase}`}>{resultadoConfig[e.resultado]?.label}</span>
                                                                    : <span className="exp-nd">—</span>}
                                                            </td>
                                                            <td>
                                                                <span className={`estatus-badge ${estatusEvalConfig[e.estatus]?.clase}`}>
                                                                    {estatusEvalConfig[e.estatus]?.label ?? e.estatus}
                                                                </span>
                                                            </td>
                                                            <td>
                                                                <button className="exp-btn-fila-ver" title="Ver formulario completo" onClick={() => {
                                                                    localStorage.setItem('verEvaluacionId', e.id);
                                                                    localStorage.setItem('volverExpedienteId', perfil.id);
                                                                    setShowPerfil(false); setPerfil(null);
                                                                    window.dispatchEvent(new CustomEvent('navigate', { detail: 'evaluacion' }));
                                                                }}><i className="bi bi-eye"></i></button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )
                                    )}

                                    {tabActiva === 'medidas' && (() => {
                                        const estadoMedidaConfig = {
                                            ACTIVO:     { label: 'Activo',     cls: 'badge-activo' },
                                            SUSPENDIDO: { label: 'Suspendido', cls: 'badge-suspendido' },
                                            FINALIZADO: { label: 'Finalizado', cls: 'badge-finalizado' },
                                            LEVANTADO:  { label: 'Levantado',  cls: 'badge-levantado' },
                                            REVOCADO:   { label: 'Revocado',   cls: 'badge-revocado' },
                                        };
                                        return !perfil.medidas?.length ? (
                                            <div className="exp-empty">
                                                <i className="bi bi-card-list"></i>
                                                <span>Sin medidas cautelares / SCP registradas</span>
                                            </div>
                                        ) : (
                                            <table className="exp-tabla">
                                                <thead>
                                                    <tr>
                                                        <th>Tipo</th>
                                                        <th>Estado</th>
                                                        <th>Fecha recepción</th>
                                                        <th>Fecha término</th>
                                                        <th style={{ width: 40, textAlign: 'center' }}>VER</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {perfil.medidas.map(m => {
                                                        const tipoLabel = m.tipo === 'MEDIDA_CAUTELAR' ? 'MC' : m.tipo === 'SUSPENSION_CONDICIONAL' ? 'SCP' : m.tipo;
                                                        const est = estadoMedidaConfig[m.estado] || { label: m.estado, cls: '' };
                                                        return (
                                                            <tr key={m.id} className={`exp-fila-${m.estado?.toLowerCase()}`}>
                                                                <td>
                                                                    <span className={`tipo-medida-badge ${m.tipo === 'MEDIDA_CAUTELAR' ? 'tipo-mc' : 'tipo-scp'}`}>
                                                                        {tipoLabel}
                                                                    </span>
                                                                </td>
                                                                <td><span className={`estatus-badge ${est.cls}`}>{est.label}</span></td>
                                                                <td>{m.fechaRecepcion ?? '—'}</td>
                                                                <td>{m.fechaTermino ?? '—'}</td>
                                                                <td>
                                                                    <button className="exp-btn-fila-ver" title="Ver detalle" onClick={() => {
                                                                        localStorage.setItem('verMedidaId', m.id);
                                                                        localStorage.setItem('volverExpedienteId', perfil.id);
                                                                        setShowPerfil(false); setPerfil(null);
                                                                        window.dispatchEvent(new CustomEvent('navigate', { detail: 'medidas' }));
                                                                    }}><i className="bi bi-eye"></i></button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        );
                                    })()}

                                    {tabActiva === 'seguimientos' && (
                                        <SeguimientosPanel
                                            imputadoId={perfil.id}
                                            seccion="EXPEDIENTE"
                                            referenciaId={null}
                                        />
                                    )}
                                </div>

                                {/* ── Footer de acciones ── */}
                                <div className="exp-footer">
                                    {!perfil.fallecido && !perfil.carpetaCerrada && (() => {
                                        const ultimaEntrevista = perfil.entrevistas?.[perfil.entrevistas.length - 1];
                                        const ultimaEvaluacion = perfil.evaluaciones?.[perfil.evaluaciones.length - 1];

                                        const accionesPorTab = {
                                            entrevistas: {
                                                nueva: onNavigarEntrevista && (user?.rol === 'ADMINISTRADOR' || user?.rol === 'SUPERADMIN' || user?.rol === 'SUPERVISION' || user?.rol === 'EVALUADOR_RIESGO' || user?.rol === 'CORRESPONDENCIA') && {
                                                    label: 'Nueva Entrevista', icon: 'bi-journal-plus',
                                                    action: () => { onNavigarEntrevista(perfil); setShowPerfil(false); setPerfil(null); }
                                                },
                                                ver: ultimaEntrevista && {
                                                    label: 'Ver formulario', icon: 'bi-eye',
                                                    action: () => {
                                                        localStorage.setItem('verEntrevistaId', ultimaEntrevista.id);
                                                        localStorage.setItem('volverExpedienteId', perfil.id);
                                                        setShowPerfil(false); setPerfil(null);
                                                        window.dispatchEvent(new CustomEvent('navigate', { detail: 'entrevista' }));
                                                    }
                                                }
                                            },
                                            evaluaciones: {
                                                nueva: (user?.rol === 'ADMINISTRADOR' || user?.rol === 'SUPERADMIN'  || user?.rol === 'EVALUADOR_RIESGO') && {
                                                    label: 'Nueva Evaluación', icon: 'bi-shield-plus',
                                                    action: () => {
                                                        localStorage.setItem('evaluacionPreset', JSON.stringify({ causaPenal: perfil.causaPenal, nombre: perfil.nombreCompleto }));
                                                        setShowPerfil(false); setPerfil(null);
                                                        window.dispatchEvent(new CustomEvent('navigate', { detail: 'evaluacion' }));
                                                    }
                                                },
                                                ver: ultimaEvaluacion && {
                                                    label: 'Ver formulario', icon: 'bi-eye',
                                                    action: () => {
                                                        localStorage.setItem('verEvaluacionId', ultimaEvaluacion.id);
                                                        setShowPerfil(false); setPerfil(null);
                                                        window.dispatchEvent(new CustomEvent('navigate', { detail: 'evaluacion' }));
                                                    }
                                                }
                                            },
                                            medidas: {
                                                nueva: (user?.rol === 'ADMINISTRADOR' || user?.rol === 'SUPERADMIN'  || user?.rol === 'SUPERVISION') && {
                                                    label: 'Nueva Medida / SCP', icon: 'bi-card-checklist',
                                                    action: () => {
                                                        localStorage.setItem('medidaPreset', JSON.stringify({ causaPenal: perfil.causaPenal, nombre: perfil.nombreCompleto }));
                                                        setShowPerfil(false); setPerfil(null);
                                                        window.dispatchEvent(new CustomEvent('navigate', { detail: 'medidas' }));
                                                    }
                                                },
                                                ver: perfil.medidas?.[0] && {
                                                    label: 'Ver formulario', icon: 'bi-eye',
                                                    action: () => {
                                                        localStorage.setItem('verMedidaId', perfil.medidas[0].id);
                                                        setShowPerfil(false); setPerfil(null);
                                                        window.dispatchEvent(new CustomEvent('navigate', { detail: 'medidas' }));
                                                    }
                                                }
                                            },
                                        };
                                        const { nueva } = accionesPorTab[tabActiva] || {};
                                        return nueva ? (
                                            <button className="exp-action-btn exp-btn-entrevista" onClick={nueva.action}>
                                                <i className={`bi ${nueva.icon}`}></i> {nueva.label}
                                            </button>
                                        ) : null;
                                    })()}
                                    {puedeCierreCarpeta && !perfil.fallecido && !perfil.carpetaCerrada && (
                                        <button className="exp-action-btn exp-btn-cierre" onClick={() => {
                                            setShowCierre(true);
                                            setFormCierre(CIERRE_INIT);
                                            setCierreMsg(null);
                                        }}>
                                            <i className="bi bi-folder-x"></i> Cierre de Carpeta
                                        </button>
                                    )}
                                    {puedeFallecimiento && !perfil.fallecido && !perfil.carpetaCerrada && (
                                        <button className="exp-action-btn exp-btn-fallecimiento" onClick={() => {
                                            setShowFallecimiento(true);
                                            setFormFall(FALLECIMIENTO_INIT);
                                            setFallMsg(null);
                                        }}>
                                            <i className="bi bi-heartbreak"></i> Registrar Fallecimiento
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Modal Cierre de Carpeta ── */}
            {showCierre && perfil && (
                <div className="fall-overlay">
                    <div className="fall-modal">
                        <div className="fall-header fall-header-cierre">
                            <div className="fall-header-icon fall-header-icon-cierre"><i className="bi bi-folder-x" style={{ color: '#fff' }}></i></div>
                            <div>
                                <h3 className="fall-header-title">{cierreConfirmando ? 'Confirmar Cierre de Carpeta' : 'Cierre de Carpeta'}</h3>
                                <p className="fall-header-sub">{perfil.nombreCompleto}</p>
                            </div>
                            <button className="fall-close" onClick={() => { setShowCierre(false); setCierreConfirmando(false); }}>
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        {!cierreConfirmando ? (
                            <>
                                <div className="fall-aviso fall-aviso-cierre">
                                    <i className="bi bi-info-circle-fill"></i>
                                    {formCierre.estatusCumplimientoCierre && ESTATUS_SOLO_MEDIDA.has(formCierre.estatusCumplimientoCierre)
                                        ? 'Este estatus finalizará las medidas activas del imputado. El expediente permanecerá abierto para seguir operando.'
                                        : 'Esta acción cierra la carpeta del imputado y finaliza automáticamente todas sus medidas activas. El número de cierre se genera automáticamente.'
                                    }
                                </div>

                                <div className="fall-body">
                                    <div className="fall-field fall-field-full">
                                        <label>Motivo del cierre <span className="fall-req">*</span></label>
                                        <textarea rows={3} placeholder="Describe el motivo del cierre de carpeta..."
                                            value={formCierre.motivoCierreCarpeta}
                                            onChange={e => setFormCierre(p => ({ ...p, motivoCierreCarpeta: e.target.value }))} />
                                    </div>
                                    <div className="fall-field fall-field-full" style={{ maxWidth: 260 }}>
                                        <label>Fecha de cierre</label>
                                        <input type="date"
                                            value={formCierre.fechaIngresoCierre}
                                            onChange={e => setFormCierre(p => ({ ...p, fechaIngresoCierre: e.target.value }))} />
                                    </div>
                                    <div className="fall-field fall-field-full">
                                        <label>Estatus al cierre <span className="fall-req">*</span></label>
                                        {(() => {
                                            // Determinar tipo por la medida más reciente
                                            const medidasOrdenadas = [...(perfil?.medidas || [])].sort((a, b) =>
                                                new Date(b.fechaInicio || b.createdAt || 0) - new Date(a.fechaInicio || a.createdAt || 0)
                                            );
                                            const tipoReciente = medidasOrdenadas[0]?.tipo;
                                            const esSCP = tipoReciente === 'SUSPENSION_CONDICIONAL';
                                            return (
                                                <select
                                                    className="cierre-estatus-select"
                                                    value={formCierre.estatusCumplimientoCierre}
                                                    onChange={e => setFormCierre(p => ({ ...p, estatusCumplimientoCierre: e.target.value }))}
                                                >
                                                    <option value="">— Seleccionar estatus —</option>
                                                    {esSCP ? (<>
                                                        <option value="CUMPLIMIENTO_DE_CONDICIONES">Cumplimiento de las condiciones</option>
                                                        <option value="CUMPLIMIENTO_DE_REPARACION_DANO">Cumplimiento de la reparación del daño</option>
                                                        <option value="INCUMPLIMIENTO">Incumplimiento</option>
                                                        <option value="NUEVA_CONDENA">Nueva condena</option>
                                                        <option value="FALLECIMIENTO_IMPUTADO">Fallecimiento del imputado</option>
                                                    </>) : (<>
                                                        <option value="AUTO_NO_VINCULACION">Auto de no vinculación a proceso</option>
                                                        <option value="SENTENCIA_ABSOLUTORIA">Sentencia absolutoria</option>
                                                        <option value="SENTENCIA_CONDENATORIA">Sentencia condenatoria</option>
                                                        <option value="ARRAIGO_DOMICILIARIO">Arraigo domiciliario</option>
                                                        <option value="CAMBIO_MC_A_SCP">Cambio de MC a SCP</option>
                                                    </>)}
                                                </select>
                                            );
                                        })()}
                                    </div>
                                    <div className="fall-field fall-field-full">
                                        <label>Notas adicionales</label>
                                        <textarea rows={2} placeholder="Observaciones o notas del cierre (opcional)..."
                                            value={formCierre.notasCierre}
                                            onChange={e => setFormCierre(p => ({ ...p, notasCierre: e.target.value }))} />
                                    </div>
                                </div>

                                <div className="fall-footer">
                                    <button className="fall-btn-cancelar" onClick={() => { setShowCierre(false); setCierreConfirmando(false); }}>
                                        Cancelar
                                    </button>
                                    <button className="fall-btn-cierre" onClick={() => {
                                        if (!formCierre.motivoCierreCarpeta.trim()) {
                                            setCierreMsg({ tipo: 'error', texto: 'El motivo del cierre es requerido' });
                                            return;
                                        }
                                        if (!formCierre.estatusCumplimientoCierre) {
                                            setCierreMsg({ tipo: 'error', texto: 'Selecciona el estatus de cumplimiento al cierre' });
                                            return;
                                        }
                                        setCierreMsg(null);
                                        setCierreConfirmando(true);
                                    }}>
                                        <i className="bi bi-arrow-right"></i> Continuar
                                    </button>
                                </div>

                                {cierreMsg && (
                                    <div className={`fall-msg fall-msg--${cierreMsg.tipo}`} style={{ margin: '0 24px 16px' }}>
                                        <i className={`bi ${cierreMsg.tipo === 'ok' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'}`} />
                                        {cierreMsg.texto}
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <div className="fall-body-resumen">
                                    <div className="cierre-resumen">
                                        <div className="cierre-resumen-titulo">
                                            <i className="bi bi-exclamation-triangle-fill"></i>
                                            {ESTATUS_SOLO_MEDIDA.has(formCierre.estatusCumplimientoCierre)
                                                ? 'Se finalizarán las medidas activas. El expediente seguirá abierto.'
                                                : 'Esta acción no se puede deshacer. La carpeta quedará cerrada permanentemente.'
                                            }
                                        </div>
                                        <div className="cierre-resumen-fila">
                                            <span className="cierre-resumen-label">Imputado</span>
                                            <span className="cierre-resumen-valor">{perfil.nombreCompleto}</span>
                                        </div>
                                        <div className="cierre-resumen-fila">
                                            <span className="cierre-resumen-label">Causa penal</span>
                                            <span className="cierre-resumen-valor">{perfil.causaPenal}</span>
                                        </div>
                                        <div className="cierre-resumen-fila">
                                            <span className="cierre-resumen-label">Estatus al cierre</span>
                                            <span className="cierre-resumen-valor">
                                                {ESTATUS_CIERRE_LABEL[formCierre.estatusCumplimientoCierre] || formCierre.estatusCumplimientoCierre}
                                            </span>
                                        </div>
                                        <div className="cierre-resumen-fila">
                                            <span className="cierre-resumen-label">Motivo</span>
                                            <span className="cierre-resumen-valor cierre-resumen-motivo">{formCierre.motivoCierreCarpeta}</span>
                                        </div>
                                        {formCierre.fechaIngresoCierre && (
                                            <div className="cierre-resumen-fila">
                                                <span className="cierre-resumen-label">Fecha de ingreso</span>
                                                <span className="cierre-resumen-valor">{new Date(formCierre.fechaIngresoCierre + 'T00:00:00').toLocaleDateString('es-MX')}</span>
                                            </div>
                                        )}
                                        {formCierre.notasCierre && (
                                            <div className="cierre-resumen-fila">
                                                <span className="cierre-resumen-label">Notas</span>
                                                <span className="cierre-resumen-valor cierre-resumen-motivo">{formCierre.notasCierre}</span>
                                            </div>
                                        )}
                                        <div className="cierre-resumen-fila">
                                            <span className="cierre-resumen-label">Medidas</span>
                                            <span className="cierre-resumen-valor">
                                                {(() => {
                                                    const activas = perfil.medidas?.filter(m => !['FINALIZADO','LEVANTADO','REVOCADO'].includes(m.estado)) ?? [];
                                                    const soloMedida = ESTATUS_SOLO_MEDIDA.has(formCierre.estatusCumplimientoCierre);
                                                    if (activas.length > 0)
                                                        return soloMedida
                                                            ? `${activas.length} medida(s) serán finalizadas. El expediente permanece abierto.`
                                                            : `${activas.length} medida(s) en curso serán finalizadas y la carpeta quedará cerrada.`;
                                                    return `${perfil.medidas?.length ?? 0} medida(s) registrada(s) — ninguna activa al momento del cierre`;
                                                })()}
                                            </span>
                                        </div>
                                    </div>

                                    {cierreMsg && (
                                        <div className={`fall-msg fall-msg--${cierreMsg.tipo}`} style={{ marginTop: 12 }}>
                                            <i className={`bi ${cierreMsg.tipo === 'ok' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'}`} />
                                            {cierreMsg.texto}
                                        </div>
                                    )}
                                </div>

                                <div className="fall-footer">
                                    <button className="fall-btn-cancelar" onClick={() => setCierreConfirmando(false)}>
                                        <i className="bi bi-arrow-left"></i> Regresar
                                    </button>
                                    <button className="fall-btn-cierre" onClick={handleGuardarCierre} disabled={guardandoCierre}>
                                        {guardandoCierre
                                            ? <><i className="bi bi-arrow-repeat imp-spin"></i> Guardando…</>
                                            : <><i className="bi bi-folder-x"></i> Confirmar Cierre</>}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ── Modal Registrar Fallecimiento ── */}
            {showFallecimiento && perfil && (
                <div className="fall-overlay">
                    <div className="fall-modal">
                        {/* Header */}
                        <div className="fall-header">
                            <div className="fall-header-icon"><i className="bi bi-heartbreak-fill"></i></div>
                            <div>
                                <h3 className="fall-header-title">Registrar Fallecimiento</h3>
                                <p className="fall-header-sub">{perfil.nombreCompleto}</p>
                            </div>
                            <button className="fall-close" onClick={() => setShowFallecimiento(false)}>
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        {/* Advertencia */}
                        <div className="fall-aviso">
                            <i className="bi bi-exclamation-triangle-fill"></i>
                            Esta acción marca al imputado como fallecido y cancela todas las supervisiones activas. No se puede deshacer.
                        </div>

                        {/* Formulario */}
                        <div className="fall-body">
                            <div className="fall-field fall-field-full">
                                <label>Fecha de fallecimiento <span className="fall-req">*</span></label>
                                <input type="date" value={formFall.fechaFallecimiento}
                                    onChange={e => setFormFall(p => ({ ...p, fechaFallecimiento: e.target.value }))} />
                            </div>
                            <div className="fall-field">
                                <label>¿Quién avisó?</label>
                                <input type="text" placeholder="Nombre del informante"
                                    value={formFall.quienAviso}
                                    onChange={e => setFormFall(p => ({ ...p, quienAviso: e.target.value }))} />
                            </div>
                            <div className="fall-field">
                                <label>Parentesco</label>
                                <input type="text" placeholder="Relación con el imputado"
                                    value={formFall.parentesco}
                                    onChange={e => setFormFall(p => ({ ...p, parentesco: e.target.value }))} />
                            </div>
                            <div className="fall-field">
                                <label>¿Cómo se comprobó?</label>
                                <input type="text" placeholder="Acta, certificado médico..."
                                    value={formFall.comoSeComprobo}
                                    onChange={e => setFormFall(p => ({ ...p, comoSeComprobo: e.target.value }))} />
                            </div>
                            <div className="fall-field">
                                <label>No. Acta de defunción</label>
                                <input type="text" placeholder="Número de acta"
                                    value={formFall.noActaDefuncion}
                                    onChange={e => setFormFall(p => ({ ...p, noActaDefuncion: e.target.value }))} />
                            </div>
                            <div className="fall-field fall-field-full">
                                <label>Observaciones</label>
                                <textarea rows={3} placeholder="Notas adicionales..."
                                    value={formFall.observacionesFallecimiento}
                                    onChange={e => setFormFall(p => ({ ...p, observacionesFallecimiento: e.target.value }))} />
                            </div>

                            {fallMsg && (
                                <div className={`fall-msg fall-msg--${fallMsg.tipo}`}>
                                    <i className={`bi ${fallMsg.tipo === 'ok' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'}`} />
                                    {fallMsg.texto}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="fall-footer">
                            <button className="fall-btn-cancelar" onClick={() => setShowFallecimiento(false)}>
                                Cancelar
                            </button>
                            <button className="fall-btn-confirmar" onClick={handleGuardarFallecimiento} disabled={guardandoFall}>
                                {guardandoFall
                                    ? <><i className="bi bi-arrow-repeat imp-spin"></i> Guardando…</>
                                    : <><i className="bi bi-heartbreak-fill"></i> Confirmar Fallecimiento</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Zoom foto */}
            {zoomFoto && perfil && (
                <div className="imp-zoom-overlay" onClick={() => setZoomFoto(false)}>
                    {perfil.foto
                        ? <img src={perfil.foto} alt="Foto ampliada" className="imp-zoom-img" />
                        : <div className="imp-zoom-iniciales">{inicialesFoto(perfil)}</div>
                    }
                    <button className="imp-zoom-close" onClick={() => setZoomFoto(false)}>
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>
            )}
        </div>
    );
};

export default Imputados;
