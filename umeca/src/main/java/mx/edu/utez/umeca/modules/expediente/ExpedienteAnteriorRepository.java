package mx.edu.utez.umeca.modules.expediente;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ExpedienteAnteriorRepository extends JpaRepository<ExpedienteAnterior, Long> {

    @Query(value = """
        SELECT * FROM expedientes_anteriores e
        WHERE
            (:tipo     IS NULL OR e.tipo = :tipo)
        AND (:zona     IS NULL OR e.zona = :zona)
        AND (:busqueda IS NULL OR LOWER(CONCAT(COALESCE(e.nombre,''),' ',COALESCE(e.ap_paterno,''),' ',COALESCE(e.ap_materno,''))) LIKE LOWER(CONCAT('%',:busqueda,'%'))
             OR LOWER(COALESCE(e.causa_penal,'')) LIKE LOWER(CONCAT('%',:busqueda,'%'))
             OR LOWER(COALESCE(e.numero,''))      LIKE LOWER(CONCAT('%',:busqueda,'%')))
        ORDER BY
            CASE WHEN e.numero IS NULL OR e.numero = '' THEN 1 ELSE 0 END,
            (e.numero + 0),
            e.ap_paterno, e.ap_materno, e.nombre
    """,
    countQuery = """
        SELECT COUNT(*) FROM expedientes_anteriores e
        WHERE
            (:tipo     IS NULL OR e.tipo = :tipo)
        AND (:zona     IS NULL OR e.zona = :zona)
        AND (:busqueda IS NULL OR LOWER(CONCAT(COALESCE(e.nombre,''),' ',COALESCE(e.ap_paterno,''),' ',COALESCE(e.ap_materno,''))) LIKE LOWER(CONCAT('%',:busqueda,'%'))
             OR LOWER(COALESCE(e.causa_penal,'')) LIKE LOWER(CONCAT('%',:busqueda,'%'))
             OR LOWER(COALESCE(e.numero,''))      LIKE LOWER(CONCAT('%',:busqueda,'%')))
    """,
    nativeQuery = true)
    Page<ExpedienteAnterior> buscar(
        @Param("tipo")     String tipo,
        @Param("zona")     String zona,
        @Param("busqueda") String busqueda,
        Pageable pageable
    );

    @Modifying
    @Query("DELETE FROM ExpedienteAnterior e WHERE e.loteId = :loteId")
    int eliminarPorLote(@Param("loteId") Long loteId);

    @Query("SELECT COUNT(e) FROM ExpedienteAnterior e WHERE e.loteId = :loteId AND e.tipo = :tipo")
    int contarPorLoteYTipo(@Param("loteId") Long loteId, @Param("tipo") ExpedienteAnterior.TipoExpediente tipo);
}
