import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import headerImg from '../assets/header-login.png';
import footerDorado from '../assets/footer-dorado.png';
import footerVerde from '../assets/footer-verde.png';
import './Login.css';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [errorTipo, setErrorTipo] = useState('error'); // 'error' | 'desactivada'
    const [loading, setLoading] = useState(false);
    const [bienvenida, setBienvenida] = useState(null); // { nombre, destino }
    const { login, logout } = useAuth();
    const navigate = useNavigate();

    // Al llegar al login (sea por logout, flecha de atrás o acceso directo),
    // se invalida cualquier sesión activa para que el forward no regrese al dashboard
    useEffect(() => {
        logout();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await api.post('/auth/login', { username, password });
            if (res.data.ok) {
                const { token, ...userData } = res.data.data;
                login(userData, token);
                const nombre = [userData.nombre, userData.apPaterno, userData.apMaterno].filter(Boolean).join(' ');
                const destino = userData.primerLogin ? '/primer-login' : '/dashboard';
                setBienvenida({ nombre, destino });
                setTimeout(() => navigate(destino), 1800);
            } else {
                const msg = res.data.message || '';
                setErrorTipo(msg.includes('desactivada') ? 'desactivada' : 'error');
                setError(msg);
                setLoading(false);
            }
        } catch (err) {
            const msg = err.response?.data?.message || 'Usuario o contraseña incorrectos';
            setErrorTipo(msg.includes('desactivada') ? 'desactivada' : 'error');
            setError(msg);
            setLoading(false);
        }
    };

    if (bienvenida) return (
        <div className="login-bienvenida">
            <div className="login-bienvenida-circulo">
                <i className="bi bi-check-lg login-bienvenida-check" />
            </div>
            <p className="login-bienvenida-texto">¡Bienvenido/a!</p>
            <p className="login-bienvenida-nombre">{bienvenida.nombre}</p>
        </div>
    );

    return (
        <div className="login-wrapper">
            <img src={headerImg} alt="Header" className="login-header-img" />

            <div className="login-body">
                <h1 className="login-title">Sistema de Gestión interna</h1>
                <p className="login-subtitle">
                    Dirección de la Unidad de Medidas Cautelares y Salidas Alternas para Adultos
                </p>

                <form className="login-form" onSubmit={handleSubmit}>
                    <label>Usuario</label>
                    <input
                        type="text"
                        placeholder="Ingresa tu usuario"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />

                    <label>Contraseña</label>
                    <input
                        type="password"
                        placeholder="Ingresa la contraseña"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />

                    {error && (
                        <div className={`login-error ${errorTipo === 'desactivada' ? 'login-error-desactivada' : ''}`}>
                            <i className={`bi ${errorTipo === 'desactivada' ? 'bi-lock-fill' : 'bi-exclamation-circle-fill'}`} />
                            {error}
                        </div>
                    )}

                    <button type="submit" disabled={loading}>
                        {loading ? 'Iniciando...' : 'Iniciar sesión'}
                    </button>

                    {/* <Link to="/forgot-password" className="login-forgot-link">
                        ¿Olvidaste tu contraseña?
                    </Link> */}
                </form>
            </div>
            
            <img src={footerVerde} alt="Footer verde" className="login-footer-verde" />
            <img src={footerDorado} alt="Footer dorado" className="login-footer-dorado" />
            
        </div>
    );
};

export default Login;