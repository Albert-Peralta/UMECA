package mx.edu.utez.umeca.modules.seguimiento;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface SeguimientoRepository extends JpaRepository<Seguimiento, Long> {

    // Todos los seguimientos de un imputado ordenados por fecha desc
    List<Seguimiento> findByImputadoIdOrderByFechaRegistroDesc(Long imputadoId);

    // Seguimientos del día por zona para el reporte diario automático (usuario individual)
    @Query("""
        SELECT s FROM Seguimiento s
        WHERE s.fechaRegistro >= :inicio
          AND s.fechaRegistro < :fin
          AND s.registradoPor.zona = :zona
    """)
    List<Seguimiento> findByZonaYRango(
        @Param("zona") mx.edu.utez.umeca.modules.security.user.User.Zona zona,
        @Param("inicio") LocalDateTime inicio,
        @Param("fin") LocalDateTime fin
    );

    // Seguimientos del día filtrados por zona Y usuario (reporte personal)
    @Query("""
        SELECT s FROM Seguimiento s
        WHERE s.fechaRegistro >= :inicio
          AND s.fechaRegistro < :fin
          AND s.registradoPor.zona = :zona
          AND s.registradoPor.id = :usuarioId
    """)
    List<Seguimiento> findByZonaYRangoYUsuario(
        @Param("zona") mx.edu.utez.umeca.modules.security.user.User.Zona zona,
        @Param("inicio") LocalDateTime inicio,
        @Param("fin") LocalDateTime fin,
        @Param("usuarioId") Long usuarioId
    );

    // Todos los seguimientos en un rango de fechas (para reporte consolidado del admin)
    @Query("""
        SELECT s FROM Seguimiento s
        WHERE s.fechaRegistro >= :inicio
          AND s.fechaRegistro < :fin
    """)
    List<Seguimiento> findByRango(
        @Param("inicio") LocalDateTime inicio,
        @Param("fin") LocalDateTime fin
    );

    // Historial por usuario en un rango (para la pestaña historial por usuario)
    @Query("""
        SELECT s FROM Seguimiento s
        LEFT JOIN FETCH s.registradoPor u
        LEFT JOIN FETCH s.imputado i
        WHERE s.fechaRegistro >= :inicio
          AND s.fechaRegistro < :fin
        ORDER BY u.zona, u.apPaterno, s.fechaRegistro DESC
    """)
    List<Seguimiento> findHistorialPorUsuario(
        @Param("inicio") LocalDateTime inicio,
        @Param("fin") LocalDateTime fin
    );

    // Seguimientos por medida
    List<Seguimiento> findByMedidaIdOrderByFechaRegistroDesc(Long medidaId);

    // Seguimientos por entrevista
    List<Seguimiento> findByEntrevistaIdOrderByFechaRegistroDesc(Long entrevistaId);

    // Seguimientos por evaluacion
    List<Seguimiento> findByEvaluacionIdOrderByFechaRegistroDesc(Long evaluacionId);
}
