import { useEffect, useRef, useState } from 'react';
import { enviarMensaje, getHistorialMensajes, desactivarMensaje, activarMensaje, editarMensaje } from '../api/mensajeAdminApi';
import { useAuth } from '../context/AuthContext';
import ChatGeneral from './ChatGeneral';
import './MensajesAdmin.css';

const ZONA_LABELS = {
    XOCHITEPEC: 'Xochitepec',
    CUAUTLA: 'Cuautla',
    JOJUTLA: 'Jojutla',
    GENERAL: 'General',
};

const normalizar = (txt) =>
    txt.toUpperCase()
        .replace(/[ÁÀÂÄ]/g, 'A').replace(/[ÉÈÊË]/g, 'E')
        .replace(/[ÍÌÎÏ]/g, 'I').replace(/[ÓÒÔÖ]/g, 'O')
        .replace(/[ÚÙÛÜ]/g, 'U');

export default function MensajesAdmin({ defaultTab }) {
    const { user } = useAuth();
    const miNombre = user ? `${user.nombre || ''} ${user.apPaterno || ''}`.trim() : '';
    const esMio = (m) => m.enviadoPorNombre === miNombre;

    const [tab, setTab] = useState(defaultTab || 'mensajes');
    const [contenido, setContenido] = useState('');
    const [zona, setZona] = useState('GENERAL');
    const [enviando, setEnviando] = useState(false);
    const [historial, setHistorial] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [modalEditar, setModalEditar] = useState(null);
    const [editando, setEditando] = useState(false);
    const [editExito, setEditExito] = useState(false);
    const bottomRef = useRef(null);
    const inputRef = useRef(null);
    const cursorRef = useRef(null);

    const cargarHistorial = async () => {
        try {
            const res = await getHistorialMensajes();
            const lista = [...(res.data?.data || [])].reverse();
            setHistorial(lista);
        } catch { }
        finally { setCargando(false); }
    };

    useEffect(() => { cargarHistorial(); }, []);

    // Autofocus al montar y al cambiar al tab de mensajes
    useEffect(() => {
        if (tab === 'mensajes') inputRef.current?.focus();
    }, [tab]);

    useEffect(() => {
        if (cursorRef.current !== null && inputRef.current) {
            inputRef.current.setSelectionRange(cursorRef.current, cursorRef.current);
            cursorRef.current = null;
        }
    }, [contenido]);

    useEffect(() => {
        if (!cargando && tab === 'mensajes') {
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
        }
    }, [cargando, historial.length, tab]);

    const handleEnviar = async () => {
        if (!contenido.trim()) return;
        setEnviando(true);
        try {
            await enviarMensaje(contenido.trim(), zona);
            setContenido('');
            cargarHistorial();
        } catch { }
        finally { setEnviando(false); }
    };

    const onKey = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEnviar(); }
    };

    const handleDesactivar = async (id) => {
        try {
            await desactivarMensaje(id);
            setHistorial(h => h.map(m => m.id === id ? { ...m, activo: false } : m));
        } catch { }
    };

    const handleActivar = async (id) => {
        try {
            await activarMensaje(id);
            setHistorial(h => h.map(m => m.id === id ? { ...m, activo: true } : m));
        } catch { }
    };

    const handleGuardarEdicion = async () => {
        if (!modalEditar?.contenido?.trim()) return;
        setEditando(true); setEditExito(false);
        try {
            await editarMensaje(modalEditar.id, modalEditar.contenido.trim());
            setHistorial(h => h.map(m => m.id === modalEditar.id ? { ...m, contenido: modalEditar.contenido.trim() } : m));
            setEditExito(true);
            setTimeout(() => { setModalEditar(null); setEditExito(false); }, 1200);
        } catch { }
        finally { setEditando(false); }
    };

    const fmtHora = (dt) => {
        if (!dt) return '';
        return new Date(dt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    };

    const fmtFecha = (dt) => {
        if (!dt) return '';
        const d = new Date(dt);
        const hoy = new Date();
        const ayer = new Date(); ayer.setDate(hoy.getDate() - 1);
        if (d.toDateString() === hoy.toDateString()) return 'Hoy';
        if (d.toDateString() === ayer.toDateString()) return 'Ayer';
        return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
    };

    const grupos = historial.reduce((acc, m) => {
        const key = fmtFecha(m.fechaEnvio);
        if (!acc[key]) acc[key] = [];
        acc[key].push(m);
        return acc;
    }, {});

    const Tabs = () => (
        <div className="ma-tabs">
            <button className={`mp-tab${tab === 'mensajes' ? ' mp-tab--active' : ''}`} onClick={() => setTab('mensajes')}>
                <i className="bi bi-megaphone" /> Mensajes al personal
            </button>
            <button className={`mp-tab${tab === 'chat' ? ' mp-tab--active' : ''}`} onClick={() => setTab('chat')}>
                <i className="bi bi-people" /> Chat General
            </button>
        </div>
    );

    if (tab === 'chat') {
        return (
            <div className="ma-page-chat">
                <Tabs />
                <ChatGeneral />
            </div>
        );
    }

    return (
        <>
        <div className="ma-page-chat">
            <Tabs />
            <div className="ma-chat-wrap">
                <div className="ma-chat-header">
                    <i className="bi bi-megaphone-fill" />
                    <div>
                        <span className="ma-chat-titulo">Mensajes al personal</span>
                        <span className="ma-chat-sub">Solo los administradores pueden enviar comunicados</span>
                    </div>
                </div>

                <div className="ma-chat-mensajes">
                    {cargando ? (
                        <div className="ma-chat-vacio"><i className="bi bi-hourglass-split" /> Cargando...</div>
                    ) : historial.length === 0 ? (
                        <div className="ma-chat-vacio">
                            <i className="bi bi-megaphone" />
                            <p>No hay mensajes enviados aún.</p>
                        </div>
                    ) : (
                        Object.entries(grupos).map(([fecha, lista]) => (
                            <div key={fecha}>
                                <div className="ma-separador-fecha"><span>{fecha}</span></div>
                                {lista.map(m => (
                                    <div key={m.id} className={`ma-burbuja-wrap${!m.activo ? ' ma-burbuja-wrap--inactiva' : ''}${esMio(m) ? ' ma-burbuja-wrap--mio' : ''}`}>
                                        <div className="ma-burbuja">
                                            <div className="ma-burbuja-top">
                                                <span className="ma-burbuja-remitente">
                                                    <i className="bi bi-shield-fill-check" /> {m.enviadoPorNombre}
                                                </span>
                                                <span className={`ma-badge-zona ma-badge-zona--${m.zonaDestino?.toLowerCase()}`}>
                                                    {ZONA_LABELS[m.zonaDestino] || m.zonaDestino}
                                                </span>
                                            </div>
                                            <p className="ma-burbuja-texto">{m.contenido}</p>
                                            <div className="ma-burbuja-footer">
                                                <span className="ma-burbuja-hora">{fmtHora(m.fechaEnvio)}</span>
                                                {!m.activo && <span className="ma-retirado"><i className="bi bi-eye-slash" /> Retirado</span>}
                                                <div className="ma-burbuja-acciones">
                                                    <button className="ma-btn-ic ma-btn-ic--edit" onClick={() => setModalEditar({ id: m.id, contenido: m.contenido })} title="Editar">
                                                        <i className="bi bi-pencil" />
                                                    </button>
                                                    {m.activo ? (
                                                        <button className="ma-btn-ic ma-btn-ic--hide" onClick={() => handleDesactivar(m.id)} title="Ocultar">
                                                            <i className="bi bi-eye-slash" />
                                                        </button>
                                                    ) : (
                                                        <button className="ma-btn-ic ma-btn-ic--show" onClick={() => handleActivar(m.id)} title="Mostrar">
                                                            <i className="bi bi-eye" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))
                    )}
                    <div ref={bottomRef} />
                </div>

                <div className="ma-chat-input-wrap">
                    <div className="ma-zona-pills">
                        {Object.entries(ZONA_LABELS).map(([val, label]) => (
                            <button
                                key={val}
                                className={`ma-zona-pill${zona === val ? ' ma-zona-pill--active' : ''}`}
                                onClick={() => setZona(val)}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    <div className="ma-chat-input-row">
                        <textarea
                            ref={inputRef}
                            className="ma-chat-input"
                            placeholder="Escribe un comunicado..."
                            value={contenido}
                            onChange={e => { cursorRef.current = e.target.selectionStart; const v = normalizar(e.target.value); if (v.length <= 400) setContenido(v); }}
                            onKeyDown={onKey}
                            rows={1}
                            maxLength={400}
                        />
                        <button className="ma-chat-btn-enviar" onClick={handleEnviar} disabled={enviando || !contenido.trim()}>
                            <i className="bi bi-send-fill" />
                        </button>
                    </div>
                </div>
            </div>
        </div>

        {modalEditar && (
            <div className="ma-edit-overlay" onClick={() => setModalEditar(null)}>
                <div className="ma-edit-modal" onClick={e => e.stopPropagation()}>
                    <div className="ma-edit-header">
                        <span><i className="bi bi-pencil-fill" /> Editar mensaje</span>
                        <button className="ma-edit-cerrar" onClick={() => setModalEditar(null)}>
                            <i className="bi bi-x-lg" />
                        </button>
                    </div>
                    <div className="ma-edit-body">
                        <label className="ma-label">
                            Mensaje <span className="ma-contador">{modalEditar.contenido.length}/400</span>
                        </label>
                        <textarea
                            className="ma-textarea"
                            rows={4}
                            value={modalEditar.contenido}
                            onChange={e => {
                                const pos = e.target.selectionStart;
                                const v = normalizar(e.target.value);
                                if (v.length <= 400) {
                                    setModalEditar(prev => ({ ...prev, contenido: v }));
                                    requestAnimationFrame(() => {
                                        e.target.selectionStart = pos;
                                        e.target.selectionEnd = pos;
                                    });
                                }
                            }}
                        />
                        {editExito && (
                            <div className="ma-alert ma-alert--ok">
                                <i className="bi bi-check-circle-fill" /> Mensaje actualizado correctamente.
                            </div>
                        )}
                    </div>
                    <div className="ma-edit-footer">
                        <button className="ma-edit-btn-cancelar" onClick={() => setModalEditar(null)}>Cancelar</button>
                        <button className="ma-btn-enviar" onClick={handleGuardarEdicion} disabled={editando || !modalEditar.contenido.trim()}>
                            {editando ? <><i className="bi bi-hourglass-split" /> Guardando...</> : <><i className="bi bi-check-lg" /> Guardar</>}
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
}
