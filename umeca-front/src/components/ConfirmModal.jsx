export default function ConfirmModal({ titulo, mensaje, onConfirmar, onCancelar, cargando = false, labelConfirmar = 'Sí, eliminar' }) {
    return (
        <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300 }}
            onClick={() => !cargando && onCancelar()}
        >
            <div
                style={{ background: '#fff', borderRadius: 14, width: '90%', maxWidth: 420, boxShadow: '0 16px 50px rgba(0,0,0,0.22)', overflow: 'hidden' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header rojo */}
                <div style={{ background: '#dc2626', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '22px 0 18px', borderRadius: '14px 14px 0 0' }}>
                    <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className="bi bi-trash3-fill" style={{ fontSize: '1.4rem', color: '#fff' }} />
                    </div>
                </div>
                {/* Contenido */}
                <div style={{ padding: '12px 28px 24px', textAlign: 'center' }}>
                    <h3 style={{ margin: '0 0 8px', fontSize: '1rem', fontWeight: 800, color: '#111827' }}>{titulo}</h3>
                    <p style={{ margin: 0, fontSize: '0.88rem', color: '#6b7280', lineHeight: 1.6 }}>{mensaje}</p>
                </div>
                {/* Botones */}
                <div style={{ display: 'flex', borderTop: '1px solid #f3f4f6', padding: '14px 20px', gap: 10, justifyContent: 'flex-end', background: '#f9fafb' }}>
                    <button
                        onClick={onCancelar}
                        disabled={cargando}
                        style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer' }}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirmar}
                        disabled={cargando}
                        style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', opacity: cargando ? 0.7 : 1 }}
                    >
                        {cargando ? 'Eliminando...' : labelConfirmar}
                    </button>
                </div>
            </div>
        </div>
    );
}
