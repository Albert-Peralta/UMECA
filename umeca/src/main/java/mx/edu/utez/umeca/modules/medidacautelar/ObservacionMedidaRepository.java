package mx.edu.utez.umeca.modules.medidacautelar;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ObservacionMedidaRepository extends JpaRepository<ObservacionMedida, Long> {
    List<ObservacionMedida> findByMedidaIdOrderByFechaCreacionDesc(Long medidaId);
    List<ObservacionMedida> findBySuspensionIdOrderByFechaCreacionDesc(Long suspensionId);
}
