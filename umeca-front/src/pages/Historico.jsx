import { useState, useEffect } from 'react';
import api from '../api/axios';
import './Historico.css';
import './Imputados.css';

const ITEMS_POR_PAGINA = 10;

const estatusConfig = {
    PENDIENTE:  { label: 'Pendiente',   clase: 'estatus-pendiente' },
    TRABAJANDO: { label: 'En Proceso',  clase: 'estatus-proceso' },
    FINALIZADO: { label: 'Finalizado',  clase: 'estatus-finalizado' },
};

const modalInicial = {
    fechaSolicitud: '',
    nombreSolicitante: '',
    cargo: '',
    dependencia: '',
    causaPenal: '',
    nombreImputado: '',
    apPaternoImputado: '',
    delito: '',
    ubicacionFisica: '',
};

const Historico = () => {
    const [datos, setDatos] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [pagina, setPagina] = useState(1);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState(modalInicial);
    const [errores, setErrores] = useState({});
    const [loading, setLoading] = useState(false);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        cargarDatos();
    }, []);

    useEffect(() => {
        if (showModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [showModal]);

    const cargarDatos = async () => {
        setCargando(true);
        try {
            const res = await api.get('/evaluaciones');
            if (res.data.ok) setDatos(res.data.data);
        } catch {
            // error de red — la pantalla muestra lista vacía; el interceptor de axios maneja 401
        } finally {
            setCargando(false);
        }
    };

    const filtrados = datos.filter(item =>
        item.nombreImputado?.toLowerCase().includes(busqueda.toLowerCase()) ||
        item.causaPenal?.toLowerCase().includes(busqueda.toLowerCase()) ||
        item.delito?.toLowerCase().includes(busqueda.toLowerCase())
    );

    const totalPaginas = Math.max(1, Math.ceil(filtrados.length / ITEMS_POR_PAGINA));
    const inicio = (pagina - 1) * ITEMS_POR_PAGINA;
    const paginados = filtrados.slice(inicio, inicio + ITEMS_POR_PAGINA);

    const handleBusqueda = (e) => {
        setBusqueda(e.target.value);
        setPagina(1);
    };

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setErrores({ ...errores, [e.target.name]: '' });
    };

    const validar = () => {
        const nuevosErrores = {};
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        Object.keys(modalInicial).forEach(key => {
            if (!form[key]) nuevosErrores[key] = 'Campo requerido';
        });

        if (form.fechaSolicitud) {
            const f = new Date(form.fechaSolicitud);
            if (f > hoy) nuevosErrores.fechaSolicitud = 'No puede ser una fecha futura';
        }
        return nuevosErrores;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const nuevosErrores = validar();
        if (Object.keys(nuevosErrores).length > 0) {
            setErrores(nuevosErrores);
            return;
        }
        setLoading(true);
        try {
            const res = await api.post('/evaluaciones', form);
            if (res.data.ok) {
                setShowModal(false);
                setForm(modalInicial);
                cargarDatos();
            } else {
                setErrores({ general: res.data.message });
            }
        } catch (err) {
            setErrores({ general: 'Error al registrar la solicitud' });
        } finally {
            setLoading(false);
        }
    };

    const handleCancelar = () => {
        setShowModal(false);
        setForm(modalInicial);
        setErrores({});
    };

    const [showDetalle, setShowDetalle] = useState(false);
    const [detalle, setDetalle] = useState(null);

    const handleVerDetalle = (item) => {
        setDetalle(item);
        setShowDetalle(true);
    };

    return (
        <div className="historico-wrapper">

            <div className="historico-toolbar">
                <span className="historico-count">
                    Mostrando <b>{filtrados.length > 0 ? inicio + 1 : 0}</b> a <b>{Math.min(inicio + ITEMS_POR_PAGINA, filtrados.length)}</b> de <b>{filtrados.length}</b> registros
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
                        placeholder="Buscar el imputado por nombre..."
                        value={busqueda}
                        onChange={handleBusqueda}
                    />
                </div>
                <button className="btn-solicitud" onClick={() => setShowModal(true)}>
                    <i className="bi bi-plus-lg"></i> Solicitud
                </button>
            </div>

            <div className="historico-tabla-wrapper">
<table className="historico-tabla">
                    <thead>
                        <tr>
                            <th>NO.</th>
                            <th>NOMBRE IMPUTADO</th>
                            <th>DELITO</th>
                            <th>CAUSA PENAL</th>
                            <th>ESTATUS</th>
                            <th>ACCIONES</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cargando ? (
                            <tr><td colSpan="5" style={{textAlign:'center', padding:'40px', color:'#aaa'}}>Cargando...</td></tr>
                        ) : paginados.length === 0 ? (
                            <tr><td colSpan="5" style={{textAlign:'center', padding:'40px', color:'#aaa'}}>No hay registros</td></tr>
                        ) : (
                            paginados.map((item, index) => (
                                <tr key={item.id}>
                                    <td>{inicio + index + 1}</td>
                                    <td>{item.nombreImputado}</td>
                                    <td>{item.delito}</td>
                                    <td>{item.causaPenal}</td>
                                    <td>
                                        {item.imputadoFallecido
                                            ? <span className="imp-badge-fallecido"><i className="bi bi-heartbreak-fill" /> Fallecido</span>
                                            : <span className={`estatus-badge ${estatusConfig[item.estatus]?.clase || 'estatus-pendiente'}`}>{estatusConfig[item.estatus]?.label || item.estatus}</span>
                                        }
                                    </td>
                                    <td>
                                        <button className="btn-ver" onClick={() => handleVerDetalle(item)}>
                                            <i className="bi bi-eye"></i>
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <div className="modal-header">
                            <h3>NUEVA SOLICITUD</h3>
                            <button className="modal-close" onClick={handleCancelar}>
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        <form className="modal-form" onSubmit={handleSubmit}>
                            {errores.general && <p className="error" style={{textAlign:'center'}}>{errores.general}</p>}

                            <div className="modal-field">
                                <label>FECHA DE SOLICITUD*</label>
                                <input type="date" name="fechaSolicitud" value={form.fechaSolicitud} onChange={handleChange} />
                                {errores.fechaSolicitud && <span className="error">{errores.fechaSolicitud}</span>}
                            </div>

                            <div className="modal-field">
                                <label>NOMBRE DE SOLICITANTE*</label>
                                <input type="text" name="nombreSolicitante" placeholder="Nombre(s) Apellido Paterno Apellido Materno" value={form.nombreSolicitante} onChange={handleChange} />
                                {errores.nombreSolicitante && <span className="error">{errores.nombreSolicitante}</span>}
                            </div>

                            <div className="modal-row">
                                <div className="modal-field">
                                    <label>CARGO*</label>
                                    <input type="text" name="cargo" value={form.cargo} onChange={handleChange} />
                                    {errores.cargo && <span className="error">{errores.cargo}</span>}
                                </div>
                                <div className="modal-field">
                                    <label>DEPENDENCIA*</label>
                                    <input type="text" name="dependencia" value={form.dependencia} onChange={handleChange} />
                                    {errores.dependencia && <span className="error">{errores.dependencia}</span>}
                                </div>
                            </div>

                            <div className="modal-field">
                                <label>CAUSA PENAL*</label>
                                <input type="text" name="causaPenal" value={form.causaPenal} onChange={handleChange} />
                                {errores.causaPenal && <span className="error">{errores.causaPenal}</span>}
                            </div>

                            <div className="modal-row">
                                <div className="modal-field">
                                    <label>NOMBRE DEL IMPUTADO*</label>
                                    <input type="text" name="nombreImputado" value={form.nombreImputado} onChange={handleChange} />
                                    {errores.nombreImputado && <span className="error">{errores.nombreImputado}</span>}
                                </div>
                                <div className="modal-field">
                                    <label>APELLIDO PATERNO*</label>
                                    <input type="text" name="apPaternoImputado" value={form.apPaternoImputado} onChange={handleChange} />
                                    {errores.apPaternoImputado && <span className="error">{errores.apPaternoImputado}</span>}
                                </div>
                            </div>

                            <div className="modal-field">
                                <label>DELITO*</label>
                                <input type="text" name="delito" value={form.delito} onChange={handleChange} />
                                {errores.delito && <span className="error">{errores.delito}</span>}
                            </div>

                            <div className="modal-field">
                                <label>UBICACIÓN FÍSICA*</label>
                                <select name="ubicacionFisica" value={form.ubicacionFisica} onChange={handleChange}>
                                    <option value="">Seleccionar...</option>
                                    <option value="FGR">FGR</option>
                                    <option value="FGE">FGE</option>
                                    <option value="CERESO">CERESO</option>
                                    <option value="DOMICILIO">DOMICILIO</option>
                                    <option value="UMECA">UMECA</option>
                                </select>
                                {errores.ubicacionFisica && <span className="error">{errores.ubicacionFisica}</span>}
                            </div>

                            <div className="modal-row">
                                <div className="modal-field">
                                    <label>PUESTA A DISPOSICIÓN</label>
                                    <input type="date" name="puestaDisposicion" value={form.puestaDisposicion} onChange={handleChange} />
                                </div>
                                <div className="modal-field">
                                    <label>FECHA DE LA AUDIENCIA</label>
                                    <input type="date" name="fechaAudiencia" value={form.fechaAudiencia} onChange={handleChange} />
                                </div>
                            </div>

                            <div className="modal-buttons">
                                <button type="button" className="btn-cancelar" onClick={handleCancelar}>Cancelar</button>
                                <button type="submit" className="btn-registrar" disabled={loading}>
                                    {loading ? 'Registrando...' : 'Registrar Imputado'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showDetalle && detalle && (
    <div className="modal-overlay">
        <div className="modal-box">
            <div className="modal-header">
                <h3>DETALLE DE SOLICITUD</h3>
                <button className="modal-close" onClick={() => setShowDetalle(false)}>
                    <i className="bi bi-x-lg"></i>
                </button>
            </div>
            <div className="modal-form">
                <div className="detalle-grid">
                    <div className="detalle-item">
                        <span className="detalle-label">NOMBRE IMPUTADO</span>
                        <span className="detalle-valor">{detalle.nombreImputado}</span>
                    </div>
                    <div className="detalle-item">
                        <span className="detalle-label">CAUSA PENAL</span>
                        <span className="detalle-valor">{detalle.causaPenal}</span>
                    </div>
                    <div className="detalle-item">
                        <span className="detalle-label">DELITO</span>
                        <span className="detalle-valor">{detalle.delito}</span>
                    </div>
                    <div className="detalle-item">
                        <span className="detalle-label">UBICACIÓN FÍSICA</span>
                        <span className="detalle-valor">{detalle.ubicacionFisica}</span>
                    </div>
                    <div className="detalle-item">
                        <span className="detalle-label">SOLICITANTE</span>
                        <span className="detalle-valor">{detalle.nombreSolicitante}</span>
                    </div>
                    <div className="detalle-item">
                        <span className="detalle-label">FECHA SOLICITUD</span>
                        <span className="detalle-valor">{detalle.fechaSolicitud}</span>
                    </div>
                    <div className="detalle-item">
                        <span className="detalle-label">PUESTA A DISPOSICIÓN</span>
                        <span className="detalle-valor">{detalle.puestaDisposicion}</span>
                    </div>
                    <div className="detalle-item">
                        <span className="detalle-label">FECHA AUDIENCIA</span>
                        <span className="detalle-valor">{detalle.fechaAudiencia}</span>
                    </div>
                    <div className="detalle-item">
                        <span className="detalle-label">ESTATUS</span>
                        <span className={`estatus-badge ${estatusConfig[detalle.estatus]?.clase}`}>
                            {estatusConfig[detalle.estatus]?.label}
                        </span>
                    </div>
                    {detalle.resultado && (
                        <div className="detalle-item">
                            <span className="detalle-label">RESULTADO</span>
                            <span className="detalle-valor">{detalle.resultado}</span>
                        </div>
                    )}
                </div>
                <div className="modal-buttons">
                    <button className="btn-cancelar" onClick={() => setShowDetalle(false)}>
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    </div>
)}
        </div>
    );
};

export default Historico;