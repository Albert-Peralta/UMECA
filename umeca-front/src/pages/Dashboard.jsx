import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useFormGuard } from '../context/FormGuardContext';
import gobiernoImg from '../assets/gobierno-mexico.png';
import logoMorelos from '../assets/logo-morelos-nuevo.png';
import footerDorado from '../assets/footer-dorado.png';
import footerVerde from '../assets/footer-verde.png';
import './Dashboard.css';
import Historico from './Historico';
import GestionUsuarios from './GestionUsuarios';
import EntrevistaEncuadre from './EntrevistaEncuadre';
import Imputados from './Imputados';
import EvaluacionRiesgos from './EvaluacionRiesgos';
import SeguimientoCasos from './SeguimientoCasos';
import Supervision from './Supervision';
import Estadisticas from './Estadisticas';
import Bitacora from './Bitacora';
import ConsultaRegistros from './ConsultaRegistros';
import SuspensionCondicional from './SuspensionCondicional';
import ReporteDiario from './ReporteDiario';
import PrimerLogin from './PrimerLogin';
import Perfil from './Perfil';
import Correspondencia from './Correspondencia';
import ExpedientesAnteriores from './ExpedientesAnteriores';
import { getContadoresCorrespondencia } from '../api/correspondenciaApi';

// ── Menú por rol ──────────────────────────────────────────────────────────────
// Cada entrada puede ser un ítem de navegación (con key e icon) o un separador visual.
// La key coincide con el case en renderContent() y se persiste en localStorage.
const menuPorRol = {
    SUPERADMIN: [
        { separator: true,   label: 'General' },
        { key: 'imputados',  label: 'Imputados',              icon: 'bi bi-person' },
        { key: 'graficas',   label: 'Estadísticas',           icon: 'bi bi-bar-chart' },
        { key: 'reporte',    label: 'Reporte Diario',         icon: 'bi bi-clipboard-data' },
        { key: 'bitacora',   label: 'Bitácora',               icon: 'bi bi-journal-text' },
        { key: 'usuarios',   label: 'Gestión de usuarios',    icon: 'bi bi-people' },
        { separator: true,   label: 'Supervisión' },
        { key: 'entrevista', label: 'Entrevista de encuadre', icon: 'bi bi-journal-text' },
        { key: 'medidas',    label: 'Medidas y Suspensiones', icon: 'bi bi-card-checklist' },
        { key: 'supervision',label: 'Supervisión',            icon: 'bi bi-eye' },
        { separator: true,   label: 'Evaluación' },
        { key: 'evaluacion',  label: 'Evaluación de riesgos',  icon: 'bi bi-shield-check' },
        { key: 'consultas',   label: 'Consulta de Registros',  icon: 'bi bi-search' },
        { key: 'suspension',  label: 'Suspensión Condicional', icon: 'bi bi-hourglass-split' },
        { separator: true,   label: 'Oficios' },
        { key: 'correspondencia', label: 'Correspondencia',    icon: 'bi bi-envelope-paper' },
        { separator: true,   label: 'Histórico' },
        { key: 'expedientes', label: 'Expedientes Anteriores', icon: 'bi bi-archive' },
    ],
    ADMINISTRADOR: [
        { separator: true,   label: 'General' },
        { key: 'imputados',  label: 'Imputados',              icon: 'bi bi-person' },
        { key: 'graficas',   label: 'Estadísticas',           icon: 'bi bi-bar-chart' },
        { key: 'reporte',    label: 'Reporte Diario',         icon: 'bi bi-clipboard-data' },
        { key: 'bitacora',   label: 'Bitácora',               icon: 'bi bi-journal-text' },
        { separator: true,   label: 'Supervisión' },
        { key: 'entrevista', label: 'Entrevista de encuadre', icon: 'bi bi-journal-text' },
        { key: 'medidas',    label: 'Medidas y Suspensiones', icon: 'bi bi-card-checklist' },
        { key: 'supervision',label: 'Supervisión',            icon: 'bi bi-eye' },
        { separator: true,   label: 'Evaluación' },
        { key: 'evaluacion',  label: 'Evaluación de riesgos',  icon: 'bi bi-shield-check' },
        { key: 'consultas',   label: 'Consulta de Registros',  icon: 'bi bi-search' },
        { key: 'suspension',  label: 'Suspensión Condicional', icon: 'bi bi-hourglass-split' },
        { separator: true,   label: 'Oficios' },
        { key: 'correspondencia', label: 'Correspondencia',    icon: 'bi bi-envelope-paper' },
        { separator: true,   label: 'Histórico' },
        { key: 'expedientes', label: 'Expedientes Anteriores', icon: 'bi bi-archive' },
    ],
    SUPERVISION: [
        { separator: true,   label: 'General' },
        { key: 'imputados',  label: 'Imputados',              icon: 'bi bi-person' },
        { key: 'reporte',    label: 'Reporte Diario',         icon: 'bi bi-clipboard-data' },
        { separator: true,   label: 'Supervisión' },
        { key: 'entrevista', label: 'Entrevista de encuadre', icon: 'bi bi-journal-text' },
        { key: 'medidas',    label: 'Medidas y Suspensiones', icon: 'bi bi-card-checklist' },
        { key: 'supervision',label: 'Supervisión',            icon: 'bi bi-eye' },
        { separator: true,   label: 'Evaluación' },
        { key: 'evaluacion',  label: 'Evaluación de riesgos',  icon: 'bi bi-shield-check' },
        { key: 'consultas',   label: 'Consulta de Registros',  icon: 'bi bi-search' },
        { separator: true,   label: 'Oficios' },
        { key: 'correspondencia', label: 'Correspondencia',        icon: 'bi bi-envelope-paper' },
        { separator: true,   label: 'Histórico' },
        { key: 'expedientes',     label: 'Expedientes Anteriores', icon: 'bi bi-archive' },
    ],
    EVALUADOR_RIESGO: [
        { separator: true,   label: 'General' },
        { key: 'imputados',   label: 'Imputados',              icon: 'bi bi-people' },
        { key: 'reporte',     label: 'Reporte Diario',         icon: 'bi bi-clipboard-data' },
        { separator: true,   label: 'Supervisión' },
        { key: 'entrevista',  label: 'Entrevista de Encuadre', icon: 'bi bi-journal-text' },
        { key: 'medidas',     label: 'Medidas y Suspensiones', icon: 'bi bi-card-checklist' },
        { key: 'supervision', label: 'Supervisión',            icon: 'bi bi-eye' },
        { separator: true,   label: 'Evaluación' },
        { key: 'evaluacion',  label: 'Evaluación de riesgos',  icon: 'bi bi-shield-check' },
        { key: 'consultas',   label: 'Consulta de Registros',  icon: 'bi bi-search' },
        { key: 'suspension',  label: 'Suspensión Condicional', icon: 'bi bi-hourglass-split' },
        { separator: true,   label: 'Oficios' },
        { key: 'correspondencia', label: 'Correspondencia',        icon: 'bi bi-envelope-paper' },
        { separator: true,   label: 'Histórico' },
        { key: 'expedientes',     label: 'Expedientes Anteriores', icon: 'bi bi-archive' },
    ],
    CORRESPONDENCIA: [
        { separator: true,        label: 'General' },
        { key: 'graficas',        label: 'Estadísticas',        icon: 'bi bi-bar-chart' },
        { key: 'reporte',         label: 'Reporte Diario',      icon: 'bi bi-clipboard-data' },
        { separator: true,        label: 'Supervisión' },
        { key: 'entrevista',      label: 'Entrevista de encuadre', icon: 'bi bi-journal-text' },
        { separator: true,        label: 'Oficios' },
        { key: 'correspondencia', label: 'Correspondencia',     icon: 'bi bi-envelope-paper' },
    ],
};

