import { useState, useEffect } from 'react';
import { getEntrevistas, getEntrevistaById } from '../api/entrevistasApi';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import './EntrevistaEncuadre.css';
import './Imputados.css';
import FormularioEntrevista from './FormularioEntrevista';
import DetalleEntrevista from './DetalleEntrevista';
import { ESTATUS_CIERRE_LABEL } from '../constants/estatusCierre';

const EntrevistaEncuadre = () => {
    const { showToast } = useToast();
    const { user } = useAuth();
    const puedeCrear = ['ADMINISTRADOR', 'SUPERADMIN', 'SUPERVISION', 'EVALUADOR_RIESGO', 'CORRESPONDENCIA'].includes(user?.rol);
    const [mostrarFormulario, setMostrarFormulario] = useState(false);
    const [entrevistaSeleccionada, setEntrevistaSeleccionada] = useState(null);
    const [entrevistas, setEntrevistas] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('');
    const [zonaFiltro, setZonaFiltro] = useState('TODAS');
    const [pagina, setPagina] = useState(1);
    const ITEMS_POR_PAGINA = 50;

    useEffect(() => { cargar(); }, []);

    // Auto-abrir detalle si viene desde el expediente
    useEffect(() => {
        const preset = localStorage.getItem('verEntrevistaId');
        if (preset) {
            localStorage.removeItem('verEntrevistaId');
            handleVer(Number(preset));
        }
    }, []);

    const cargar = async () => {
        try {
            const res = await getEntrevistas();
            setEntrevistas(res.data.data || []);
        } catch (e) {
            showToast('Error al cargar entrevistas. Verifica la conexión.', 'error');
        }
    };

    const handleVer = async (id) => {
        try {
            const res = await getEntrevistaById(id);
            setEntrevistaSeleccionada(res.data.data);
        } catch (e) {
            // silenced
        }
    };

    const filtradas = [...entrevistas]
        .sort((a, b) => new Date(b.createdAt || b.fechaRegistro) - new Date(a.createdAt || a.fechaRegistro))
        .filter(e => {
        const texto = `${e.folio} ${e.nombre} ${e.apPaterno} ${e.causaPenal}`.toLowerCase();
        const coincideBusqueda = texto.includes(busqueda.toLowerCase());
        const coincideEstado = filtroEstado ? e.estado === filtroEstado : true;
        const coincideZona = zonaFiltro === 'TODAS' || e.zona === zonaFiltro;
        return coincideBusqueda && coincideEstado && coincideZona;
    });

    const totalPaginas = Math.max(1, Math.ceil(filtradas.length / ITEMS_POR_PAGINA));
    const inicio = (pagina - 1) * ITEMS_POR_PAGINA;
    const paginadas = filtradas.slice(inicio, inicio + ITEMS_POR_PAGINA);

    const getBadgeClass = (estado) => {
        switch (estado) {
            case 'COMPLETADO': return 'ee-badge-completado';
            case 'EN_REVISION': return 'ee-badge-revision';
            case 'PENDIENTE': return 'ee-badge-pendiente';
            default: return '';
        }
    };

    const getEstadoLabel = (estado) => {
        switch (estado) {
            case 'COMPLETADO': return 'Completado';
            case 'EN_REVISION': return 'En Revisión';
            case 'PENDIENTE': return 'Pendiente';
            default: return estado;
        }
    };

    if (mostrarFormulario) {
        return <FormularioEntrevista
            onCancelar={() => setMostrarFormulario(false)}
            onGuardado={() => { setMostrarFormulario(false); cargar(); showToast('Entrevista guardada correctamente'); }}
        />;
    }

    if (entrevistaSeleccionada) {
        return <DetalleEntrevista
            entrevista={entrevistaSeleccionada}
            onVolver={() => { setEntrevistaSeleccionada(null); cargar(); }}
        />;
    }

    return (
        <div className="ee-container">
            {/* Barra superior: contador + badges + paginación */}
            <div className="ee-topbar">
                <div className="ee-topbar-left">
                    <span className="ee-topbar-count">
                        Mostrando <b>{filtradas.length > 0 ? inicio + 1 : 0}</b> a <b>{Math.min(inicio + ITEMS_POR_PAGINA, filtradas.length)}</b> de <b>{filtradas.length}</b> registros
                    </span>
                    <div className="ee-stats-badges">
                        <span className="ee-badge-completado">Completadas: {entrevistas.filter(e => e.estado === 'COMPLETADO' && !e.imputado?.fallecido).length}</span>
                        <span className="ee-badge-revision">En Revisión: {entrevistas.filter(e => e.estado === 'EN_REVISION' && !e.imputado?.fallecido).length}</span>
                        <span className="ee-badge-pendiente">Pendientes: {entrevistas.filter(e => e.estado === 'PENDIENTE' && !e.imputado?.fallecido).length}</span>
                        {entrevistas.filter(e => e.imputado?.fallecido).length > 0 && (
                            <span className="imp-badge-fallecido" style={{ fontSize: '11px', padding: '3px 8px' }}>
                                <i className="bi bi-heartbreak-fill" /> Fallecidos: {entrevistas.filter(e => e.imputado?.fallecido).length}
                            </span>
                        )}
                    </div>
                </div>
                <div className="ee-topbar-right">
                    <div className="ee-paginacion">
                        <button onClick={() => setPagina(p => Math.max(p - 1, 1))} disabled={pagina === 1}>
                            <i className="bi bi-chevron-left"></i>
                        </button>
                        <span>{pagina} / {totalPaginas}</span>
                        <button onClick={() => setPagina(p => Math.min(p + 1, totalPaginas))} disabled={pagina === totalPaginas}>
                            <i className="bi bi-chevron-right"></i>
                        </button>
                    </div>
                    {puedeCrear && (
                        <button className="ee-btn-nueva" onClick={() => setMostrarFormulario(true)}>
                            + Nueva Entrevista
                        </button>
                    )}
                </div>
            </div>

            <div className="ee-filtros">
                <input
                    className="ee-buscador"
                    placeholder="Buscar por nombre, folio o causa penal..."
                    value={busqueda}
                    onChange={e => { setBusqueda(e.target.value); setPagina(1); }}
                />
                <div className="zona-pills">
                    {['TODAS','XOCHITEPEC','CUAUTLA','JOJUTLA'].map(z => (
                        <button key={z}
                            className={`zona-pill zona-pill-${z.toLowerCase()} ${zonaFiltro === z ? 'zona-pill-active' : ''}`}
                            onClick={() => { setZonaFiltro(z); setPagina(1); }}>
                            {z === 'TODAS' ? 'Todas' : z.charAt(0) + z.slice(1).toLowerCase()}
                        </button>
                    ))}
                </div>
                <select className="ee-select" value={filtroEstado} onChange={e => { setFiltroEstado(e.target.value); setPagina(1); }}>
                    <option value="">Todos los estados</option>
                    <option value="PENDIENTE">Pendiente</option>
                    <option value="EN_REVISION">En Revisión</option>
                    <option value="COMPLETADO">Completado</option>
                </select>
            </div>

            <div className="ee-table-wrapper">
                <table className="ee-table">
                    <thead>
                        <tr>
                            <th>Folio</th>
                            <th>Causa Penal</th>
                            <th>Nombre Completo</th>
                            <th>Fecha Registro</th>
                            <th>Estado Civil</th>
                            <th>Tipo</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtradas.length === 0 ? (
                            <tr><td colSpan="8" className="ee-empty">No hay entrevistas registradas</td></tr>
                        ) : (
                            paginadas.map(e => (
                                <tr key={e.id}>
                                    <td>{e.folio}</td>
                                    <td>{e.causaPenal}</td>
                                    <td>
                                        <div style={{ display:'flex', alignItems:'center', gap:'7px' }}>
                                            {e.nombre} {e.apPaterno} {e.apMaterno}
                                            {e.zona && (
                                                <span className={`zona-tag zona-tag-${e.zona.toLowerCase()}`}>
                                                    {({'XOCHITEPEC':'Xochi','CUAUTLA':'Cuat','JOJUTLA':'Jojut'})[e.zona] ?? e.zona}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td>{e.fechaRegistro}</td>
                                    <td>{e.estadoCivil || '—'}</td>
                                    <td>
                                        {e.tipoSeguimiento ? (
                                            <div>
                                                <span className={`ee-tipo ee-tipo-${e.tipoSeguimiento.toLowerCase()}`}>
                                                    {e.tipoSeguimiento}
                                                </span>
                                                {e.vieneDeMC && (
                                                    <span style={{ display: 'block', fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                                                        M.C. → S.C.P.
                                                    </span>
                                                )}
                                                {e.vieneDeScp && (
                                                    <span style={{ display: 'block', fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                                                        S.C.P. → M.C.
                                                    </span>
                                                )}
                                            </div>
                                        ) : '—'}
                                    </td>
                                    <td>
                                        {e.imputado?.fallecido
                                            ? <span className="imp-badge-fallecido"><i className="bi bi-heartbreak-fill" /> Fallecido</span>
                                            : e.imputado?.carpetaCerrada
                                            ? <span className="exp-badge-cierre" style={{ fontSize: 11, padding: '2px 6px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
                                                <span><i className="bi bi-folder-x" /> Carpeta Cerrada</span>
                                                {e.imputado?.estatusCierre && <span style={{ fontSize: 10, opacity: 0.85, fontWeight: 400 }}>{ESTATUS_CIERRE_LABEL[e.imputado.estatusCierre] ?? e.imputado.estatusCierre}</span>}
                                              </span>
                                            : <span className={`ee-badge ${getBadgeClass(e.estado)}`}>{getEstadoLabel(e.estado)}</span>
                                        }
                                    </td>
                                    <td className="ee-acciones">
                                        <button className="ee-btn-ver" onClick={() => handleVer(e.id)} title="Ver detalle">
                                            <i className="bi bi-eye-fill" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default EntrevistaEncuadre;