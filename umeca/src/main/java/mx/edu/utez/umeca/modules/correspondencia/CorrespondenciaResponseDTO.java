package mx.edu.utez.umeca.modules.correspondencia;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter @Setter
public class CorrespondenciaResponseDTO {
    private Long id;
    private String noTurno;
    private String sede;
    private String noOficio;
    private String fechaOficio;
    private String fechaRecibido;
    private String tipo;
    private String remitente;
    private String asunto;
    private Integer terminoRespuestaHoras;
    private Boolean requiereRespuesta;
    private String prioridad;
    private String archivoPdf;
    private String estado;
    private String registradoPorNombre;
    private Long asignadoAId;
    private String asignadoANombre;
    private String asignadoARol;
    private LocalDateTime fechaAsignacion;
    private LocalDateTime createdAt;

    public static CorrespondenciaResponseDTO from(Correspondencia c) {
        CorrespondenciaResponseDTO dto = new CorrespondenciaResponseDTO();
        dto.setId(c.getId());
        dto.setNoTurno(c.getNoTurno());
        dto.setSede(c.getSede() != null ? c.getSede().name() : null);
        dto.setNoOficio(c.getNoOficio());
        dto.setFechaOficio(c.getFechaOficio() != null ? c.getFechaOficio().toString() : null);
        dto.setFechaRecibido(c.getFechaRecibido() != null ? c.getFechaRecibido().toString() : null);
        dto.setTipo(c.getTipo() != null ? c.getTipo().name() : null);
        dto.setRemitente(c.getRemitente());
        dto.setAsunto(c.getAsunto());
        dto.setTerminoRespuestaHoras(c.getTerminoRespuestaHoras());
        dto.setRequiereRespuesta(c.getRequiereRespuesta());
        dto.setPrioridad(c.getPrioridad() != null ? c.getPrioridad().name() : null);
        dto.setArchivoPdf(c.getArchivoPdf());
        dto.setEstado(c.getEstado() != null ? c.getEstado().name() : null);
        dto.setFechaAsignacion(c.getFechaAsignacion());
        dto.setCreatedAt(c.getCreatedAt());
        if (c.getRegistradoPor() != null)
            dto.setRegistradoPorNombre(c.getRegistradoPor().getNombre() + " " + c.getRegistradoPor().getApPaterno());
        if (c.getAsignadoA() != null) {
            dto.setAsignadoAId(c.getAsignadoA().getId());
            dto.setAsignadoANombre(c.getAsignadoA().getNombre() + " " + c.getAsignadoA().getApPaterno());
            dto.setAsignadoARol(c.getAsignadoA().getRol() != null ? c.getAsignadoA().getRol().name() : null);
        }
        return dto;
    }
}
