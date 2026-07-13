package mx.edu.utez.umeca.modules.bitacora;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface BitacoraRepository extends JpaRepository<Bitacora, Long> {

    /** Historial de un registro concreto (para el panel por módulo) */
    List<Bitacora> findByEntidadAndEntidadIdOrderByFechaDesc(
            Bitacora.Entidad entidad, Long entidadId);

    /** Vista global paginada con filtros opcionales */
    @Query("""
        SELECT b FROM Bitacora b
        LEFT JOIN FETCH b.realizadoPor u
        WHERE (:entidad  IS NULL OR b.entidad  = :entidad)
          AND (:accion   IS NULL OR b.accion   = :accion)
          AND (:usuarioId IS NULL OR u.id = :usuarioId)
          AND (:desde    IS NULL OR b.fecha >= :desde)
          AND (:hasta    IS NULL OR b.fecha <= :hasta)
        ORDER BY b.fecha DESC
    """)
    Page<Bitacora> buscarGlobal(
            @Param("entidad")   Bitacora.Entidad entidad,
            @Param("accion")    Bitacora.Accion  accion,
            @Param("usuarioId") Long             usuarioId,
            @Param("desde")     LocalDateTime    desde,
            @Param("hasta")     LocalDateTime    hasta,
            Pageable pageable);
}
