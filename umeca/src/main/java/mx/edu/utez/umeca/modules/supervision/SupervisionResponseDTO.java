package mx.edu.utez.umeca.modules.supervision;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class SupervisionResponseDTO {

    private Long id;
    private Long imputadoId;
    private String nombreImputado;
    private boolean imputadoFallecido;
    private String causaPenal;
    private String tipo;
    private LocalDate fechaProgramada;
    private LocalDate fechaRealizada;
    private String estado;
    private String observaciones;
    private String registradoPor;
    private Long medidaCautelarId;
    private String domicilioImputado;    // dirección para visitas domiciliarias
    private String coordenadasImputado;  // coordenadas exactas si se capturaron
    private String telefonoImputado;     // celular o teléfono de casa del imputado
    private String destinatariosJson;

    public static SupervisionResponseDTO from(Supervision s) {
        SupervisionResponseDTO dto = new SupervisionResponseDTO();
        dto.setId(s.getId());
        dto.setImputadoId(s.getImputado().getId());
        dto.setNombreImputado(s.getImputado().getNombreCompleto());
        dto.setImputadoFallecido(s.getImputado().isFallecido());
        dto.setCausaPenal(s.getImputado().getCausaPenal());
        dto.setTipo(s.getTipo().name());
        dto.setFechaProgramada(s.getFechaProgramada());
        dto.setFechaRealizada(s.getFechaRealizada());
        dto.setEstado(s.getEstado().name());
        dto.setObservaciones(s.getObservaciones());
        dto.setRegistradoPor(s.getRegistradoPor() != null
                ? s.getRegistradoPor().getNombre() + " " + s.getRegistradoPor().getApPaterno()
                : null);
        dto.setMedidaCautelarId(s.getMedidaCautelar() != null ? s.getMedidaCautelar().getId() : null);
        dto.setDestinatariosJson(s.getDestinatariosJson());
        return dto;
    }
}
