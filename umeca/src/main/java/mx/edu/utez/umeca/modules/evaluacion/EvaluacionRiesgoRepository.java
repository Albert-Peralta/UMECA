package mx.edu.utez.umeca.modules.evaluacion;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EvaluacionRiesgoRepository extends JpaRepository<EvaluacionRiesgo, Long> {

    List<EvaluacionRiesgo> findAllByOrderByCreatedAtDesc();

    @Query("SELECT e FROM EvaluacionRiesgo e WHERE " +
            "LOWER(e.imputado.nombre) LIKE LOWER(CONCAT('%', :busqueda, '%')) OR " +
            "LOWER(e.imputado.apPaterno) LIKE LOWER(CONCAT('%', :busqueda, '%')) OR " +
            "LOWER(e.imputado.causaPenal) LIKE LOWER(CONCAT('%', :busqueda, '%')) OR " +
            "LOWER(e.imputado.delito) LIKE LOWER(CONCAT('%', :busqueda, '%'))")
    List<EvaluacionRiesgo> buscar(String busqueda);

    boolean existsByImputado_CausaPenal(String causaPenal);

    List<EvaluacionRiesgo> findByImputadoId(Long imputadoId);
    long countByImputadoId(Long imputadoId);

    @Query("SELECT e.imputado.id, COUNT(e) FROM EvaluacionRiesgo e WHERE e.imputado.id IN :ids GROUP BY e.imputado.id")
    List<Object[]> countsPorImputados(@Param("ids") List<Long> ids);

    // ── Estadísticas ──────────────────────────────────────────────────────────
    @Query("SELECT MONTH(e.createdAt), COUNT(e) FROM EvaluacionRiesgo e " +
           "WHERE YEAR(e.createdAt) = :anio GROUP BY MONTH(e.createdAt) ORDER BY MONTH(e.createdAt)")
    List<Object[]> countPorMes(@Param("anio") int anio);

    @Query("SELECT COUNT(e) FROM EvaluacionRiesgo e WHERE YEAR(e.createdAt) = :anio")
    long countByAnio(@Param("anio") int anio);

    @Query("SELECT COUNT(e) FROM EvaluacionRiesgo e WHERE YEAR(e.createdAt) = :anio AND MONTH(e.createdAt) = :mes")
    long countByAnioMes(@Param("anio") int anio, @Param("mes") int mes);

    @Query("SELECT COUNT(e) FROM EvaluacionRiesgo e WHERE e.createdAt >= :inicio AND e.createdAt < :fin")
    long countByRango(@Param("inicio") java.time.LocalDateTime inicio, @Param("fin") java.time.LocalDateTime fin);
}