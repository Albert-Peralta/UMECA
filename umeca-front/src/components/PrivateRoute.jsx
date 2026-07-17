import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PrivateRoute = ({ children, roles }) => {
    const { user } = useAuth();

    // Doble verificación: contexto Y localStorage (cubre navegación por historial del browser)
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (!user || !token || !storedUser) return <Navigate to="/" replace />;

    if (roles && !roles.includes(user.rol)) {
        return <Navigate to="/unauthorized" replace />;
    }

    return children;
};

export default PrivateRoute;