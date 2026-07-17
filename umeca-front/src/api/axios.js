import axios from 'axios';

// Usa el mismo host desde donde se cargó la página para funcionar
// en cualquier red sin cambiar configuración (desarrollo local o IP de red local)
const apiBase = `http://${window.location.hostname}:8080/api`;

const api = axios.create({
    baseURL: apiBase,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Adjunta el JWT de localStorage en cada petición saliente
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Si el backend responde 401 (token expirado o inválido), limpia la sesión
// y redirige al login, excepto cuando el 401 viene del propio endpoint de login.
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            const isLoginRoute = error.config.url.includes('/auth/login');
            if (!isLoginRoute) {
                localStorage.clear();
                window.location.replace('/');
            }
        }
        return Promise.reject(error);
    }
);

export default api;