import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Unauthorized from './pages/Unauthorized';
import PrimerLogin from './pages/PrimerLogin';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

const App = () => {
    return (
        <AuthProvider>
        <ToastProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<Login />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/unauthorized" element={<Unauthorized />} />
                    <Route
                        path="/primer-login"
                        element={
                            <PrivateRoute roles={['ADMINISTRADOR', 'SUPERVISION', 'EVALUADOR_RIESGO']}>
                                <PrimerLogin onCompletado={() => window.location.replace('/dashboard')} />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/dashboard"
                        element={
                            <PrivateRoute roles={['ADMINISTRADOR', 'SUPERVISION', 'EVALUADOR_RIESGO']}>
                                <Dashboard />
                            </PrivateRoute>
                        }
                    />
                </Routes>
            </BrowserRouter>
        </ToastProvider>
        </AuthProvider>
    );
};

export default App;