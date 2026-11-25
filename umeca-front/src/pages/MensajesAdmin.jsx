import { useEffect, useState } from 'react';
import { enviarMensaje, getHistorialMensajes, desactivarMensaje, activarMensaje, editarMensaje } from '../api/mensajeAdminApi';
import './MensajesAdmin.css';

const ZONA_LABELS = {
    XOCHITEPEC: 'Xochitepec',
    CUAUTLA: 'Cuautla',
    JOJUTLA: 'Jojutla',
    GENERAL: 'General (todas)',
};

export default function MensajesAdmin() {
    const [contenido, setContenido] = useState('');

    const normalizar = (txt) =>
        txt
            .toUpperCase()
            .replace(/[ÁÀÂÄ]/g, 'A')
            .replace(/[ÉÈÊË]/g, 'E')
            .replace(/[ÍÌÎÏ]/g, 'I')
            .replace(/[ÓÒÔÖ]/g, 'O')
            .replace(/[ÚÙÛÜ]/g, 'U');
    const [zona, setZona] = useState('GENERAL');
    const [enviando, setEnviando] = useState(false);
    const [exito, setExito] = useState('');
    const [error, setError] = useState('');
    const [historial, setHistorial] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [modalEditar, setModalEditar] = useState(null); // { id, contenido }
    const [editando, setEditando] = useState(false);
    const [editExito, setEditExito] = useState(false);

    const cargarHistorial = async () => {
        try {
            const res = await getHistorialMensajes();
            setHistorial(res.data?.data || []);
        } catch { /* silencioso */ }
        finally { setCargando(false); }
    };

    useEffect(() => { cargarHistorial(); }, []);

    const handleEnviar = async () => {
        if (!contenido.trim()) { setError('Escribe un mensaje antes de enviar.'); return; }
        setEnviando(true);
        setError('');
        setExito('');
        try {
            await enviarMensaje(contenido.trim(), zona);
            setExito('Mensaje enviado correctamente.');
            setContenido('');
            cargarHistorial();
        } catch {
            setError('No se pudo enviar el mensaje. Intenta de nuevo.');
        } finally { setEnviando(false); }
    };

    const handleDesactivar = async (id) => {
        try {
            await desactivarMensaje(id);
            setHistorial(h => h.map(m => m.id === id ? { ...m, activo: false } : m));
        } catch { /* silencioso */ }
    };

    const handleGuardarEdicion = async () => {
        if (!modalEditar?.contenido?.trim()) return;
        setEditando(true);
        setEditExito(false);
        try {
            await editarMensaje(modalEditar.id, modalEditar.contenido.trim());
            setHistorial(h => h.map(m => m.id === modalEditar.id ? { ...m, contenido: modalEditar.contenido.trim() } : m));
            setEditExito(true);
            setTimeout(() => { setModalEditar(null); setEditExito(false); }, 1200);
        } catch { /* silencioso */ }
        finally { setEditando(false); }
    };

    const handleActivar = async (id) => {
        try {
            await activarMensaje(id);
            setHistorial(h => h.map(m => m.id === id ? { ...m, activo: true } : m));
        } catch { /* silencioso */ }
    };

    const fmtFecha = (dt) => {
        if (!dt) return '';
        return new Date(dt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
    };

    return (
        <>
        <div className="ma-page">
            <div className="ma-page-header">
                <i className="bi bi-megaphone-fill" />
                <div>
                    <h2 className="ma-page-titulo">Mensajes al personal</h2>
                    <p className="ma-page-subtitulo">Envía comunicados por zona. Solo aparecen una vez por sesión a cada usuario.</p>
                </div>
            </div>

            <div className="ma-card">
                <div className="ma-card-titulo"><i className="bi bi-send-fill" /> Nuevo mensaje</div>
                <div className="ma-form">
                    <label className="ma-label">Zona de destino</label>
                    <div className="ma-zona-btns">
                        {Object.entries(ZONA_LABELS).map(([val, label]) => (
                            <button
                                key={val}
                                className={`ma-zona-btn${zona === val ? ' ma-zona-btn--active' : ''}`}
                                onClick={() => setZona(val)}
                            >
                                {val === 'GENERAL' && <i className="bi bi-globe2" />}
                                {label}
                            </button>
                        ))}
                    </div>

                    <label className="ma-label">Mensaje <span className="ma-contador">{contenido.length}/400</span></label>
                    <textarea
                        className="ma-textarea"
                        placeholder="Escribe el comunicado para el personal..."
                        value={contenido}
                        onChange={e => { const v = normalizar(e.target.value); if (v.length <= 400) setContenido(v); }}
                        rows={4}
                        maxLength={400}
                    />

                    {exito && <div className="ma-alert ma-alert--ok"><i className="bi bi-check-circle-fill" /> {exito}</div>}
                    {error && <div className="ma-alert ma-alert--err"><i className="bi bi-exclamation-triangle-fill" /> {error}</div>}

                    <div className="ma-form-acciones">
                        <span className="ma-zona-preview">
                            Enviando a: <strong>{ZONA_LABELS[zona]}</strong>
                        </span>
                        <button className="ma-btn-enviar" onClick={handleEnviar} disabled={enviando || !contenido.trim()}>
                            {enviando
                                ? <><i className="bi bi-hourglass-split" /> Enviando...</>
                                : <><i className="bi bi-send-fill" /> Enviar mensaje</>
                            }
                        </button>
                    </div>
                </div>
            </div>

            <div className="ma-card">
                <div className="ma-card-titulo"><i className="bi bi-clock-history" /> Historial de mensajes</div>
                {cargando ? (
                    <div className="ma-cargando"><i className="bi bi-hourglass-split" /> Cargando...</div>
                ) : historial.length === 0 ? (
                    <div className="ma-vacio"><i className="bi bi-inbox" /> No hay mensajes enviados aún.</div>
                ) : (
                    <div className="ma-tabla-wrap">
                        <table className="ma-tabla">
                            <thead>
                                <tr>
                                    <th>Mensaje</th>
                                    <th>Zona</th>
                                    <th>Enviado por</th>
                                    <th>Fecha y hora</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {historial.map(m => (
                                    <tr key={m.id} className={!m.activo ? 'ma-fila-inactiva' : ''}>
                                        <td className="ma-celda-mensaje">{m.contenido}</td>
                                        <td>
                                            <span className={`ma-badge-zona ma-badge-zona--${m.zonaDestino?.toLowerCase()}`}>
                                                {ZONA_LABELS[m.zonaDestino] || m.zonaDestino}
                                            </span>
                                        </td>
                                        <td>{m.enviadoPorNombre}</td>
                                        <td className="ma-celda-fecha">{fmtFecha(m.fechaEnvio)}</td>
                                        <td>
                                            {m.activo
                                                ? <span className="ma-estado-activo"><i className="bi bi-broadcast" /> Activo</span>
                                                : <span className="ma-estado-inactivo"><i className="bi bi-eye-slash" /> Inactivo</span>
                                            }
                                        </td>
                                        <td>
                                            <div className="ma-acciones-grupo">
                                                <button
                                                    className="ma-btn-editar"
                                                    onClick={() => setModalEditar({ id: m.id, contenido: m.contenido })}
                                                    title="Editar"
                                                >
                                                    <i className="bi bi-pencil" />
                                                </button>
                                                {m.activo ? (
                                                    <button className="ma-btn-desactivar" onClick={() => handleDesactivar(m.id)} title="Desactivar">
                                                        <i className="bi bi-eye-slash" />
                                                    </button>
                                                ) : (
                                                    <button className="ma-btn-activar" onClick={() => handleActivar(m.id)} title="Reactivar">
                                                        <i className="bi bi-eye" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>

        {/* ── Modal editar mensaje ── */}
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
                        <button className="ma-edit-btn-cancelar" onClick={() => setModalEditar(null)}>
                            Cancelar
                        </button>
                        <button
                            className="ma-btn-enviar"
                            onClick={handleGuardarEdicion}
                            disabled={editando || !modalEditar.contenido.trim()}
                        >
                            {editando ? <><i className="bi bi-hourglass-split" /> Guardando...</> : <><i className="bi bi-check-lg" /> Guardar</>}
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
}
