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

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;
        if (status === 401) {
            const isLoginRoute = error.config.url.includes('/auth/login');
            if (!isLoginRoute) {
                localStorage.clear();
                window.location.replace('/');
            }
        }
        // Adjuntar mensaje descriptivo al error para que los componentes lo usen
        const mensajeBackend = error.response?.data?.message;
        error.mensajeDescriptivo = mensajeBackend || MENSAJES_ERROR[status] || `Error inesperado (${status || 'sin conexión'}).`;
        return Promise.reject(error);
    }
);

export default api;