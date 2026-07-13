/**
 * Panel colapsable de historial de cambios para un registro concreto.
 * Uso:
 *   <HistorialRegistro entidad="IMPUTADO" id={imputado.id} />
 */
import { useState, useEffect } from 'react';
import { getHistorialRegistro } from '../api/bitacoraApi';
import './HistorialRegistro.css';

const ETIQUETA_ACCION = {
    CREAR:         'Creación',
    EDITAR:        'Edición',
    ELIMINAR:      'Eliminación',
    CAMBIO_ESTADO: 'Cambio de estado',
    FALLECIMIENTO: 'Fallecimiento',
    FOTO:          'Foto',
};
const COLOR_ACCION = {
    CREAR:         '#16a34a',
    EDITAR:        '#2563eb',
    ELIMINAR:      '#dc2626',
    CAMBIO_ESTADO: '#d97706',
    FALLECIMIENTO: '#6b7280',
    FOTO:          '#7c3aed',
};
const ICON_ACCION = {
    CREAR:         'bi-plus-circle-fill',
    EDITAR:        'bi-pencil-fill',
    ELIMINAR:      'bi-trash-fill',
    CAMBIO_ESTADO: 'bi-arrow-left-right',
    FALLECIMIENTO: 'bi-heart-pulse',
    FOTO:          'bi-camera-fill',
};

function formatFecha(fechaStr) {
    if (!fechaStr) return '—';
    const d = new Date(fechaStr);
    return d.toLocaleString('es-MX', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

export default function HistorialRegistro({ entidad, id }) {
    const [abierto, setAbierto]     = useState(false);
    const [registros, setRegistros] = useState([]);
    const [cargando, setCargando]   = useState(false);
    const [cargado, setCargado]     = useState(false);

    useEffect(() => {
        if (abierto && !cargado && id) {
            setCargando(true);
            getHistorialRegistro(entidad, id)
                .then(res => {
                    if (res.data.ok) setRegistros(res.data.data || []);
                })
                .finally(() => { setCargando(false); setCargado(true); });
        }
    }, [abierto, cargado, entidad, id]);

    // Recargar si cambia el ID
    useEffect(() => { setCargado(false); setRegistros([]); }, [id]);

    return (
        <div className="hlog-container">
            <button
                className={`hlog-toggle ${abierto ? 'hlog-toggle--open' : ''}`}
                onClick={() => setAbierto(o => !o)}
            >
                <i className="bi bi-clock-history" />
                Historial de cambios
                {registros.length > 0 && (
                    <span className="hlog-count">{registros.length}</span>
                )}
                <i className={`bi ${abierto ? 'bi-chevron-up' : 'bi-chevron-down'} hlog-caret`} />
            </button>

            {abierto && (
                <div className="hlog-panel">
                    {cargando ? (
                        <div className="hlog-cargando">
                            <i className="bi bi-hourglass-split hlog-spin" /> Cargando historial...
                        </div>
                    ) : registros.length === 0 ? (
                        <div className="hlog-vacio">
                            <i className="bi bi-inbox" /> Sin registros de cambios
                        </div>
                    ) : (
                        <ul className="hlog-lista">
                            {registros.map(r => (
                                <li key={r.id} className="hlog-item">
                                    <div
                                        className="hlog-dot"
                                        style={{ background: COLOR_ACCION[r.accion] || '#94a3b8' }}
                                    >
                                        <i className={`bi ${ICON_ACCION[r.accion] || 'bi-dot'}`} />
                                    </div>
                                    <div className="hlog-contenido">
                                        <div className="hlog-fila-top">
                                            <span
                                                className="hlog-accion"
                                                style={{ color: COLOR_ACCION[r.accion] || '#6b7280' }}
                                            >
                                                {ETIQUETA_ACCION[r.accion] || r.accion}
                                            </span>
                                            <span className="hlog-fecha">{formatFecha(r.fecha)}</span>
                                        </div>
                                        <div className="hlog-desc">{r.descripcion || '—'}</div>
                                        <div className="hlog-usuario">
                                            <i className="bi bi-person-fill" />
                                            {r.usuario || 'Sistema'}
                                            {r.usuarioEmail && (
                                                <span className="hlog-email"> · {r.usuarioEmail}</span>
                                            )}
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}
