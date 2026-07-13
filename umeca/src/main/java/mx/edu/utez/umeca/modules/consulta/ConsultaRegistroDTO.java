package mx.edu.utez.umeca.modules.consulta;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class ConsultaRegistroDTO {

    @NotNull(message = "La fecha de solicitud es obligatoria")
    private LocalDate fechaSolicitud;

    @NotBlank(message = "El nombre del solicitante es obligatorio")
    private String quienSolicita;

    private String cargoSolicitante;
    private String dependenciaSolicitante;

    @NotBlank(message = "El nombre del imputado es obligatorio")
    private String nombreImputado;

    private String apPaternoImputado;
    private String apMaternoImputado;
    private String causaPenal;
    private LocalDate fechaNacimientoImputado;
    private String curp;
    private Long folioConsecutivo;
    private String oficioNumero;

    @NotNull(message = "El resultado es obligatorio")
    private String resultado;

    private String observaciones;
}