// ── Shell principal del sistema ───────────────────────────────────────────────
// Controla la navegación entre módulos mediante activeMenu. El componente activo
// se monta en renderContent() sin desmontarse hasta que el usuario cambia de sección
// (lazy-mount por switch, no lazy import). La última sección visitada se restaura
// desde localStorage al recargar la página.
const Dashboard = () => {
    const { user, logout, login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const getValidKey = (hash) => {
        const items = menuPorRol[user?.rol] || [];
        const keys = [...items.filter(i => !i.separator).map(i => i.key), 'perfil'];
        const key = hash.replace('#', '');
        return keys.includes(key) ? key : (keys[0] || 'imputados');
    };

    const [activeMenu, setActiveMenu] = useState(() => getValidKey(window.location.hash));
    const [avatarSrc, setAvatarSrc] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [corrPendientes, setCorrPendientes] = useState(0);
    const [guardConfirm, setGuardConfirm] = useState(null); // key pendiente de navegar
    const { isFormDirty, setFormDirty } = useFormGuard();

    // Si el token desaparece (logout en otra pestaña o navegación por historial), cierra sesión
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            logout();
            navigate('/', { replace: true });
        }
    }, []);

    // Carga el avatar al montar y cuando cambia el usuario
    useEffect(() => {
        if (user?.id) {
            setAvatarSrc(localStorage.getItem(`avatar_${user.id}`) || null);
        }
    }, [user?.id]);

    // Carga y refresca el contador de correspondencia pendiente cada 10 s
    useEffect(() => {
        const tieneCorr = (menuPorRol[user?.rol] || []).some(i => i.key === 'correspondencia');
        // CORRESPONDENCIA solo registra; no tiene contadores de pendientes
        if (!tieneCorr || user?.rol === 'CORRESPONDENCIA') return;

        const rol = user?.rol;
        const esPersonal = rol === 'SUPERVISION' || rol === 'EVALUADOR_RIESGO';

        const cargarContadores = async () => {
            try {
                const res = await getContadoresCorrespondencia();
                if (res.data?.ok) {
                    const d = res.data.data || {};
                    setCorrPendientes(esPersonal ? (d.misAsignados || 0) : (d.pendientesAdmin || 0));
                }
            } catch { /* silencioso */ }
        };

        cargarContadores();
        // Polling cada 10 s para refrescar el badge rápidamente
        const id = setInterval(cargarContadores, 10_000);
        // Refresco inmediato cuando Correspondencia emite un cambio de asignación
        const handler = () => cargarContadores();
        window.addEventListener('corr-contadores-cambio', handler);
        return () => {
            clearInterval(id);
            window.removeEventListener('corr-contadores-cambio', handler);
        };
    }, [user?.rol]);

    // Sincroniza activeMenu con el hash cuando el usuario usa las flechas del navegador
    useEffect(() => {
        setActiveMenu(getValidKey(location.hash));
    }, [location.hash]);

    // Permite que cualquier módulo dispare window.dispatchEvent(new CustomEvent('navigate', {detail:'evaluacion'}))
    // para cambiar de sección sin pasar props hacia arriba.
    useEffect(() => {
        const handler = (e) => {
            const key = e.detail;
            const items = menuPorRol[user?.rol] || [];
            const keys = items.filter(i => !i.separator).map(i => i.key);
            // Rutas auxiliares: accesibles desde el expediente aunque no estén en el menú lateral
            const rutasAuxiliares = ['entrevista', 'medidas', 'evaluacion'];
            if (keys.includes(key) || rutasAuxiliares.includes(key)) navegarA(key);
        };
        window.addEventListener('navigate', handler);
        return () => window.removeEventListener('navigate', handler);
    }, [user?.rol]);

    // Escucha cambios de avatar desde Perfil (mismo tab)
    useEffect(() => {
        const handler = () => {
            if (user?.id) setAvatarSrc(localStorage.getItem(`avatar_${user.id}`) || null);
        };
        window.addEventListener('avatar-updated', handler);
        return () => window.removeEventListener('avatar-updated', handler);
    }, [user?.id]);

    // Cambia de sección actualizando el hash — el navegador registra la entrada en su historial
    const navegarA = useCallback((key) => {
        if (isFormDirty()) {
            setGuardConfirm(key);
            setSidebarOpen(false);
            return;
        }
        navigate(`/dashboard#${key}`);
        setSidebarOpen(false);
    }, [isFormDirty, navigate]);

    const confirmarNavegacion = () => {
        setFormDirty(false);
        navigate(`/dashboard#${guardConfirm}`);
        setGuardConfirm(null);
    };

    const handleLogout = () => {
        logout();
        navigate('/', { replace: true });
    };

    const getInitials = () => {
        if (!user) return 'U';
        return [user.nombre, user.apPaterno]
            .filter(Boolean).map(s => s.charAt(0).toUpperCase()).join('');
    };

    const nombreSidebar = [user?.nombre, user?.apPaterno].filter(Boolean).join(' ');

    const menuItems = menuPorRol[user?.rol] || [];

    const renderContent = () => {
    switch (activeMenu) {
        case 'historico': return <Historico />;
        case 'entrevista': return <EntrevistaEncuadre
            onNueva={() => {}}
            onVer={() => {}}
        />;
        case 'imputados': return <Imputados onNavigarEntrevista={(imp) => {
            // Pasa datos del imputado a EntrevistaEncuadre vía localStorage para pre-llenar el formulario
            localStorage.setItem('entrevistaPreset', JSON.stringify({ causaPenal: imp.causaPenal, nombre: imp.nombreCompleto }));
            navegarA('entrevista');
        }} />;
        case 'evaluacion': return <EvaluacionRiesgos />;
        case 'medidas':    return <SeguimientoCasos />;
        case 'supervision': return <Supervision />;
        case 'graficas': return <Estadisticas />;
        case 'usuarios': return <GestionUsuarios />;
        case 'bitacora':  return <Bitacora />;
        case 'consultas':   return <ConsultaRegistros />;
        case 'suspension':  return <SuspensionCondicional />;
        case 'reporte':          return <ReporteDiario />;
        case 'correspondencia':  return <Correspondencia />;
        case 'expedientes':      return <ExpedientesAnteriores />;
        case 'perfil':           return <Perfil />;
        default: {
            // Redirigir a la primera sección disponible fuera del render
            const primerKey = (menuPorRol[user?.rol] || []).find(i => !i.separator)?.key || 'imputados';
            setTimeout(() => navegarA(primerKey), 0);
            return null;
        }
    }
};

    return (
    <>
        {/* Modal confirmación cambio de módulo con formulario activo */}
        {guardConfirm && (
            <div className="guard-overlay">
                <div className="guard-modal">
                    <div className="guard-badge">
                        <div className="guard-badge-ring">
                            <i className="bi bi-file-earmark-x" />
                        </div>
                    </div>
                    <div className="guard-body">
                        <h3 className="guard-title">Cambios sin guardar</h3>
                        <p className="guard-msg">Si cambias de módulo ahora, <strong>perderás todo el progreso</strong> capturado en el formulario actual.</p>
                    </div>
                    <div className="guard-actions">
                        <button className="guard-btn-cancel" onClick={() => setGuardConfirm(null)}>
                            <i className="bi bi-pencil" /> Seguir editando
                        </button>
                        <button className="guard-btn-confirm" onClick={confirmarNavegacion}>
                            <i className="bi bi-box-arrow-right" /> Salir sin guardar
                        </button>
                    </div>
                </div>
            </div>
        )}
        {user?.primerLogin && (
            <PrimerLogin onCompletado={() => {
                const updatedUser = { ...user, primerLogin: false };
                login(updatedUser, localStorage.getItem('token'));
            }} />
        )}
        <div className="dashboard-wrapper">
            {/* Overlay para cerrar sidebar en móvil */}
            {sidebarOpen && (
                <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
            )}
            <aside className={`sidebar${sidebarOpen ? ' sidebar-open' : ''}`}>
                <div className="sidebar-logo">
                    <img src={logoMorelos} alt="Morelos" />
                </div>

                <nav className={`sidebar-nav${!menuItems.some(i => i.separator) ? ' sidebar-nav-pocos' : menuItems.filter(i => !i.separator).length >= 7 ? ' sidebar-nav-lleno' : ''}`}>
                    {menuItems.map((item, idx) =>
                        item.separator ? (
                            <div key={`sep-${idx}`} className="sidebar-separator">
                                <span>{item.label}</span>
                            </div>
                        ) : (
                            <button
                                key={item.key}
                                className={`sidebar-item ${activeMenu === item.key ? 'active' : ''}`}
                                onClick={() => navegarA(item.key)}
                            >
                                <i className={item.icon}></i>
                                <span style={{ flex: 1 }}>{item.label}</span>
                                {item.key === 'correspondencia' && corrPendientes > 0 && (
                                    <span className="sidebar-badge">{corrPendientes > 99 ? '99+' : corrPendientes}</span>
                                )}
                            </button>
                        )
                    )}
                </nav>

                <div className="sidebar-footer">
                    <div
                        className={`sidebar-user${activeMenu === 'perfil' ? ' active' : ''}`}
                        onClick={() => navegarA('perfil')}
                        title="Ver perfil"
                    >
                        {avatarSrc
                            ? <img src={avatarSrc} alt="avatar" className="sidebar-avatar sidebar-avatar-img" />
                            : <div className="sidebar-avatar">{getInitials()}</div>
                        }
                        <div className="sidebar-user-info">
                            <span className="sidebar-user-name">{nombreSidebar}</span>
                            <span className="sidebar-user-role">{user?.rol}</span>
                        </div>
                        <i className="bi bi-chevron-right sidebar-user-arrow" />
                    </div>
                    <button className="sidebar-logout" onClick={handleLogout}>
                        <i className="bi bi-box-arrow-right"></i> Cerrar Sesión
                    </button>
                </div>
            </aside>

            <div className="dashboard-main">
                <div className="dashboard-top-bar">
                    <img src={footerVerde} alt="" className="dashboard-top-verde" />
                    <div className="dashboard-header">
                        <button
                            className="hamburger-btn"
                            onClick={() => setSidebarOpen(prev => !prev)}
                            aria-label="Abrir menú"
                        >
                            <i className="bi bi-list"></i>
                        </button>
                        <h1>Dirección de la Unidad de Medidas Cautelares y Salidas Alternas para Adultos</h1>
                    </div>
                </div>

                <div className="dashboard-content">
                    <p className="dashboard-section-label">
                        {activeMenu === 'perfil'
                            ? 'PERFIL'
                            : menuItems.find(i => i.key === activeMenu)?.label?.toUpperCase()}
                    </p>
                    {renderContent()}
                </div>

                <div className="dashboard-bottom">
                    <img src={footerDorado} alt="" className="dashboard-footer-dorado" />
                </div>
            </div>
        </div>
    </>
    );
};

export default Dashboard;