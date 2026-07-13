import { useState, useEffect, useRef } from 'react';
import { getImputados, getImputadoById, actualizarFotoImputado, registrarFallecimiento } from '../api/imputadosApi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import './Historico.css';
import './Imputados.css';

const ITEMS_POR_PAGINA = 10;

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

const Imputados = ({ onNavigarEntrevista }) => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const puedeEditarFoto    = user?.rol === 'ADMINISTRADOR' || user?.rol === 'SUPERVISION';
    const puedeFallecimiento = user?.rol === 'ADMINISTRADOR' || user?.rol === 'SUPERVISION';

    const [datos, setDatos] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [tabVista, setTabVista] = useState('activos'); // 'activos' | 'fallecidos'
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
    const [showFallecimiento, setShowFallecimiento] = useState(false);
    const [formFall, setFormFall] = useState(FALLECIMIENTO_INIT);
    const [guardandoFall, setGuardandoFall] = useState(false);
    const [fallMsg, setFallMsg] = useState(null);

    useEffect(() => { cargarDatos(); }, []);

    // Auto-reabrir drawer si volvemos desde un detalle externo
    useEffect(() => {
        const id = localStorage.getItem('abrirExpedienteId');
        if (id) {
            localStorage.removeItem('abrirExpedienteId');
            cargarDatos().then ? null : null; // asegurar datos cargados
            getImputadoById(Number(id)).then(res => {
                if (res.data.ok) { setPerfil(res.data.data); setShowPerfil(true); }
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
            // silenced
        } finally {
            setCargando(false);
        }
    };

    const filtrados = datos.filter(i => {
        if (tabVista === 'activos' && i.fallecido) return false;
        if (tabVista === 'fallecidos' && !i.fallecido) return false;
        return (
            i.nombreCompleto?.toLowerCase().includes(busqueda.toLowerCase()) ||
            i.causaPenal?.toLowerCase().includes(busqueda.toLowerCase()) ||
            i.delito?.toLowerCase().includes(busqueda.toLowerCase())
        );
    });

    const totalPaginas = Math.max(1, Math.ceil(filtrados.length / ITEMS_POR_PAGINA));
    const inicio = (pagina - 1) * ITEMS_POR_PAGINA;
    const paginados = filtrados.slice(inicio, inicio + ITEMS_POR_PAGINA);

    const handleVerPerfil = async (item) => {
        setShowPerfil(true);
        setCargandoPerfil(true);
        setTabActiva('entrevistas');
        try {
            const res = await getImputadoById(item.id);
            if (res.data.ok) setPerfil(res.data.data);
        } catch (err) {
            // silenced
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
                parentesco:                formFall.parentesco || null,
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

    const totalActivos    = datos.filter(i => !i.fallecido).length;
    const totalFallecidos = datos.filter(i =>  i.fallecido).length;

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
                    className={`imp-tab${tabVista === 'fallecidos' ? ' imp-tab-activa imp-tab-fallecida' : ''}`}
                    onClick={() => { setTabVista('fallecidos'); setPagina(1); setBusqueda(''); }}
                >
                    <i className="bi bi-heartbreak"></i> Fallecidos
                    <span className="imp-tab-count">{totalFallecidos}</span>
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

            <div className="historico-actions">
                <div className="historico-search">
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
                <table className="historico-tabla">
                    <thead>
                        <tr>
                            <th>NO.</th>
                            <th>NOMBRE</th>
                            <th>CAUSA PENAL</th>
                            <th>DELITO</th>
                            <th>FECHA REGISTRO</th>
                            {tabVista === 'fallecidos' && <th>FECHA FALLECIMIENTO</th>}
                            <th>ENTREVISTAS</th>
                            <th>EVALUACIONES</th>
                            <th style={{ textAlign: 'center' }}>MEDIDA</th>
                            <th>EXPEDIENTE</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cargando ? (
                            <tr><td colSpan={tabVista === 'fallecidos' ? 9 : 8} className="tabla-vacia">Cargando...</td></tr>
                        ) : paginados.length === 0 ? (
                            <tr><td colSpan={tabVista === 'fallecidos' ? 9 : 8} className="tabla-vacia">No hay registros</td></tr>
                        ) : (
                            paginados.map((item, index) => (
                                <tr key={item.id}>
                                    <td>{inicio + index + 1}</td>
                                    <td className="td-nombre">{item.nombreCompleto}</td>
                                    <td>{item.causaPenal}</td>
                                    <td className="td-delito">{item.delito || '—'}</td>
                                    <td>{item.createdAt ? new Date(item.createdAt).toLocaleDateString('es-MX') : '—'}</td>
                                    {tabVista === 'fallecidos' && (
                                        <td>{item.fechaFallecimiento ? new Date(item.fechaFallecimiento + 'T00:00:00').toLocaleDateString('es-MX') : '—'}</td>
                                    )}
                                    <td>
                                        <span className={`count-badge ${(item.totalEntrevistas ?? 0) === 0 ? 'count-badge-cero' : ''}`}>
                                            {item.totalEntrevistas ?? 0}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`count-badge ${(item.totalEvaluaciones ?? 0) === 0 ? 'count-badge-cero' : ''}`}>
                                            {item.totalEvaluaciones ?? 0}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        {item.tipoMedidaActiva ? (
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                                <span className={`tipo-medida-badge ${item.tipoMedidaActiva === 'MEDIDA_CAUTELAR' ? 'tipo-mc' : 'tipo-scp'}`}>
                                                    {item.tipoMedidaActiva === 'MEDIDA_CAUTELAR' ? 'MC' : 'SCP'}
                                                </span>
                                                <span className={`medida-estado-dot medida-estado-${item.estadoMedidaActiva?.toLowerCase()}`}
                                                      title={item.estadoMedidaActiva}></span>
                                            </div>
                                        ) : (
                                            <span style={{ color: '#d1d5db', fontSize: 13 }}>—</span>
                                        )}
                                    </td>
                                    <td>
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
                                                        {perfil.fallecido && (
                                                            <span className="exp-badge-fallecido">
                                                                <i className="bi bi-heartbreak-fill"></i> Fallecido
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

                                {/* Tabs */}
                                <div className="exp-tabs">
                                    {[
                                        { id: 'entrevistas', icon: 'bi-journal-text',  label: 'Entrevistas',  count: perfil.entrevistas?.length ?? 0 },
                                        { id: 'evaluaciones', icon: 'bi-shield-check', label: 'Evaluaciones', count: perfil.evaluaciones?.length ?? 0 },
                                        { id: 'medidas',     icon: 'bi-card-checklist',label: 'Medidas / SCP',count: perfil.medidas?.length ?? 0 },
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
                                </div>

                                {/* ── Footer de acciones ── */}
                                <div className="exp-footer">
                                    {!perfil.fallecido && (() => {
                                        const ultimaEntrevista = perfil.entrevistas?.[perfil.entrevistas.length - 1];
                                        const ultimaEvaluacion = perfil.evaluaciones?.[perfil.evaluaciones.length - 1];

                                        const accionesPorTab = {
                                            entrevistas: {
                                                nueva: onNavigarEntrevista && {
                                                    label: 'Nueva Entrevista', icon: 'bi-journal-plus',
                                                    action: () => { onNavigarEntrevista(perfil); setShowPerfil(false); setPerfil(null); }
                                                },
                                                ver: ultimaEntrevista && {
                                                    label: 'Ver formulario', icon: 'bi-eye',
                                                    action: () => {
                                                        localStorage.setItem('verEntrevistaId', ultimaEntrevista.id);
                                                        setShowPerfil(false); setPerfil(null);
                                                        window.dispatchEvent(new CustomEvent('navigate', { detail: 'entrevista' }));
                                                    }
                                                }
                                            },
                                            evaluaciones: {
                                                nueva: (user?.rol === 'ADMINISTRADOR' || user?.rol === 'EVALUADOR_RIESGO') && {
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
                                                nueva: (user?.rol === 'ADMINISTRADOR' || user?.rol === 'SUPERVISION') && {
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
                                    {puedeFallecimiento && !perfil.fallecido && (
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
