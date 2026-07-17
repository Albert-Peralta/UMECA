import { useState } from 'react';
import PrintEvaluacion from './PrintEvaluacion';
import PrintInformeEval from './PrintInformeEval';
import './DetalleEntrevista.css';
import './EvaluacionRiesgos.css';

const resultadoConfig = {
    FLEXIBLE:        { label: 'Bajo Riesgo',  clase: 'riesgo-bajo' },
    ESTRICTO:        { label: 'Medio Riesgo', clase: 'riesgo-medio' },
    DIFICIL_CUMPLIR: { label: 'Alto Riesgo',  clase: 'riesgo-alto' },
};
const estatusConfig = {
    PENDIENTE:  { label: 'Pendiente',  clase: 'estatus-pendiente' },
    TRABAJANDO: { label: 'En Proceso', clase: 'estatus-proceso' },
    FINALIZADO: { label: 'Finalizado', clase: 'estatus-atendido' },
};

const campo = (label, valor) => (
    <div className="de-campo">
        <span className="de-label">{label}</span>
        <span className="de-valor">{valor || '—'}</span>
    </div>
);

const sec = (titulo) => (
    <div className="de-seccion-titulo">
        <h3>{titulo}</h3>
    </div>
);

const DetalleEvaluacion = ({ evaluacion: d, onVolver, onEditar, puedeEditar }) => {
    const [imprimiendo, setImprimiendo]         = useState(false);
    const [showInforme, setShowInforme]         = useState(false);
    const domAnt = (() => { try { return JSON.parse(d.domiciliosAnterioresJson || '[]'); } catch { return []; } })();
    const empleosAnt = (() => { try { return JSON.parse(d.empleosAnterioresJson || '[]'); } catch { return []; } })();

    return (
        <div className="de-container">
            {imprimiendo  && <PrintEvaluacion    evaluacion={d} onCerrar={() => setImprimiendo(false)} autoImprimir={true} />}
            {showInforme  && <PrintInformeEval   evaluacion={d} onCerrar={() => setShowInforme(false)} />}

            {/* Toolbar */}
            <div className="de-toolbar">
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="de-btn-volver" onClick={onVolver}>
                        <i className="bi bi-arrow-left"></i> Volver
                    </button>
                    {localStorage.getItem('volverExpedienteId') && (
                        <button className="de-btn-volver de-btn-expediente" onClick={() => {
                            const id = localStorage.getItem('volverExpedienteId');
                            localStorage.removeItem('volverExpedienteId');
                            localStorage.setItem('abrirExpedienteId', id);
                            window.dispatchEvent(new CustomEvent('navigate', { detail: 'imputados' }));
                        }}>
                            <i className="bi bi-person-vcard"></i> Volver al Expediente
                        </button>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button className="de-btn-imprimir" onClick={() => setImprimiendo(true)}>
                        <i className="bi bi-printer-fill"></i> Imprimir Evaluación
                    </button>
                    <button className="de-btn-imprimir de-btn-informe" onClick={() => setShowInforme(true)}>
                        <i className="bi bi-file-earmark-text"></i> Informe
                    </button>

                    {puedeEditar && onEditar && (
                        <button className="de-btn-editar" onClick={onEditar}>
                            <i className="bi bi-pencil"></i> Editar
                        </button>
                    )}
                </div>
            </div>


            {/* Encabezado */}
            <div className="dev-header-card">
                <div className="dev-header-causa-wrap">
                    <span className="dev-header-tag">CAUSA PENAL</span>
                    <h2 className="dev-header-causa">{d.causaPenal}</h2>
                </div>
                <div className="dev-header-imputado">
                    <i className="bi bi-person-fill"></i>
                    <div>
                        <span className="dev-header-sublabel">IMPUTADO</span>
                        <span className="dev-header-nombre">{d.nombreCompletoImputado || `${d.apPaternoImputado || ''} ${d.nombreImputado || ''}`.trim() || '—'}</span>
                    </div>
                </div>
                <div className="dev-persona-card dev-delito">
                    <i className="bi bi-exclamation-triangle-fill"></i>
                    <div>
                        <span className="dev-persona-label">DELITO</span>
                        <span className="dev-persona-nombre">{d.delito || '—'}</span>
                    </div>
                </div>
                <div className="dev-persona-card dev-evaluador">
                    <i className="bi bi-shield-check"></i>
                    <div>
                        <span className="dev-persona-label">EVALUADOR</span>
                        <span className="dev-persona-nombre">{d.nombreEvaluador || '—'}</span>
                    </div>
                </div>
                <div className="dev-persona-card dev-solicitante">
                    <i className="bi bi-person-badge"></i>
                    <div>
                        <span className="dev-persona-label">SOLICITANTE</span>
                        <span className="dev-persona-nombre">{d.nombreSolicitante || '—'}</span>
                    </div>
                </div>
                <div className={`dev-persona-card ${d.resultado === 'FLEXIBLE' ? 'dev-resultado-bajo' : d.resultado === 'ESTRICTO' ? 'dev-resultado-medio' : d.resultado === 'DIFICIL_CUMPLIR' ? 'dev-resultado-alto' : 'dev-resultado-pendiente'}`}>
                    <i className={`bi ${d.resultado === 'FLEXIBLE' ? 'bi-check-circle-fill' : d.resultado === 'ESTRICTO' ? 'bi-dash-circle-fill' : 'bi-x-circle-fill'}`}></i>
                    <div>
                        <span className="dev-persona-label">RESULTADO</span>
                        <span className="dev-persona-nombre">
                            {d.resultado
                                ? resultadoConfig[d.resultado]?.label
                                : estatusConfig[d.estatus]?.label}
                        </span>
                    </div>
                </div>
            </div>

            {/* Datos de la solicitud */}
            {sec('DATOS DE LA SOLICITUD')}
            <div className="de-grid-2">
                {campo('Fecha de Solicitud', d.fechaSolicitud)}
                {campo('Nombre del Solicitante', d.nombreSolicitante)}
                {campo('Cargo', d.cargo)}
                {campo('Dependencia', d.dependencia)}
                {campo('Puesta a Disposición', d.puestaDisposicion)}
                {campo('Fecha de Audiencia', d.fechaAudiencia)}
                {campo('Hora de Inicio', d.horaInicio)}
                {campo('Hora Final', d.horaFinal)}
                {d.lugarEntrevista && campo('Lugar de Entrevista', d.lugarEntrevista)}
            </div>

            {/* Datos generales del imputado */}
            {sec('1. DATOS GENERALES DEL IMPUTADO')}
            <div className="de-grid-2">
                {campo('Apellido Paterno', d.apPaternoImputado)}
                {campo('Nombre(s)', d.nombreImputado)}
                {campo('Delito', d.delito)}
                {campo('Ubicación Física', d.ubicacionFisica)}
                {campo('Género', d.genero)}
                {campo('Fecha de Nacimiento', d.fechaNacimiento)}
                {campo('Edad', d.edad)}
                {campo('Estado Civil', d.estadoCivil)}
                {campo('CURP', d.curp)}
                {campo('Municipio', d.municipioImp)}
                {campo('Estado de Nacimiento', d.estadoNacimiento)}
                {campo('País', d.paisImp)}
                {campo('Grado de Estudios', d.gradoEstudios)}
                {campo('¿Tiene Hijos?', d.hijos ? 'Sí' : 'No')}
                {d.hijos && campo('Número de Hijos', d.numHijos)}
                {d.hijos && campo('Hijos Menores de Edad', d.numHijosMenores)}
            </div>

            {/* Domicilio actual */}
            {sec('DOMICILIO ACTUAL')}
            <div className="de-grid-2">
                {campo('Calle', d.domicilioActualCalle)}
                {campo('No.', d.domicilioActualNo)}
                {campo('Colonia', d.domicilioActualColonia)}
                {campo('Municipio', d.domicilioActualMunicipio)}
                {campo('Estado', d.domicilioActualEstado)}
                {campo('Tiempo en Domicilio', d.tiempoEnDomicilio)}
                {campo('Tipo de Domicilio', d.tipoDomicilioActual)}
                {d.tipoDomicilioActual === 'Arrendado' && campo('Nombre Arrendador', d.nombreArrendador)}
                {d.tipoDomicilioActual === 'Arrendado' && campo('Monto', d.montoDomicilio)}
                {campo('Teléfono', d.telefonoDomicilio)}
                {campo('Celular', d.celularDomicilio)}
                {d.calleSecundaria && campo('Calle Secundaria', d.calleSecundaria)}
                {d.coloniaSecundaria && campo('Colonia Secundaria', d.coloniaSecundaria)}
                {d.municipioSecundario && campo('Municipio Secundario', d.municipioSecundario)}
            </div>
            {d.razonDomicilio && (
                <div className="de-campo" style={{ marginBottom: 8 }}>
                    <span className="de-label">Razón del Domicilio</span>
                    <span className="de-valor">{d.razonDomicilio}</span>
                </div>
            )}

            {/* Domicilios anteriores */}
            {domAnt.length > 0 && (
                <>
                    {sec('2. DOMICILIOS ANTERIORES')}
                    {domAnt.map((da, i) => (
                        <div key={i} className="de-grid-2" style={{ marginBottom: 4 }}>
                            {campo(`Dirección ${i + 1}`, da.direccion)}
                            {campo('Casa Propia', da.casaPropia ? 'Sí' : 'No')}
                            {campo('Tiempo de Residencia', da.tiempoResidencia)}
                            {campo('Motivo de Mudanza', da.motivoMudanza)}
                        </div>
                    ))}
                </>
            )}

            {/* Facilidad de abandonar */}
            {sec('5. FACILIDAD DE ABANDONAR EL PAÍS')}
            <div className="de-grid-2">
                {campo('Tiempo en Morelos', d.tiempoEnMorelos)}
                {campo('Familiares en Otro País', d.familiaresOtroPais)}
                {campo('Medios de Comunicación', d.mediosComunicacion)}
                {campo('Dónde Habitan Familiares', d.dondeHabitanFamiliares)}
                {campo('¿Tiene Visa?', d.tieneVisa ? 'Sí' : 'No')}
                {campo('¿Tiene Pasaporte?', d.tienePasaporte ? 'Sí' : 'No')}
                {campo('Personas Dependientes', d.personasDependientes)}
                {campo('Dónde Habitan Dependientes', d.dondeHabitanDependientes)}
            </div>

            {/* Empleo actual */}
            {sec('6. EMPLEO ACTUAL')}
            <div className="de-grid-2">
                {campo('Empresa', d.empresaImp)}
                {campo('Teléfono Empresa', d.telEmpresaImp)}
                {campo('Puesto', d.puestoImp)}
                {campo('Nombre del Jefe', d.nombreJefeImp)}
                {campo('Horario de Trabajo', d.horarioTrabajoImp)}
                {campo('Domicilio de Trabajo', d.domicilioTrabajoImp)}
                {campo('Salario Mensual', d.salarioMensualImp)}
            </div>
            {d.ultimoEmpleoImp && (
                <div className="de-campo" style={{ marginBottom: 8 }}>
                    <span className="de-label">Último Empleo</span>
                    <span className="de-valor">{d.ultimoEmpleoImp}</span>
                </div>
            )}

            {/* Empleos anteriores */}
            {empleosAnt.length > 0 && (
                <>
                    {sec('EMPLEOS ANTERIORES')}
                    {empleosAnt.map((ea, i) => (
                        <div key={i} className="de-grid-2" style={{ marginBottom: 4 }}>
                            {campo(`Empresa ${i + 1}`, ea.empresa)}
                            {campo('Puesto', ea.puesto)}
                            {campo('Nombre del Jefe', ea.nombreJefe)}
                            {campo('Razón de Salida', ea.razon)}
                            {campo('Inicio', ea.inicio)}
                            {campo('Conclusión', ea.conclusion)}
                        </div>
                    ))}
                </>
            )}

            {/* Entorno social */}
            {sec('7. ENTORNO SOCIAL')}
            <div className="de-grid-2">
                {campo('Enfermedades', d.enfermedades)}
                {campo('Hobbies', d.hobbies)}
                {campo('Enfermedad Familiar', d.enfermedadFamiliar)}
                {campo('Organizaciones', d.organizaciones)}
            </div>
            {d.observacionesGenerales && (
                <div className="de-campo" style={{ marginBottom: 8 }}>
                    <span className="de-label">Observaciones Generales</span>
                    <span className="de-valor">{d.observacionesGenerales}</span>
                </div>
            )}

            {/* Datos del denunciante */}
            {sec('8. DATOS DEL DENUNCIANTE / VÍCTIMA')}
            <div className="de-grid-2">
                {campo('¿Sabe Quién es el Denunciante?', d.sabeDenunciante ? 'Sí' : 'No')}
                {campo('¿Vive con el Imputado?', d.viveConImputado ? 'Sí' : 'No')}
                {campo('¿Saben Dónde Vive?', d.sabenDondeVive ? 'Sí' : 'No')}
                {campo('Nombre del Denunciante', d.nombreDenunciante)}
                {campo('Tipo de Solicitud', d.tipoSolicitud)}
            </div>
            {d.basesVictima && (
                <div className="de-campo" style={{ marginBottom: 8 }}>
                    <span className="de-label">Bases de la Víctima</span>
                    <span className="de-valor">{d.basesVictima}</span>
                </div>
            )}

            {/* Proceso actual */}
            {sec('9. PROCESO ACTUAL')}
            <div className="de-grid-2">
                {campo('¿Reincidencia?', d.reincidencia ? 'Sí' : 'No')}
                {campo('Relación con la Víctima', d.relacionVictima)}
            </div>
            {d.descripcionCompromiso && (
                <div className="de-campo" style={{ marginBottom: 8 }}>
                    <span className="de-label">Descripción del Compromiso</span>
                    <span className="de-valor">{d.descripcionCompromiso}</span>
                </div>
            )}

            {/* Procesos anteriores */}
            {d.procesosAnteriores && (
                <>
                    {sec('10. PROCESOS ANTERIORES')}
                    <div className="de-campo" style={{ marginBottom: 8 }}>
                        <span className="de-label">Procesos Anteriores</span>
                        <span className="de-valor">{d.procesosAnteriores}</span>
                    </div>
                </>
            )}

            {/* Conclusión */}
            {sec('11. CONCLUSIÓN')}
            <div className="de-grid-2" style={{ marginBottom: 32 }}>
                <div className="de-campo">
                    <span className="de-label">Resultado</span>
                    <span className="de-valor">
                        {d.resultado
                            ? <span className={`riesgo-badge ${resultadoConfig[d.resultado]?.clase}`}>{resultadoConfig[d.resultado]?.label}</span>
                            : <span className={`estatus-badge ${estatusConfig[d.estatus]?.clase}`}>{estatusConfig[d.estatus]?.label}</span>
                        }
                    </span>
                </div>
                {d.justificacionResultado && campo('Justificación', d.justificacionResultado)}
            </div>
        </div>
    );
};

export default DetalleEvaluacion;
