import { useState, useEffect, useCallback } from 'react';
import { getBitacoraGlobal } from '../api/bitacoraApi';
import './Bitacora.css';

const ENTIDADES = ['', 'IMPUTADO', 'MEDIDA_CAUTELAR', 'ENTREVISTA', 'SUPERVISION', 'USUARIO', 'CONSULTA', 'REPORTE_DIARIO'];
const ACCIONES  = ['', 'CREAR', 'EDITAR', 'ELIMINAR', 'CAMBIO_ESTADO', 'FALLECIMIENTO', 'FOTO'];

const ETIQUETA_ENTIDAD = {
    IMPUTADO:       'Imputado',
    MEDIDA_CAUTELAR:'Medida Cautelar',
    ENTREVISTA:     'Entrevista',
    SUPERVISION:    'Supervisión',
    USUARIO:        'Usuario',
    CONSULTA:       'Consulta de Registros',
    REPORTE_DIARIO: 'Reporte Diario',
};

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

export default function Bitacora() {
    const [registros, setRegistros]       = useState([]);
    const [totalPaginas, setTotalPaginas] = useState(1);
    const [totalItems, setTotalItems]     = useState(0);
    const [pagina, setPagina]             = useState(0);
    const [cargando, setCargando]         = useState(false);
    const [error, setError]               = useState('');

    // Filtros
    const [filtroEntidad, setFiltroEntidad] = useState('');
    const [filtroAccion, setFiltroAccion]   = useState('');
    const [filtroBusqueda, setFiltroBusqueda] = useState('');

    const TAMANO = 20;

    const cargar = useCallback(async (pag = 0) => {
        setCargando(true);
        setError('');
        try {
            const params = {
                pagina: pag,
                tamano: TAMANO,
                ...(filtroEntidad ? { entidad: filtroEntidad } : {}),
                ...(filtroAccion  ? { accion:  filtroAccion  } : {}),
            };
            const res = await getBitacoraGlobal(params);
            if (res.data.ok) {
                const d = res.data.data;
                setRegistros(d.contenido || []);
                setTotalPaginas(d.totalPaginas || 1);
                setTotalItems(d.totalItems || 0);
                setPagina(d.paginaActual || 0);
            } else {
                setError(res.data.message || 'Error al cargar la bitácora');
            }
        } catch {
            setError('No se pudo conectar con el servidor');
        } finally {
            setCargando(false);
        }
    }, [filtroEntidad, filtroAccion]);

    useEffect(() => { cargar(0); }, [cargar]);

    const registrosFiltrados = filtroBusqueda.trim()
        ? registros.filter(r =>
            (r.entidadNombre || '').toLowerCase().includes(filtroBusqueda.toLowerCase()) ||
            (r.usuario || '').toLowerCase().includes(filtroBusqueda.toLowerCase()) ||
            (r.descripcion || '').toLowerCase().includes(filtroBusqueda.toLowerCase())
          )
        : registros;

    return (
        <div className="bit-container">
            {/* ── Encabezado ───────────────────────────────────────── */}
            <div className="bit-header">
                <div>
                    <h2 className="bit-titulo">
                        <i className="bi bi-journal-text" /> Bitácora de cambios
                    </h2>
                    <p className="bit-subtitulo">
                        Registro completo de todas las operaciones realizadas en el sistema
                    </p>
                </div>
                <span className="bit-badge-total">{totalItems.toLocaleString()} registros</span>
            </div>

            {/* ── Filtros ───────────────────────────────────────────── */}
            <div className="bit-filtros">
                <div className="bit-filtro-grupo">
                    <label>Módulo</label>
                    <select value={filtroEntidad} onChange={e => { setFiltroEntidad(e.target.value); setPagina(0); }}>
                        {ENTIDADES.map(e => (
                            <option key={e} value={e}>{e ? ETIQUETA_ENTIDAD[e] : 'Todos los módulos'}</option>
                        ))}
                    </select>
                </div>
                <div className="bit-filtro-grupo">
                    <label>Acción</label>
                    <select value={filtroAccion} onChange={e => { setFiltroAccion(e.target.value); setPagina(0); }}>
                        {ACCIONES.map(a => (
                            <option key={a} value={a}>{a ? ETIQUETA_ACCION[a] : 'Todas las acciones'}</option>
                        ))}
                    </select>
                </div>
                <div className="bit-filtro-grupo bit-filtro-busqueda">
                    <label>Buscar</label>
                    <div className="bit-search-wrap">
                        <i className="bi bi-search" />
                        <input
                            type="text"
                            placeholder="Nombre, usuario, descripción..."
                            value={filtroBusqueda}
                            onChange={e => setFiltroBusqueda(e.target.value)}
                        />
                    </div>
                </div>
                <button className="bit-btn-refrescar" onClick={() => cargar(0)} title="Refrescar">
                    <i className={`bi bi-arrow-clockwise ${cargando ? 'bit-spin' : ''}`} />
                </button>
            </div>

            {/* ── Error ─────────────────────────────────────────────── */}
            {error && <div className="bit-error"><i className="bi bi-exclamation-triangle" /> {error}</div>}

            {/* ── Paginación superior ───────────────────────────────── */}
            {totalPaginas > 1 && (
                <div className="bit-paginacion">
                    <button disabled={pagina === 0} onClick={() => cargar(pagina - 1)}>
                        <i className="bi bi-chevron-left" /> Anterior
                    </button>
                    <span>Página {pagina + 1} de {totalPaginas}</span>
                    <button disabled={pagina >= totalPaginas - 1} onClick={() => cargar(pagina + 1)}>
                        Siguiente <i className="bi bi-chevron-right" />
                    </button>
                </div>
            )}

            {/* ── Tabla ─────────────────────────────────────────────── */}
            {cargando && registros.length === 0 ? (
                <div className="bit-cargando">
                    <i className="bi bi-hourglass-split bit-spin" />
                    <span>Cargando bitácora...</span>
                </div>
            ) : (
                <>
                    <div className="bit-tabla-wrap">
                        <table className="bit-tabla">
                            <thead>
                                <tr>
                                    <th>Fecha y hora</th>
                                    <th>Módulo</th>
                                    <th>Acción</th>
                                    <th>Registro</th>
                                    <th>Descripción</th>
                                    <th>Realizado por</th>
                                </tr>
                            </thead>
                            <tbody>
                                {registrosFiltrados.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="bit-vacio">
                                            <i className="bi bi-inbox" /> Sin registros para los filtros seleccionados
                                        </td>
                                    </tr>
                                ) : registrosFiltrados.map(r => (
                                    <tr key={r.id}>
                                        <td className="bit-fecha">{formatFecha(r.fecha)}</td>
                                        <td>
                                            <span className="bit-chip bit-chip-entidad">
                                                {ETIQUETA_ENTIDAD[r.entidad] || r.entidad}
                                            </span>
                                        </td>
                                        <td>
                                            <span
                                                className="bit-chip bit-chip-accion"
                                                style={{ '--color-accion': COLOR_ACCION[r.accion] || '#6b7280' }}
                                            >
                                                <i className={`bi ${ICON_ACCION[r.accion] || 'bi-dot'}`} />
                                                {ETIQUETA_ACCION[r.accion] || r.accion}
                                            </span>
                                        </td>
                                        <td className="bit-nombre">{r.entidadNombre || '—'}</td>
                                        <td className="bit-desc">{r.descripcion || '—'}</td>
                                        <td className="bit-usuario">
                                            <div className="bit-usuario-wrap">
                                                <span className="bit-avatar">
                                                    {r.usuario ? r.usuario.charAt(0).toUpperCase() : '?'}
                                                </span>
                                                <div>
                                                    <div className="bit-usuario-nombre">{r.usuario || 'Sistema'}</div>
                                                    {r.usuarioUsername && (
                                                        <div className="bit-usuario-email">{r.usuarioUsername}</div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                </>
            )}
        </div>
    );
}
