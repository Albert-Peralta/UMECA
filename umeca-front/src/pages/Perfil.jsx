import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import './Perfil.css';

const ROL_LABEL = {
    ADMINISTRADOR:    'Administrador',
    SUPERVISION:       'Supervisión',
    EVALUADOR_RIESGO: 'Evaluador de Riesgos',
};

const ZONA_LABEL = {
    XOCHITEPEC: 'Xochitepec',
    CUAUTLA:    'Cuautla',
    JOJUTLA:    'Jojutla',
};

const Campo = ({ label, valor }) => (
    <div className="pf-campo">
        <span className="pf-campo-label">{label}</span>
        <span className="pf-campo-valor">{valor || '—'}</span>
    </div>
);

const Perfil = () => {
    const { user } = useAuth();
    const fileRef = useRef();

    // Avatar: se guarda en localStorage por usuario
    const avatarKey = `avatar_${user?.id}`;
    const [avatarSrc,    setAvatarSrc]    = useState(() => localStorage.getItem(avatarKey) || null);
    const [avatarZoom,   setAvatarZoom]   = useState(false);

    // Cambio de contraseña
    const [showPass, setShowPass]   = useState(false);
    const [passForm, setPassForm]   = useState({ actual: '', nueva: '', confirmar: '' });
    const [passMsg,  setPassMsg]    = useState(null);   // { ok, texto }
    const [loading,  setLoading]    = useState(false);

    const iniciales = [user?.nombre, user?.apPaterno]
        .filter(Boolean).map(s => s.charAt(0).toUpperCase()).join('');

    const nombreCompleto = [user?.nombre, user?.apPaterno, user?.apMaterno]
        .filter(Boolean).join(' ');

    /* ── Cambiar foto ── */
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const dataUrl = ev.target.result;
            localStorage.setItem(avatarKey, dataUrl);
            setAvatarSrc(dataUrl);
            window.dispatchEvent(new Event('avatar-updated'));
        };
        reader.readAsDataURL(file);
    };

    /* ── Cambiar contraseña ── */
    const handleCambiarPass = async (e) => {
        e.preventDefault();
        if (!passForm.actual) {
            setPassMsg({ ok: false, texto: 'Ingresa tu contraseña actual.' });
            return;
        }
        if (passForm.nueva !== passForm.confirmar) {
            setPassMsg({ ok: false, texto: 'Las contraseñas nuevas no coinciden.' });
            return;
        }
        if (passForm.nueva.length < 8) {
            setPassMsg({ ok: false, texto: 'La contraseña debe tener al menos 8 caracteres.' });
            return;
        }
        if (!/[A-Z]/.test(passForm.nueva)) {
            setPassMsg({ ok: false, texto: 'La contraseña debe contener al menos una mayúscula.' });
            return;
        }
        if (!/[a-z]/.test(passForm.nueva)) {
            setPassMsg({ ok: false, texto: 'La contraseña debe contener al menos una minúscula.' });
            return;
        }
        if (!/[0-9]/.test(passForm.nueva)) {
            setPassMsg({ ok: false, texto: 'La contraseña debe contener al menos un número.' });
            return;
        }
        if (!/[!@#$%&*?]/.test(passForm.nueva)) {
            setPassMsg({ ok: false, texto: 'La contraseña debe contener al menos un carácter especial (!@#$%&*?).' });
            return;
        }
        setLoading(true);
        setPassMsg(null);
        try {
            // 1. Verificar contraseña actual
            const verif = await api.post('/auth/verificar-password', { password: passForm.actual });
            if (!verif.data.ok || !verif.data.data) {
                setPassMsg({ ok: false, texto: 'La contraseña actual es incorrecta.' });
                setLoading(false);
                return;
            }
            // 2. Cambiar contraseña
            const res = await api.patch(`/users/${user.id}/cambiar-password`, { password: passForm.nueva });
            if (res.data.ok) {
                setPassMsg({ ok: true, texto: 'Contraseña actualizada correctamente.' });
                setPassForm({ actual: '', nueva: '', confirmar: '' });
                setTimeout(() => setShowPass(false), 2000);
            } else {
                setPassMsg({ ok: false, texto: res.data.message });
            }
        } catch {
            setPassMsg({ ok: false, texto: 'Error al actualizar la contraseña.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="pf-wrapper">

            {/* ── Encabezado con avatar ── */}
            <div className="pf-header">
                <div className="pf-avatar-wrap">
                    {avatarSrc
                        ? <img src={avatarSrc} alt="avatar" className="pf-avatar-img"
                               onClick={() => setAvatarZoom(true)} title="Ver foto" style={{ cursor: 'zoom-in' }} />
                        : <div className="pf-avatar">{iniciales}</div>
                    }
                    <button className="pf-avatar-edit" onClick={() => fileRef.current.click()} title="Cambiar foto">
                        <i className="bi bi-camera-fill" />
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFileChange} />
                </div>

                {/* Modal zoom avatar */}
                {avatarZoom && (
                    <div className="pf-zoom-overlay" onClick={() => setAvatarZoom(false)}>
                        <img src={avatarSrc} alt="avatar" className="pf-zoom-img" onClick={e => e.stopPropagation()} />
                        <button className="pf-zoom-close" onClick={() => setAvatarZoom(false)}>
                            <i className="bi bi-x-lg" />
                        </button>
                    </div>
                )}
                <div className="pf-header-info">
                    <h2 className="pf-nombre">{nombreCompleto}</h2>
                    <span className="pf-rol-badge">{ROL_LABEL[user?.rol] ?? user?.rol}</span>
                    {/* <span className="pf-email">{user?.email}</span> */}
                </div>
            </div>

            {/* ── Secciones ── */}
            <div className="pf-secciones">

                <div className="pf-card">
                    <div className="pf-card-header">
                        <i className="bi bi-person-lines-fill" />
                        <span>Datos personales</span>
                    </div>
                    <div className="pf-card-body">
                        <Campo label="Nombre"             valor={user?.nombre} />
                        <Campo label="Apellido paterno"   valor={user?.apPaterno} />
                        <Campo label="Apellido materno"   valor={user?.apMaterno} />
                        {/* Correo electrónico comentado — el acceso es por usuario/contraseña definidos por el administrador */}
                        {/* <Campo label="Correo electrónico" valor={user?.email} /> */}
                        <Campo label="Identificador"      valor={user?.identificador} />
                    </div>
                </div>

                <div className="pf-card">
                    <div className="pf-card-header">
                        <i className="bi bi-building" />
                        <span>Información institucional</span>
                    </div>
                    <div className="pf-card-body">
                        <Campo label="Cargo"          valor={user?.cargo} />
                        <Campo label="Dependencia"    valor={user?.dependencia} />
                        <Campo label="Zona"           valor={ZONA_LABEL[user?.zona] ?? user?.zona} />
                        <Campo label="Rol del sistema" valor={ROL_LABEL[user?.rol] ?? user?.rol} />
                    </div>
                </div>

            </div>

            {/* ── Cambiar contraseña ── */}
            <div className="pf-card pf-card-pass">
                <div className="pf-card-header" style={{ cursor: 'pointer' }} onClick={() => { setShowPass(v => !v); setPassMsg(null); }}>
                    <i className="bi bi-lock-fill" />
                    <span>Cambiar contraseña</span>
                    <i className={`bi bi-chevron-${showPass ? 'up' : 'down'} pf-pass-toggle`} />
                </div>

                {showPass && (
                    <form className="pf-pass-form" onSubmit={handleCambiarPass}>
                        <div className="pf-pass-fields">
                            <div className="pf-pass-field pf-pass-field-full">
                                <label>Contraseña actual</label>
                                <input
                                    type="password"
                                    placeholder="Ingresa tu contraseña actual"
                                    value={passForm.actual}
                                    onChange={e => setPassForm(f => ({ ...f, actual: e.target.value }))}
                                    required
                                />
                            </div>
                            <div className="pf-pass-field">
                                <label>Nueva contraseña</label>
                                <input
                                    type="password"
                                    placeholder="Mín. 8 caracteres, mayúscula, minúscula, número y especial"
                                    value={passForm.nueva}
                                    onChange={e => setPassForm(f => ({ ...f, nueva: e.target.value }))}
                                    required
                                />
                            </div>
                            <div className="pf-pass-field">
                                <label>Confirmar nueva contraseña</label>
                                <input
                                    type="password"
                                    placeholder="Repite la nueva contraseña"
                                    value={passForm.confirmar}
                                    onChange={e => setPassForm(f => ({ ...f, confirmar: e.target.value }))}
                                    required
                                />
                            </div>
                        </div>

                        {passMsg && (
                            <div className={`pf-pass-msg ${passMsg.ok ? 'ok' : 'err'}`}>
                                <i className={`bi ${passMsg.ok ? 'bi-check-circle-fill' : 'bi-exclamation-circle-fill'}`} />
                                {passMsg.texto}
                            </div>
                        )}

                        <div className="pf-pass-actions">
                            <button type="button" className="pf-btn-cancel" onClick={() => { setShowPass(false); setPassMsg(null); setPassForm({ actual: '', nueva: '', confirmar: '' }); }}>
                                Cancelar
                            </button>
                            <button type="submit" className="pf-btn-save" disabled={loading}>
                                {loading ? <><i className="bi bi-arrow-repeat" /> Guardando...</> : <><i className="bi bi-check-lg" /> Actualizar contraseña</>}
                            </button>
                        </div>
                    </form>
                )}
            </div>

        </div>
    );
};

export default Perfil;
