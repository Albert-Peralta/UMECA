package mx.edu.utez.umeca.modules.mensaje;

import jakarta.persistence.*;
import mx.edu.utez.umeca.modules.security.user.User;

import java.time.LocalDateTime;

@Entity
@Table(name = "chat_ultima_lectura")
public class ChatUltimaLectura {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false, unique = true)
    private User usuario;

    @Column(name = "ultima_lectura", nullable = false)
    private LocalDateTime ultimaLectura;

    public ChatUltimaLectura() {}

    public ChatUltimaLectura(User usuario, LocalDateTime ultimaLectura) {
        this.usuario = usuario;
        this.ultimaLectura = ultimaLectura;
    }

    public Long getId() { return id; }
    public User getUsuario() { return usuario; }
    public LocalDateTime getUltimaLectura() { return ultimaLectura; }
    public void setUltimaLectura(LocalDateTime ultimaLectura) { this.ultimaLectura = ultimaLectura; }
}
