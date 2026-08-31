package mx.edu.utez.umeca.modules.controloficio;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter @Setter
public class ControlOficioResponseDTO {

    private Long id;
    private String noOficio;
    private LocalDate fecha;
    private String destinatario;
    private String asunto;
    private String supervisado;
    private String solicitanteNombre;
    private String solicitanteZona;
    private String estado;
    private String motivoCancelacion;
    private LocalDateTime createdAt;

    public static ControlOficioResponseDTO from(ControlOficio c) {
        ControlOficioResponseDTO dto = new ControlOficioResponseDTO();
        dto.setId(c.getId());
        dto.setNoOficio(c.getNoOficio());
        dto.setFecha(c.getFecha());
        dto.setDestinatario(c.getDestinatario());
        dto.setAsunto(c.getAsunto());
        dto.setSupervisado(c.getSupervisado());
        if (c.getSolicitante() != null) {
            dto.setSolicitanteNombre(c.getSolicitante().getNombre() + " " + c.getSolicitante().getApPaterno());
            dto.setSolicitanteZona(c.getSolicitante().getZona() != null ? c.getSolicitante().getZona().name() : null);
        }
        dto.setEstado(c.getEstado().name());
        dto.setMotivoCancelacion(c.getMotivoCancelacion());
        dto.setCreatedAt(c.getCreatedAt());
        return dto;
    }
}
