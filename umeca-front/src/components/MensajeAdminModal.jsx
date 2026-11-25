import { useEffect, useState } from 'react';
import { getMisMensajes } from '../api/mensajeAdminApi';
import { useAuth } from '../context/AuthContext';
import './MensajeAdminModal.css';

const ROLES_ADMIN = ['ADMINISTRADOR', 'SUPERADMIN'];
const STORAGE_KEY = 'mensajes_admin_vistos';

function getVistos() {
    try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]'); }
    catch { return []; }
}

function marcarTodosVistos(ids) {
    const vistos = getVistos();
    const nuevos = ids.filter(id => !vistos.includes(id));
    if (nuevos.length > 0) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...vistos, ...nuevos]));
    }
}

export default function MensajeAdminModal({ bloqueado = false }) {
    const { user } = useAuth();
    const [mensajes, setMensajes] = useState([]);

    useEffect(() => {
        if (!user || ROLES_ADMIN.includes(user.rol)) return;

        const checkMensajes = async () => {
            try {
                const res = await getMisMensajes();
                const lista = res.data?.data || [];
                const vistos = getVistos();
                // Más antiguos primero (el backend devuelve DESC, invertimos)
                const nuevos = lista.filter(m => m.activo && !vistos.includes(m.id)).reverse();
                if (nuevos.length > 0) setMensajes(nuevos);
            } catch { /* silencioso */ }
        };

        checkMensajes();
        const interval = setInterval(checkMensajes, 2 * 60 * 1000);
        return () => clearInterval(interval);
    }, [user]);

    if (mensajes.length === 0 || bloqueado) return null;

    const cerrar = () => {
        marcarTodosVistos(mensajes.map(m => m.id));
        setMensajes([]);
    };

    const fmtHora = (dt) => {
        if (!dt) return '';
        return new Date(dt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
    };

    return (
        <div className="ma-overlay">
            <div className="ma-modal">
                <div className="ma-header">
                    <div className="ma-header-left">
                        <i className="bi bi-megaphone-fill ma-icon" />
                        <span className="ma-titulo">
                            {mensajes.length === 1
                                ? 'Mensaje del Administrador'
                                : `${mensajes.length} mensajes del Administrador`}
                        </span>
                    </div>
                    <button className="ma-cerrar" onClick={cerrar} title="Cerrar">
                        <i className="bi bi-x-lg" />
                    </button>
                </div>
                <div className="ma-body ma-body--lista">
                    {mensajes.map((m, i) => (
                        <div key={m.id} className="ma-item">
                            {mensajes.length > 1 && (
                                <span className="ma-item-num">{i + 1}</span>
                            )}
                            <div className="ma-item-contenido">
                                <p className="ma-contenido">{m.contenido}</p>
                                <span className="ma-meta">
                                    <i className="bi bi-person-fill" /> {m.enviadoPorNombre}
                                    &nbsp;&nbsp;<i className="bi bi-clock" /> {fmtHora(m.fechaEnvio)}
                                                    <span className="ma-zona-badge">
                                        {m.zonaDestino === 'GENERAL' || !m.zonaDestino ? 'GENERAL' : m.zonaDestino}
                                    </span>
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="ma-footer">
                    <button className="ma-btn-aceptar" onClick={cerrar}>
                        <i className="bi bi-check-lg" /> Entendido
                    </button>
                </div>
            </div>
        </div>
    );
}
