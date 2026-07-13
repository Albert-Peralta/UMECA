package mx.edu.utez.umeca.modules.evaluacion;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class NegacionDTO {

    private String nombreImputado;
    private String apPaternoImputado;
    private String apMaternoImputado;
    private Integer edad;
    private String causaPenal;

    private String dependencia;
    private String cargo;
    private String nombreSolicitante;
    private LocalDate fechaSolicitud;
    private String horaInicio;
    private String lugarEntrevista;
}
