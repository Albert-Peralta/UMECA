package mx.edu.utez.umeca.modules.mensaje;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class MensajeChatDTO {
    private Long id;
    private String contenido;
    private Long autorId;
    private String autorNombre;
    private String autorRol;
    private LocalDateTime fechaEnvio;

    public static MensajeChatDTO from(MensajeChat m) {
        MensajeChatDTO dto = new MensajeChatDTO();
        dto.setId(m.getId());
        dto.setContenido(m.getContenido());
        dto.setAutorId(m.getAutor().getId());
        String nombre = m.getAutor().getNombre() != null ? m.getAutor().getNombre() : "";
        String ap = m.getAutor().getApPaterno() != null ? m.getAutor().getApPaterno() : "";
        dto.setAutorNombre((nombre + " " + ap).trim());
        dto.setAutorRol(m.getAutor().getRol() != null ? m.getAutor().getRol().name() : "");
        dto.setFechaEnvio(m.getFechaEnvio());
        return dto;
    }
}
