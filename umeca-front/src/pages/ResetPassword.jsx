import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword, validateResetToken } from '../api/authApi';
import headerImg from '../assets/header-login.png';
import footerDorado from '../assets/footer-dorado.png';
import footerVerde from '../assets/footer-verde.png';
import './Login.css';
import './ForgotPassword.css';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();

    const [password, setPassword] = useState('');
    const [confirmar, setConfirmar] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [exito, setExito] = useState(false);
    const [tokenValido, setTokenValido] = useState(null); // null=cargando, true=ok, false=inválido

    useEffect(() => {
        if (!token) { navigate('/'); return; }
        validateResetToken(token)
            .then(res => setTokenValido(res.data.ok))
            .catch(() => setTokenValido(false));
    }, [token, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password.length < 8) {
            setError('La contraseña debe tener al menos 8 caracteres.');
            return;
        }
        if (password !== confirmar) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        setLoading(true);
        try {
            const res = await resetPassword(token, password);
            if (res.data.ok) {
                setExito(true);
                setTimeout(() => navigate('/'), 2500);
            } else {
                setError(res.data.message || 'Error al restablecer la contraseña.');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'El enlace no es válido o ha expirado.');
        }
        setLoading(false);
    };

    if (tokenValido === null) return (
        <div className="login-bienvenida" style={{background:'#f4f6f4'}}>
            <p style={{color:'#555', fontSize:'1rem'}}>Verificando enlace...</p>
        </div>
    );

    if (tokenValido === false) return (
        <div className="login-wrapper">
            <img src={headerImg} alt="Header" className="login-header-img" />
            <div className="login-body">
                <div className="fp-success-box" style={{borderColor:'#e57373', background:'#fdecea'}}>
                    <div className="fp-success-icon">⛔</div>
                    <p className="fp-success-title" style={{color:'#c0392b'}}>Enlace inválido o expirado</p>
                    <p className="fp-success-msg">
                        Este enlace ya fue usado o han pasado más de 10 minutos. Solicita uno nuevo.
                    </p>
                    <button className="fp-btn-back" onClick={() => navigate('/forgot-password')}>
                        Solicitar nuevo enlace
                    </button>
                </div>
            </div>
            <img src={footerVerde} alt="" className="login-footer-verde" />
            <img src={footerDorado} alt="" className="login-footer-dorado" />
        </div>
    );

    if (exito) return (
        <div className="login-bienvenida">
            <div className="login-bienvenida-circulo">
                <i className="bi bi-check-lg login-bienvenida-check" />
            </div>
            <p className="login-bienvenida-texto">¡Contraseña restablecida!</p>
            <p className="login-bienvenida-nombre">Redirigiendo al inicio de sesión...</p>
        </div>
    );

    return (
        <div className="login-wrapper">
            <img src={headerImg} alt="Header" className="login-header-img" />

            <div className="login-body">
                <h1 className="login-title">Nueva contraseña</h1>
                <p className="login-subtitle">
                    Dirección de la Unidad de Medidas Cautelares y Salidas Alternas para Adultos
                </p>

                <form className="login-form" onSubmit={handleSubmit}>
                    <label>Nueva contraseña</label>
                    <input
                        type="password"
                        placeholder="Mínimo 8 caracteres"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />

                    <label>Confirmar contraseña</label>
                    <input
                        type="password"
                        placeholder="Repite la contraseña"
                        value={confirmar}
                        onChange={(e) => setConfirmar(e.target.value)}
                        required
                    />

                    {error && (
                        <div className="login-error">
                            <i className="bi bi-exclamation-circle-fill" />
                            {error}
                        </div>
                    )}

                    <button type="submit" disabled={loading}>
                        {loading ? 'Guardando...' : 'Guardar nueva contraseña'}
                    </button>
                </form>
            </div>

            <img src={footerVerde} alt="Footer verde" className="login-footer-verde" />
            <img src={footerDorado} alt="Footer dorado" className="login-footer-dorado" />
        </div>
    );
};

export default ResetPassword;
