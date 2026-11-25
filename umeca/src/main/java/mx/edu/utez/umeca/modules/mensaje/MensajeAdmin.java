package mx.edu.utez.umeca.modules.mensaje;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import mx.edu.utez.umeca.kernel.BaseEntity;
import mx.edu.utez.umeca.modules.security.user.User;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "mensajes_admin")
public class MensajeAdmin extends BaseEntity {

    @Column(nullable = false, columnDefinition = "TEXT")
    private String contenido;

    @Enumerated(EnumType.STRING)
    @Column(name = "zona_destino", length = 20)
    private ZonaDestino zonaDestino; // null = GENERAL

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "enviado_por_id", nullable = false)
    private User enviadoPor;

    @Column(name = "fecha_envio", nullable = false)
    private LocalDateTime fechaEnvio;

    @Column(nullable = false)
    private boolean activo = true;

    public enum ZonaDestino {
        XOCHITEPEC, CUAUTLA, JOJUTLA
        // null significa GENERAL (todas las zonas)
    }
}
