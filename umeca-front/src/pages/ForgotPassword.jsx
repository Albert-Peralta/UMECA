import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { forgotPassword } from '../api/authApi';
import headerImg from '../assets/header-login.png';
import footerDorado from '../assets/footer-dorado.png';
import footerVerde from '../assets/footer-verde.png';
import './Login.css';
import './ForgotPassword.css';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [enviado, setEnviado] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await forgotPassword(email);
            setEnviado(true);
        } catch {
            setError('Ocurrió un error. Intenta de nuevo.');
        }
        setLoading(false);
    };

    return (
        <div className="login-wrapper">
            <img src={headerImg} alt="Header" className="login-header-img" />

            <div className="login-body">
                <h1 className="login-title">Recuperar contraseña</h1>
                <p className="login-subtitle">
                    Dirección de la Unidad de Medidas Cautelares y Salidas Alternas para Adultos
                </p>

                {enviado ? (
                    <div className="fp-success-box">
                        <div className="fp-success-icon">✉️</div>
                        <p className="fp-success-title">¡Correo enviado!</p>
                        <p className="fp-success-msg">
                            Si el correo está registrado en el sistema, recibirás un enlace para restablecer tu contraseña. Revisa tu bandeja de entrada.
                        </p>
                        <button className="fp-btn-back" onClick={() => navigate('/')}>
                            Volver al inicio de sesión
                        </button>
                    </div>
                ) : (
                    <form className="login-form" onSubmit={handleSubmit}>
                        <label>Correo electrónico</label>
                        <input
                            type="email"
                            placeholder="Ingresa tu correo registrado"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />

                        {error && (
                            <div className="login-error">
                                <i className="bi bi-exclamation-circle-fill" />
                                {error}
                            </div>
                        )}

                        <button type="submit" disabled={loading}>
                            {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
                        </button>

                        <button type="button" className="fp-btn-cancel" onClick={() => navigate('/')}>
                            ← Volver al inicio de sesión
                        </button>
                    </form>
                )}
            </div>

            <img src={footerVerde} alt="Footer verde" className="login-footer-verde" />
            <img src={footerDorado} alt="Footer dorado" className="login-footer-dorado" />
        </div>
    );
};

export default ForgotPassword;
