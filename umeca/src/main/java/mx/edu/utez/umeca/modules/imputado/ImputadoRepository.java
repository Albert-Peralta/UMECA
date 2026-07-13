package mx.edu.utez.umeca.modules.imputado;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ImputadoRepository extends JpaRepository<Imputado, Long> {

    List<Imputado> findAllByOrderByCreatedAtDesc();

    List<Imputado> findByNombreContainingIgnoreCaseOrApPaternoContainingIgnoreCase(
            String nombre, String apPaterno);

    boolean existsByCausaPenal(String causaPenal);

    Optional<Imputado> findByCausaPenal(String causaPenal);

    // ── Estadísticas ──────────────────────────────────────────────────────────
    @Query("SELECT COUNT(i) FROM Imputado i WHERE YEAR(i.createdAt) = :anio")
    long countByAnio(@Param("anio") int anio);

    @Query("SELECT COUNT(i) FROM Imputado i WHERE YEAR(i.createdAt) = :anio AND MONTH(i.createdAt) = :mes")
    long countByAnioMes(@Param("anio") int anio, @Param("mes") int mes);

    // Fallecidos — usa createdAt para el filtro de año/mes (fechaFallecimiento puede ser null)
    @Query("SELECT COUNT(i) FROM Imputado i WHERE i.fallecido = true")
    long countFallecidos();

    @Query("SELECT COUNT(i) FROM Imputado i WHERE i.fallecido = true AND YEAR(i.createdAt) = :anio")
    long countFallecidosByAnio(@Param("anio") int anio);

    @Query("SELECT COUNT(i) FROM Imputado i WHERE i.fallecido = true AND YEAR(i.createdAt) = :anio AND MONTH(i.createdAt) = :mes")
    long countFallecidosByAnioMes(@Param("anio") int anio, @Param("mes") int mes);

    @Query("SELECT COUNT(i) FROM Imputado i WHERE i.fallecido = false OR i.fallecido IS NULL")
    long countActivos();

    @Query("SELECT MONTH(i.createdAt), COUNT(i) FROM Imputado i " +
           "WHERE i.fallecido = true AND YEAR(i.createdAt) = :anio " +
           "GROUP BY MONTH(i.createdAt) ORDER BY MONTH(i.createdAt)")
    List<Object[]> countFallecidosPorMes(@Param("anio") int anio);

    @Query("SELECT COUNT(i) FROM Imputado i WHERE i.createdAt >= :inicio AND i.createdAt < :fin")
    long countByRango(@Param("inicio") java.time.LocalDateTime inicio, @Param("fin") java.time.LocalDateTime fin);
}