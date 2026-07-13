package mx.edu.utez.umeca.modules.medidacautelar;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SeguimientoMedidaRepository extends JpaRepository<SeguimientoMedida, Long> {
}
