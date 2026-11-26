package mx.edu.utez.umeca.modules.mensaje;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import mx.edu.utez.umeca.modules.security.user.User;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "mensajes_chat")
public class MensajeChat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String contenido;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "autor_id", nullable = false)
    private User autor;

    @Column(name = "fecha_envio", nullable = false)
    private LocalDateTime fechaEnvio;
}
