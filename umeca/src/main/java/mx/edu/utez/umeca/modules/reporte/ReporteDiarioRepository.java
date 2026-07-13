package mx.edu.utez.umeca.modules.reporte;

import mx.edu.utez.umeca.modules.security.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ReporteDiarioRepository extends JpaRepository<ReporteDiario, Long> {

    Optional<ReporteDiario> findByFechaAndZonaAndUsuarioId(LocalDate fecha, User.Zona zona, Long usuarioId);

    List<ReporteDiario> findByFecha(LocalDate fecha);

    @Query("SELECT r FROM ReporteDiario r WHERE r.fecha BETWEEN :inicio AND :fin ORDER BY r.fecha ASC, r.zona ASC")
    List<ReporteDiario> findByRangoFecha(@Param("inicio") LocalDate inicio, @Param("fin") LocalDate fin);

    @Query("SELECT r FROM ReporteDiario r WHERE r.fecha BETWEEN :inicio AND :fin AND r.zona = :zona ORDER BY r.fecha ASC")
    List<ReporteDiario> findByRangoFechaYZona(@Param("inicio") LocalDate inicio, @Param("fin") LocalDate fin, @Param("zona") User.Zona zona);
}
