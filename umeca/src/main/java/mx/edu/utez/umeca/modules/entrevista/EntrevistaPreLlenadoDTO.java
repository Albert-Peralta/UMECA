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
    private String zona;

    public static EntrevistaPreLlenadoDTO from(EntrevistaEncuadre e) {
        EntrevistaPreLlenadoDTO dto = new EntrevistaPreLlenadoDTO();
        dto.setId(e.getId());
        dto.setFolio(e.getFolio());
        String nom = (e.getNombre() != null && !e.getNombre().isBlank()) ? e.getNombre()
                : (e.getImputado() != null ? e.getImputado().getNombre() : "");
        String pat = (e.getApPaterno() != null && !e.getApPaterno().isBlank()) ? e.getApPaterno()
                : (e.getImputado() != null ? e.getImputado().getApPaterno() : "");
        String mat = (e.getApMaterno() != null && !e.getApMaterno().isBlank()) ? e.getApMaterno()
                : (e.getImputado() != null ? e.getImputado().getApMaterno() : null);
        dto.setNombreCompleto(nom + " " + pat + (mat != null && !mat.isBlank() ? " " + mat : ""));
        dto.setCausaPenal(e.getCausaPenal());
        dto.setTipoSeguimiento(e.getTipoSeguimiento() != null ? e.getTipoSeguimiento().name() : null);
        dto.setImputadoId(e.getImputado() != null ? e.getImputado().getId() : null);
        dto.setFechaRegistro(e.getFechaRegistro() != null ? e.getFechaRegistro().toString() : null);
        dto.setZona(e.getRegistradoPor() != null && e.getRegistradoPor().getZona() != null
                ? e.getRegistradoPor().getZona().name() : null);
        return dto;
    }
}
