import { createPortal } from 'react-dom';
import { useState } from 'react';
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
    const [tamano, setTamano] = useState('a4'); // 'a4' | 'legal'
    const nombreCompleto = [d.apPaternoImputado, d.apMaternoImputado, d.nombreImputado]
        .filter(Boolean).join(' ').toUpperCase();

    const esPositivo = d.resultado === 'POSITIVO';

    const content = (
        <div className="pco-overlay">
            <style>{`@media print { @page { size: ${tamano === 'a4' ? 'A4' : 'legal'} portrait; margin: 12mm 14mm; } }`}</style>
            {/* Toolbar */}
            <div className="pco-toolbar no-print">
                <span className="pco-toolbar-title">Vista previa — Oficio de Consulta</span>
                <div className="pco-toolbar-actions">
                    <div className="pco-select-wrap">
                        <i className="bi bi-file-earmark" />
                        <select value={tamano} onChange={e => setTamano(e.target.value)} className="pco-select-tamano">
                            <option value="a4">Tamaño: A4</option>
                            <option value="legal">Tamaño: Oficio</option>
                        </select>
                    </div>
                    <button className="pco-btn-cerrar" onClick={onCerrar}>✕ Cerrar</button>
                    <button className="pco-btn-imprimir" onClick={() => window.print()}>
                        <i className="bi bi-printer-fill" /> Imprimir
                    </button>
                </div>
            </div>

            {/* Documento */}
            <div className={`pco-documento pco-${tamano}`}>

                {/* Encabezado */}
                <div className="pco-header">
                    <div className="pco-header-izq">
                        <img src={logo} alt="Morelos" className="pco-logo" />
                    </div>
                    <div className="pco-header-right">
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
                <div className="pco-destinatario">
                    <p className="pco-dest-nombre">{d.quienSolicita?.toUpperCase() || '___________'}</p>
                    <p className="pco-dest-cargo">{d.cargoSolicitante?.toUpperCase() || ''}</p>
                    {d.dependenciaSolicitante && (
                        <p className="pco-dest-cargo">{d.dependenciaSolicitante.toUpperCase()}</p>
                    )}
                    <p className="pco-presente">P R E S E N T E.</p>
                </div>

                {/* Cuerpo – párrafo 1 */}
                <p className="pco-parrafo">
                    Con fundamento en lo dispuesto por los artículos 105, 176, 177 fracción XI, del Código Nacional de
                    Procedimientos Penales, así como en atención a su oficio número:{' '}
                    <strong>{d.oficioNumero || '___________'}</strong>, de fecha {hoy(d.fechaSolicitud)}, donde solicita
                    informe si se cuenta con registro, Averiguación Previa, carpeta de Investigación, Acuerdo reparatorio,
                    Suspensión Condicional del Proceso abreviado y/o de procedimientos simplificados o abreviado o si
                    cuenta con algún procedimiento pendiente, respecto de la(s) persona(s) que se describe(n) a
                    continuación:
                </p>

                {/* Tabla del imputado */}
                <table className="pco-tabla-imp">
                    <thead>
                        <tr>
                            <th>NOMBRE</th>
                            <th>FECHA DE NACIMIENTO</th>
                            <th>CURP</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>{nombreCompleto || '___________'}</td>
                            <td>{d.fechaNacimientoImputado ? hoy(d.fechaNacimientoImputado, true) : '___________'}</td>
                            <td className="pco-td-curp">{d.curp || '___________'}</td>
                        </tr>
                    </tbody>
                </table>

                {/* Párrafo resultado */}
                {esPositivo ? (
                    <p className="pco-parrafo">
                        Derivado de lo anterior, me permito hacer de su conocimiento que, una vez realizada la consulta
                        en las bases de datos a disposición de esta Dirección de la Unidad de Medidas Cautelares y
                        Salidas Alternas para Adultos,{' '}
                        <strong>SI SE CUENTA CON REGISTRO</strong>, por cuanto a la{' '}
                        <strong>
                            SUPERVISIÓN CONDICIONAL Y MEDIDAS CAUTELARES EN LIBERTAD
                        </strong>
                        , de la causa penal:
                    </p>
                ) : (
                    <p className="pco-parrafo">
                        Derivado de lo anterior, me permito hacer de su conocimiento que, una vez realizada la consulta
                        en las bases de datos a disposición de esta Dirección de la Unidad de Medidas Cautelares y
                        Salidas Alternas para Adultos,{' '}
                        <strong>NO SE CUENTA CON REGISTRO</strong> de la(s) persona(s) antes descrita(s) en esta
                        Dirección de la Unidad de Medidas Cautelares y Salidas Alternas para Adultos.
                    </p>
                )}

                {/* Detalle del registro (observaciones) – solo si positivo */}
                {esPositivo && d.observaciones && (
                    <div className="pco-detalle-reg">
                        <p className="pco-parrafo">{d.observaciones}</p>
                    </div>
                )}

                {/* Párrafo cierre */}
                <p className="pco-parrafo">
                    Es importante mencionar que, esta Autoridad de acuerdo al Código Nacional de Procedimientos Penales,
                    únicamente tiene como objeto el seguimiento de las medidas cautelares y de la supervisión condicional
                    del proceso, debiendo destacar que se desconoce respecto a los acuerdos reparatorios, procedimientos
                    simplificados o abreviados.
                </p>

                <p className="pco-parrafo">
                    Sin otro particular, aprovecho la ocasión para enviarle un cordial saludo.
                </p>

                {/* Firma */}
                <div className="pco-firma-bloque">
                    <p className="pco-atentamente">A T E N T A M E N T E</p>

                    {/* Fila superior: solo el Director */}
                    <div className="pco-firmas pco-firmas-director">
                        <div className="pco-firma-col pco-firma-col-centro">
                            <p className="pco-firma-nombre">LIC. REY GIOVANNI RIVAS SANDOVAL</p>
                            <p className="pco-firma-cargo">DIRECTOR DE LA UNIDAD DE MEDIDAS CAUTELARES</p>
                            <p className="pco-firma-cargo">Y SALIDAS ALTERNAS PARA ADULTOS.</p>
                        </div>
                    </div>

                    {/* Fila inferior: ELABORÓ · REVISÓ · AUTORIZÓ */}
                    <div className="pco-firmas pco-firmas-bottom">
                        <div className="pco-firma-col pco-firma-col-lateral">
                            <p className="pco-firma-label-sm">ELABORÓ</p>
                        </div>
                        <div className="pco-firma-col pco-firma-col-lateral">
                            <p className="pco-firma-label-sm">REVISÓ</p>
                        </div>
                        <div className="pco-firma-col pco-firma-col-lateral">
                            <p className="pco-firma-label-sm">AUTORIZÓ</p>
                        </div>
                    </div>
                </div>

                {/* Pie de página igual que PrintEntrevista */}
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
