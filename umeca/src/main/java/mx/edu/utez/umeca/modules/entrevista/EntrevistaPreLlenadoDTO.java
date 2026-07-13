package mx.edu.utez.umeca.modules.entrevista;

import lombok.Getter;
import lombok.Setter;

/**
 * DTO ligero para el buscador de pre-llenado en Medidas y Suspensiones.
 * Solo expone los campos necesarios para prellenar el formulario.
 */
@Getter
@Setter
public class EntrevistaPreLlenadoDTO {

    private Long id;
    private String folio;
    private String nombreCompleto;
    private String causaPenal;
    private String tipoSeguimiento;   // MC | SCP
    private Long imputadoId;
    private String fechaRegistro;

    public static EntrevistaPreLlenadoDTO from(EntrevistaEncuadre e) {
        EntrevistaPreLlenadoDTO dto = new EntrevistaPreLlenadoDTO();
        dto.setId(e.getId());
        dto.setFolio(e.getFolio());
        dto.setNombreCompleto(e.getNombre() + " " + e.getApPaterno()
                + (e.getApMaterno() != null ? " " + e.getApMaterno() : ""));
        dto.setCausaPenal(e.getCausaPenal());
        dto.setTipoSeguimiento(e.getTipoSeguimiento() != null ? e.getTipoSeguimiento().name() : null);
        dto.setImputadoId(e.getImputado() != null ? e.getImputado().getId() : null);
        dto.setFechaRegistro(e.getFechaRegistro() != null ? e.getFechaRegistro().toString() : null);
        return dto;
    }
}
