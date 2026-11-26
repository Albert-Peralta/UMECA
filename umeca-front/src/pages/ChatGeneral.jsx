import { useEffect, useRef, useState } from 'react';
import { getMensajesChat, enviarMensajeChat, marcarVistoChat, getNoLeidosChat } from '../api/chatApi';
import { useAuth } from '../context/AuthContext';
import './ChatGeneral.css';

const normalizar = (txt) =>
    txt.toUpperCase()
        .replace(/[ÁÀÂÄ]/g, 'A').replace(/[ÉÈÊË]/g, 'E')
        .replace(/[ÍÌÎÏ]/g, 'I').replace(/[ÓÒÔÖ]/g, 'O')
        .replace(/[ÚÙÛÜ]/g, 'U');

const ROL_LABELS = {
    SUPERADMIN: 'Super Admin',
    ADMINISTRADOR: 'Administrador',
    SUPERVISION: 'Supervisión',
    EVALUADOR_RIESGO: 'Evaluador',
    CORRESPONDENCIA: 'Correspondencia',
};

function separadorFecha(dt) {
    const d = new Date(dt);
    const hoy = new Date();
    const ayer = new Date(); ayer.setDate(hoy.getDate() - 1);
    if (d.toDateString() === hoy.toDateString()) return 'Hoy';
    if (d.toDateString() === ayer.toDateString()) return 'Ayer';
    return d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ChatGeneral() {
    const { user } = useAuth();
    const [mensajes, setMensajes] = useState([]);
    const [texto, setTexto] = useState('');
    const [enviando, setEnviando] = useState(false);
    const [noLeidosAlAbrir, setNoLeidosAlAbrir] = useState(0);
    const bottomRef = useRef(null);
    const nuevosRef = useRef(null);
    const inputRef = useRef(null);
    const cursorRef = useRef(null);

    const cargar = async () => {
        try {
            const res = await getMensajesChat();
            setMensajes(res.data?.data || []);
        } catch { /* silencioso */ }
    };

    useEffect(() => {
        const init = async () => {
            try {
                const res = await getNoLeidosChat();
                setNoLeidosAlAbrir(res.data?.data ?? 0);
            } catch { /* silencioso */ }
            await cargar();
            marcarVistoChat().catch(() => {});
            inputRef.current?.focus();
        };
        init();
        const interval = setInterval(cargar, 15000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (nuevosRef.current) {
            nuevosRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [mensajes, noLeidosAlAbrir]);

    useEffect(() => {
        if (cursorRef.current !== null && inputRef.current) {
            inputRef.current.setSelectionRange(cursorRef.current, cursorRef.current);
            cursorRef.current = null;
        }
    }, [texto]);

    const enviar = async () => {
        const txt = texto.trim();
        if (!txt) return;
        setEnviando(true);
        try {
            await enviarMensajeChat(txt);
            setTexto('');
            await cargar();
        } catch { /* silencioso */ }
        finally {
            setEnviando(false);
            inputRef.current?.focus();
        }
    };

    const onKey = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); }
    };

    const fmtHora = (dt) => new Date(dt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

    // Agrupar por fecha e insertar separador de no leídos
    const grupos = [];
    let fechaActual = null;
    const primerNuevoIdx = noLeidosAlAbrir > 0 ? mensajes.length - noLeidosAlAbrir : -1;
    for (let i = 0; i < mensajes.length; i++) {
        const m = mensajes[i];
        if (i === primerNuevoIdx) grupos.push({ tipo: 'nuevos' });
        const sep = separadorFecha(m.fechaEnvio);
        if (sep !== fechaActual) { grupos.push({ tipo: 'sep', label: sep }); fechaActual = sep; }
        grupos.push({ tipo: 'msg', data: m });
    }

    const esMio = (m) => Number(m.autorId) === Number(user?.id);

    return (
        <div className="cg-page">
            <div className="cg-header">
                <i className="bi bi-people-fill" />
                <div>
                    <span className="cg-titulo">Chat General</span>
                    <span className="cg-subtitulo">Todas las áreas · {mensajes.length} mensajes</span>
                </div>
            </div>

            <div className="cg-mensajes">
                {grupos.length === 0 && (
                    <div className="cg-vacio">
                        <i className="bi bi-chat-dots" />
                        <p>Sé el primero en escribir algo.</p>
                    </div>
                )}
                {grupos.map((item, i) =>
                    item.tipo === 'nuevos' ? (
                        <div key="nuevos" ref={nuevosRef} className="cg-separador cg-separador--nuevos">
                            <span>Mensajes nuevos</span>
                        </div>
                    ) : item.tipo === 'sep' ? (
                        <div key={`sep-${i}`} className="cg-separador">
                            <span>{item.label}</span>
                        </div>
                    ) : (
                        <div key={item.data.id} className={`cg-burbuja-wrap ${esMio(item.data) ? 'cg-mio' : 'cg-otro'}`}>
                            <div className="cg-burbuja">
                                {!esMio(item.data) && (
                                    <div className="cg-autor">
                                        <span className="cg-autor-nombre">{item.data.autorNombre}</span>
                                    </div>
                                )}
                                <p className="cg-texto">{item.data.contenido}</p>
                                <span className="cg-hora">{fmtHora(item.data.fechaEnvio)}</span>
                            </div>
                        </div>
                    )
                )}
                <div ref={bottomRef} />
            </div>

            <div className="cg-input-wrap">
                <textarea
                    ref={inputRef}
                    className="cg-input"
                    placeholder="Escribe un mensaje..."
                    value={texto}
                    onChange={e => { cursorRef.current = e.target.selectionStart; const v = normalizar(e.target.value); if (v.length <= 500) setTexto(v); }}
                    onKeyDown={onKey}
                    rows={1}
                    maxLength={500}
                />
                <button className="cg-btn-enviar" onClick={enviar} disabled={enviando || !texto.trim()}>
                    <i className="bi bi-send-fill" />
                </button>
            </div>
        </div>
    );
}
