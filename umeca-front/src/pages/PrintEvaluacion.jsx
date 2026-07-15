import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import logoMorelos from '../assets/logo-morelos-nuevo.png';
import footerDorado from '../assets/footer-dorado.png';
import './PrintEvaluacion.css';

const val = (v) => (v !== null && v !== undefined && v !== '') ? v : '—';
const yesno = (v) => v ? 'Sí' : 'No';

/** Fila de la tabla principal (label + value) */
const Row = ({ label, value, full = false }) => (
    <div className={`pev-field ${full ? 'pev-full' : ''}`}>
        <span className="pev-label">{label}</span>
        <span className="pev-value">{val(value)}</span>
    </div>
);

/** Encabezado de sección */
const Sec = ({ children }) => (
    <div className="pev-section-title">{children}</div>
);

/** Bloque de verificación (en la tabla principal va como fila de 4 cols) */
const FilaVerif = ({ label, metodo, resultado }) => {
    if (!metodo && !resultado) return null;
    return (
        <tr className="pev-verif-row">
            <td className="pev-tv-factor pev-tv-verif-label">✔ Verif. — {label}</td>
            <td className="pev-tv-datos">{val(metodo)}</td>
            <td className="pev-tv-metodo" colSpan={2}>{val(resultado)}</td>
        </tr>
    );
};

