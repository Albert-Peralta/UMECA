import { useNavigate } from 'react-router-dom';

const Unauthorized = () => {
    const navigate = useNavigate();

    return (
        <div style={{ textAlign: 'center', padding: '100px 20px' }}>
            <h1 style={{ color: '#376842', fontSize: '48px' }}>403</h1>
            <h2>Acceso no autorizado</h2>
            <p>No tienes permisos para acceder a esta página.</p>
            <button
                onClick={() => navigate('/')}
                style={{
                    backgroundColor: '#376842',
                    color: 'white',
                    border: 'none',
                    padding: '10px 24px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '16px'
                }}
            >
                Volver al inicio
            </button>
        </div>
    );
};

export default Unauthorized;