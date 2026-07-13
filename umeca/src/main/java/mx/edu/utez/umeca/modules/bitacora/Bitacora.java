package mx.edu.utez.umeca.modules.bitacora;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import mx.edu.utez.umeca.modules.security.user.User;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "bitacora", indexes = {
        @Index(name = "idx_bitacora_entidad", columnList = "entidad,entidadId"),
        @Index(name = "idx_bitacora_fecha",   columnList = "fecha")
})
public class Bitacora {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Módulo afectado */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private Entidad entidad;

    /** ID del registro afectado (imputado, medida, etc.) */
    @Column(nullable = false)
    private Long entidadId;

    /** Nombre legible del registro (ej. "Juan Pérez García") */
    @Column(length = 200)
    private String entidadNombre;

    /** Tipo de operación */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Accion accion;

    /** Descripción libre del cambio */
    @Column(columnDefinition = "TEXT")
    private String descripcion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id")
    private User realizadoPor;

    @Column(nullable = false)
    private LocalDateTime fecha;

    @PrePersist
    protected void onCreate() {
        if (this.fecha == null) this.fecha = LocalDateTime.now();
    }

    // ── Constructor de conveniencia ────────────────────────────────────────────
    public Bitacora(Entidad entidad, Long entidadId, String entidadNombre,
                    Accion accion, String descripcion, User realizadoPor) {
        this.entidad       = entidad;
        this.entidadId     = entidadId;
        this.entidadNombre = entidadNombre;
        this.accion        = accion;
        this.descripcion   = descripcion;
        this.realizadoPor  = realizadoPor;
        this.fecha         = LocalDateTime.now();
    }

    public enum Entidad {
        IMPUTADO, MEDIDA_CAUTELAR, ENTREVISTA, SUPERVISION, USUARIO, CONSULTA, REPORTE_DIARIO
    }

    public enum Accion {
        CREAR, EDITAR, ELIMINAR, CAMBIO_ESTADO, FALLECIMIENTO, FOTO
    }
}
