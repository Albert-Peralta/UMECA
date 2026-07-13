package mx.edu.utez.umeca.modules.consulta;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ConsultaRegistroRepository extends JpaRepository<ConsultaRegistro, Long> {

    // Buscar consultas previas del mismo imputado (por CURP o por nombre+apellido)
    List<ConsultaRegistro> findByCurpIgnoreCaseAndIdNot(String curp, Long id);
    List<ConsultaRegistro> findByCurpIgnoreCase(String curp);

    List<ConsultaRegistro> findByNombreImputadoIgnoreCaseAndApPaternoImputadoIgnoreCaseAndIdNot(
            String nombre, String apPaterno, Long id);
    List<ConsultaRegistro> findByNombreImputadoIgnoreCaseAndApPaternoImputadoIgnoreCase(
            String nombre, String apPaterno);

    List<ConsultaRegistro> findAllByOrderByFechaSolicitudDesc();

    @Query("SELECT COALESCE(MAX(c.folioConsecutivo), 0) FROM ConsultaRegistro c")
    Long findMaxFolio();
}
