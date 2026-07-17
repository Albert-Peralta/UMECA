import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import './PrimerLogin.css';

const PrimerLogin = ({ onCompletado }) => {
    const { user, login } = useAuth();
    const [form, setForm] = useState({
        passwordActual: '',
        nuevaPassword: '',
        confirmarPassword: '',
    });
    const [verPass, setVerPass] = useState({ actual: false, nueva: false, confirmar: false });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const validar = () => {
        if (!form.passwordActual) return 'Ingresa tu contraseña temporal';
        if (form.nuevaPassword.length < 8) return 'La contraseña debe tener al menos 8 caracteres';
        if (!/[A-Z]/.test(form.nuevaPassword)) return 'Debe contener al menos una mayúscula';
        if (!/[0-9]/.test(form.nuevaPassword)) return 'Debe contener al menos un número';
        if (!/[!@#$%&*?]/.test(form.nuevaPassword)) return 'Debe contener al menos un carácter especial (!@#$%&*?)';
        if (form.nuevaPassword !== form.confirmarPassword) return 'Las contraseñas no coinciden';
        return null;
    };

    const handleGuardar = async () => {
        const errorMsg = validar();
        if (errorMsg) { setError(errorMsg); return; }

        setLoading(true);
        setError('');
        try {
            await api.post('/auth/verificar-password', { password: form.passwordActual });
            await api.patch(`/users/${user.id}/cambiar-password`, { password: form.nuevaPassword });

            const updatedUser = { ...user, primerLogin: false };
            login(updatedUser, localStorage.getItem('token'));
            onCompletado();
        } catch (e) {
            setError(e.response?.data?.message || 'Error al cambiar la contraseña');
        }
        setLoading(false);
    };

    return (
        <div className="pl-overlay">
            <div className="pl-card">
                <div className="pl-header">
                    <h2>Bienvenido, {user?.nombre}</h2>
                    <p>Por seguridad debes cambiar tu contraseña antes de continuar</p>
                </div>

                <div className="pl-body">
                    {error && <div className="pl-error">{error}</div>}

                    <div className="pl-field">
                        <label>Contraseña temporal (asignada por el administrador)</label>
                        <div className="pl-input-wrapper">
                            <input
                                type={verPass.actual ? 'text' : 'password'}
                                placeholder="Ingresa tu contraseña temporal"
                                value={form.passwordActual}
                                onChange={e => setForm({...form, passwordActual: e.target.value})}
                            />
                            <button type="button" className="pl-toggle-pass" onClick={() => setVerPass({...verPass, actual: !verPass.actual})}>
                                <i className={`bi ${verPass.actual ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                            </button>
                        </div>
                    </div>

                    <div className="pl-field">
                        <label>Nueva contraseña</label>
                        <div className="pl-input-wrapper">
                            <input
                                type={verPass.nueva ? 'text' : 'password'}
                                placeholder="Mínimo 8 caracteres"
                                value={form.nuevaPassword}
                                onChange={e => setForm({...form, nuevaPassword: e.target.value})}
                            />
                            <button type="button" className="pl-toggle-pass" onClick={() => setVerPass({...verPass, nueva: !verPass.nueva})}>
                                <i className={`bi ${verPass.nueva ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                            </button>
                        </div>
                    </div>

                    <div className="pl-field">
                        <label>Confirmar nueva contraseña</label>
                        <div className="pl-input-wrapper">
                            <input
                                type={verPass.confirmar ? 'text' : 'password'}
                                placeholder="Repite tu nueva contraseña"
                                value={form.confirmarPassword}
                                onChange={e => setForm({...form, confirmarPassword: e.target.value})}
                            />
                            <button type="button" className="pl-toggle-pass" onClick={() => setVerPass({...verPass, confirmar: !verPass.confirmar})}>
                                <i className={`bi ${verPass.confirmar ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                            </button>
                        </div>
                    </div>

                    <div className="pl-requisitos">
                        <p>La contraseña debe tener:</p>
                        <ul>
                            <li className={form.nuevaPassword.length >= 8 ? 'pl-ok' : ''}>Mínimo 8 caracteres</li>
                            <li className={/[A-Z]/.test(form.nuevaPassword) ? 'pl-ok' : ''}>Al menos una mayúscula</li>
                            <li className={/[0-9]/.test(form.nuevaPassword) ? 'pl-ok' : ''}>Al menos un número</li>
                            <li className={/[!@#$%&*?]/.test(form.nuevaPassword) ? 'pl-ok' : ''}>Al menos un carácter especial (!@#$%&*?)</li>
                        </ul>
                    </div>

                    <button className="pl-btn" onClick={handleGuardar} disabled={loading}>
                        {loading ? 'Guardando...' : 'Cambiar contraseña y continuar'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PrimerLogin;