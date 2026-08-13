package mx.edu.utez.umeca.modules.correspondencia;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface CorrespondenciaRepository extends JpaRepository<Correspondencia, Long> {

    List<Correspondencia> findAllByOrderByCreatedAtDesc();

    List<Correspondencia> findByAsignadoAIdOrderByCreatedAtDesc(Long userId);

    List<Correspondencia> findByRegistradoPorIdOrderByCreatedAtDesc(Long userId);

    List<Correspondencia> findByEstadoOrderByCreatedAtDesc(Correspondencia.Estado estado);

    @Query("SELECT COUNT(c) FROM Correspondencia c WHERE c.estado = 'PENDIENTE'")
    long contarPendientes();

    @Query("SELECT COUNT(c) FROM Correspondencia c WHERE c.asignadoA.id = :userId AND c.estado NOT IN ('FINALIZADO')")
    long contarAsignadosPendientesParaUsuario(Long userId);

    @Query("SELECT c FROM Correspondencia c WHERE " +
           "LOWER(c.noTurno) LIKE LOWER(CONCAT('%',:q,'%')) OR " +
           "LOWER(c.noOficio) LIKE LOWER(CONCAT('%',:q,'%')) OR " +
           "LOWER(c.remitente) LIKE LOWER(CONCAT('%',:q,'%')) OR " +
           "LOWER(c.asunto) LIKE LOWER(CONCAT('%',:q,'%')) " +
           "ORDER BY c.createdAt DESC")
    List<Correspondencia> buscar(String q);

    @Query("SELECT MAX(c.id) FROM Correspondencia c WHERE YEAR(c.createdAt) = :anio")
    Long maxIdDelAnio(int anio);

    // ── Usuarios registradores ────────────────────────────────────────────────
    @Query("""
        SELECT DISTINCT u.id, u.nombre, u.apPaterno, u.apMaterno, u.username
        FROM Correspondencia c
        JOIN c.registradoPor u
        ORDER BY u.nombre ASC
    """)
    List<Object[]> findRegistradoreDistintos();

    // ── Estadísticas ──────────────────────────────────────────────────────────
    @Query("SELECT COUNT(c) FROM Correspondencia c WHERE YEAR(c.createdAt) = :anio")
    long contarPorAnio(int anio);

    @Query("SELECT c.tipo, COUNT(c) FROM Correspondencia c WHERE YEAR(c.createdAt) = :anio GROUP BY c.tipo")
    List<Object[]> contarPorTipo(int anio);

    @Query("SELECT c.estado, COUNT(c) FROM Correspondencia c WHERE YEAR(c.createdAt) = :anio GROUP BY c.estado")
    List<Object[]> contarPorEstado(int anio);

    @Query("SELECT c.prioridad, COUNT(c) FROM Correspondencia c WHERE YEAR(c.createdAt) = :anio GROUP BY c.prioridad")
    List<Object[]> contarPorPrioridad(int anio);

    @Query("SELECT MONTH(c.createdAt), COUNT(c) FROM Correspondencia c WHERE YEAR(c.createdAt) = :anio GROUP BY MONTH(c.createdAt) ORDER BY MONTH(c.createdAt)")
    List<Object[]> contarPorMes(int anio);

    @Query("SELECT c.requiereRespuesta, COUNT(c) FROM Correspondencia c WHERE YEAR(c.createdAt) = :anio GROUP BY c.requiereRespuesta")
    List<Object[]> contarPorRequiereRespuesta(int anio);
}
