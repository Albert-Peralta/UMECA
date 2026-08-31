package mx.edu.utez.umeca.modules.correspondencia;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import mx.edu.utez.umeca.modules.security.user.User;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "correspondencia")
@Getter @Setter
public class Correspondencia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "no_turno", unique = true, nullable = false)
    private String noTurno;          // auto: TURNO-2026-001

    @Enumerated(EnumType.STRING)
    @Column(name = "sede", nullable = false, length = 20)
    private Sede sede;

    @Column(name = "no_oficio", length = 100)
    private String noOficio;

    @Column(name = "fecha_oficio")
    private LocalDate fechaOficio;

    @Column(name = "fecha_recibido")
    private LocalDate fechaRecibido;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo", nullable = false, length = 20)
    private Tipo tipo;

    @Column(name = "remitente", length = 200)
    private String remitente;

    @Column(name = "asunto", length = 500)
    private String asunto;

    @Column(name = "termino_respuesta_horas")
    private Integer terminoRespuestaHoras;

    @Column(name = "requiere_respuesta", nullable = false)
    private Boolean requiereRespuesta = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "prioridad", nullable = false, length = 20)
    private Prioridad prioridad = Prioridad.NORMAL;

    @Column(name = "archivo_pdf", length = 500)
    private String archivoPdf;       // ruta relativa del archivo guardado

    @Enumerated(EnumType.STRING)
    @Column(name = "estado", nullable = false, length = 20)
    private Estado estado = Estado.PENDIENTE;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "registrado_por_id")
    private User registradoPor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "asignado_a_id")
    private User asignadoA;

    @Column(name = "fecha_asignacion")
    private LocalDateTime fechaAsignacion;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "motivo_cancelacion", length = 500)
    private String motivoCancelacion;

    // ── Enums ──────────────────────────────────────────────────────────────────

    public enum Sede { XOCHITEPEC, CUAUTLA, JOJUTLA }

    public enum Tipo { OFICIO, CORREO, WHATSAPP }

    public enum Prioridad { NORMAL, URGENTE, DE_CONOCIMIENTO, TURNO, CIRCULAR }

    public enum Estado { PENDIENTE, ASIGNADO, LEIDO, EN_ESPERA, FINALIZADO, ARCHIVADO, CANCELADO }
}
