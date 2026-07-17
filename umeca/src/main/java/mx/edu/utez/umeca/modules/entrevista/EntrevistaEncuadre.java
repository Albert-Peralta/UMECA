package mx.edu.utez.umeca.modules.entrevista;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import mx.edu.utez.umeca.kernel.BaseEntity;
import mx.edu.utez.umeca.modules.imputado.Imputado;
import mx.edu.utez.umeca.modules.security.user.User;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Entrevista de encuadre realizada a un imputado al ingresar al programa UMECA.
 * Es el documento inicial del expediente; captura datos personales, biométricos,
 * laborales y de contacto que luego se pre-llenan en la evaluación de riesgos.
 *
 * <p>Las colecciones relacionadas se gestionan con cascada completa y orphanRemoval:</p>
 * <ul>
 *   <li>{@code domicilios} — uno o más domicilios del imputado ({@link DomicilioEntrevista})</li>
 *   <li>{@code personasHabita} — personas que conviven con el imputado ({@link PersonaHabita})</li>
 *   <li>{@code referencias} — referencias personales de localización ({@link ReferenciaPersonal})</li>
 *   <li>{@code consumoSustancias} — historial de consumo de sustancias ({@link ConsumoSustancia})</li>
 * </ul>
 *
 * <p>{@code fotoImputado} es transitorio: si llega en el request se persiste en la entidad
 * {@link mx.edu.utez.umeca.modules.imputado.Imputado}, no aquí.</p>
 */
@Getter
@Setter
@Entity
@Table(name = "entrevistas_encuadre")
public class EntrevistaEncuadre extends BaseEntity {

    @Column(nullable = false, unique = true, length = 20)
    private String folio;

    @Column(name = "causa_penal", nullable = false, length = 100)
    private String causaPenal;

    @Column(name = "fecha_registro", nullable = false)
    private LocalDate fechaRegistro;

    @Column(length = 10)
    private String libro;

    @Column(length = 10)
    private String foja;

    @Column(nullable = false, length = 100)
    private String nombre;

    @Column(name = "ap_paterno", nullable = false, length = 100)
    private String apPaterno;

    @Column(name = "ap_materno", length = 100)
    private String apMaterno;

    @Column(name = "telefono_casa", length = 20)
    private String telefonoCasa;

    @Column(length = 20)
    private String celular;

    @Column(length = 150)
    private String email;

    @Column(name = "fecha_nacimiento")
    private LocalDate fechaNacimiento;

    @Column
    private Integer edad;

    @Column(length = 100)
    private String municipio;

    @Column(name = "estado_nacimiento", length = 100)
    private String estadoNacimiento;

    @Column(length = 100)
    private String pais;

    @Column(length = 200)
    private String enfermedad;

    @Column(name = "grado_estudios", length = 50)
    private String gradoEstudios;

    @Column(length = 20)
    private String genero;

    @Column(length = 30)
    private String complexion;

    @Column
    private Integer estatura;

    @Column(name = "color_ojos", length = 50)
    private String colorOjos;

    @Column(length = 30)
    private String cejas;

    @Column(name = "tez_piel", length = 30)
    private String tezPiel;

    @Column(name = "color_cabello", length = 50)
    private String colorCabello;

    @Column(name = "tam_labios", length = 30)
    private String tamLabios;

    @Column(name = "senas_cara", length = 200)
    private String senasCara;

    @Column(name = "tiene_tatuajes")
    private Boolean tieneTatuajes = false;

    @Column(name = "tatuajes_json", columnDefinition = "TEXT")
    private String tatuajesJson;

    @Column(length = 100)
    private String alias;

    @Column(name = "documentos_migratorios", length = 200)
    private String documentosMigratorios;

    @Column(name = "estado_civil", length = 20)
    private String estadoCivil;

    @Column(name = "grupo_vulnerable", length = 100)
    private String grupoVulnerable;

    @Column(name = "conoce_victima")
    private Boolean conoceVictima = false;

