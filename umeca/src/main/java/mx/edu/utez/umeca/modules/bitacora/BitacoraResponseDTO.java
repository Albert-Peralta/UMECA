package mx.edu.utez.umeca.modules.bitacora;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class BitacoraResponseDTO {

    private Long          id;
    private String        entidad;
    private Long          entidadId;
    private String        entidadNombre;
    private String        accion;
    private String        descripcion;
    private String        usuario;        // nombre completo del realizadoPor
    private String        usuarioUsername;
    private LocalDateTime fecha;

    public static BitacoraResponseDTO from(Bitacora b) {
        BitacoraResponseDTO dto = new BitacoraResponseDTO();
        dto.id            = b.getId();
        dto.entidad       = b.getEntidad().name();
        dto.entidadId     = b.getEntidadId();
        dto.entidadNombre = b.getEntidadNombre();
        dto.accion        = b.getAccion().name();
        dto.descripcion   = b.getDescripcion();
        dto.fecha         = b.getFecha();
        if (b.getRealizadoPor() != null) {
            var u = b.getRealizadoPor();
            dto.usuario         = u.getNombre() + " " + u.getApPaterno()
                    + (u.getApMaterno() != null && !u.getApMaterno().isBlank() ? " " + u.getApMaterno() : "");
            dto.usuarioUsername = u.getUsername();
        }
        return dto;
    }
}
