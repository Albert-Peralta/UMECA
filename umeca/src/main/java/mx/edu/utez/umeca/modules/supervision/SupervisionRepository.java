package mx.edu.utez.umeca.modules.supervision;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface SupervisionRepository extends JpaRepository<Supervision, Long> {

    List<Supervision> findByImputadoIdOrderByFechaProgramadaDesc(Long imputadoId);

    @Query("SELECT s FROM Supervision s WHERE s.imputado.id = :id AND CAST(s.estado AS string) = 'PENDIENTE'")
    List<Supervision> findPendientesByImputadoId(@Param("id") Long id);

    @Query("""
        SELECT s FROM Supervision s
        JOIN FETCH s.imputado i
        LEFT JOIN FETCH s.registradoPor
        WHERE s.fechaProgramada BETWEEN :inicio AND :fin
        ORDER BY s.fechaProgramada ASC, s.tipo ASC
    """)
    List<Supervision> findAgenda(@Param("inicio") LocalDate inicio, @Param("fin") LocalDate fin);

    @Query("""
        SELECT s FROM Supervision s
        JOIN FETCH s.imputado i
        LEFT JOIN FETCH s.registradoPor
        WHERE LOWER(i.nombre) LIKE LOWER(CONCAT('%',:q,'%'))
           OR LOWER(i.apPaterno) LIKE LOWER(CONCAT('%',:q,'%'))
           OR LOWER(i.causaPenal) LIKE LOWER(CONCAT('%',:q,'%'))
        ORDER BY s.fechaProgramada DESC
    """)
    List<Supervision> buscar(@Param("q") String q);

    @Query("SELECT COUNT(s) FROM Supervision s WHERE s.imputado.id = :id AND CAST(s.estado AS string) = 'PENDIENTE'")
    long countPendientesByImputadoId(@Param("id") Long id);

    // ── Estadísticas ──────────────────────────────────────────────────────────
    @Query("SELECT COUNT(s) FROM Supervision s WHERE CAST(s.estado AS string) = :estado AND YEAR(s.fechaProgramada) = :anio")
    long countByEstadoAndAnio(@Param("estado") String estado, @Param("anio") int anio);

    @Query("SELECT COUNT(s) FROM Supervision s WHERE CAST(s.estado AS string) = :estado AND YEAR(s.fechaProgramada) = :anio AND MONTH(s.fechaProgramada) = :mes")
    long countByEstadoAndAnioMes(@Param("estado") String estado, @Param("anio") int anio, @Param("mes") int mes);

    @Query("SELECT COUNT(s) FROM Supervision s WHERE CAST(s.tipo AS string) = :tipo AND YEAR(s.fechaProgramada) = :anio")
    long countByTipoAndAnio(@Param("tipo") String tipo, @Param("anio") int anio);

    @Query("SELECT COUNT(s) FROM Supervision s WHERE CAST(s.tipo AS string) = :tipo AND YEAR(s.fechaProgramada) = :anio AND MONTH(s.fechaProgramada) = :mes")
    long countByTipoAndAnioMes(@Param("tipo") String tipo, @Param("anio") int anio, @Param("mes") int mes);

    @Query("SELECT COUNT(s) FROM Supervision s WHERE YEAR(s.fechaProgramada) = :anio")
    long countByAnio(@Param("anio") int anio);

    @Query("SELECT COUNT(s) FROM Supervision s WHERE YEAR(s.fechaProgramada) = :anio AND MONTH(s.fechaProgramada) = :mes")
    long countByAnioMes(@Param("anio") int anio, @Param("mes") int mes);

    @Query("SELECT MONTH(s.fechaProgramada), COUNT(s) FROM Supervision s " +
           "WHERE YEAR(s.fechaProgramada) = :anio GROUP BY MONTH(s.fechaProgramada) ORDER BY MONTH(s.fechaProgramada)")
    List<Object[]> countPorMes(@Param("anio") int anio);

    @Query("SELECT MONTH(s.fechaProgramada), COUNT(s) FROM Supervision s " +
           "WHERE YEAR(s.fechaProgramada) = :anio AND CAST(s.tipo AS string) = :tipo " +
           "GROUP BY MONTH(s.fechaProgramada) ORDER BY MONTH(s.fechaProgramada)")
    List<Object[]> countPorMesYTipo(@Param("anio") int anio, @Param("tipo") String tipo);

    // ── Semana (rango de fechas) — fechaProgramada es LocalDate ─────────────
    @Query("SELECT COUNT(s) FROM Supervision s WHERE s.fechaProgramada >= :inicio AND s.fechaProgramada <= :fin")
    long countByRango(@Param("inicio") LocalDate inicio, @Param("fin") LocalDate fin);

    @Query("SELECT COUNT(s) FROM Supervision s WHERE CAST(s.estado AS string) = :estado AND s.fechaProgramada >= :inicio AND s.fechaProgramada <= :fin")
    long countByEstadoYRango(@Param("estado") String estado, @Param("inicio") LocalDate inicio, @Param("fin") LocalDate fin);

    @Query("SELECT COUNT(s) FROM Supervision s WHERE CAST(s.tipo AS string) = :tipo AND s.fechaProgramada >= :inicio AND s.fechaProgramada <= :fin")
    long countByTipoYRango(@Param("tipo") String tipo, @Param("inicio") LocalDate inicio, @Param("fin") LocalDate fin);
}
