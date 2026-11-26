package mx.edu.utez.umeca.modules.mensaje;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MensajeChatRepository extends JpaRepository<MensajeChat, Long> {
    List<MensajeChat> findAllByOrderByFechaEnvioAsc();

    long countByFechaEnvioAfterAndAutorNot(java.time.LocalDateTime fecha, mx.edu.utez.umeca.modules.security.user.User autor);

    long countByAutorNot(mx.edu.utez.umeca.modules.security.user.User autor);
}
