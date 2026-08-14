import axios from 'axios';

// Usa el mismo host desde donde se cargó la página para funcionar
// en cualquier red sin cambiar configuración (desarrollo local o IP de red local)
const apiBase = `http://${window.location.hostname}:8089/api`;

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

// Mensajes descriptivos por código de error HTTP
const MENSAJES_ERROR = {
    400: 'Datos incorrectos. Verifica que todos los campos estén bien capturados.',
    401: 'Sesión expirada. Por favor inicia sesión nuevamente.',
    403: 'No tienes permiso para realizar esta acción.',
    404: 'El recurso solicitado no fue encontrado.',
    409: 'Ya existe un registro con esa información.',
    413: 'El archivo es demasiado grande para ser enviado.',
    422: 'Los datos enviados no son válidos. Revisa el formulario.',
    500: 'Error interno del servidor. Intenta de nuevo o contacta al administrador.',
    503: 'El servidor no está disponible en este momento. Intenta más tarde.',
};

// Verifica si el JWT en localStorage ya expiró
const tokenExpirado = () => {
    const token = localStorage.getItem('token');
    if (!token) return false;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.exp && payload.exp * 1000 < Date.now();
    } catch { return false; }
};

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;
        const isLoginRoute = error.config?.url?.includes('/auth/login');

        // 401: sesión inválida/expirada
        // 403 con token expirado: Spring Security devuelve 403 en lugar de 401
        //     cuando no hay AuthenticationEntryPoint configurado
        // Solo cerrar sesión si HAY token pero es inválido/expirado
        const tieneToken = !!localStorage.getItem('token');
        if (!isLoginRoute && tieneToken && (status === 401 || (status === 403 && tokenExpirado()))) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.replace('/');
        }

        // Adjuntar mensaje descriptivo al error para que los componentes lo usen
        const mensajeBackend = error.response?.data?.message;
        error.mensajeDescriptivo = mensajeBackend || MENSAJES_ERROR[status] || `Error inesperado (${status || 'sin conexión'}).`;
        return Promise.reject(error);
    }
);

export default api;