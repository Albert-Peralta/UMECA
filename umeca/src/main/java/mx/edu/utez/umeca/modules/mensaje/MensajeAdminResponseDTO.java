package mx.edu.utez.umeca.modules.mensaje;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class MensajeAdminResponseDTO {
    private Long id;
    private String contenido;
    private String zonaDestino; // null = "GENERAL"
    private String enviadoPorNombre;
    private LocalDateTime fechaEnvio;
    private boolean activo;

    public static MensajeAdminResponseDTO from(MensajeAdmin m) {
        MensajeAdminResponseDTO dto = new MensajeAdminResponseDTO();
        dto.setId(m.getId());
        dto.setContenido(m.getContenido());
        dto.setZonaDestino(m.getZonaDestino() != null ? m.getZonaDestino().name() : "GENERAL");
        dto.setEnviadoPorNombre(m.getEnviadoPor().getNombre() + " " + m.getEnviadoPor().getApPaterno());
        dto.setFechaEnvio(m.getFechaEnvio());
        dto.setActivo(m.isActivo());
        return dto;
    }
}
