import { useEffect, useState } from 'react';
import { getMensajesNoLeidos, marcarMensajeLeido } from '../api/mensajeAdminApi';
import { useAuth } from '../context/AuthContext';
import './MensajeAdminModal.css';

const ROLES_ADMIN = ['ADMINISTRADOR', 'SUPERADMIN'];

export default function MensajeAdminModal({ bloqueado = false }) {
    const { user } = useAuth();
    const [mensajes, setMensajes] = useState([]);

    useEffect(() => {
        if (!user || ROLES_ADMIN.includes(user.rol)) return;

        const checkMensajes = async () => {
            try {
                const res = await getMensajesNoLeidos();
                const lista = res.data?.data || [];
                // Más antiguos primero
                if (lista.length > 0) setMensajes([...lista].reverse());
            } catch { /* silencioso */ }
        };

        checkMensajes();
        const interval = setInterval(checkMensajes, 30_000);
        return () => clearInterval(interval);
    }, [user]);

    if (mensajes.length === 0 || bloqueado) return null;

    const cerrar = async () => {
        // Marcar todos como leídos en el backend
        await Promise.allSettled(mensajes.map(m => marcarMensajeLeido(m.id)));
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
                </div>
                <div className="ma-body ma-body--lista">
                    {mensajes.map((m, i) => (
                        <div key={m.id} className="ma-item">
                            {mensajes.length > 1 && (
                                <span className="ma-item-num">{i + 1}</span>
                            )}
                            <div className="ma-item-contenido">
                                <span className="ma-item-remitente"><i className="bi bi-person-fill" /> {m.enviadoPorNombre}</span>
                                <p className="ma-contenido">{m.contenido}</p>
                                <span className="ma-item-fecha"><i className="bi bi-clock" /> {fmtHora(m.fechaEnvio)}</span>
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
