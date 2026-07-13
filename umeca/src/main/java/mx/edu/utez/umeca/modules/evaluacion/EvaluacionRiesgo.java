package mx.edu.utez.umeca.modules.evaluacion;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import mx.edu.utez.umeca.kernel.BaseEntity;
import mx.edu.utez.umeca.modules.entrevista.EntrevistaEncuadre;
import mx.edu.utez.umeca.modules.imputado.Imputado;
import mx.edu.utez.umeca.modules.security.user.User;

import java.time.LocalDate;

/**
 * Registro de evaluación de riesgos procesales de un imputado.
 * Contiene los 13 secciones del formato oficial (Versión 5, 16 MAR 2022):
 * datos personales, domicilios, entorno laboral/escolar, consumo de sustancias,
 * proceso penal y la conclusión con el criterio de riesgo.
 *
 * <p>Las colecciones que no tienen cardinalidad fija (domicilios anteriores,
 * empleos anteriores, riesgos procesales y factores de estabilidad) se serializan
 * como JSON en columnas TEXT para simplicidad.</p>
 *
 * <p>Las verificaciones de cada sección (método + resultado) se almacenan en pares
 * de columnas {@code verif_sN_metodo} / {@code verif_sN_resultado}.</p>
 */
@Getter
@Setter
@Entity
@Table(name = "evaluaciones_riesgo")
public class EvaluacionRiesgo extends BaseEntity {

    @Column(name = "fecha_solicitud", nullable = false)
    private LocalDate fechaSolicitud;

    @Column(name = "nombre_solicitante_texto", length = 300)
    private String nombreSolicitanteTexto;

    @Column(name = "cargo_solicitante", length = 200)
    private String cargoSolicitante;

    @Column(name = "dependencia_solicitante", length = 200)
    private String dependenciaSolicitante;

