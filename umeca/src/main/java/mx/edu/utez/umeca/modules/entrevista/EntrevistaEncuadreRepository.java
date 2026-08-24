package mx.edu.utez.umeca.modules.entrevista;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EntrevistaEncuadreRepository extends JpaRepository<EntrevistaEncuadre, Long> {
    Optional<EntrevistaEncuadre> findByFolio(String folio);
    long countByFolioStartingWith(String prefix);

    /** Devuelve el número secuencial más alto del folio para un prefijo dado, o 0 si no hay ninguno. */
    @Query("SELECT COALESCE(MAX(CAST(SUBSTRING(e.folio, LENGTH(:prefix) + 1) AS integer)), 0) FROM EntrevistaEncuadre e WHERE e.folio LIKE CONCAT(:prefix, '%')")
    long findMaxSecuencialByPrefix(@Param("prefix") String prefix);
    @Query("SELECT e FROM EntrevistaEncuadre e WHERE e.imputado.id = :imputadoId")
    List<EntrevistaEncuadre> findByImputadoId(@Param("imputadoId") Long imputadoId);

    @Modifying
    @Query("UPDATE EntrevistaEncuadre e SET e.nombre = :nombre, e.apPaterno = :apPaterno, e.apMaterno = :apMaterno WHERE e.imputado.id = :imputadoId")
    int actualizarNombrePorImputado(@Param("imputadoId") Long imputadoId,
                                    @Param("nombre") String nombre,
                                    @Param("apPaterno") String apPaterno,
                                    @Param("apMaterno") String apMaterno);

    @Query("SELECT COUNT(e) FROM EntrevistaEncuadre e WHERE e.imputado.id = :imputadoId")
    long countByImputadoId(@Param("imputadoId") Long imputadoId);

    @Query("SELECT e FROM EntrevistaEncuadre e WHERE e.imputado.id = :imputadoId ORDER BY e.createdAt DESC")
    List<EntrevistaEncuadre> findTopByImputadoIdOrderByCreatedAtDesc(@Param("imputadoId") Long imputadoId);

    /**
     * Para la lista de imputados: trae [imputadoId, count, celular_o_telefonoCasa] de la última entrevista
     * de cada imputado de una sola pasada — evita N+1.
     */
    @Query("""
        SELECT e.imputado.id, COUNT(e), e.celular, e.telefonoCasa
        FROM EntrevistaEncuadre e
        WHERE e.imputado.id IN :ids
          AND e.createdAt = (
              SELECT MAX(e2.createdAt) FROM EntrevistaEncuadre e2
              WHERE e2.imputado.id = e.imputado.id
          )
        GROUP BY e.imputado.id, e.celular, e.telefonoCasa
    """)
    List<Object[]> resumenPorImputados(@Param("ids") List<Long> ids);

    @Query("SELECT e.imputado.id, COUNT(e) FROM EntrevistaEncuadre e WHERE e.imputado.id IN :ids GROUP BY e.imputado.id")
    List<Object[]> countsPorImputados(@Param("ids") List<Long> ids);

    /** Para la lista de imputados: zona del registradoPor de la entrevista más reciente por imputado. */
    @Query("""
        SELECT e.imputado.id, e.registradoPor.zona
        FROM EntrevistaEncuadre e
        WHERE e.imputado.id IN :ids
          AND e.createdAt = (
              SELECT MAX(e2.createdAt) FROM EntrevistaEncuadre e2
              WHERE e2.imputado.id = e.imputado.id
          )
        GROUP BY e.imputado.id, e.registradoPor.zona
    """)
    List<Object[]> zonasPorImputados(@Param("ids") List<Long> ids);

    @Query("""
        SELECT e FROM EntrevistaEncuadre e
        LEFT JOIN e.imputado i
        WHERE e.tipoSeguimiento IS NOT NULL
          AND i IS NOT NULL AND i.fallecido = false AND i.carpetaCerrada = false
          AND (
            LOWER(e.nombre) LIKE LOWER(CONCAT('%',:q,'%')) OR
            LOWER(e.apPaterno) LIKE LOWER(CONCAT('%',:q,'%')) OR
            LOWER(e.causaPenal) LIKE LOWER(CONCAT('%',:q,'%')) OR
            LOWER(COALESCE(i.nombre,'')) LIKE LOWER(CONCAT('%',:q,'%')) OR
            LOWER(COALESCE(i.causaPenal,'')) LIKE LOWER(CONCAT('%',:q,'%'))
          )
        ORDER BY e.createdAt DESC
    """)
    List<EntrevistaEncuadre> buscarParaMedida(@Param("q") String q);

    Optional<EntrevistaEncuadre> findFirstByNombreIgnoreCaseAndApPaternoIgnoreCaseAndApMaternoIgnoreCaseAndEstadoIn(
            String nombre, String apPaterno, String apMaterno, List<EntrevistaEncuadre.Estado> estados);

    Optional<EntrevistaEncuadre> findFirstByNombreIgnoreCaseAndApPaternoIgnoreCaseAndApMaternoIsNullAndEstadoIn(
            String nombre, String apPaterno, List<EntrevistaEncuadre.Estado> estados);

    // ── Estadísticas ──────────────────────────────────────────────────────────
    @Query("SELECT COUNT(e) FROM EntrevistaEncuadre e WHERE CAST(e.tipoSeguimiento AS string) = :tipo")
    long countByTipoSeguimiento(@Param("tipo") String tipo);

    long countByTipoSeguimientoIsNull();

    @Query("SELECT COUNT(e) FROM EntrevistaEncuadre e WHERE YEAR(e.createdAt) = :anio")
    long countByAnio(@Param("anio") int anio);

    @Query("SELECT COUNT(e) FROM EntrevistaEncuadre e WHERE YEAR(e.createdAt) = :anio AND MONTH(e.createdAt) = :mes")
    long countByAnioMes(@Param("anio") int anio, @Param("mes") int mes);

    @Query("SELECT COUNT(e) FROM EntrevistaEncuadre e WHERE CAST(e.tipoSeguimiento AS string) = :tipo AND YEAR(e.createdAt) = :anio")
    long countByTipoSeguimientoAndAnio(@Param("tipo") String tipo, @Param("anio") int anio);

    @Query("SELECT COUNT(e) FROM EntrevistaEncuadre e WHERE CAST(e.tipoSeguimiento AS string) = :tipo AND YEAR(e.createdAt) = :anio AND MONTH(e.createdAt) = :mes")
    long countByTipoSeguimientoAndAnioMes(@Param("tipo") String tipo, @Param("anio") int anio, @Param("mes") int mes);

    @Query("SELECT COUNT(e) FROM EntrevistaEncuadre e WHERE e.tipoSeguimiento IS NULL AND YEAR(e.createdAt) = :anio")
    long countByTipoSeguimientoIsNullAndAnio(@Param("anio") int anio);

    @Query("SELECT COUNT(e) FROM EntrevistaEncuadre e WHERE e.tipoSeguimiento IS NULL AND YEAR(e.createdAt) = :anio AND MONTH(e.createdAt) = :mes")
    long countByTipoSeguimientoIsNullAndAnioMes(@Param("anio") int anio, @Param("mes") int mes);

    // ── Semana (rango de fechas) ──────────────────────────────────────────────
    @Query("SELECT COUNT(e) FROM EntrevistaEncuadre e WHERE e.createdAt >= :inicio AND e.createdAt < :fin")
    long countByRango(@Param("inicio") java.time.LocalDateTime inicio, @Param("fin") java.time.LocalDateTime fin);

    @Query("SELECT COUNT(e) FROM EntrevistaEncuadre e WHERE e.createdAt >= :inicio AND e.createdAt < :fin AND CAST(e.registradoPor.zona AS string) = :zona")
    long countByRangoYZona(@Param("inicio") java.time.LocalDateTime inicio, @Param("fin") java.time.LocalDateTime fin, @Param("zona") String zona);

    @Query("SELECT COUNT(e) FROM EntrevistaEncuadre e WHERE CAST(e.tipoSeguimiento AS string) = :tipo AND e.createdAt >= :inicio AND e.createdAt < :fin")
    long countByTipoYRango(@Param("tipo") String tipo, @Param("inicio") java.time.LocalDateTime inicio, @Param("fin") java.time.LocalDateTime fin);

    @Query("SELECT COUNT(e) FROM EntrevistaEncuadre e WHERE CAST(e.tipoSeguimiento AS string) = :tipo AND e.createdAt >= :inicio AND e.createdAt < :fin AND CAST(e.registradoPor.zona AS string) = :zona")
    long countByTipoYRangoYZona(@Param("tipo") String tipo, @Param("inicio") java.time.LocalDateTime inicio, @Param("fin") java.time.LocalDateTime fin, @Param("zona") String zona);

    @Query("SELECT COUNT(e) FROM EntrevistaEncuadre e WHERE e.tipoSeguimiento IS NULL AND e.createdAt >= :inicio AND e.createdAt < :fin")
    long countByTipoNullYRango(@Param("inicio") java.time.LocalDateTime inicio, @Param("fin") java.time.LocalDateTime fin);

    @Query("SELECT COUNT(e) FROM EntrevistaEncuadre e WHERE e.tipoSeguimiento IS NULL AND e.createdAt >= :inicio AND e.createdAt < :fin AND CAST(e.registradoPor.zona AS string) = :zona")
    long countByTipoNullYRangoYZona(@Param("inicio") java.time.LocalDateTime inicio, @Param("fin") java.time.LocalDateTime fin, @Param("zona") String zona);

    @Modifying
    @Query("UPDATE EntrevistaEncuadre e SET e.tipoSeguimiento = :nuevoTipo WHERE e.imputado.id = :imputadoId")
    int actualizarTipoSeguimientoPorImputado(@Param("imputadoId") Long imputadoId, @Param("nuevoTipo") EntrevistaEncuadre.TipoSeguimiento nuevoTipo);
}