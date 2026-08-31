package mx.edu.utez.umeca.modules.controloficio;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import mx.edu.utez.umeca.modules.security.user.User;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "control_oficios")
@Getter @Setter
public class ControlOficio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "numero_secuencial", nullable = false, unique = true)
    private int numeroSecuencial;

    @Column(name = "no_oficio", nullable = false, length = 20)
    private String noOficio;

    @Column(name = "fecha", nullable = false)
    private LocalDate fecha;

    @Column(name = "destinatario", nullable = false, length = 200)
    private String destinatario;

    @Column(name = "asunto", nullable = false, length = 500)
    private String asunto;

    @Column(name = "supervisado", length = 200)
    private String supervisado;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "solicitante_id", nullable = false)
    private User solicitante;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado", nullable = false, length = 20)
    private Estado estado = Estado.PENDIENTE;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "motivo_cancelacion", length = 500)
    private String motivoCancelacion;

    public enum Estado { PENDIENTE, TRAMITADO, CANCELADO }
}
