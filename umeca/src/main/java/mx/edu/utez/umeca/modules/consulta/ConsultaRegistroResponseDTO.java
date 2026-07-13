package mx.edu.utez.umeca.modules.consulta;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
public class ConsultaRegistroResponseDTO {

    private Long id;
    private LocalDate fechaSolicitud;
    private String quienSolicita;
    private String cargoSolicitante;
    private String dependenciaSolicitante;
    private String nombreImputado;
    private String apPaternoImputado;
    private String apMaternoImputado;
    private String nombreCompleto;
    private String causaPenal;
    private Long folioConsecutivo;
    private LocalDate fechaNacimientoImputado;
    private String curp;
    private String oficioNumero;
    private String resultado;
    private String observaciones;
    private String registradoPor;
    private LocalDateTime createdAt;

    // Consultas previas del mismo imputado
    private List<ConsultaPreviaDTO> consultasPrevias;

    @Getter
    @Setter
    public static class ConsultaPreviaDTO {
        private Long id;
        private LocalDate fechaSolicitud;
        private String resultado;
        private String quienSolicita;
        private String causaPenal;
    }

    public static ConsultaRegistroResponseDTO from(ConsultaRegistro c) {
        ConsultaRegistroResponseDTO dto = new ConsultaRegistroResponseDTO();
        dto.setId(c.getId());
        dto.setFechaSolicitud(c.getFechaSolicitud());
        dto.setQuienSolicita(c.getQuienSolicita());
        dto.setCargoSolicitante(c.getCargoSolicitante());
        dto.setDependenciaSolicitante(c.getDependenciaSolicitante());
        dto.setNombreImputado(c.getNombreImputado());
        dto.setApPaternoImputado(c.getApPaternoImputado());
        dto.setApMaternoImputado(c.getApMaternoImputado());
        dto.setNombreCompleto((c.getApPaternoImputado() != null ? c.getApPaternoImputado() + " " : "")
                + (c.getApMaternoImputado() != null ? c.getApMaternoImputado() + " " : "")
                + c.getNombreImputado());
        dto.setCausaPenal(c.getCausaPenal());
        dto.setFolioConsecutivo(c.getFolioConsecutivo());
        dto.setFechaNacimientoImputado(c.getFechaNacimientoImputado());
        dto.setCurp(c.getCurp());
        dto.setOficioNumero(c.getOficioNumero());
        dto.setResultado(c.getResultado().name());
        dto.setObservaciones(c.getObservaciones());
        dto.setCreatedAt(c.getCreatedAt());
        if (c.getRegistradoPor() != null) {
            dto.setRegistradoPor(c.getRegistradoPor().getNombre() + " " + c.getRegistradoPor().getApPaterno());
        }
        return dto;
    }
}
