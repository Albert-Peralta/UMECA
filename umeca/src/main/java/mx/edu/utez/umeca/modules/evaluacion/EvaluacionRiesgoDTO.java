package mx.edu.utez.umeca.modules.evaluacion;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class EvaluacionRiesgoDTO {

    // Datos solicitud
    @NotNull(message = "La fecha de solicitud es obligatoria")
    @PastOrPresent(message = "La fecha de solicitud no puede ser futura")
    private LocalDate fechaSolicitud;

    @NotBlank(message = "El nombre del solicitante es obligatorio")
    private String nombreSolicitante;

    @NotBlank(message = "El cargo es obligatorio")
    private String cargo;

    @NotBlank(message = "La dependencia es obligatoria")
    private String dependencia;

    // Datos imputado
    @NotBlank(message = "La causa penal es obligatoria")
    private String causaPenal;

    @NotBlank(message = "El nombre del imputado es obligatorio")
    private String nombreImputado;

    @NotBlank(message = "El apellido paterno es obligatorio")
    private String apPaternoImputado;

    private String apMaternoImputado;

    @NotBlank(message = "El delito es obligatorio")
    private String delito;

    @NotNull(message = "La ubicación física es obligatoria")
    private String ubicacionFisica;

    private LocalDate puestaDisposicion;

    private LocalDate fechaAudiencia;

    // FK entrevista (opcional)
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

    // Domicilio actual imputado
    private String domicilioActualCalle;
    private String domicilioActualNo;
    private String domicilioActualColonia;
    private String domicilioActualMunicipio;
    private String domicilioActualEstado;

    // Empleo actual imputado
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

    // Sección 2: domicilios anteriores (JSON)
    private String domiciliosAnterioresJson;

    // Sección 6: empleos anteriores (JSON)
    private String empleosAnterioresJson;

    // Sección 7: historia escolar
    private String nombreEscuela;
    private String anioEscolar;
    private String atrasoEscolar;

    // Sección 5: facilidad de abandonar
    private String tiempoEnMorelos;
    private String familiaresOtroPais;
    private String mediosComunicacion;
    private String dondeHabitanFamiliares;
    private Boolean tieneVisa;
    private Boolean tienePasaporte;
    private String personasDependientes;
    private String dondeHabitanDependientes;

    // Sección 9: entorno social
    private String enfermedades;
    private String hobbies;
    private String enfermedadFamiliar;
    private String organizaciones;
    private String observacionesGenerales;

    // Sección 10: datos denunciante
    private Boolean sabeDenunciante;
    private Boolean viveConImputado;
    private Boolean sabenDondeVive;
    private String nombreDenunciante;
    private String basesVictima;
    private String tipoSolicitud;

    // Sección 11: proceso actual
    private String articuloDelito;
    private Boolean reincidencia;
    private String relacionVictima;
    private String descripcionCompromiso;

    // Datos del oficio
    private String numOficio;
    private String folioEscrito;
    private String fiscalia;

    // Sección 12: procesos anteriores
    private String procesosAnteriores;

    // Sección 13: conclusión
    private String resultado;
    private String justificacionResultado;
    private String conclusionGeneral;
    private String riesgosProcesalesJson;
    private String factoresEstabilidadJson;

    // Verificaciones por sección (s1–s11)
    private String verifS1Metodo; private String verifS1Resultado;
    private String verifS2Metodo; private String verifS2Resultado;
    private String verifS3Metodo; private String verifS3Resultado;
    private String verifS4Metodo; private String verifS4Resultado;
    private String verifS5Metodo; private String verifS5Resultado;
    private String verifS6Metodo; private String verifS6Resultado;
    private String verifS7Metodo; private String verifS7Resultado;
    private String verifS8Metodo; private String verifS8Resultado;
    private String verifS9Metodo; private String verifS9Resultado;
    private String verifS10Metodo; private String verifS10Resultado;
    private String verifS11Metodo; private String verifS11Resultado;
}
