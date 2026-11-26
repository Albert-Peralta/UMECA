import { useEffect, useRef, useState } from 'react';
import { getMisMensajes } from '../api/mensajeAdminApi';
import ChatGeneral from './ChatGeneral';
import './MensajesPersonal.css';

export default function MensajesPersonal({ defaultTab }) {
    const [tab, setTab] = useState(defaultTab || 'comunicados');
    const [mensajes, setMensajes] = useState([]);
    const [cargando, setCargando] = useState(true);
    const bottomRef = useRef(null);

    useEffect(() => {
        const cargar = async () => {
            try {
                const res = await getMisMensajes();
                const lista = [...(res.data?.data || [])].filter(m => m.activo).reverse();
                setMensajes(lista);
            } catch { /* silencioso */ }
            finally { setCargando(false); }
        };
        cargar();
        const intervalo = setInterval(cargar, 2 * 60 * 1000);
        return () => clearInterval(intervalo);
    }, []);

    // Scroll automático al último mensaje cuando cargan los datos o se cambia al tab comunicados
    useEffect(() => {
        if (!cargando && tab === 'comunicados') {
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
        }
    }, [cargando, tab]);

    const fmtFecha = (dt) => {
        if (!dt) return '';
        const d = new Date(dt);
        const hoy = new Date();
        const ayer = new Date(); ayer.setDate(hoy.getDate() - 1);
        if (d.toDateString() === hoy.toDateString()) return 'Hoy';
        if (d.toDateString() === ayer.toDateString()) return 'Ayer';
        return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
    };

    const fmtHora = (dt) => {
        if (!dt) return '';
        return new Date(dt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    };

    // Agrupar por fecha manteniendo orden ascendente
    const grupos = mensajes.reduce((acc, m) => {
        const key = fmtFecha(m.fechaEnvio);
        if (!acc[key]) acc[key] = [];
        acc[key].push(m);
        return acc;
    }, {});
    // Object.entries mantiene el orden de inserción, que ya es ascendente

    return (
        <div className="mp-page">
            <div className="mp-tabs">
                <button className={`mp-tab${tab === 'comunicados' ? ' mp-tab--active' : ''}`} onClick={() => setTab('comunicados')}>
                    <i className="bi bi-megaphone" /> Comunicados
                </button>
                <button className={`mp-tab${tab === 'chat' ? ' mp-tab--active' : ''}`} onClick={() => setTab('chat')}>
                    <i className="bi bi-people" /> Chat General
                </button>
            </div>

            {tab === 'chat' ? <ChatGeneral /> : (<>
            <div className="mp-header">
                <div className="mp-header-avatar">
                    <i className="bi bi-megaphone-fill" />
                </div>
                <div className="mp-header-info">
                    <div className="mp-header-nombre">Comunicados del Administrador</div>
                    <div className="mp-header-sub">Solo lectura — solo el administrador puede enviar mensajes</div>
                </div>
            </div>

            <div className="mp-chat">
                {cargando ? (
                    <div className="mp-cargando"><i className="bi bi-hourglass-split" /> Cargando mensajes...</div>
                ) : mensajes.length === 0 ? (
                    <div className="mp-vacio">
                        <i className="bi bi-chat-square-dots" />
                        <p>No hay comunicados aún.</p>
                    </div>
                ) : (
                    Object.entries(grupos).map(([fecha, lista]) => (
                        <div key={fecha}>
                            <div className="mp-separador-fecha">
                                <span>{fecha}</span>
                            </div>
                            {lista.map(m => (
                                <div key={m.id} className="mp-burbuja-wrap">
                                    <div className={`mp-burbuja${!m.activo ? ' mp-burbuja--inactiva' : ''}`}>
                                        <div className="mp-burbuja-remitente">
                                            <i className="bi bi-shield-fill-check" /> {m.enviadoPorNombre}
                                        </div>
                                        <p className="mp-burbuja-texto">{m.contenido}</p>
                                        <div className="mp-burbuja-meta">
                                            <span className="mp-hora">{fmtHora(m.fechaEnvio)}</span>
                                            {!m.activo && <span className="mp-retirado"><i className="bi bi-eye-slash" /> Retirado</span>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))
                )}
                <div ref={bottomRef} />
            </div>
            </>)}
        </div>
    );
}
