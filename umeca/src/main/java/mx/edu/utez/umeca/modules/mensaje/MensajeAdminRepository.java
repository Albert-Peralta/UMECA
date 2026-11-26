package mx.edu.utez.umeca.modules.mensaje;

import mx.edu.utez.umeca.modules.security.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MensajeAdminRepository extends JpaRepository<MensajeAdmin, Long> {

    // Mensajes activos NO leídos por el usuario, para una zona específica o general
    @Query("SELECT m FROM MensajeAdmin m WHERE m.activo = true AND (m.zonaDestino = :zona OR m.zonaDestino IS NULL) AND :usuario NOT MEMBER OF m.lectores ORDER BY m.fechaEnvio DESC")
    List<MensajeAdmin> findNoLeidosParaZona(@Param("zona") MensajeAdmin.ZonaDestino zona, @Param("usuario") User usuario);

    // Mensajes activos generales NO leídos por el usuario
    @Query("SELECT m FROM MensajeAdmin m WHERE m.activo = true AND m.zonaDestino IS NULL AND :usuario NOT MEMBER OF m.lectores ORDER BY m.fechaEnvio DESC")
    List<MensajeAdmin> findGeneralesNoLeidos(@Param("usuario") User usuario);

    // Historial para personal: mensajes de su zona o generales, ordenados DESC
    @Query("SELECT m FROM MensajeAdmin m WHERE m.zonaDestino = :zona OR m.zonaDestino IS NULL ORDER BY m.fechaEnvio DESC")
    List<MensajeAdmin> findHistorialParaZona(@Param("zona") MensajeAdmin.ZonaDestino zona);

    // Historial general (sin zona)
    @Query("SELECT m FROM MensajeAdmin m WHERE m.zonaDestino IS NULL ORDER BY m.fechaEnvio DESC")
    List<MensajeAdmin> findHistorialGenerales();

    // Todos los mensajes ordenados por fecha DESC para historial
    List<MensajeAdmin> findAllByOrderByFechaEnvioDesc();
}
