import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './PrintConsulta.css';
import logo from '../assets/logo-morelos-nuevo.png';
import footerDorado from '../assets/footer-dorado.png';

const hoy = (fechaStr, mayusculas = false) => {
    if (!fechaStr) return '___________';
    const [y, m, d] = fechaStr.split('-');
    const meses = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
    const mesesMin = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    if (mayusculas) return `${d} DE ${meses[parseInt(m) - 1]} DE ${y}`;
    return `${parseInt(d)} de ${mesesMin[parseInt(m) - 1]} del año ${y}`;
};

const PrintConsulta = ({ consulta: d, onCerrar }) => {
    const docRef = useRef(null);
    const initialHtml = useRef(null);
    const [imprimiendo, setImprimiendo] = useState(false);
    const [guardadoEn, setGuardadoEn] = useState(null);
    const storageKey = `umeca-consulta-${d?.id || d?.causaPenal || 'nueva'}`;

    // Al montar: guarda el HTML inicial, luego aplica el guardado si existe
    const handleMounted = (el) => {
        if (!el) return;
        if (!initialHtml.current) initialHtml.current = el.innerHTML; // guardar antes de sobreescribir
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            el.innerHTML = saved;
            const meta = localStorage.getItem(storageKey + '-meta');
            if (meta) setGuardadoEn(meta);
        }
    };

    const handleRestaurar = () => {
        if (!window.confirm('¿Restaurar el documento original? Se perderán los cambios editados.')) return;
        localStorage.removeItem(storageKey);
        localStorage.removeItem(storageKey + '-meta');
        setGuardadoEn(null);
        if (docRef.current && initialHtml.current) {
            docRef.current.innerHTML = initialHtml.current;
        }
    };

    const handleInput = () => {
        if (!docRef.current) return;
        localStorage.setItem(storageKey, docRef.current.innerHTML);
        const ahora = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
        localStorage.setItem(storageKey + '-meta', ahora);
        setGuardadoEn(ahora);
    };

    // Construir lista de imputados: primero el principal, luego los adicionales del JSON
    const listaImputados = (() => {
        const lista = [{
            nombre: [d.apPaternoImputado, d.apMaternoImputado, d.nombreImputado].filter(Boolean).join(' ').toUpperCase(),
            fechaNacimiento: d.fechaNacimientoImputado,
        }];
        if (d.imputadosJson) {
            try {
                const adicionales = JSON.parse(d.imputadosJson);
                adicionales.forEach(imp => {
                    lista.push({
                        nombre: [imp.apPaterno, imp.apMaterno, imp.nombre].filter(Boolean).join(' ').toUpperCase(),
                        fechaNacimiento: imp.fechaNacimiento,
                    });
                });
            } catch { /* ignorar */ }
        }
        return lista;
    })();

    const esPositivo = d.resultado === 'POSITIVO';

    const handleImprimir = async () => {
        setImprimiendo(true);
        try {
            const html2pdf = (await import('html2pdf.js')).default;
            const el       = docRef.current;
            const footerEl = el.querySelector('.pco-footer');

            el.style.width     = '720px';
            el.style.margin    = '0';
            el.style.boxShadow = 'none';
            el.style.padding   = '14px 22px';
            el.style.minHeight = 'unset';

            if (footerEl) {
                el.getBoundingClientRect();
                const gap = Math.max(20, 1280 - el.scrollHeight);
                footerEl.style.marginTop = gap + 'px';
            }

            const blobUrl = await html2pdf()
                .set({
                    margin:      [8, 14, 10, 14],
                    image:       { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2, useCORS: true, logging: false, windowWidth: 720 },
                    jsPDF:       { unit: 'mm', format: 'legal', orientation: 'portrait' },
                    pagebreak:   { mode: ['css', 'legacy'], avoid: ['.pco-header', '.pco-firma-bloque', 'tr'] },
                })
                .from(el)
                .output('bloburl');

            if (footerEl) footerEl.style.marginTop = '';
            el.style.width     = '';
            el.style.margin    = '';
            el.style.boxShadow = '';
            el.style.padding   = '';
            el.style.minHeight = '';

            window.open(blobUrl, '_blank');
        } catch (err) {
            console.error('Error al generar PDF:', err);
        } finally {
            setImprimiendo(false);
        }
    };

    const content = (
        <div className="pco-overlay">
            {imprimiendo && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                    <style>{`@keyframes pco-spin { to { transform: rotate(360deg); } }`}</style>
                    <div style={{ width: 52, height: 52, border: '5px solid rgba(255,255,255,0.15)', borderTop: '5px solid #376842', borderRadius: '50%', animation: 'pco-spin 0.8s linear infinite' }} />
                    <p style={{ color: 'white', fontSize: 15, fontWeight: 600, margin: 0, letterSpacing: 0.5 }}>Generando PDF...</p>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, margin: 0 }}>Por favor espera un momento</p>
                </div>
            )}
            {/* Toolbar */}
            <div className="pco-toolbar">
                <span className="pco-toolbar-title">Vista previa — Oficio de Consulta</span>
                <span className="pco-toolbar-hint">
                    <i className="bi bi-pencil-square" /> Haz clic en el documento para editar
                </span>
                <div className="pco-toolbar-actions">
                    {guardadoEn && (
                        <>
                            <span className="pco-guardado-en">
                                <i className="bi bi-cloud-check" /> Guardado {guardadoEn}
                            </span>
                            <button className="pco-btn-restaurar" onClick={handleRestaurar}>
                                <i className="bi bi-arrow-counterclockwise" /> Restaurar
                            </button>
                        </>
                    )}
                    <button className="pco-btn-cerrar" onClick={onCerrar}>✕ Cerrar</button>
                    <button className="pco-btn-imprimir" onClick={handleImprimir} disabled={imprimiendo}>
                        <i className="bi bi-printer-fill" /> {imprimiendo ? 'Generando...' : 'Imprimir'}
                    </button>
                </div>
            </div>

            {/* Documento — pco-legal da el ancho/padding de pantalla; ref apunta aquí para el PDF */}
            <div ref={el => { docRef.current = el; handleMounted(el); }}
                 onInput={handleInput}
                 className="pco-documento pco-legal">

                {/* Encabezado */}
                <div className="pco-header">
                    <div className="pco-header-izq">
                        <img src={logo} alt="Morelos" className="pco-logo" />
                    </div>
                    <div contentEditable suppressContentEditableWarning
                         className="pco-header-right pco-editable">
                        <p className="pco-inst-1">Secretaría de Seguridad y Protección Ciudadana</p>
                        <p className="pco-inst-2">Coordinación del Sistema Penitenciario</p>
                        <p className="pco-inst-2">Dirección General de Reinserción Social</p>
                        <p className="pco-inst-2">Dirección de la Unidad de Medidas Cautelares</p>
                        <p className="pco-inst-2">y Salidas Alternas para Adultos</p>
                        {(() => {
                            const fecha = d.fechaSolicitud ? new Date(d.fechaSolicitud + 'T00:00:00') : new Date();
                            const mes = String(fecha.getMonth() + 1).padStart(2, '0');
                            const anio = fecha.getFullYear();
                            const folio = d.folioConsecutivo
                                ? String(d.folioConsecutivo).padStart(4, '0')
                                : '____';
                            return <p className="pco-folio">SSyPC/CSP/DGRS/DUMCySA/<strong>{folio}/{mes}/{anio}</strong></p>;
                        })()}
                        <p className="pco-lugar">Xochitepec, Morelos; a {hoy(d.fechaSolicitud)}</p>
                        <p className="pco-carpeta">
                            Carpeta de Investigación: <strong>{d.causaPenal || '___________'}</strong>
                        </p>
                    </div>
                </div>

                <div className="pco-separador" />

                {/* Destinatario */}
                <div contentEditable suppressContentEditableWarning
                     className="pco-destinatario pco-editable">
                    <p className="pco-dest-nombre">{d.quienSolicita?.toUpperCase() || '___________'}</p>
                    <p className="pco-dest-cargo">{d.cargoSolicitante?.toUpperCase() || ''}</p>
                    {d.dependenciaSolicitante && (
                        <p className="pco-dest-cargo">{d.dependenciaSolicitante.toUpperCase()}</p>
                    )}
                    <p className="pco-presente">P R E S E N T E.</p>
                </div>

                {/* Párrafo 1 */}
                <p contentEditable suppressContentEditableWarning className="pco-parrafo pco-editable">
                    Con fundamento en lo dispuesto por los artículos 105, 176, 177 fracción XI, del Código Nacional de
                    Procedimientos Penales, así como en atención a su oficio número:{' '}
                    <strong>{d.oficioNumero || '___________'}</strong>, de fecha {hoy(d.fechaSolicitud)}, donde solicita
                    informe si se cuenta con registro, Averiguación Previa, carpeta de Investigación, Acuerdo reparatorio,
                    Suspensión Condicional del Proceso abreviado y/o de procedimientos simplificados o abreviado o si
                    cuenta con algún procedimiento pendiente, respecto de la(s) persona(s) que se describe(n) a
                    continuación:
                </p>

                {/* Tabla de imputado(s) */}
                <table className="pco-tabla-imp">
                    <thead>
                        <tr>
                            <th>NOMBRE</th>
                            <th>FECHA DE NACIMIENTO</th>
                        </tr>
                    </thead>
                    <tbody>
                        {listaImputados.map((imp, i) => (
                            <tr key={i}>
                                <td>{imp.nombre || '___________'}</td>
                                <td>{imp.fechaNacimiento ? hoy(imp.fechaNacimiento, true) : '___________'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Párrafo resultado */}
                {esPositivo ? (
                    <p contentEditable suppressContentEditableWarning className="pco-parrafo pco-editable">
                        Derivado de lo anterior, me permito hacer de su conocimiento que, una vez realizada la consulta
                        en las bases de datos a disposición de esta Dirección de la Unidad de Medidas Cautelares y
                        Salidas Alternas para Adultos,{' '}
                        <strong>SI SE CUENTA CON REGISTRO</strong>, por cuanto a la{' '}
                        <strong>SUPERVISIÓN CONDICIONAL Y MEDIDAS CAUTELARES EN LIBERTAD</strong>
                        , de la causa penal:
                    </p>
                ) : (
                    <p contentEditable suppressContentEditableWarning className="pco-parrafo pco-editable">
                        Derivado de lo anterior, me permito hacer de su conocimiento que, una vez realizada la consulta
                        en las bases de datos a disposición de esta Dirección de la Unidad de Medidas Cautelares y
                        Salidas Alternas para Adultos,{' '}
                        <strong>NO SE CUENTA CON REGISTRO</strong> de la(s) persona(s) antes descrita(s) en esta
                        Dirección de la Unidad de Medidas Cautelares y Salidas Alternas para Adultos.
                    </p>
                )}

                {esPositivo && d.observaciones && (
                    <div className="pco-detalle-reg">
                        <p className="pco-parrafo">{d.observaciones}</p>
                    </div>
                )}

                <p contentEditable suppressContentEditableWarning className="pco-parrafo pco-editable">
                    Es importante mencionar que, esta Autoridad de acuerdo al Código Nacional de Procedimientos Penales,
                    únicamente tiene como objeto el seguimiento de las medidas cautelares y de la supervisión condicional
                    del proceso, debiendo destacar que se desconoce respecto a los acuerdos reparatorios, procedimientos
                    simplificados o abreviados.
                </p>

                <p contentEditable suppressContentEditableWarning className="pco-parrafo pco-editable">
                    Sin otro particular, aprovecho la ocasión para enviarle un cordial saludo.
                </p>

                {/* Firma */}
                <div className="pco-firma-bloque">
                    <p className="pco-atentamente">A T E N T A M E N T E</p>
                    <div className="pco-firmas pco-firmas-director">
                        <div contentEditable suppressContentEditableWarning
                             className="pco-firma-col pco-firma-col-centro pco-editable">
                            <p className="pco-firma-nombre">LIC. REY GIOVANNI RIVAS SANDOVAL</p>
                            <p className="pco-firma-cargo">DIRECTOR DE LA UNIDAD DE MEDIDAS CAUTELARES</p>
                            <p className="pco-firma-cargo">Y SALIDAS ALTERNAS PARA ADULTOS.</p>
                        </div>
                    </div>
                    <div className="pco-firmas pco-firmas-bottom">
                        <div contentEditable suppressContentEditableWarning
                             className="pco-firma-col pco-firma-col-lateral pco-editable">
                            <p className="pco-firma-label-sm">ELABORÓ</p>
                            <p className="pco-firma-nombre-sm">[Nombre del elaborador]</p>
                        </div>
                        <div contentEditable suppressContentEditableWarning
                             className="pco-firma-col pco-firma-col-lateral pco-editable">
                            <p className="pco-firma-label-sm">REVISÓ</p>
                            <p className="pco-firma-nombre-sm">[Nombre del revisor]</p>
                        </div>
                        <div contentEditable suppressContentEditableWarning
                             className="pco-firma-col pco-firma-col-lateral pco-editable">
                            <p className="pco-firma-label-sm">AUTORIZÓ</p>
                            <p className="pco-firma-nombre-sm">[Nombre del autorizador]</p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="pco-footer">
                    <img src={footerDorado} alt="" className="pco-footer-img" />
                    <p className="pco-footer-fecha">
                        Documento generado el {new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
            </div>
        </div>
    );

    return createPortal(content, document.body);
};

export default PrintConsulta;