const PrintEvaluacion = ({ evaluacion: d, onCerrar }) => {
    const docRef = useRef(null);
    const [imprimiendo, setImprimiendo] = useState(false);

    const handlePrint = async () => {
        setImprimiendo(true);
        try {
            const { default: html2pdf } = await import('html2pdf.js');
            const el = docRef.current;
            const h2cOpts = { scale: 2, useCORS: true, logging: false, windowWidth: 720 };

            el.style.width     = '720px';
            el.style.margin    = '0';
            el.style.boxShadow = 'none';
            el.style.padding   = '14px 22px';
            el.style.minHeight = 'unset';

            // Ocultar encabezado duplicado (page2)
            const h2 = el.querySelector('.pev-header-page2');
            if (h2) h2.style.display = 'none';

            // Capturar header usando html2canvas interno de html2pdf
            const headerEl = el.querySelector('.pev-header-carta');
            const headerCanvas = await html2pdf().set({ html2canvas: h2cOpts }).from(headerEl).toCanvas().get('canvas');
            const headerImgData = headerCanvas.toDataURL('image/jpeg', 0.98);
            headerEl.style.display = 'none';

            // Dimensiones
            const marginL = 14, marginR = 14, marginTop = 8;
            const contentW = 215.9 - marginL - marginR;
            const headerH  = (headerCanvas.height / headerCanvas.width) * contentW;
            const topMargin = marginTop + headerH + 4;

            // Cargar imagen del footer dorado usando el import directo del asset
            let footerImgData = null;
            let footerHMm    = 0;
            await new Promise((res) => {
                const img = new Image();
                img.onload = () => {
                    const fc = document.createElement('canvas');
                    fc.width  = img.naturalWidth;
                    fc.height = img.naturalHeight;
                    fc.getContext('2d').drawImage(img, 0, 0);
                    footerImgData = fc.toDataURL('image/jpeg', 0.98);
                    footerHMm = (img.naturalHeight / img.naturalWidth) * contentW;
                    res();
                };
                img.onerror = () => res();
                img.src = footerDorado; // asset ya importado al inicio del archivo
            });

            // Ocultar footer del HTML (se añade con jsPDF)
            const footerEl = el.querySelector('.pev-footer');
            if (footerEl) footerEl.style.display = 'none';

            const bottomMargin = 10 + footerHMm + 2;

            const pdfInstance = await html2pdf()
                .set({
                    margin:      [topMargin, marginR, bottomMargin, marginL],
                    image:       { type: 'jpeg', quality: 0.98 },
                    html2canvas: h2cOpts,
                    jsPDF:       { unit: 'mm', format: 'legal', orientation: 'portrait' },
                    pagebreak:   { mode: ['css', 'legacy'], avoid: ['.pev-firmas', 'tr'] },
                })
                .from(el)
                .toPdf()
                .get('pdf');

            // Añadir encabezado y footer en cada página
            const pageH      = pdfInstance.internal.pageSize.getHeight();
            const totalPages = pdfInstance.internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                pdfInstance.setPage(i);
                pdfInstance.addImage(headerImgData, 'JPEG', marginL, marginTop, contentW, headerH);
                if (footerImgData) {
                    const fH = footerHMm * 0.75; // reducir un 25% el alto del footer
                    pdfInstance.addImage(footerImgData, 'JPEG', marginL, pageH - 10 - fH, contentW, fH);
                }
            }

            const blobUrl = pdfInstance.output('bloburl');

            // Restaurar estilos
            headerEl.style.display = '';
            if (footerEl) footerEl.style.display = '';
            if (h2)       h2.style.display = '';
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

    const domAnt  = (() => { try { return JSON.parse(d.domiciliosAnterioresJson || '[]'); } catch { return []; } })();
    const empAnt  = (() => { try { return JSON.parse(d.empleosAnterioresJson   || '[]'); } catch { return []; } })();
    const riesgos = (() => { try { const a = JSON.parse(d.riesgosProcesalesJson || '[]'); return [...a, ...Array(7)].slice(0,7); } catch { return Array(7).fill(''); } })();
    const factores= (() => { try { const a = JSON.parse(d.factoresEstabilidadJson || '[]'); return [...a, ...Array(7)].slice(0,7); } catch { return Array(7).fill(''); } })();

    const resultadoLabel = d.resultado === 'FLEXIBLE'        ? 'Pudiera cumplir las medidas cautelares bajo un esquema de supervisión FLEXIBLE.'
                         : d.resultado === 'ESTRICTO'        ? 'Pudiera cumplir las medidas cautelares bajo un esquema de supervisión ESTRICTO.'
                         : d.resultado === 'DIFICIL_CUMPLIR' ? 'Sería DIFÍCIL DE CUMPLIR las medidas cautelares bajo cualquier esquema de supervisión.'
                         : '—';

    const fechaHoy = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });

    const formatFechaLarga = (iso) => {
        if (!iso) return '—';
        const [y, m, dia] = iso.split('-');
        const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
        return `${parseInt(dia)} de ${meses[parseInt(m)-1]} de ${y}`;
    };
    const nombreImputado = `${val(d.apPaternoImputado)} ${val(d.apMaternoImputado || '')} ${val(d.nombreImputado)}`.replace(/—\s*/g,'').trim().toUpperCase();

    return createPortal(
        <div className="pev-overlay">
            {/* Toolbar */}
            <div className="pev-toolbar no-print">
                <span className="pev-toolbar-title">Vista previa de impresión — Evaluación de Riesgos</span>
                <div className="pev-toolbar-actions">
                    <button className="pev-btn-cerrar" onClick={onCerrar}>✕ Cerrar</button>
                    <button className="pev-btn-imprimir" onClick={handlePrint} disabled={imprimiendo}>
                        <i className="bi bi-printer-fill" /> {imprimiendo ? 'Generando...' : 'Imprimir'}
                    </button>
                </div>
            </div>

            <div className="pev-documento" ref={docRef}>

                {/* ══ ENCABEZADO CARTA OFICIAL ══ */}
                <div className="pev-header-carta">
                    <div className="pev-header-logo">
                        <img src={logoMorelos} alt="Morelos" className="pev-logo" />
                    </div>
                    <div className="pev-header-deps">
                        <p>Secretaría de Seguridad y Protección Ciudadana</p>
                        <p>Coordinación del Sistema Penitenciario</p>
                        <p>Dirección General de Reinserción Social</p>
                        <p>Dirección de la Unidad de Medidas Cautelares</p>
                        <p>y Salidas Alternas para Adultos</p>
                        {d.numOficio && <span className="pev-num-oficio-meta">{d.numOficio}</span>}
                    </div>
                </div>

                <div className="pev-carta-meta">
                    <div className="pev-asunto-bloque">
                        <span className="pev-fecha-lugar">Xochitepec, Morelos; a {fechaHoy}</span>
                        <span className="pev-asunto"><b>ASUNTO: OPINIÓN TÉCNICA</b></span>
                        <span className="pev-asunto">Sobre la Evaluación de Riesgos Procesales</span>
                    </div>
                </div>

                <div className="pev-cc-bloque">
                    <p><b>CC. AGENTE DEL MINISTERIO PÚBLICO</b></p>
                    <p><b>Y DEFENSOR</b></p>
                    <p><b>P R E S E N T E S.</b></p>
                </div>

                <p className="pev-intro-parrafo">
                    En atención al escrito registro
                    {d.folioEscrito ? <> con número <b>{d.folioEscrito}</b></> : ''}.
                    De fecha {formatFechaLarga(d.fechaSolicitud)}, efectuada por parte del Agente del Ministerio Público
                    de la federación, en el cual solicita se realice Evaluación de
                    Riesgos Procesales a la persona de nombre <b>{nombreImputado}</b>, y con fundamento en lo dispuesto
                    por los numerales 105 Fracción VIII, 156, 164, 168, 169, 170 y 176 del Código Nacional de
                    Procedimientos Penales; se emite lo siguiente:
                </p>

                {/* ══ TABLA RESUMEN ENTREVISTA ══ */}
                <table className="pev-tabla-resumen">
                    <tbody>
                        <tr>
                            <th>NOMBRE DEL ENTREVISTADO</th>
                            <td>{nombreImputado}</td>
                            <th>EDAD</th>
                            <td>{val(d.edad)}{d.edad ? ' AÑOS' : ''}</td>
                        </tr>
                        <tr>
                            <th>CARPETA DE INVESTIGACIÓN</th>
                            <td>{val(d.causaPenal)}</td>
                            <th>FISCALÍA</th>
                            <td>{val(d.fiscalia)}</td>
                        </tr>
                        <tr>
                            <th>FECHA DE LA ENTREVISTA</th>
                            <td>{val(d.fechaSolicitud)}</td>
                            <th>HORA</th>
                            <td>{val(d.horaInicio)}{d.horaInicio && d.horaFinal ? ` — ${d.horaFinal}` : ''}</td>
                        </tr>
                        <tr>
                            <th>LUGAR DONDE SE REALIZÓ LA ENTREVISTA</th>
                            <td colSpan={3}>{val(d.lugarEntrevista)}</td>
                        </tr>
                        <tr>
                            <th>FECHA DE REGISTRO</th>
                            <td colSpan={3}>{d.createdAt ? new Date(d.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}</td>
                        </tr>
                    </tbody>
                </table>

                {/* ══ TABLA EVALUACIÓN PRINCIPAL ══ */}
                <h2 className="pev-tabla-titulo">RESULTADO DE LA EVALUACIÓN DE RIESGOS PROCESALES Y VÍNCULOS COMUNITARIOS</h2>

                <table className="pev-tabla-eval">
                    <thead>
                        <tr>
                            <th className="pev-tv-factor">FACTOR</th>
                            <th className="pev-tv-datos">DATOS SOCIO-AMBIENTALES</th>
                            <th className="pev-tv-metodo">MÉTODO Y FUENTE DE VERIFICACIÓN</th>
                            <th className="pev-tv-resverif">RESULTADO DE VERIFICACIÓN</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* ── DATOS GENERALES + DOMICILIO ACTUAL (misma verificación) ── */}
                        <tr className="pev-tv-grupo pev-grupo-avoid"><td colSpan={4}>DATOS GENERALES</td></tr>
                        <tr className="pev-grupo-avoid"><td className="pev-tv-factor">Nombre</td><td>{val(d.nombreImputado)}</td><td rowSpan={15 + domAnt.length} className="pev-tv-metodo">{val(d.verifS1Metodo)}</td><td rowSpan={15 + domAnt.length}>{val(d.verifS1Resultado)}</td></tr>
                        <tr><td className="pev-tv-factor">Apellidos</td><td>{val(d.apPaternoImputado)} {d.apMaternoImputado||''}</td></tr>
                        <tr><td className="pev-tv-factor">Fecha de Nacimiento</td><td>{val(d.fechaNacimiento)}</td></tr>
                        <tr><td className="pev-tv-factor">Lugar de Nacimiento</td><td>{val(d.lugarNacimientoImp)}</td></tr>
                        <tr><td className="pev-tv-factor">CURP</td><td>{val(d.curp)}</td></tr>
                        <tr><td className="pev-tv-factor">Edad</td><td>{d.edad ? `${d.edad} años` : '—'}</td></tr>
                        <tr><td className="pev-tv-factor">Estado Civil</td><td>{val(d.estadoCivil)}{d.hijos ? `, ${d.numHijos||0} hijo(s), ${d.numHijosMenores||0} menor(es)` : ', sin hijos'}</td></tr>
                        <tr><td className="pev-tv-factor">Escolaridad</td><td>{val(d.gradoEstudios)}</td></tr>

                        {/* ── DOMICILIO ACTUAL (dentro del mismo rowspan) ── */}
                        <tr className="pev-tv-subgrupo"><td colSpan={2}>DOMICILIO ACTUAL</td></tr>
                        <tr><td className="pev-tv-factor">Dirección</td><td>{[d.domicilioActualCalle, d.domicilioActualNo, d.domicilioActualColonia, d.domicilioActualMunicipio, d.domicilioActualEstado].filter(Boolean).join(', ') || '—'}</td></tr>
                        <tr><td className="pev-tv-factor">Tiempo en domicilio</td><td>{val(d.tiempoEnDomicilio)}</td></tr>
                        <tr><td className="pev-tv-factor">Tipo</td><td>{val(d.tipoDomicilioActual)}</td></tr>
                        <tr><td className="pev-tv-factor">Teléfono Fijo</td><td>{val(d.telefonoDomicilio)}</td></tr>
                        <tr><td className="pev-tv-factor">Celular</td><td>{val(d.celularDomicilio)}</td></tr>
                        {domAnt.map((da, i) => (
                            <tr key={i}><td className="pev-tv-factor">Dom. anterior {i+1}</td><td>{val(da.direccion)} — {yesno(da.casaPropia)} propia — {val(da.tiempoResidencia)}</td></tr>
                        ))}

                        {/* ── FACILIDAD DE ABANDONAR ── */}
                        <tr className="pev-tv-grupo pev-grupo-avoid"><td colSpan={4}>5. FACILIDAD DE ABANDONAR EL ESTADO/PAÍS</td></tr>
                        <tr className="pev-grupo-avoid"><td className="pev-tv-factor">Tiempo en Morelos</td><td>{val(d.tiempoEnMorelos)}</td><td rowSpan={6} className="pev-tv-metodo">{val(d.verifS5Metodo)}</td><td rowSpan={6}>{val(d.verifS5Resultado)}</td></tr>
                        <tr><td className="pev-tv-factor">Familiares fuera del país</td><td>{val(d.familiaresOtroPais)}</td></tr>
                        <tr><td className="pev-tv-factor">Medios de comunicación</td><td>{val(d.mediosComunicacion)}</td></tr>
                        <tr><td className="pev-tv-factor">Personas dependientes</td><td>{val(d.personasDependientes)}</td></tr>
                        <tr><td className="pev-tv-factor">¿Tiene Visa?</td><td>{yesno(d.tieneVisa)}</td></tr>
                        <tr><td className="pev-tv-factor">¿Tiene Pasaporte?</td><td>{yesno(d.tienePasaporte)}</td></tr>

                        {/* ── INFORMACIÓN LABORAL ── */}
                        <tr className="pev-tv-grupo pev-grupo-avoid"><td colSpan={4}>6. INFORMACIÓN LABORAL / OCUPACIONAL</td></tr>
                        <tr className="pev-grupo-avoid"><td className="pev-tv-factor">Empresa</td><td>{val(d.empresaImp)}</td><td className="pev-tv-metodo" rowSpan={3}>{val(d.verifS6Metodo)}</td><td rowSpan={3}>{val(d.verifS6Resultado)}</td></tr>
                        <tr><td className="pev-tv-factor">Puesto</td><td>{val(d.puestoImp)}</td></tr>
                        <tr><td className="pev-tv-factor">Horario</td><td>{val(d.horarioTrabajoImp)}</td></tr>
                        <tr><td className="pev-tv-factor">Salario</td><td>{d.salarioMensualImp ? `$${d.salarioMensualImp}` : '—'}</td><td className="pev-tv-metodo" rowSpan={3 + empAnt.length}></td><td rowSpan={3 + empAnt.length}></td></tr>
                        <tr><td className="pev-tv-factor">Temporalidad</td><td>{val(d.ultimoEmpleoImp)}</td></tr>
                        <tr><td className="pev-tv-factor">Domicilio trabajo</td><td>{val(d.domicilioTrabajoImp)}</td></tr>
                        {empAnt.length > 0 && empAnt.map((ea, i) => (
                            <tr key={i}><td className="pev-tv-factor">Empleo ant. {i+1}</td><td>{val(ea.empresa)} — {val(ea.puesto)}</td></tr>
                        ))}

                        {/* ── COMPORTAMIENTO / ENTORNO ── */}
                        <tr className="pev-tv-grupo pev-grupo-avoid"><td colSpan={4}>8. ENTORNO SOCIAL</td></tr>
                        <tr className="pev-grupo-avoid"><td className="pev-tv-factor">Enfermedades</td><td>{val(d.enfermedades)}</td><td rowSpan={3} className="pev-tv-metodo">{val(d.verifS9Metodo)}</td><td rowSpan={3}>{val(d.verifS9Resultado)}</td></tr>
                        <tr><td className="pev-tv-factor">Hobbies / Deporte</td><td>{val(d.hobbies)}</td></tr>
                        <tr><td className="pev-tv-factor">Organizaciones</td><td>{val(d.organizaciones)}</td></tr>
                    </tbody>
                </table>

                {/* ══ ENCABEZADO REPETIDO — hoja de conclusión ══ */}
                <div className="pev-header-carta pev-header-page2">
                    <div className="pev-header-logo">
                        <img src={logoMorelos} alt="Morelos" className="pev-logo" />
                    </div>
                    <div className="pev-header-deps">
                        <p>Secretaría de Seguridad y Protección Ciudadana</p>
                        <p>Coordinación del Sistema Penitenciario</p>
                        <p>Dirección General de Reinserción Social</p>
                        <p>Dirección de la Unidad de Medidas Cautelares</p>
                        <p>y Salidas Alternas para Adultos</p>
                        {d.numOficio && <span className="pev-num-oficio-meta">{d.numOficio}</span>}
                    </div>
                </div>

                {/* ══ CONCLUSIÓN GENERAL ══ */}
                <div className="pev-conclusion-bloque">
                    <h3 className="pev-conclusion-titulo">CONCLUSIÓN GENERAL:</h3>
                    <p className="pev-conclusion-texto">
                        {d.conclusionGeneral ||
                            'Basado en los análisis en la evaluación de los datos socio ambiental proporcionados por el entrevistado y verificados por las fuentes y métodos citados; los riesgos procesales y los factores de estabilidad son los siguientes:'}
                    </p>

                    <table className="pev-tabla-riesgos">
                        <thead>
                            <tr>
                                <th style={{width:'30px'}}>#</th>
                                <th>RIESGOS PROCESALES</th>
                                <th>FACTORES DE ESTABILIDAD</th>
                            </tr>
                        </thead>
                        <tbody>
                            {riesgos.map((r, i) => (
                                <tr key={i}>
                                    <td className="pev-riesgo-num">{i+1}</td>
                                    <td>{r || ''}</td>
                                    <td>{factores[i] || ''}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* ══ RESULTADO FINAL ══ */}
                <div className="pev-resultado-bloque">
                    <p>Basado en el análisis derivado de la evaluación anterior se considera que la libertad del imputado podría ser:</p>
                    <div className="pev-resultado-opcion">
                        <span className="pev-check">✓</span>
                        <span>{resultadoLabel}</span>
                    </div>
                    {d.justificacionResultado && <p className="pev-justificacion">{d.justificacionResultado}</p>}
                </div>

                {/* ══ CIERRE FORMAL ══ */}
                <p className="pev-cierre">
                    Sin otro particular, agradezco la atención al presente, aprovechando la ocasión para enviarle un cordial saludo.
                </p>

                {/* ══ FIRMAS ══ */}
                <div className="pev-firmas">
                    <p className="pev-atentamente">A T E N T A M E N T E</p>

                    {/* Nombre y cargo del director — centrado */}
                    <div className="pev-firma-director">
                        <p className="pev-firma-director-nombre">LIC. REY GIOVANNI RIVAS SANDOVAL</p>
                        <p className="pev-firma-director-cargo">DIRECTOR DE LA UNIDAD DE MEDIDAS CAUTELARES<br/>Y SALIDAS ALTERNAS PARA ADULTOS.</p>
                    </div>

                    {/* Tres firmas: ELABORÓ | REVISÓ | AUTORIZÓ */}
                    <div className="pev-firmas-grid">
                        <div className="pev-firma-bloque">
                            <p className="pev-firma-label">ELABORÓ</p>
                        </div>
                        <div className="pev-firma-bloque">
                            <p className="pev-firma-label">REVISÓ</p>
                        </div>
                        <div className="pev-firma-bloque">
                            <p className="pev-firma-label">AUTORIZÓ</p>
                        </div>
                    </div>
                </div>

                <div className="pev-footer">
                    <img src={footerDorado} alt="" className="pev-footer-img" />
                    <p className="pev-footer-fecha">
                        Documento generado el {new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>

            </div>
        </div>
    , document.body);
};

export default PrintEvaluacion;
