package mx.edu.utez.umeca.modules.expediente;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ImportacionLoteRepository extends JpaRepository<ImportacionLote, Long> {
    List<ImportacionLote> findAllByOrderByCreatedAtDesc();
}
