package mx.edu.utez.umeca.modules.mensaje;

import mx.edu.utez.umeca.modules.security.user.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ChatUltimaLecturaRepository extends JpaRepository<ChatUltimaLectura, Long> {
    Optional<ChatUltimaLectura> findByUsuario(User usuario);
}
