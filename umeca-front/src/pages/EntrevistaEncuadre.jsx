import { useState, useEffect } from 'react';
import { getEntrevistas, getEntrevistaById } from '../api/entrevistasApi';
import { useToast } from '../context/ToastContext';
import './EntrevistaEncuadre.css';
import './Imputados.css';
import FormularioEntrevista from './FormularioEntrevista';
import DetalleEntrevista from './DetalleEntrevista';

const EntrevistaEncuadre = () => {
    const { showToast } = useToast();
    const [mostrarFormulario, setMostrarFormulario] = useState(false);
    const [entrevistaSeleccionada, setEntrevistaSeleccionada] = useState(null);
    const [entrevistas, setEntrevistas] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('');

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
            // silenced
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
        return coincideBusqueda && coincideEstado;
    });

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
            <div className="ee-header">
                <div className="ee-stats">
                    <span>Mostrando {filtradas.length} de {entrevistas.length} registros</span>
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
                <button className="ee-btn-nueva" onClick={() => setMostrarFormulario(true)}>
                    + Nueva Entrevista
                </button>
            </div>

            <div className="ee-filtros">
                <input
                    className="ee-buscador"
                    placeholder="Buscar por nombre, folio o causa penal..."
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                />
                <select className="ee-select" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
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
                            filtradas.map(e => (
                                <tr key={e.id}>
                                    <td>{e.folio}</td>
                                    <td>{e.causaPenal}</td>
                                    <td>{e.nombre} {e.apPaterno} {e.apMaterno}</td>
                                    <td>{e.fechaRegistro}</td>
                                    <td>{e.estadoCivil || '—'}</td>
                                    <td>
                                        {e.tipoSeguimiento ? (
                                            <span className={`ee-tipo ee-tipo-${e.tipoSeguimiento.toLowerCase()}`}>
                                                {e.tipoSeguimiento}
                                            </span>
                                        ) : '—'}
                                    </td>
                                    <td>
                                        {e.imputado?.fallecido
                                            ? <span className="imp-badge-fallecido"><i className="bi bi-heartbreak-fill" /> Fallecido</span>
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