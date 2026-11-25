package mx.edu.utez.umeca.modules.mensaje;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface MensajeAdminRepository extends JpaRepository<MensajeAdmin, Long> {

    // Mensaje activo para una zona específica o general (zona null)
    @Query("SELECT m FROM MensajeAdmin m WHERE m.activo = true AND (m.zonaDestino = :zona OR m.zonaDestino IS NULL) ORDER BY m.fechaEnvio DESC")
    List<MensajeAdmin> findActivoParaZona(@Param("zona") MensajeAdmin.ZonaDestino zona);

    // Solo mensajes generales (zonaDestino IS NULL) activos
    @Query("SELECT m FROM MensajeAdmin m WHERE m.activo = true AND m.zonaDestino IS NULL ORDER BY m.fechaEnvio DESC")
    List<MensajeAdmin> findGeneralesActivos();

    // Historial para personal: mensajes de su zona o generales, ordenados DESC
    @Query("SELECT m FROM MensajeAdmin m WHERE m.zonaDestino = :zona OR m.zonaDestino IS NULL ORDER BY m.fechaEnvio DESC")
    List<MensajeAdmin> findHistorialParaZona(@Param("zona") MensajeAdmin.ZonaDestino zona);

    // Historial general (sin zona)
    @Query("SELECT m FROM MensajeAdmin m WHERE m.zonaDestino IS NULL ORDER BY m.fechaEnvio DESC")
    List<MensajeAdmin> findHistorialGenerales();

    // Todos los mensajes ordenados por fecha DESC para historial
    List<MensajeAdmin> findAllByOrderByFechaEnvioDesc();
}
