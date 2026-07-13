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

const PrintEntrevista = ({ entrevista: e, onCerrar }) => {
    const handlePrint = () => window.print();

    const dom = e.domicilios?.[0];
    const imputado = e.imputado || {};

    return createPortal(
        <div className="pr-overlay">
            {/* Toolbar — se oculta al imprimir */}
            <div className="pr-toolbar no-print">
                <span className="pr-toolbar-title">Vista previa de impresión</span>
                <div className="pr-toolbar-actions">
                    <button className="pr-btn-cerrar" onClick={onCerrar}>✕ Cerrar</button>
                    <button className="pr-btn-imprimir" onClick={handlePrint}>
                        <i className="bi bi-printer-fill" /> Imprimir
                    </button>
                </div>
            </div>

            {/* Documento */}
            <div className="pr-documento" id="pr-documento">

                {/* Encabezado */}
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

                {/* 1. Datos personales */}
                <SectionTitle>1. DATOS PERSONALES</SectionTitle>
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

                {/* 7. Consumo de sustancias */}
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

                {/* 8. Seguimiento */}
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
    , document.body);
};

export default PrintEntrevista;
