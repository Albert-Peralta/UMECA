package mx.edu.utez.umeca.modules.suspension;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SuspensionCondicionalRepository extends JpaRepository<SuspensionCondicional, Long> {

    @Query(value = """
        SELECT * FROM suspension_condicional s
        WHERE
            (:fuero    IS NULL OR s.fuero = :fuero)
        AND (:anio     IS NULL OR s.anio  = :anio)
        AND (:busqueda IS NULL
             OR LOWER(COALESCE(s.imputado,''))       LIKE LOWER(CONCAT('%',:busqueda,'%'))
             OR LOWER(COALESCE(s.causa,''))           LIKE LOWER(CONCAT('%',:busqueda,'%'))
             OR LOWER(COALESCE(s.oficio,''))          LIKE LOWER(CONCAT('%',:busqueda,'%'))
             OR LOWER(COALESCE(s.delito,''))          LIKE LOWER(CONCAT('%',:busqueda,'%')))
        ORDER BY s.recibido DESC, s.imputado ASC
    """,
    countQuery = """
        SELECT COUNT(*) FROM suspension_condicional s
        WHERE
            (:fuero    IS NULL OR s.fuero = :fuero)
        AND (:anio     IS NULL OR s.anio  = :anio)
        AND (:busqueda IS NULL
             OR LOWER(COALESCE(s.imputado,''))       LIKE LOWER(CONCAT('%',:busqueda,'%'))
             OR LOWER(COALESCE(s.causa,''))           LIKE LOWER(CONCAT('%',:busqueda,'%'))
             OR LOWER(COALESCE(s.oficio,''))          LIKE LOWER(CONCAT('%',:busqueda,'%'))
             OR LOWER(COALESCE(s.delito,''))          LIKE LOWER(CONCAT('%',:busqueda,'%')))
    """,
    nativeQuery = true)
    Page<SuspensionCondicional> buscar(
        @Param("fuero")    String fuero,
        @Param("anio")     Integer anio,
        @Param("busqueda") String busqueda,
        Pageable pageable
    );
}
