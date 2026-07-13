package mx.edu.utez.umeca.modules.evaluacion;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class EvaluacionRiesgoResponseDTO {
    private Long id;
    private LocalDate fechaSolicitud;
    private String nombreSolicitante;
    private boolean imputadoFallecido;
    private String nombreImputado;      // solo el nombre (para el formulario)
    private String apPaternoImputado;   // solo el apellido paterno (para el formulario)
    private String apMaternoImputado;   // apellido materno (para el formulario)
    private String nombreCompletoImputado; // nombre + apellido (para mostrar en lista/detalle)
    private String causaPenal;
    private String delito;
    private String ubicacionFisica;
    private LocalDate puestaDisposicion;
    private LocalDate fechaAudiencia;
    private String estatus;
    private String resultado;
    private String nombreEvaluador;
    private String cargo;
    private String dependencia;
    private Long entrevistaId;

    // Datos personales imputado (del formulario)
    private String genero;
    private java.time.LocalDate fechaNacimiento;
    private Integer edad;
    private String lugarNacimientoImp;
    private String municipioImp;
    private String estadoNacimiento;
    private String paisImp;
    private String estadoCivil;
    private String gradoEstudios;

    // Domicilio actual
    private String domicilioActualCalle;
    private String domicilioActualNo;
    private String domicilioActualColonia;
    private String domicilioActualMunicipio;
    private String domicilioActualEstado;

    // Empleo actual
    private String empresaImp;
    private String telEmpresaImp;
    private String puestoImp;
    private String nombreJefeImp;
    private String horarioTrabajoImp;
    private String domicilioTrabajoImp;
    private Double salarioMensualImp;
    private String ultimoEmpleoImp;

    // Metadatos evaluación
    private String horaInicio;
    private String horaFinal;
    private String lugarEntrevista;

    // Sección 1 extras
    private String curp;
    private Boolean hijos;
    private Integer numHijos;
    private Integer numHijosMenores;
    private String tiempoEnDomicilio;
    private String tipoDomicilioActual;
    private String nombreArrendador;
    private Double montoDomicilio;
    private String telefonoDomicilio;
    private String celularDomicilio;
    private String calleSecundaria;
    private String noSecundaria;
    private String coloniaSecundaria;
    private String municipioSecundario;
    private String razonDomicilio;

    // JSON arrays
    private String domiciliosAnterioresJson;
    private String empleosAnterioresJson;

    // Sección 7
    private String nombreEscuela;
    private String anioEscolar;
    private String atrasoEscolar;

    // Sección 5
    private String tiempoEnMorelos;
    private String familiaresOtroPais;
    private String mediosComunicacion;
    private String dondeHabitanFamiliares;
    private Boolean tieneVisa;
    private Boolean tienePasaporte;
    private String personasDependientes;
    private String dondeHabitanDependientes;

    // Sección 9
    private String enfermedades;
    private String hobbies;
    private String enfermedadFamiliar;
    private String organizaciones;
    private String observacionesGenerales;

    // Sección 10
    private Boolean sabeDenunciante;
    private Boolean viveConImputado;
    private Boolean sabenDondeVive;
    private String nombreDenunciante;
    private String basesVictima;
    private String tipoSolicitud;

    // Sección 11
    private String articuloDelito;
    private Boolean reincidencia;
    private String relacionVictima;
    private String descripcionCompromiso;

    // Datos del oficio
    private String numOficio;
    private String folioEscrito;
    private String fiscalia;

    // Sección 12
    private String procesosAnteriores;

    // Sección 13
    private String justificacionResultado;
    private String conclusionGeneral;
    private String riesgosProcesalesJson;
    private String factoresEstabilidadJson;

    // Verificaciones por sección (s1–s11)
    private String verifS1Metodo;  private String verifS1Resultado;
    private String verifS2Metodo;  private String verifS2Resultado;
    private String verifS3Metodo;  private String verifS3Resultado;
    private String verifS4Metodo;  private String verifS4Resultado;
    private String verifS5Metodo;  private String verifS5Resultado;
    private String verifS6Metodo;  private String verifS6Resultado;
    private String verifS7Metodo;  private String verifS7Resultado;
    private String verifS8Metodo;  private String verifS8Resultado;
    private String verifS9Metodo;  private String verifS9Resultado;
    private String verifS10Metodo; private String verifS10Resultado;
    private String verifS11Metodo; private String verifS11Resultado;
    private String tipoDocumento;

    public static EvaluacionRiesgoResponseDTO from(EvaluacionRiesgo e) {
        EvaluacionRiesgoResponseDTO dto = new EvaluacionRiesgoResponseDTO();
        dto.setId(e.getId());
        dto.setFechaSolicitud(e.getFechaSolicitud());
        dto.setNombreSolicitante(e.getNombreSolicitanteTexto() != null && !e.getNombreSolicitanteTexto().isBlank()
                ? e.getNombreSolicitanteTexto()
                : e.getSolicitante().getNombre() + " " + e.getSolicitante().getApPaterno());
        dto.setCargo(e.getCargoSolicitante());
        dto.setDependencia(e.getDependenciaSolicitante());
        dto.setImputadoFallecido(e.getImputado().isFallecido());
        dto.setNombreImputado(e.getImputado().getNombre());
        dto.setApPaternoImputado(e.getImputado().getApPaterno());
        dto.setApMaternoImputado(e.getImputado().getApMaterno());
        dto.setNombreCompletoImputado(e.getImputado().getNombreCompleto());
        dto.setCausaPenal(e.getImputado().getCausaPenal());
        dto.setDelito(e.getImputado().getDelito());
        dto.setUbicacionFisica(e.getImputado().getUbicacionFisica() != null ? e.getImputado().getUbicacionFisica().name() : null);
        dto.setPuestaDisposicion(e.getPuestaDisposicion());
        dto.setFechaAudiencia(e.getFechaAudiencia());
        dto.setEstatus(e.getEstatus().name());
        dto.setResultado(e.getResultado() != null ? e.getResultado().name() : null);
        dto.setNombreEvaluador(e.getEvaluador() != null
                ? e.getEvaluador().getNombre() + " " + e.getEvaluador().getApPaterno() : null);
        dto.setEntrevistaId(e.getEntrevista() != null ? e.getEntrevista().getId() : null);

        dto.setGenero(e.getGenero());
        dto.setFechaNacimiento(e.getFechaNacimiento());
        dto.setEdad(e.getEdad());
        dto.setLugarNacimientoImp(e.getLugarNacimientoImp());
        dto.setMunicipioImp(e.getMunicipioImp());
        dto.setEstadoNacimiento(e.getEstadoNacimiento());
        dto.setPaisImp(e.getPaisImp());
        dto.setEstadoCivil(e.getEstadoCivil());
        dto.setGradoEstudios(e.getGradoEstudios());
        dto.setDomicilioActualCalle(e.getDomicilioActualCalle());
        dto.setDomicilioActualNo(e.getDomicilioActualNo());
        dto.setDomicilioActualColonia(e.getDomicilioActualColonia());
        dto.setDomicilioActualMunicipio(e.getDomicilioActualMunicipio());
        dto.setDomicilioActualEstado(e.getDomicilioActualEstado());
        dto.setEmpresaImp(e.getEmpresaImp());
        dto.setTelEmpresaImp(e.getTelEmpresaImp());
        dto.setPuestoImp(e.getPuestoImp());
        dto.setNombreJefeImp(e.getNombreJefeImp());
        dto.setHorarioTrabajoImp(e.getHorarioTrabajoImp());
        dto.setDomicilioTrabajoImp(e.getDomicilioTrabajoImp());
        dto.setSalarioMensualImp(e.getSalarioMensualImp());
        dto.setUltimoEmpleoImp(e.getUltimoEmpleoImp());

        dto.setHoraInicio(e.getHoraInicio());
        dto.setHoraFinal(e.getHoraFinal());
        dto.setLugarEntrevista(e.getLugarEntrevista());

        dto.setCurp(e.getCurp());
        dto.setHijos(e.getHijos());
        dto.setNumHijos(e.getNumHijos());
        dto.setNumHijosMenores(e.getNumHijosMenores());
        dto.setTiempoEnDomicilio(e.getTiempoEnDomicilio());
        dto.setTipoDomicilioActual(e.getTipoDomicilioActual());
        dto.setNombreArrendador(e.getNombreArrendador());
        dto.setMontoDomicilio(e.getMontoDomicilio());
        dto.setTelefonoDomicilio(e.getTelefonoDomicilio());
        dto.setCelularDomicilio(e.getCelularDomicilio());
        dto.setCalleSecundaria(e.getCalleSecundaria());
        dto.setNoSecundaria(e.getNoSecundaria());
        dto.setColoniaSecundaria(e.getColoniaSecundaria());
        dto.setMunicipioSecundario(e.getMunicipioSecundario());
        dto.setRazonDomicilio(e.getRazonDomicilio());
        dto.setDomiciliosAnterioresJson(e.getDomiciliosAnterioresJson());
        dto.setEmpleosAnterioresJson(e.getEmpleosAnterioresJson());
        dto.setNombreEscuela(e.getNombreEscuela());
        dto.setAnioEscolar(e.getAnioEscolar());
        dto.setAtrasoEscolar(e.getAtrasoEscolar());

        dto.setTiempoEnMorelos(e.getTiempoEnMorelos());
        dto.setFamiliaresOtroPais(e.getFamiliaresOtroPais());
        dto.setMediosComunicacion(e.getMediosComunicacion());
        dto.setDondeHabitanFamiliares(e.getDondeHabitanFamiliares());
        dto.setTieneVisa(e.getTieneVisa());
        dto.setTienePasaporte(e.getTienePasaporte());
        dto.setPersonasDependientes(e.getPersonasDependientes());
        dto.setDondeHabitanDependientes(e.getDondeHabitanDependientes());

        dto.setEnfermedades(e.getEnfermedades());
        dto.setHobbies(e.getHobbies());
        dto.setEnfermedadFamiliar(e.getEnfermedadFamiliar());
        dto.setOrganizaciones(e.getOrganizaciones());
        dto.setObservacionesGenerales(e.getObservacionesGenerales());

        dto.setSabeDenunciante(e.getSabeDenunciante());
        dto.setViveConImputado(e.getViveConImputado());
        dto.setSabenDondeVive(e.getSabenDondeVive());
        dto.setNombreDenunciante(e.getNombreDenunciante());
        dto.setBasesVictima(e.getBasesVictima());
        dto.setTipoSolicitud(e.getTipoSolicitud());

        dto.setArticuloDelito(e.getArticuloDelito());
        dto.setReincidencia(e.getReincidencia());
        dto.setRelacionVictima(e.getRelacionVictima());
        dto.setDescripcionCompromiso(e.getDescripcionCompromiso());

        dto.setNumOficio(e.getNumOficio());
        dto.setFolioEscrito(e.getFolioEscrito());
        dto.setFiscalia(e.getFiscalia());
        dto.setProcesosAnteriores(e.getProcesosAnteriores());
        dto.setJustificacionResultado(e.getJustificacionResultado());
        dto.setConclusionGeneral(e.getConclusionGeneral());
        dto.setRiesgosProcesalesJson(e.getRiesgosProcesalesJson());
        dto.setFactoresEstabilidadJson(e.getFactoresEstabilidadJson());

        // Verificaciones por sección (s1–s11)
        dto.setVerifS1Metodo(e.getVerifS1Metodo()); dto.setVerifS1Resultado(e.getVerifS1Resultado());
        dto.setVerifS2Metodo(e.getVerifS2Metodo()); dto.setVerifS2Resultado(e.getVerifS2Resultado());
        dto.setVerifS3Metodo(e.getVerifS3Metodo()); dto.setVerifS3Resultado(e.getVerifS3Resultado());
        dto.setVerifS4Metodo(e.getVerifS4Metodo()); dto.setVerifS4Resultado(e.getVerifS4Resultado());
        dto.setVerifS5Metodo(e.getVerifS5Metodo()); dto.setVerifS5Resultado(e.getVerifS5Resultado());
        dto.setVerifS6Metodo(e.getVerifS6Metodo()); dto.setVerifS6Resultado(e.getVerifS6Resultado());
        dto.setVerifS7Metodo(e.getVerifS7Metodo()); dto.setVerifS7Resultado(e.getVerifS7Resultado());
        dto.setVerifS8Metodo(e.getVerifS8Metodo()); dto.setVerifS8Resultado(e.getVerifS8Resultado());
        dto.setVerifS9Metodo(e.getVerifS9Metodo()); dto.setVerifS9Resultado(e.getVerifS9Resultado());
        dto.setVerifS10Metodo(e.getVerifS10Metodo()); dto.setVerifS10Resultado(e.getVerifS10Resultado());
        dto.setVerifS11Metodo(e.getVerifS11Metodo()); dto.setVerifS11Resultado(e.getVerifS11Resultado());
        dto.setTipoDocumento(e.getTipoDocumento() != null ? e.getTipoDocumento().name() : "NORMAL");
        return dto;
    }
}
