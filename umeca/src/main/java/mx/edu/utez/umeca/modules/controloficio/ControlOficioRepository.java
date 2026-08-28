package mx.edu.utez.umeca.modules.controloficio;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface ControlOficioRepository extends JpaRepository<ControlOficio, Long> {

    List<ControlOficio> findAllByOrderByNumeroSecuencialDesc();

    @Query(value = "SELECT COALESCE(MAX(numero_secuencial), 3299) FROM control_oficios FOR UPDATE", nativeQuery = true)
    int findMaxSecuencial();

    @Query("SELECT COUNT(c) FROM ControlOficio c WHERE c.estado = 'PENDIENTE'")
    long countPendientes();
}