    @Column(name = "tel_victima", length = 20)
    private String telVictima;

    @Column(name = "nombre_victima", length = 200)
    private String nombreVictima;

    @Column(name = "domicilio_victima", columnDefinition = "TEXT")
    private String domicilioVictima;

    @Column(name = "relacion_victima", length = 100)
    private String relacionVictima;

    @Column(length = 20)
    private String curp;

    @Column(length = 200)
    private String empresa;

    @Column(name = "tel_empresa", length = 20)
    private String telEmpresa;

    @Column(name = "salario_mensual")
    private Double salarioMensual;

    @Column(length = 100)
    private String puesto;

    @Column(name = "nombre_jefe", length = 200)
    private String nombreJefe;

    @Column(name = "horario_trabajo", length = 50)
    private String horarioTrabajo;

    @Column(name = "domicilio_trabajo", length = 300)
    private String domicilioTrabajo;

    @Column(name = "ultimo_empleo", columnDefinition = "TEXT")
    private String ultimoEmpleo;

    // ── Preguntas formulario ─────────────────────────
    @Column(name = "tratamiento_adicciones")
    private Boolean tratamientoAdicciones = false;

    @Column(name = "tratamiento_adicciones_esp", length = 300)
    private String tratamientoAdiccionesEsp;

    @Column(name = "familiares_consumo")
    private Boolean familiaresConsumo = false;

    @Column(name = "familiares_consumo_esp", length = 300)
    private String familiaresConsumoEsp;

    @Column(name = "buena_base")
    private Boolean buenaBase = false;

    @Column(name = "buena_base_esp", length = 300)
    private String buenaBaseEsp;

    @Column(name = "obligaciones_dificiles")
    private Boolean obligacionesDificiles = false;

    @Column(name = "obligaciones_dificiles_esp", length = 300)
    private String obligacionesDificilesEsp;

    @Column(name = "familiares_exterior")
    private Boolean familiaresExterior = false;

    @Column(name = "familiares_exterior_esp", length = 300)
    private String familiaresExteriorEsp;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_seguimiento", length = 10)
    private TipoSeguimiento tipoSeguimiento;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Estado estado = Estado.PENDIENTE;

    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "imputado_id")
    private Imputado imputado;

    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "password", "authorities", "accountNonExpired", "accountNonLocked", "credentialsNonExpired", "enabled"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "registrado_por_id")
    private User registradoPor;

    @Column(name = "fecha_completado")
    private LocalDateTime fechaCompletado;

    /** Tipo de resolución judicial: Medida Cautelar o Suspensión Condicional del Proceso. */
    public enum TipoSeguimiento {
        MC, SCP
    }

    /** Estado de captura de la entrevista dentro del flujo de trabajo. */
    public enum Estado {
        PENDIENTE, EN_REVISION, COMPLETADO
    }

    /** Campo transitorio: si viene en el request se aplica como foto del imputado, no se persiste en la entrevista */
    @Transient
    private String fotoImputado;

    /** Campo transitorio: si viene, se vincula al imputado existente en lugar de buscar/crear por causa penal. */
    @Transient
    private Long imputadoSelId;

    @OneToMany(mappedBy = "entrevista", cascade = CascadeType.ALL, orphanRemoval = true)
    private java.util.List<DomicilioEntrevista> domicilios = new java.util.ArrayList<>();

    @OneToMany(mappedBy = "entrevista", cascade = CascadeType.ALL, orphanRemoval = true)
    private java.util.List<PersonaHabita> personasHabita = new java.util.ArrayList<>();

    @OneToMany(mappedBy = "entrevista", cascade = CascadeType.ALL, orphanRemoval = true)
    private java.util.List<ReferenciaPersonal> referencias = new java.util.ArrayList<>();

    @OneToMany(mappedBy = "entrevista", cascade = CascadeType.ALL, orphanRemoval = true)
    private java.util.List<ConsumoSustancia> consumoSustancias = new java.util.ArrayList<>();
}