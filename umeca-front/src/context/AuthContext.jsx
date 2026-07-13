import { createContext, useContext, useState } from 'react';

/**
 * Contexto global de autenticación.
 * Expone { user, login, logout, updateUser } a toda la app mediante useAuth().
 * El estado se persiste en localStorage para sobrevivir recargas de página.
 */
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    // Inicializa desde localStorage para no perder la sesión al recargar
    const [user, setUser] = useState(() => {
        const stored = localStorage.getItem('user');
        return stored ? JSON.parse(stored) : null;
    });

    /** Guarda token y datos del usuario tras un login exitoso. */
    const login = (userData, token) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
    };

    /** Actualiza campos específicos del usuario sin hacer un nuevo login. */
    const updateUser = (fields) => {
        const updated = { ...user, ...fields };
        localStorage.setItem('user', JSON.stringify(updated));
        setUser(updated);
    };

    const logout = () => {
        // Conservar avatares antes de limpiar para que no desaparezcan al volver a entrar
        const avatars = {};
        Object.keys(localStorage)
            .filter(k => k.startsWith('avatar_'))
            .forEach(k => { avatars[k] = localStorage.getItem(k); });

        localStorage.clear();

        // Restaurar avatares
        Object.entries(avatars).forEach(([k, v]) => localStorage.setItem(k, v));

        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
};

/** Hook de conveniencia para acceder al contexto de autenticación. */
export const useAuth = () => useContext(AuthContext);