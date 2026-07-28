package mx.edu.utez.umeca.modules.expediente;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

/**
 * DTO para importación masiva desde Excel.
 * Todos los campos son opcionales para tolerar datos faltantes.
 */
@Getter
@Setter
public class ExpedienteAnteriorDTO {

    private String tipo;   // "MC" | "SCP" | "HISTORICO"
    private String zona;   // "XOCHITEPEC" | "CUAUTLA" | "JOJUTLA"

    // Datos del imputado
    private String numero;
    private String estatus;
    private String responsable;
    private String apPaterno;
    private String apMaterno;
    private String nombre;
    private String genero;
    private LocalDate fechaNacimiento;
    private Integer edad;

    // Grupos vulnerables
    private Boolean indigena;
    private String etniaPueblo;
    private Boolean afrodescendiente;
    private Boolean extranjeroMigrante;
    private Boolean comunidadLgbt;
    private Boolean discapacidad;
    private String grupoVulnerableOtro;

    // Domicilio
    private String calle;
    private String numeroExt;
    private String colonia;
    private String municipio;
    private String estadoDomicilio;
    private String telefono1;
    private String telefono2;
    private String ocupacion;

    // Víctima 1
    private String victima1Tipo;
    private String victima1Nombre;
    private String victima1Genero;
    private String victima1Domicilio;
    private String victima1Telefono;

    // Víctima 2
    private String victima2Tipo;
    private String victima2Nombre;
    private String victima2Genero;
    private String victima2Domicilio;
    private String victima2Telefono;

    // Campos exclusivos SCP
    private LocalDate fechaInicioSupervision;
    private LocalDate fechaImposicionScp;
    private String plazoScp;
    private LocalDate fechaConclusionScp;
    private LocalDate primeraVisita;
    private LocalDate segundaVisita;
    private LocalDate terceraVisita;
    private String tipoServicio;
    private LocalDate fechaInformeFinal;
    private LocalDate vencimientoPlazoScp;
    private String oficioSobreseimiento;
    private String responsableCierreCarpeta;
    private String ajuste;
    private String numeroExpedienteArchivo;

    // Oficio de imposición
    private LocalDate fechaRecepcion;
    private String causaPenal;
    private String delito;
    private String modalidad;
    private String sede;
    private String nombreJuez;
    private LocalDate fechaFormulacion;
    private LocalDate fechaVinculacionProceso;
    private LocalDate fechaEntrevistaEvaluacion;

    // Evaluación
    private LocalDate fechaAudienciaImposicion;
    private LocalDate fechaEntrevistaEncuadre;
    private Boolean riesgoSustraccion;
    private Boolean riesgoObstaculizacion;
    private Boolean riesgoVictima;
    private String opinionTecnicaRiesgos;
    private String informe;
    private Boolean noAplicaMpNoSolicito;
    private Boolean noAplicaSinTiempo;
    private Boolean noAplicaPersonaNoAccedio;
    private Boolean noAplicaSinFuentes;
    private String noAplicaOtro;

    // Medidas cautelares I–XIV
    private Boolean mcI, mcIi, mcIii, mcIv, mcV, mcVi, mcVii;
    private Boolean mcViii, mcIx, mcX, mcXi, mcXii, mcXiii, mcXiv;

    // Datos MC
    private LocalDate fechaCanalizacion;
    private String aDisposicion;
    private String coordenadasDomicilio;
    private String presentacionPeriodica;
    private String noBiometrico;
    private String noLibro;
    private String noPagina;
    private String cumpliendoIncumpliendo;
    private String distritoJudicial;
    private String ultimoInformeMc;
    private String acuerdoReparatorio;
    private LocalDate fechaAcuerdoReparatorio;
    private LocalDate fechaCumplimientoAcuerdo;
    private String estatusFinal;
    private LocalDate fechaTerminoMc;
    private String estadoFinal;

    // Seguimientos y observaciones
    private List<String> seguimientos;
    private String observaciones;

    // ── REGISTRO_HISTORICO ────────────────────────────────────
    private LocalDate fechaRegistroHist;
    private String situacionJuridica;

    // ── SUSTRAIDO ─────────────────────────────────────────────
    private String archivo;
    private String tipoMcScp;
    private String sustraccion;
    private String supervisor;

    // ── Campos nuevos Base Jojutla / Cuautla ──────────────────
    private String resolucion;
    private String sexo;
    private String bitacora;
    private String juez;
    private LocalDate fechaImposicion;
    private String plazo;
    private LocalDate fechaVencimiento;
    private String asignado;
    private LocalDate vencimiento;
    private String motivoCierre;
    private String cierre;
    private String observaciones2;
    private String observaciones3;
    private String observaciones4;
    private String observaciones5;
    private String observaciones6;
    private String carpetaXochitepec;
}
