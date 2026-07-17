import { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import logoMorelos from '../assets/logo-morelos-nuevo.png';
import footerDorado from '../assets/footer-dorado.png';
import './PrintEntrevista.css';

const TIPO_SEGUIMIENTO_NOMBRE = {
    MC: 'Medidas Cautelares',
    SCP: 'Suspensión Condicional del Proceso',
};

const val = (v) => v || '—';
const yesno = (v) => v ? 'Sí' : 'No';

const Row = ({ label, value, half = false }) => (
    <div className={`pr-field ${half ? 'pr-half' : ''}`}>
        <span className="pr-label">{label}</span>
        <span className="pr-value">{val(value)}</span>
    </div>
);

const SectionTitle = ({ children }) => (
    <div className="pr-section-title">{children}</div>
);

const PrintEntrevista = ({ entrevista: e, onCerrar, autoImprimir = false }) => {
    const docRef = useRef(null);
    const [imprimiendo, setImprimiendo] = useState(false);

    const handlePrint = async () => {
        setImprimiendo(true);
        try {
            const { default: html2pdf } = await import('html2pdf.js');
            const el = docRef.current;
            const h2cOpts = { scale: 1.5, useCORS: true, logging: false, windowWidth: 720 };

            el.style.width = '720px'; el.style.margin = '0';
            el.style.boxShadow = 'none'; el.style.padding = '14px 22px';
            el.style.minHeight = 'unset';

            // Capturar header como imagen (desde dentro del documento para respetar el padding)
            const headerWrapEl = el.querySelector('.pr-header-wrap');
            const headerCanvas = await html2pdf().set({ html2canvas: h2cOpts }).from(headerWrapEl).toCanvas().get('canvas');
            const headerImgData = headerCanvas.toDataURL('image/jpeg', 0.98);
            headerWrapEl.style.display = 'none';

            const marginL = 10, marginR = 10, marginTop = 11;
            const contentW = 215.9 - marginL - marginR;
            // El pr-documento tiene padding 7mm izq y 7mm der — el header se captura desde adentro
            // así que la imagen ocupa (contentW - 14mm) y se desplaza 7mm a la derecha
            const docPadL = 6;
            const docPadR = 11.5;
            const headerX = marginL + docPadL;
            const headerW = contentW - docPadL - docPadR;
            const headerH = (headerCanvas.height / headerCanvas.width) * headerW;
            const topMargin = marginTop + headerH + 1;

            // Cargar footer como imagen
            let footerImgData = null; let footerHMm = 0;
            await new Promise((res) => {
                const img = new Image();
                img.onload = () => {
                    const fc = document.createElement('canvas');
                    fc.width = img.naturalWidth; fc.height = img.naturalHeight;
                    fc.getContext('2d').drawImage(img, 0, 0);
                    footerImgData = fc.toDataURL('image/jpeg', 0.98);
                    footerHMm = (img.naturalHeight / img.naturalWidth) * contentW;
                    res();
                };
                img.onerror = () => res();
                img.src = footerDorado;
            });

            const footerEl = el.querySelector('.pr-footer');
            if (footerEl) footerEl.style.display = 'none';
            const bottomMargin = 10 + footerHMm + 2;

            const pdfInstance = await html2pdf().set({
                margin: [topMargin, marginR, bottomMargin, marginL],
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: h2cOpts,
                jsPDF: { unit: 'mm', format: 'legal', orientation: 'portrait' },
                pagebreak: { mode: ['css', 'legacy'], avoid: ['.pr-firmas', 'tr'] },
            }).from(el).toPdf().get('pdf');

            const pageH = pdfInstance.internal.pageSize.getHeight();
            const totalPages = pdfInstance.internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                pdfInstance.setPage(i);
                pdfInstance.addImage(headerImgData, 'JPEG', headerX, marginTop, headerW, headerH);
                if (footerImgData) {
                    const fH = footerHMm * 0.75;
                    pdfInstance.addImage(footerImgData, 'JPEG', marginL, pageH - 10 - fH, contentW, fH);
                }
            }

            const blobUrl = pdfInstance.output('bloburl');

            // Restaurar estilos
            headerWrapEl.style.display = '';
            if (footerEl) footerEl.style.display = '';
            el.style.width = ''; el.style.margin = ''; el.style.boxShadow = '';
            el.style.padding = ''; el.style.minHeight = '';

            window.open(blobUrl, '_blank');
        } catch (err) {
            console.error('Error al generar PDF:', err);
        } finally {
            setImprimiendo(false);
        }
    };

    useEffect(() => {
        // Pre-cargar html2pdf para que esté en caché cuando se use
        import('html2pdf.js').catch(() => {});
        if (autoImprimir) {
            handlePrint().then(() => onCerrar && onCerrar());
        }
    }, []);

    const dom = e.domicilios?.[0];
    const imputado = e.imputado || {};

    return createPortal(
        <div className="pr-overlay" style={autoImprimir ? { visibility: 'hidden' } : {}}>
        {autoImprimir && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, visibility: 'visible' }}>
                <style>{`@keyframes pr-spin { to { transform: rotate(360deg); } }`}</style>
                <div style={{ width: 52, height: 52, border: '5px solid rgba(255,255,255,0.15)', borderTop: '5px solid #376842', borderRadius: '50%', animation: 'pr-spin 0.8s linear infinite' }} />
                <p style={{ color: 'white', fontSize: 15, fontWeight: 600, margin: 0, letterSpacing: 0.5 }}>Generando PDF...</p>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, margin: 0 }}>Por favor espera un momento</p>
            </div>
        )}
        <div className="pr-overlay">
            {/* Toolbar — se oculta al imprimir */}
            <div className="pr-toolbar no-print">
                <span className="pr-toolbar-title">Vista previa de impresión</span>
                <div className="pr-toolbar-actions">
                    <button className="pr-btn-cerrar" onClick={onCerrar}>✕ Cerrar</button>
                    <button className="pr-btn-imprimir" onClick={handlePrint} disabled={imprimiendo}>
                        <i className="bi bi-printer-fill" /> {imprimiendo ? 'Generando...' : 'Imprimir'}
                    </button>
                </div>
            </div>

            {/* Documento */}
            <div className="pr-documento" id="pr-documento" ref={docRef}>

                {/* Encabezado */}
                <div className="pr-header-wrap">
                <div className="pr-header">
                    <div className="pr-header-izq">
                        <img src={logoMorelos} alt="Morelos" className="pr-logo" />
                        <p className="pr-header-dep">Dirección de la Unidad de Medidas Cautelares y Salidas Alternas para Adultos</p>
                        <h1 className="pr-titulo">ENTREVISTA DE ENCUADRE</h1>
                    </div>
                    <div className="pr-header-folio">
                        <div className="pr-folio-box">
                            <span className="pr-folio-lbl">FOLIO</span>
                            <span className="pr-folio-val">{val(e.folio)}</span>
                        </div>
                        <div className="pr-folio-box">
                            <span className="pr-folio-lbl">FECHA</span>
                            <span className="pr-folio-val">{val(e.fechaRegistro)}</span>
                        </div>
                        <div className="pr-folio-box">
                            <span className="pr-folio-lbl">LIBRO</span>
                            <span className="pr-folio-val">{val(e.libro)}</span>
                        </div>
                        <div className="pr-folio-box">
                            <span className="pr-folio-lbl">FOJA</span>
                            <span className="pr-folio-val">{val(e.foja)}</span>
                        </div>
                    </div>
                </div>

                <div className="pr-causa-bar">
                    <div className="cb-row">
                        <span className="cb-lbl">NO. DE CAUSA PENAL / CARPETA DE INVESTIGACIÓN</span>
                        <span className="cb-val">{val(e.causaPenal)}</span>
                    </div>
                    <div className="cb-row">
                        <span className="cb-lbl">TIPO DE SEGUIMIENTO</span>
                        <span className="cb-val">{TIPO_SEGUIMIENTO_NOMBRE[e.tipoSeguimiento] || val(e.tipoSeguimiento)}</span>
                    </div>
                </div>
                </div>{/* fin pr-header-wrap */}

                {/* 1. Datos personales */}
                <div className="pr-section-title pr-first-section">1. DATOS PERSONALES</div>
                <div className="pr-grid">
                    <Row label="Nombre(s)" value={e.nombre} />
                    <Row label="Apellido Paterno" value={e.apPaterno} half />
                    <Row label="Apellido Materno" value={e.apMaterno} half />
                    <Row label="Fecha de Nacimiento" value={e.fechaNacimiento} half />
                    <Row label="Edad" value={e.edad} half />
                    <Row label="Género" value={e.genero} half />
                    <Row label="Estado Civil" value={e.estadoCivil} half />
                    <Row label="Municipio de Origen" value={e.municipio} half />
                    <Row label="Estado de Nacimiento" value={e.estadoNacimiento} half />
                    <Row label="País" value={e.pais} half />
                    <Row label="CURP" value={e.curp} half />
                    <Row label="Teléfono Casa" value={e.telefonoCasa} half />
                    <Row label="Celular" value={e.celular} half />
                    <Row label="Correo Electrónico" value={e.email} />
                    <Row label="Grado de Estudios" value={e.gradoEstudios} half />
                    <Row label="Grupo Vulnerable" value={e.grupoVulnerable} half />
                    <Row label="Documentos Migratorios" value={e.documentosMigratorios} />
                    <Row label="Alias / Apodo" value={e.alias} half />
                    <Row label="Enfermedad" value={e.enfermedad} half />
                </div>

                {/* 2. Señas particulares */}
                <SectionTitle>2. SEÑAS PARTICULARES</SectionTitle>
                <div className="pr-grid">
                    <Row label="Complexión" value={e.complexion} half />
                    <Row label="Estatura (cm)" value={e.estatura} half />
                    <Row label="Color de Ojos" value={e.colorOjos} half />
                    <Row label="Cejas" value={e.cejas} half />
                    <Row label="Tez / Piel" value={e.tezPiel} half />
                    <Row label="Color de Cabello" value={e.colorCabello} half />
                    <Row label="Tamaño de Labios" value={e.tamLabios} half />
                    <Row label="Señas en Cara" value={e.senasCara} half />
                    <Row label="Tiene Tatuajes" value={yesno(e.tieneTatuajes)} />
                </div>

                {/* 3. Domicilio */}
                <SectionTitle>3. DOMICILIO ACTUAL</SectionTitle>
                {e.domicilios?.length > 0 ? e.domicilios.map((d, i) => (
                    <div key={i} className="pr-domicilio-bloque">
                        {e.domicilios.length > 1 && <p className="pr-dom-idx">Domicilio {i + 1}</p>}
                        <div className="pr-grid">
                            <Row label="Calle" value={d.calle || d.calleNumero} />
                            <Row label="Número" value={d.numero} half />
                            <Row label="Colonia" value={d.colonia} half />
                            <Row label="Municipio" value={d.municipio} half />
                            <Row label="Estado" value={d.estado} half />
                            <Row label="C.P." value={d.cp} half />
                            <Row label="Ciudad" value={d.ciudad} half />
                            <Row label="Tipo de Domicilio" value={d.tipoDomicilio} half />
                            {d.tipoDomicilio === 'Otro' && <Row label="Especificar tipo" value={d.tipoDomicilioOtro} half />}
                            <Row label="Tiempo en el Domicilio" value={d.anios ? `${d.anios} años` : null} half />
                            <Row label="Días Disponible" value={d.diasDisponibles} half />
                            <Row label="Hora Disponible" value={d.horaDisponible} half />
                            <Row label="Nombre del Propietario" value={d.propietario} />
                            <Row label="Referencias" value={d.referencias} />
                            <Row label="Razón de estar en el domicilio" value={d.razon} />
                            {d.coordenadas && <Row label="Coordenadas GPS" value={d.coordenadas} />}
                        </div>
                    </div>
                )) : <p className="pr-sin-datos">Sin domicilio registrado</p>}

                {/* 4. Personas que habitan */}
                <SectionTitle>4. PERSONAS QUE HABITAN EL DOMICILIO</SectionTitle>
                {e.personasHabita?.length > 0 ? (
                    <table className="pr-tabla">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Parentesco</th>
                                <th>Edad</th>
                                <th>Ocupación</th>
                            </tr>
                        </thead>
                        <tbody>
                            {e.personasHabita.map((p, i) => (
                                <tr key={i}>
                                    <td>{val(p.nombre)}</td>
                                    <td>{val(p.parentesco)}</td>
                                    <td>{val(p.edad)}</td>
                                    <td>{val(p.ocupacion)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : <p className="pr-sin-datos">Sin personas registradas</p>}

                {/* 5. Empleo */}
                <SectionTitle>5. SITUACIÓN LABORAL ACTUAL</SectionTitle>
                <div className="pr-grid">
                    <Row label="Empresa" value={e.empresa} />
                    <Row label="Teléfono Empresa" value={e.telEmpresa} half />
                    <Row label="Puesto" value={e.puesto} half />
                    <Row label="Nombre del Jefe" value={e.nombreJefe} half />
                    <Row label="Horario de Trabajo" value={e.horarioTrabajo} half />
                    <Row label="Domicilio del Trabajo" value={e.domicilioTrabajo} />
                    <Row label="Salario Mensual" value={e.salarioMensual ? `$${Number(e.salarioMensual).toLocaleString('es-MX')}` : null} half />
                    <Row label="Último Empleo" value={e.ultimoEmpleo} half />
                </div>

                {/* 6. Referencias personales */}
                <div style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                <SectionTitle>6. REFERENCIAS PERSONALES</SectionTitle>
                {e.referencias?.length > 0 ? (
                    <table className="pr-tabla">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Parentesco</th>
                                <th>Teléfono</th>
                                <th>Domicilio</th>
                            </tr>
                        </thead>
                        <tbody>
                            {e.referencias.map((r, i) => (
                                <tr key={i}>
                                    <td>{val(r.nombre)}</td>
                                    <td>{val(r.parentesco)}</td>
                                    <td>{val(r.telefono)}</td>
                                    <td>{val(r.domicilio)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : <p className="pr-sin-datos">Sin referencias registradas</p>}
                </div>

                {/* 7. Consumo de sustancias */}
                <div style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                <SectionTitle>7. CONSUMO DE SUSTANCIAS</SectionTitle>
                {e.consumoSustancias?.some(s => s.consume) ? (
                    <table className="pr-tabla">
                        <thead>
                            <tr>
                                <th>Sustancia</th>
                                <th>Gramos/día</th>
                                <th>Meses de consumo</th>
                                <th>Cantidad</th>
                                <th>Último consumo</th>
                            </tr>
                        </thead>
                        <tbody>
                            {e.consumoSustancias.filter(s => s.consume).map((s, i) => (
                                <tr key={i}>
                                    <td>{val(s.sustancia)}</td>
                                    <td>{val(s.grms)}</td>
                                    <td>{val(s.meses)}</td>
                                    <td>{val(s.cantidad)}</td>
                                    <td>{val(s.fechaUltimoConsumo)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : <p className="pr-sin-datos">No consume sustancias</p>}
                </div>

                {/* 8. Seguimiento */}
                <div style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                <SectionTitle>8. PREGUNTAS DE SEGUIMIENTO</SectionTitle>
                <div className="pr-grid">
                    <Row label="¿Tratamiento de adicciones?" value={yesno(e.tratamientoAdicciones)} half />
                    {e.tratamientoAdicciones && <Row label="Especificar" value={e.tratamientoAdiccionesEsp} half />}
                    <Row label="¿Familiares con consumo?" value={yesno(e.familiaresConsumo)} half />
                    {e.familiaresConsumo && <Row label="Especificar" value={e.familiaresConsumoEsp} half />}
                    <Row label="¿Buena base familiar?" value={yesno(e.buenaBase)} half />
                    {e.buenaBase && <Row label="Especificar" value={e.buenaBaseEsp} half />}
                    <Row label="¿Obligaciones difíciles?" value={yesno(e.obligacionesDificiles)} half />
                    {e.obligacionesDificiles && <Row label="Especificar" value={e.obligacionesDificilesEsp} half />}
                </div>
                </div>

                {/* 9. Víctima */}
                <SectionTitle>9. DATOS DE LA VÍCTIMA</SectionTitle>
                <div className="pr-grid">
                    <Row label="¿Conoce a la víctima?" value={yesno(e.conoceVictima)} half />
                    <Row label="Nombre de la Víctima" value={e.nombreVictima} half />
                    <Row label="Teléfono de la Víctima" value={e.telVictima} />
                    <Row label="Domicilio de la Víctima" value={e.domicilioVictima} />
                </div>

                {/* Firmas */}
                <div className="pr-firmas">
                    <div className="pr-firma-bloque">
                        <div className="pr-firma-linea"></div>
                        <p className="pr-firma-label">Firma del Entrevistado</p>
                        <p className="pr-firma-sub">{val(e.nombre)} {val(e.apPaterno)} {val(e.apMaterno)}</p>
                    </div>
                    <div className="pr-firma-bloque">
                        <div className="pr-firma-linea"></div>
                        <p className="pr-firma-label">Firma del Entrevistador</p>
                        <p className="pr-firma-sub">
                            {e.registradoPor
                                ? [e.registradoPor.nombre, e.registradoPor.apPaterno, e.registradoPor.apMaterno].filter(Boolean).join(' ')
                                : '—'}
                        </p>
                    </div>
                </div>

                <div className="pr-footer">
                    <img src={footerDorado} alt="" className="pr-footer-img" />
                    <p className="pr-footer-fecha">
                        Documento generado el {new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
            </div>
        </div>
        </div>
    , document.body);
};

export default PrintEntrevista;
