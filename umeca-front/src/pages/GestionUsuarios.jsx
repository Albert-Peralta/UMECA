import { useState, useEffect } from 'react';
import { getUsuarios, crearUsuario, actualizarUsuario, toggleUsuario } from '../api/usuariosApi';
import { useToast } from '../context/ToastContext';
import './GestionUsuarios.css';

const ROLES = ['ADMINISTRADOR', 'SUPERVISION', 'EVALUADOR_RIESGO'];
const ETIQUETA_ROL = {
    ADMINISTRADOR:    'Administrador',
    SUPERVISION:      'Supervisión',
    EVALUADOR_RIESGO: 'Evaluador de Riesgos',
};
const ZONAS = ['XOCHITEPEC'];

const initialForm = {
    nombre: '', apPaterno: '', apMaterno: '',
    email: '', cargo: '', dependencia: '',
    rol: '', zona: 'XOCHITEPEC'
};

const GestionUsuarios = () => {
    const [usuarios, setUsuarios] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState(initialForm);
    const [editId, setEditId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [errores, setErrores] = useState({});
    const { showToast } = useToast();

    useEffect(() => { cargarUsuarios(); }, []);

    const [busqueda, setBusqueda] = useState('');
    const [filtroRol, setFiltroRol] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('');

    const usuariosFiltrados = usuarios.filter(u => {
    const nombreCompleto = `${u.nombre} ${u.apPaterno} ${u.apMaterno} ${u.email}`.toLowerCase();
    const coincideBusqueda = nombreCompleto.includes(busqueda.toLowerCase());
    const coincideRol = filtroRol ? u.rol === filtroRol : true;
    const coincideEstado = filtroEstado === '' ? true : filtroEstado === 'activo' ? u.activo : !u.activo;
    return coincideBusqueda && coincideRol && coincideEstado;
});

    const cargarUsuarios = async () => {
        try {
            const res = await getUsuarios();
            setUsuarios(res.data.data || []);
        } catch (e) {
            // silenced
        }
    };

    const handleSubmit = async () => {
        const nuevosErrores = {
            nombre:    !form.nombre,
            apPaterno: !form.apPaterno,
            email:     !form.email,
            rol:       !form.rol,
        };
        setErrores(nuevosErrores);
        if (Object.values(nuevosErrores).some(Boolean)) {
            setError('Por favor completa todos los campos obligatorios marcados en rojo');
            return;
        }
        setLoading(true);
        setError('');
        try {
            if (editId) {
                await actualizarUsuario(editId, form);
                showToast('Usuario actualizado correctamente');
            } else {
                await crearUsuario(form);
                showToast('Usuario creado correctamente');
            }
            setShowModal(false);
            setForm(initialForm);
            setEditId(null);
            setErrores({});
            cargarUsuarios();
        } catch (e) {
            setError(e.response?.data?.message || 'Error al guardar usuario');
        }
        setLoading(false);
    };

    const handleEditar = (u) => {
        setForm({
            nombre: u.nombre, apPaterno: u.apPaterno,
            apMaterno: u.apMaterno, email: u.email,
            cargo: u.cargo, dependencia: u.dependencia,
            rol: u.rol, zona: u.zona
        });
        setEditId(u.id);
        setShowModal(true);
    };

    const handleToggle = async (id) => {
        const u = usuarios.find(u => u.id === id);
        await toggleUsuario(id);
        showToast(u?.activo ? 'Usuario desactivado' : 'Usuario activado');
        cargarUsuarios();
    };

    return (
        <div className="gu-container">
            <div className="gu-header">
                <span>Mostrando {usuariosFiltrados.length} de {usuarios.length} usuarios</span>
                <button className="gu-btn-nuevo" onClick={() => { setForm(initialForm); setEditId(null); setShowModal(true); }}>
                    + Nuevo usuario
                </button>
            </div>

            <div className="gu-filtros">
                <input
                    className="gu-buscador"
                    placeholder="Buscar por nombre o correo..."
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                />
                <select className="gu-select-filtro" value={filtroRol} onChange={e => setFiltroRol(e.target.value)}>
                    <option value="">Todos los roles</option>
                    {ROLES.map(r => <option key={r} value={r}>{ETIQUETA_ROL[r] || r}</option>)}
                </select>
                <select className="gu-select-filtro" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
                    <option value="">Todos los estados</option>
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                </select>
            </div>

            <div className="gu-table-wrapper">
            <table className="gu-table">
                <thead>
                    <tr>
                        <th>Identificador</th>
                        <th>Nombre</th>
                        <th>Correo</th>
                        <th>Rol</th>
                        <th>Zona</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {usuarios.length === 0 ? (
                        <tr><td colSpan="7" className="gu-empty">No hay usuarios registrados</td></tr>
                    ) : (
                        usuariosFiltrados.map(u => (
                            <tr key={u.id}>
                                <td>{u.identificador}</td>
                                <td>{u.nombre} {u.apPaterno} {u.apMaterno}</td>
                                <td>{u.email}</td>
                                <td><span className={`gu-badge gu-badge-${u.rol.toLowerCase()}`}>{ETIQUETA_ROL[u.rol] || u.rol}</span></td>
                                <td>{u.zona}</td>
                                <td>
                                    <span className={`gu-badge ${u.activo ? 'gu-badge-activo' : 'gu-badge-inactivo'}`}>
                                        {u.activo ? 'Activo' : 'Inactivo'}
                                    </span>
                                </td>
                                <td className="gu-acciones">
                                    <button className="gu-btn-editar" onClick={() => handleEditar(u)}>Editar</button>
                                    <button className={`gu-btn-toggle ${u.activo ? 'gu-btn-desactivar' : 'gu-btn-activar'}`}
                                        onClick={() => handleToggle(u.id)}>
                                        {u.activo ? 'Desactivar' : 'Activar'}
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
            </div>

            {showModal && (
                <div className="gu-modal-overlay">
                    <div className="gu-modal">
                        <h2>{editId ? 'Editar usuario' : 'Nuevo usuario'}</h2>
                        <div className="gu-modal-body">
                        {error && <p className="gu-error">{error}</p>}
                        <div className="gu-form-grid">
                            <div className={`gu-field${errores.nombre ? ' gu-field-error' : ''}`}>
                                <label>Nombre *</label>
                                <input value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} placeholder="Nombre"/>
                                {errores.nombre && <span className="gu-error-msg">Este campo es obligatorio</span>}
                            </div>
                            <div className={`gu-field${errores.apPaterno ? ' gu-field-error' : ''}`}>
                                <label>Apellido paterno *</label>
                                <input value={form.apPaterno} onChange={e => setForm({...form, apPaterno: e.target.value})} placeholder="Apellido paterno"/>
                                {errores.apPaterno && <span className="gu-error-msg">Este campo es obligatorio</span>}
                            </div>
                            <div className="gu-field">
                                <label>Apellido materno</label>
                                <input value={form.apMaterno} onChange={e => setForm({...form, apMaterno: e.target.value})} placeholder="Apellido materno"/>
                            </div>
                            <div className={`gu-field${errores.email ? ' gu-field-error' : ''}`}>
                                <label>Correo *</label>
                                <input value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="Correo" disabled={!!editId}/>
                                {errores.email && <span className="gu-error-msg">Este campo es obligatorio</span>}
                            </div>
                            <div className="gu-field">
                                <label>Cargo</label>
                                <input value={form.cargo} onChange={e => setForm({...form, cargo: e.target.value})} placeholder="Cargo"/>
                            </div>
                            <div className="gu-field">
                                <label>Dependencia</label>
                                <input value={form.dependencia} onChange={e => setForm({...form, dependencia: e.target.value})} placeholder="Dependencia"/>
                            </div>
                            <div className={`gu-field${errores.rol ? ' gu-field-error' : ''}`}>
                                <label>Rol *</label>
                                <select value={form.rol} onChange={e => setForm({...form, rol: e.target.value})}>
                                    <option value="">Selecciona rol</option>
                                    {ROLES.map(r => <option key={r} value={r}>{ETIQUETA_ROL[r] || r}</option>)}
                                </select>
                                {errores.rol && <span className="gu-error-msg">Este campo es obligatorio</span>}
                            </div>
                            <div className="gu-field">
                                <label>Zona</label>
                                <input value="XOCHITEPEC" disabled style={{background:'#f5f5f5', color:'#888', cursor:'not-allowed'}}/>
                            </div>
                        </div>
                        </div>{/* gu-modal-body */}
                        <div className="gu-modal-actions">
                            <button className="gu-btn-cancelar" onClick={() => { setShowModal(false); setErrores({}); setError(''); }}>Cancelar</button>
                            <button className="gu-btn-guardar" onClick={handleSubmit} disabled={loading}>
                                {loading ? 'Guardando...' : 'Guardar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GestionUsuarios;