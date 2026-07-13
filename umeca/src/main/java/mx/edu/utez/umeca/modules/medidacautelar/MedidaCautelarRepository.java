package mx.edu.utez.umeca.modules.medidacautelar;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MedidaCautelarRepository extends JpaRepository<MedidaCautelar, Long> {

    List<MedidaCautelar> findAllByOrderByCreatedAtDesc();

    List<MedidaCautelar> findByImputadoId(Long imputadoId);

    List<MedidaCautelar> findByImputadoIdOrderByCreatedAtDesc(Long imputadoId);

    boolean existsByImputadoIdAndCausaPenalIgnoreCaseAndTipo(
            Long imputadoId, String causaPenal, MedidaCautelar.TipoMedida tipo);

    /** Devuelve [imputadoId, tipo, estado] de la medida más reciente por imputado (para la lista general) */
    @Query("SELECT m.imputado.id, m.tipo, m.estado FROM MedidaCautelar m WHERE m.imputado.id IN :ids AND m.createdAt = (SELECT MAX(m2.createdAt) FROM MedidaCautelar m2 WHERE m2.imputado.id = m.imputado.id)")
    List<Object[]> tipoActivoPorImputados(@Param("ids") List<Long> ids);

    @Query("SELECT m FROM MedidaCautelar m WHERE " +
            "LOWER(m.imputado.nombre) LIKE LOWER(CONCAT('%',:q,'%')) OR " +
            "LOWER(m.imputado.apPaterno) LIKE LOWER(CONCAT('%',:q,'%')) OR " +
            "LOWER(m.imputado.causaPenal) LIKE LOWER(CONCAT('%',:q,'%'))")
    List<MedidaCautelar> buscar(String q);

    // ── Estadísticas ──────────────────────────────────────────────────────────
    @Query("SELECT COUNT(m) FROM MedidaCautelar m WHERE CAST(m.tipo AS string) = :tipo AND YEAR(m.createdAt) = :anio")
    long countByTipoAndAnio(@Param("tipo") String tipo, @Param("anio") int anio);

    @Query("SELECT COUNT(m) FROM MedidaCautelar m WHERE CAST(m.tipo AS string) = :tipo AND YEAR(m.createdAt) = :anio AND MONTH(m.createdAt) = :mes")
    long countByTipoAndAnioMes(@Param("tipo") String tipo, @Param("anio") int anio, @Param("mes") int mes);

    @Query("SELECT COUNT(m) FROM MedidaCautelar m WHERE CAST(m.estado AS string) = :estado AND YEAR(m.createdAt) = :anio")
    long countByEstadoAndAnio(@Param("estado") String estado, @Param("anio") int anio);

    @Query("SELECT COUNT(m) FROM MedidaCautelar m WHERE CAST(m.estado AS string) = :estado AND YEAR(m.createdAt) = :anio AND MONTH(m.createdAt) = :mes")
    long countByEstadoAndAnioMes(@Param("estado") String estado, @Param("anio") int anio, @Param("mes") int mes);

    @Query("SELECT COUNT(m) FROM MedidaCautelar m WHERE m.cumpliendoIncumpliendo = :val AND CAST(m.tipo AS string) = :tipo AND YEAR(m.createdAt) = :anio")
    long countByCumplimientoAndTipoAndAnio(@Param("val") String val, @Param("tipo") String tipo, @Param("anio") int anio);

    @Query("SELECT COUNT(m) FROM MedidaCautelar m WHERE m.cumpliendoIncumpliendo = :val AND CAST(m.tipo AS string) = :tipo AND YEAR(m.createdAt) = :anio AND MONTH(m.createdAt) = :mes")
    long countByCumplimientoAndTipoAndAnioMes(@Param("val") String val, @Param("tipo") String tipo, @Param("anio") int anio, @Param("mes") int mes);

    @Query("SELECT COUNT(m) FROM MedidaCautelar m WHERE YEAR(m.createdAt) = :anio")
    long countByAnio(@Param("anio") int anio);

    @Query("SELECT COUNT(m) FROM MedidaCautelar m WHERE YEAR(m.createdAt) = :anio AND MONTH(m.createdAt) = :mes")
    long countByAnioMes(@Param("anio") int anio, @Param("mes") int mes);

    /** Devuelve lista de [mes(1-12), count] para el año dado */
    @Query("SELECT MONTH(m.createdAt), COUNT(m) FROM MedidaCautelar m " +
           "WHERE YEAR(m.createdAt) = :anio GROUP BY MONTH(m.createdAt) ORDER BY MONTH(m.createdAt)")
    List<Object[]> countPorMes(@Param("anio") int anio);

    @Query("SELECT COUNT(m) FROM MedidaCautelar m WHERE m.cambiadoAScp = true AND YEAR(m.createdAt) = :anio")
    long countByCambiadoAScpAndAnio(@Param("anio") int anio);

    @Query("SELECT COUNT(m) FROM MedidaCautelar m WHERE m.cambiadoAScp = true AND YEAR(m.createdAt) = :anio AND MONTH(m.createdAt) = :mes")
    long countByCambiadoAScpAndAnioMes(@Param("anio") int anio, @Param("mes") int mes);

    @Query("SELECT MONTH(m.createdAt), COUNT(m) FROM MedidaCautelar m " +
           "WHERE CAST(m.estado AS string) = :estado AND YEAR(m.createdAt) = :anio " +
           "GROUP BY MONTH(m.createdAt) ORDER BY MONTH(m.createdAt)")
    List<Object[]> countPorMesYEstado(@Param("estado") String estado, @Param("anio") int anio);

    @Query("SELECT MONTH(m.createdAt), COUNT(m) FROM MedidaCautelar m " +
           "WHERE m.cambiadoAScp = true AND YEAR(m.createdAt) = :anio " +
           "GROUP BY MONTH(m.createdAt) ORDER BY MONTH(m.createdAt)")
    List<Object[]> countByCambiadoAScpPorMes(@Param("anio") int anio);

    // ── Semana (rango de fechas) ──────────────────────────────────────────────
    @Query("SELECT COUNT(m) FROM MedidaCautelar m WHERE m.createdAt >= :inicio AND m.createdAt < :fin")
    long countByRango(@Param("inicio") java.time.LocalDateTime inicio, @Param("fin") java.time.LocalDateTime fin);

    @Query("SELECT COUNT(m) FROM MedidaCautelar m WHERE CAST(m.tipo AS string) = :tipo AND m.createdAt >= :inicio AND m.createdAt < :fin")
    long countByTipoYRango(@Param("tipo") String tipo, @Param("inicio") java.time.LocalDateTime inicio, @Param("fin") java.time.LocalDateTime fin);

    @Query("SELECT COUNT(m) FROM MedidaCautelar m WHERE CAST(m.estado AS string) = :estado AND m.createdAt >= :inicio AND m.createdAt < :fin")
    long countByEstadoYRango(@Param("estado") String estado, @Param("inicio") java.time.LocalDateTime inicio, @Param("fin") java.time.LocalDateTime fin);

    @Query("SELECT COUNT(m) FROM MedidaCautelar m WHERE m.cumpliendoIncumpliendo = :val AND CAST(m.tipo AS string) = :tipo AND m.createdAt >= :inicio AND m.createdAt < :fin")
    long countByCumplimientoYTipoYRango(@Param("val") String val, @Param("tipo") String tipo, @Param("inicio") java.time.LocalDateTime inicio, @Param("fin") java.time.LocalDateTime fin);

    @Query("SELECT m.entrevista.genero, COUNT(m) FROM MedidaCautelar m " +
           "WHERE CAST(m.tipo AS string) = :tipo AND m.entrevista IS NOT NULL AND m.createdAt >= :inicio AND m.createdAt < :fin " +
           "GROUP BY m.entrevista.genero")
    List<Object[]> countPorGeneroYTipoYRango(@Param("tipo") String tipo, @Param("inicio") java.time.LocalDateTime inicio, @Param("fin") java.time.LocalDateTime fin);

    @Query("SELECT COUNT(m) FROM MedidaCautelar m WHERE m.cambiadoAScp = true AND m.createdAt >= :inicio AND m.createdAt < :fin")
    long countByCambiadoAScpYRango(@Param("inicio") java.time.LocalDateTime inicio, @Param("fin") java.time.LocalDateTime fin);

    // ── TTA ───────────────────────────────────────────────────────────────────
    @Query(value = "SELECT COUNT(*) FROM medidas_cautelares WHERE detalles_fracciones LIKE '%\"esTTA\":true%' AND estado = 'ACTIVO'", nativeQuery = true)
    long countTtaActivos();

    @Query(value = "SELECT COUNT(*) FROM medidas_cautelares WHERE detalles_fracciones LIKE '%\"esTTA\":true%' AND estado = 'ACTIVO' AND YEAR(created_at) = :anio", nativeQuery = true)
    long countTtaActivosByAnio(@Param("anio") int anio);

    @Query(value = "SELECT COUNT(*) FROM medidas_cautelares WHERE detalles_fracciones LIKE '%\"esTTA\":true%' AND estado = 'ACTIVO' AND YEAR(created_at) = :anio AND MONTH(created_at) = :mes", nativeQuery = true)
    long countTtaActivosByAnioMes(@Param("anio") int anio, @Param("mes") int mes);

    @Query(value = "SELECT MONTH(created_at), COUNT(*) FROM medidas_cautelares WHERE detalles_fracciones LIKE '%\"esTTA\":true%' AND YEAR(created_at) = :anio GROUP BY MONTH(created_at) ORDER BY MONTH(created_at)", nativeQuery = true)
    List<Object[]> countTtaPorMes(@Param("anio") int anio);

    /** Género de imputados por tipo de medida [genero, count] */
    @Query("SELECT m.entrevista.genero, COUNT(m) FROM MedidaCautelar m " +
           "WHERE CAST(m.tipo AS string) = :tipo AND m.entrevista IS NOT NULL AND YEAR(m.createdAt) = :anio " +
           "GROUP BY m.entrevista.genero")
    List<Object[]> countPorGeneroYTipoAndAnio(@Param("tipo") String tipo, @Param("anio") int anio);

    @Query("SELECT m.entrevista.genero, COUNT(m) FROM MedidaCautelar m " +
           "WHERE CAST(m.tipo AS string) = :tipo AND m.entrevista IS NOT NULL AND YEAR(m.createdAt) = :anio AND MONTH(m.createdAt) = :mes " +
           "GROUP BY m.entrevista.genero")
    List<Object[]> countPorGeneroYTipoAndAnioMes(@Param("tipo") String tipo, @Param("anio") int anio, @Param("mes") int mes);

    /** Fracciones más usadas para un tipo dado — devuelve [fraccion, count] */
    @Query(value = "SELECT f.fraccion, COUNT(*) as total " +
                   "FROM medida_fracciones f " +
                   "JOIN medidas_cautelares m ON m.id = f.medida_id " +
                   "WHERE m.tipo = :tipo " +
                   "GROUP BY f.fraccion ORDER BY total DESC",
           nativeQuery = true)
    List<Object[]> fraccionesMasUsadas(@Param("tipo") String tipo);
}