    @JsonIgnoreProperties({"hibernateLazyInitializer","handler","password","authorities","accountNonExpired","accountNonLocked","credentialsNonExpired","enabled"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "solicitante_id", nullable = false)
    private User solicitante;

    @JsonIgnoreProperties({"hibernateLazyInitializer","handler","password","authorities","accountNonExpired","accountNonLocked","credentialsNonExpired","enabled"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "evaluador_id")
    private User evaluador;

    @JsonIgnoreProperties({"hibernateLazyInitializer","handler"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "imputado_id", nullable = false)
    private Imputado imputado;

    @JsonIgnoreProperties({"hibernateLazyInitializer","handler"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "entrevista_id")
    private EntrevistaEncuadre entrevista;

    @Column(name = "puesta_disposicion")
    private LocalDate puestaDisposicion;

    @Column(name = "fecha_audiencia")
    private LocalDate fechaAudiencia;

    @Column(name = "hora_inicio", length = 10)
    private String horaInicio;

    @Column(name = "hora_final", length = 10)
    private String horaFinal;

    @Column(name = "lugar_entrevista", length = 300)
    private String lugarEntrevista;

    // ── Sección 1: datos adicionales ────────────────────
    // ── Sección 1: datos personales del imputado (del formulario) ──────────
    @Column(length = 20)
    private String genero;

    @Column(name = "fecha_nacimiento_imp")
    private java.time.LocalDate fechaNacimiento;

    @Column
    private Integer edad;

    @Column(length = 150)
    private String lugarNacimientoImp;

    @Column(length = 100)
    private String municipioImp;

    @Column(name = "estado_nacimiento_imp", length = 100)
    private String estadoNacimiento;

    @Column(length = 100)
    private String paisImp;

    @Column(name = "estado_civil_imp", length = 30)
    private String estadoCivil;

    @Column(name = "grado_estudios_imp", length = 50)
    private String gradoEstudios;

    // Domicilio actual
    @Column(name = "domicilio_actual_calle", length = 200)
    private String domicilioActualCalle;

    @Column(name = "domicilio_actual_no", length = 20)
    private String domicilioActualNo;

    @Column(name = "domicilio_actual_colonia", length = 100)
    private String domicilioActualColonia;

    @Column(name = "domicilio_actual_municipio", length = 100)
    private String domicilioActualMunicipio;

    @Column(name = "domicilio_actual_estado", length = 100)
    private String domicilioActualEstado;

    // Empleo actual
    @Column(name = "empresa_imp", length = 200)
    private String empresaImp;

    @Column(name = "tel_empresa_imp", length = 20)
    private String telEmpresaImp;

    @Column(name = "puesto_imp", length = 100)
    private String puestoImp;

    @Column(name = "nombre_jefe_imp", length = 200)
    private String nombreJefeImp;

    @Column(name = "horario_trabajo_imp", length = 50)
    private String horarioTrabajoImp;

    @Column(name = "domicilio_trabajo_imp", length = 300)
    private String domicilioTrabajoImp;

    @Column(name = "salario_mensual_imp")
    private Double salarioMensualImp;

    @Column(name = "ultimo_empleo_imp", columnDefinition = "TEXT")
    private String ultimoEmpleoImp;

    @Column(length = 20)
    private String curp;

    @Column
    private Boolean hijos = false;

    @Column(name = "num_hijos")
    private Integer numHijos;

    @Column(name = "num_hijos_menores")
    private Integer numHijosMenores;

    @Column(name = "tiempo_en_domicilio", length = 100)
    private String tiempoEnDomicilio;

    @Column(name = "tipo_domicilio_actual", length = 50)
    private String tipoDomicilioActual;

    @Column(name = "nombre_arrendador", length = 200)
    private String nombreArrendador;

    @Column(name = "monto_domicilio")
    private Double montoDomicilio;

    @Column(name = "telefono_domicilio", length = 20)
    private String telefonoDomicilio;

    @Column(name = "celular_domicilio", length = 20)
    private String celularDomicilio;

    @Column(name = "calle_secundaria", length = 200)
    private String calleSecundaria;

    @Column(name = "no_secundaria", length = 20)
    private String noSecundaria;

    @Column(name = "colonia_secundaria", length = 100)
    private String coloniaSecundaria;

    @Column(name = "municipio_secundario", length = 100)
    private String municipioSecundario;

    @Column(name = "razon_domicilio", columnDefinition = "TEXT")
    private String razonDomicilio;

    // ── Sección 2: domicilios anteriores (JSON) ─────────
    @Column(name = "domicilios_anteriores_json", columnDefinition = "TEXT")
    private String domiciliosAnterioresJson;

    // ── Sección 6: empleos anteriores (JSON) ─────────────
    @Column(name = "empleos_anteriores_json", columnDefinition = "TEXT")
    private String empleosAnterioresJson;

    // ── Sección 7: historia escolar ──────────────────────
    @Column(name = "nombre_escuela", length = 300)
    private String nombreEscuela;

    @Column(name = "anio_escolar", length = 50)
    private String anioEscolar;

    @Column(name = "atraso_escolar", length = 100)
    private String atrasoEscolar;

    // ── Sección 5: facilidad de abandonar ───────────────
    @Column(name = "tiempo_en_morelos", length = 200)
    private String tiempoEnMorelos;

    @Column(name = "familiares_otro_pais", length = 300)
    private String familiaresOtroPais;

    @Column(name = "medios_comunicacion", length = 300)
    private String mediosComunicacion;

    @Column(name = "donde_habitan_familiares", length = 300)
    private String dondeHabitanFamiliares;

    @Column(name = "tiene_visa")
    private Boolean tieneVisa = false;

    @Column(name = "tiene_pasaporte")
    private Boolean tienePasaporte = false;

    @Column(name = "personas_dependientes", length = 300)
    private String personasDependientes;

    @Column(name = "donde_habitan_dependientes", length = 300)
    private String dondeHabitanDependientes;

    // ── Sección 9: entorno social ────────────────────────
    @Column(columnDefinition = "TEXT")
    private String enfermedades;

    @Column(columnDefinition = "TEXT")
    private String hobbies;

    @Column(name = "enfermedad_familiar", columnDefinition = "TEXT")
    private String enfermedadFamiliar;

    @Column(columnDefinition = "TEXT")
    private String organizaciones;

    @Column(name = "observaciones_generales", columnDefinition = "TEXT")
    private String observacionesGenerales;

    // ── Sección 10: datos denunciante ────────────────────
    @Column(name = "sabe_denunciante")
    private Boolean sabeDenunciante = false;

    @Column(name = "vive_con_imputado")
    private Boolean viveConImputado = false;

    @Column(name = "saben_donde_vive")
    private Boolean sabenDondeVive = false;

    @Column(name = "nombre_denunciante", length = 200)
    private String nombreDenunciante;

    @Column(name = "bases_victima", columnDefinition = "TEXT")
    private String basesVictima;

    @Column(name = "tipo_solicitud", length = 100)
    private String tipoSolicitud;

    // ── Sección 11: proceso actual ───────────────────────
    @Column(name = "articulo_delito", length = 200)
    private String articuloDelito;

    @Column
    private Boolean reincidencia = false;

    @Column(name = "relacion_victima", length = 300)
    private String relacionVictima;

    @Column(name = "descripcion_compromiso", columnDefinition = "TEXT")
    private String descripcionCompromiso;

    // ── Sección 12: procesos anteriores ─────────────────
    @Column(name = "procesos_anteriores", columnDefinition = "TEXT")
    private String procesosAnteriores;

    // ── Verificaciones por sección (s1–s11) ─────────────
    @Column(name = "verif_s1_metodo", columnDefinition = "TEXT") private String verifS1Metodo;
    @Column(name = "verif_s1_resultado", columnDefinition = "TEXT") private String verifS1Resultado;
    @Column(name = "verif_s2_metodo", columnDefinition = "TEXT") private String verifS2Metodo;
    @Column(name = "verif_s2_resultado", columnDefinition = "TEXT") private String verifS2Resultado;
    @Column(name = "verif_s3_metodo", columnDefinition = "TEXT") private String verifS3Metodo;
    @Column(name = "verif_s3_resultado", columnDefinition = "TEXT") private String verifS3Resultado;
    @Column(name = "verif_s4_metodo", columnDefinition = "TEXT") private String verifS4Metodo;
    @Column(name = "verif_s4_resultado", columnDefinition = "TEXT") private String verifS4Resultado;
    @Column(name = "verif_s5_metodo", columnDefinition = "TEXT") private String verifS5Metodo;
    @Column(name = "verif_s5_resultado", columnDefinition = "TEXT") private String verifS5Resultado;
    @Column(name = "verif_s6_metodo", columnDefinition = "TEXT") private String verifS6Metodo;
    @Column(name = "verif_s6_resultado", columnDefinition = "TEXT") private String verifS6Resultado;
    @Column(name = "verif_s7_metodo", columnDefinition = "TEXT") private String verifS7Metodo;
    @Column(name = "verif_s7_resultado", columnDefinition = "TEXT") private String verifS7Resultado;
    @Column(name = "verif_s8_metodo", columnDefinition = "TEXT") private String verifS8Metodo;
    @Column(name = "verif_s8_resultado", columnDefinition = "TEXT") private String verifS8Resultado;
    @Column(name = "verif_s9_metodo", columnDefinition = "TEXT") private String verifS9Metodo;
    @Column(name = "verif_s9_resultado", columnDefinition = "TEXT") private String verifS9Resultado;
    @Column(name = "verif_s10_metodo", columnDefinition = "TEXT") private String verifS10Metodo;
    @Column(name = "verif_s10_resultado", columnDefinition = "TEXT") private String verifS10Resultado;
    @Column(name = "verif_s11_metodo", columnDefinition = "TEXT") private String verifS11Metodo;
    @Column(name = "verif_s11_resultado", columnDefinition = "TEXT") private String verifS11Resultado;

    // ── Datos del oficio / carta ─────────────────────────
    @Column(name = "num_oficio", length = 100)
    private String numOficio;

    @Column(name = "folio_escrito", length = 150)
    private String folioEscrito;

    @Column(name = "fiscalia", length = 200)
    private String fiscalia;

    // ── Sección 13: conclusión ───────────────────────────
    @Column(name = "justificacion_resultado", columnDefinition = "TEXT")
    private String justificacionResultado;

    @Column(name = "conclusion_general", columnDefinition = "TEXT")
    private String conclusionGeneral;

    @Column(name = "riesgos_procesales_json", columnDefinition = "TEXT")
    private String riesgosProcesalesJson;

    @Column(name = "factores_estabilidad_json", columnDefinition = "TEXT")
    private String factoresEstabilidadJson;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Estatus estatus = Estatus.PENDIENTE;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private Resultado resultado;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_documento", length = 20)
    private TipoDocumento tipoDocumento = TipoDocumento.NORMAL;

    /**
     * Ciclo de vida del expediente de evaluación.
     * PENDIENTE: aún no asignado a evaluador; TRABAJANDO: en proceso; FINALIZADO: con resultado cargado.
     */
    public enum Estatus {
        PENDIENTE, TRABAJANDO, FINALIZADO
    }

    /**
     * Criterio de riesgo procesal determinado por el evaluador.
     * FLEXIBLE = bajo riesgo; ESTRICTO = medio riesgo; DIFICIL_CUMPLIR = alto riesgo.
     */
    public enum Resultado {
        DIFICIL_CUMPLIR, ESTRICTO, FLEXIBLE
    }

    /**
     * Distingue evaluaciones normales de cartas de negación de información
     * (cuando el imputado se negó a proporcionar datos).
     */
    public enum TipoDocumento {
        NORMAL, NEGACION
    }
}
