import { useState, useEffect, useRef } from 'react';
import { getUsuarios, crearUsuario, actualizarUsuario, toggleUsuario } from '../api/usuariosApi';
import { exportarBackupZip } from '../api/backupApi';
import { getModulosExtra, guardarModulosExtra } from '../api/modulosExtraApi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import './GestionUsuarios.css';

const ROLES = ['SUPERADMIN', 'ADMINISTRADOR', 'SUPERVISION', 'EVALUADOR_RIESGO', 'CORRESPONDENCIA'];
const ETIQUETA_ROL = {
    SUPERADMIN:      'Superadmin',
    ADMINISTRADOR:   'Administrador',
    SUPERVISION:     'Supervisión',
    EVALUADOR_RIESGO:'Evaluador de Riesgos',
    CORRESPONDENCIA: 'Correspondencia',
};
const ZONAS = ['XOCHITEPEC', 'CUAUTLA', 'JOJUTLA'];

const reglasPwd = [
    { id: 'len',     label: 'Mínimo 8 caracteres',          test: p => p.length >= 8 },
    { id: 'upper',   label: 'Al menos una mayúscula',        test: p => /[A-Z]/.test(p) },
    { id: 'lower',   label: 'Al menos una minúscula',        test: p => /[a-z]/.test(p) },
    { id: 'num',     label: 'Al menos un número',            test: p => /[0-9]/.test(p) },
    { id: 'special', label: 'Al menos un carácter especial (!@#$%&*?)', test: p => /[!@#$%&*?]/.test(p) },
];

const validarPassword = (pwd) => reglasPwd.every(r => r.test(pwd));

const initialForm = {
    nombre: '', apPaterno: '', apMaterno: '',
    username: '', password: '',
    // email: '',   // Comentado — el acceso es por usuario/contraseña definidos por el administrador
    cargo: '', dependencia: '',
    rol: '', zona: 'XOCHITEPEC'
};

// Todos los módulos del sistema
const TODOS_MODULOS = [
    { modulo: 'ENTREVISTA',       label: 'Entrevista de Encuadre',  grupo: 'Supervisión' },
    { modulo: 'MEDIDAS',          label: 'Medidas y Suspensiones',   grupo: 'Supervisión' },
    { modulo: 'SUPERVISION',      label: 'Supervisión',              grupo: 'Supervisión' },
    { modulo: 'EVALUACION',       label: 'Evaluación de Riesgos',    grupo: 'Evaluación'  },
    { modulo: 'CONSULTAS',        label: 'Consulta de Registros',    grupo: 'Evaluación'  },
    { modulo: 'SUSPENSION',       label: 'Suspensión Condicional',   grupo: 'Evaluación'  },
    { modulo: 'CORRESPONDENCIA',  label: 'Correspondencia',          grupo: 'Oficios'     },
    { modulo: 'CONTROL_OFICIOS',  label: 'Control de Oficios',       grupo: 'Oficios'     },
    { modulo: 'ESTADISTICAS',     label: 'Estadísticas',             grupo: 'General'     },
    { modulo: 'EXPEDIENTES',      label: 'Expedientes Anteriores',   grupo: 'Histórico'   },
];

// Módulos que ya vienen incluidos por defecto en cada rol
const MODULOS_POR_ROL = {
    ADMINISTRADOR:   ['ENTREVISTA','MEDIDAS','SUPERVISION','EVALUACION','CONSULTAS','SUSPENSION','CORRESPONDENCIA','CONTROL_OFICIOS','ESTADISTICAS','EXPEDIENTES'],
    SUPERVISION:     ['ENTREVISTA','MEDIDAS','SUPERVISION','EVALUACION','CONSULTAS','CORRESPONDENCIA','CONTROL_OFICIOS','EXPEDIENTES'],
    EVALUADOR_RIESGO:['ENTREVISTA','MEDIDAS','SUPERVISION','EVALUACION','CONSULTAS','SUSPENSION','CORRESPONDENCIA','CONTROL_OFICIOS','EXPEDIENTES'],
    CORRESPONDENCIA: ['ENTREVISTA','CORRESPONDENCIA','CONTROL_OFICIOS','ESTADISTICAS'],
};

// Filtra los módulos que ya tiene el rol para mostrar solo los extras posibles
const modulosDisponiblesParaRol = (rol) => {
    const base = new Set(MODULOS_POR_ROL[rol] || []);
    return TODOS_MODULOS.filter(m => !base.has(m.modulo));
};

const GestionUsuarios = () => {
    const { user: usuarioActual } = useAuth();
    const esSuperAdmin = usuarioActual?.rol === 'SUPERADMIN';

    const [usuarios, setUsuarios] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState(initialForm);
    const [editId, setEditId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [errores, setErrores] = useState({});
    const [showPassword, setShowPassword] = useState(false);
    const { showToast } = useToast();

    // Modal de módulos extra
    const [showModulos, setShowModulos] = useState(false);
    const [usuarioModulos, setUsuarioModulos] = useState(null); // { id, nombre, rol }
    const [modulosActivos, setModulosActivos] = useState([]); // [{ modulo, puedeVer, puedeCrear, puedeEditar }]
    const [guardandoModulos, setGuardandoModulos] = useState(false);

    const abrirModulos = async (u) => {
        setUsuarioModulos(u);
        setShowModulos(true);
        try {
            const res = await getModulosExtra(u.id);
            if (res.data.ok) setModulosActivos(res.data.data || []);
            else setModulosActivos([]);
        } catch { setModulosActivos([]); }
    };

    const toggleModulo = (modulo) => {
        setModulosActivos(prev => {
            const existe = prev.find(m => m.modulo === modulo);
            if (existe) return prev.filter(m => m.modulo !== modulo);
            return [...prev, { modulo, puedeVer: true, puedeCrear: false, puedeEditar: false }];
        });
    };

    const togglePermiso = (modulo, campo) => {
        setModulosActivos(prev => prev.map(m =>
            m.modulo === modulo ? { ...m, [campo]: !m[campo] } : m
        ));
    };

    const handleGuardarModulos = async () => {
        setGuardandoModulos(true);
        try {
            const res = await guardarModulosExtra(usuarioModulos.id, modulosActivos);
            if (res.data.ok) {
                showToast('Módulos actualizados correctamente');
                setShowModulos(false);
            } else {
                showToast(res.data.message || 'Error al guardar', 'error');
            }
        } catch { showToast('Error al conectar con el servidor', 'error'); }
        finally { setGuardandoModulos(false); }
    };

    useEffect(() => { cargarUsuarios(); }, []);

    const [busqueda, setBusqueda] = useState('');
    const [filtroRol, setFiltroRol] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('');
    const [descargandoBackup, setDescargandoBackup] = useState(false);

    const handleDescargarBackup = async () => {
        setDescargandoBackup(true);
        try {
            const res = await exportarBackupZip();
            const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/zip' }));
            const a = document.createElement('a');
            const hoy = new Date().toISOString().slice(0, 10);
            a.href = url;
            a.download = `UMECA_Backup_${hoy}.zip`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            showToast('Backup descargado correctamente', 'success');
        } catch {
            showToast('Error al generar el backup', 'error');
        } finally {
            setDescargandoBackup(false);
        }
    };

    const usuariosFiltrados = usuarios.filter(u => {
        const nombreCompleto = `${u.nombre} ${u.apPaterno} ${u.apMaterno} ${u.username || ''}`.toLowerCase();
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
            showToast('Error al cargar usuarios. Verifica la conexión.', 'error');
        }
    };

    const [advertenciaNombre, setAdvertenciaNombre] = useState('');

    const handleSubmit = async () => {
        const pwdInvalida = form.password && !validarPassword(form.password);

        const nuevosErrores = {
            nombre:    !form.nombre.trim(),
            apPaterno: !form.apPaterno.trim(),
            username:  !form.username.trim(),
            password:  (!editId && !form.password) || pwdInvalida,
            rol:       !form.rol,
        };
        setErrores(nuevosErrores);
        setAdvertenciaNombre('');

        if (!editId && !form.password) {
            setError('La contraseña es obligatoria al crear un usuario');
            return;
        }
        if (pwdInvalida) {
            setError('La contraseña no cumple con los requisitos de seguridad');
            return;
        }
        if (Object.values(nuevosErrores).some(Boolean)) {
            setError('Por favor completa todos los campos obligatorios');
            return;
        }

        // Advertencia (no bloqueante) si ya existe alguien con el mismo nombre + apellido paterno + apellido materno
        const nombreCompleto = `${form.nombre.trim()} ${form.apPaterno.trim()} ${(form.apMaterno || '').trim()}`.toLowerCase().trim();
        const duplicadoNombre = usuarios.some(u =>
            u.id !== editId &&
            `${u.nombre} ${u.apPaterno} ${u.apMaterno || ''}`.toLowerCase().trim() === nombreCompleto
        );
        if (duplicadoNombre) {
            setAdvertenciaNombre('⚠️ Ya existe un usuario con el mismo nombre completo. Verifica que no sea un duplicado.');
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
            setAdvertenciaNombre('');
            cargarUsuarios();
        } catch (e) {
            const msg = e.response?.data?.message || 'Error al guardar usuario';
            if (msg.includes('usuario ya está registrado') || msg.includes('ya está en uso')) {
                setErrores(prev => ({ ...prev, username: true }));
                setError(''); // el campo ya muestra el mensaje inline
            } else {
                setError(msg);
            }
        }
        setLoading(false);
    };

    const handleEditar = (u) => {
        setForm({
            nombre: u.nombre, apPaterno: u.apPaterno,
            apMaterno: u.apMaterno,
            username: u.username || '',
            _usernameOriginal: u.username || '', // para saber si ya tenía username
            password: '',   // No se muestra ni se requiere al editar
            // email: u.email,
            cargo: u.cargo || '', dependencia: u.dependencia || '',
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
        <>
        <div className="gu-container">
            <div className="gu-header">
                <span>Mostrando {usuariosFiltrados.length} de {usuarios.length} usuarios</span>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button
                        className="gu-btn-backup"
                        onClick={handleDescargarBackup}
                        disabled={descargandoBackup}
                        title="Exportar todos los registros del sistema en un ZIP con archivos Excel"
                    >
                        <i className={`bi ${descargandoBackup ? 'bi-hourglass-split' : 'bi-cloud-download'}`} />
                        {descargandoBackup ? ' Generando...' : ' Exportar Backup'}
                    </button>
                    <button className="gu-btn-nuevo" onClick={() => { setForm(initialForm); setEditId(null); setShowModal(true); }}>
                        + Nuevo usuario
                    </button>
                </div>
            </div>

            <div className="gu-filtros">
                <input
                    className="gu-buscador"
                    placeholder="Buscar por nombre o usuario..."
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
                        <th>Usuario</th>
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
                                <td>{u.username || '—'}</td>
                                <td><span className={`gu-badge gu-badge-${u.rol.toLowerCase()}`}>{ETIQUETA_ROL[u.rol] || u.rol}</span></td>
                                <td>{u.zona}</td>
                                <td>
                                    <span className={`gu-badge ${u.activo ? 'gu-badge-activo' : 'gu-badge-inactivo'}`}>
                                        {u.activo ? 'Activo' : 'Inactivo'}
                                    </span>
                                </td>
                                <td className="gu-acciones">
                                    <button className="gu-btn-editar" onClick={() => handleEditar(u)}>Editar</button>
                                    {esSuperAdmin && u.rol !== 'SUPERADMIN' && (
                                        <button className="gu-btn-modulos" onClick={() => abrirModulos(u)}>
                                            <i className="bi bi-grid-3x3-gap"></i> Módulos
                                        </button>
                                    )}
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
                        {advertenciaNombre && <p className="gu-advertencia">{advertenciaNombre}</p>}
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
                            {/* Espaciador para que Usuario y Contraseña queden en la misma fila */}
                            <div className="gu-field" />

                            {/* Correo comentado — el acceso es por usuario/contraseña definidos por el administrador */}
                            {/*
                            <div className="gu-field">
                                <label>Correo</label>
                                <input value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="Correo" disabled={!!editId}/>
                            </div>
                            */}

                            {/* Usuario y Contraseña en la misma fila */}
                            <div className={`gu-field${errores.username ? ' gu-field-error' : ''}`}>
                                <label>Usuario *</label>
                                <input
                                    value={form.username}
                                    onChange={e => {
                                        setForm({...form, username: e.target.value});
                                        if (errores.username) setErrores(prev => ({ ...prev, username: false }));
                                    }}
                                    placeholder="Ej: jgonzalez"
                                    disabled={!!editId && !!form._usernameOriginal}
                                />
                                {errores.username && (
                                    <span className="gu-error-msg">
                                        {!form.username.trim() ? 'Este campo es obligatorio' : 'Este usuario ya existe, elige otro'}
                                    </span>
                                )}
                                {!editId && (
                                    <span className="gu-field-nota">🔒 El usuario no podrá modificarse una vez asignado</span>
                                )}
                            </div>
                            <div className={`gu-field${errores.password ? ' gu-field-error' : ''}`}>
                                <label>Contraseña {editId ? '' : '*'}</label>
                                <div className="gu-pwd-wrapper">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={form.password}
                                        onChange={e => setForm({...form, password: e.target.value})}
                                        placeholder={editId ? 'Dejar vacío para no cambiar' : 'Contraseña'}
                                    />
                                    <button type="button" className="gu-pwd-toggle" onClick={() => setShowPassword(p => !p)} tabIndex={-1}>
                                        <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`} />
                                    </button>
                                </div>
                                {form.password && (
                                    <ul className="gu-pwd-reglas">
                                        {reglasPwd.map(r => (
                                            <li key={r.id} className={r.test(form.password) ? 'gu-pwd-ok' : 'gu-pwd-fail'}>
                                                {r.test(form.password) ? '✓' : '✗'} {r.label}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                {errores.password && !form.password && <span className="gu-error-msg">La contraseña es obligatoria</span>}
                            </div>

                            {/* Cargo y Dependencia debajo */}
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
                                <label>Zona {form.rol === 'CORRESPONDENCIA' ? <span style={{color:'#9ca3af',fontWeight:400}}>(opcional)</span> : ''}</label>
                                <select value={form.zona} onChange={e => setForm(p => ({ ...p, zona: e.target.value }))}>
                                    {form.rol === 'CORRESPONDENCIA' && <option value="">Sin zona</option>}
                                    {ZONAS.map(z => <option key={z} value={z}>{z}</option>)}
                                </select>
                            </div>
                        </div>
                        </div>{/* gu-modal-body */}
                        <div className="gu-modal-actions">
                            <button className="gu-btn-cancelar" onClick={() => { setShowModal(false); setErrores({}); setError(''); setAdvertenciaNombre(''); }}>Cancelar</button>
                            <button className="gu-btn-guardar" onClick={handleSubmit} disabled={loading}>
                                {loading ? 'Guardando...' : 'Guardar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* ── Modal Módulos Extra ── */}
        {showModulos && usuarioModulos && (
            <div className="gu-modal-overlay">
                <div className="gu-modal gu-modal-modulos">
                    <div className="gu-modulos-header">
                        <div>
                            <h2><i className="bi bi-grid-3x3-gap"></i> Módulos Extra</h2>
                            <p className="gu-modulos-sub">
                                {usuarioModulos.nombre} {usuarioModulos.apPaterno} —
                                <span className="gu-modulos-rol"> {usuarioModulos.rol}</span>
                            </p>
                        </div>
                        <button className="gu-modulos-close" onClick={() => setShowModulos(false)}>
                            <i className="bi bi-x-lg"></i>
                        </button>
                    </div>
                    <p className="gu-modulos-hint">
                        <i className="bi bi-info-circle"></i>
                        Activa módulos adicionales al rol base. Los módulos propios del rol no aparecen aquí.
                    </p>
                    <div className="gu-modulos-lista">
                        {modulosDisponiblesParaRol(usuarioModulos.rol).length === 0 ? (
                            <div style={{ textAlign: 'center', color: '#6b7280', padding: '24px 0', fontSize: 14 }}>
                                <i className="bi bi-check-circle" style={{ fontSize: 28, color: '#10b981', display: 'block', marginBottom: 8 }}></i>
                                Este rol ya tiene acceso a todos los módulos disponibles.
                            </div>
                        ) : Object.entries(
                            modulosDisponiblesParaRol(usuarioModulos.rol).reduce((acc, m) => {
                                if (!acc[m.grupo]) acc[m.grupo] = [];
                                acc[m.grupo].push(m);
                                return acc;
                            }, {})
                        ).map(([grupo, items]) => (
                            <div key={grupo} className="gu-modulos-grupo">
                                <div className="gu-modulos-grupo-titulo">{grupo}</div>
                                {items.map(({ modulo, label }) => {
                                    const activo = modulosActivos.find(m => m.modulo === modulo);
                                    return (
                                        <div key={modulo} className={`gu-modulo-fila${activo ? ' activo' : ''}`}>
                                            <label className="gu-modulo-check">
                                                <input type="checkbox" checked={!!activo}
                                                    onChange={() => toggleModulo(modulo)} />
                                                <span>{label}</span>
                                            </label>
                                            {activo && (
                                                <div className="gu-modulo-permisos">
                                                    <label><input type="checkbox" checked={activo.puedeCrear}
                                                        onChange={() => togglePermiso(modulo, 'puedeCrear')} /> Crear</label>
                                                    <label><input type="checkbox" checked={activo.puedeEditar}
                                                        onChange={() => togglePermiso(modulo, 'puedeEditar')} /> Editar</label>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                    <div className="gu-modal-actions">
                        <button className="gu-btn-cancelar" onClick={() => setShowModulos(false)}>Cancelar</button>
                        <button className="gu-btn-guardar" onClick={handleGuardarModulos} disabled={guardandoModulos}>
                            {guardandoModulos ? 'Guardando...' : 'Guardar Módulos'}
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
};

export default GestionUsuarios;
