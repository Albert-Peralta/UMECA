package mx.edu.utez.umeca.modules.supervision;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class SupervisionDTO {

    private Long id;

    @NotNull(message = "El imputado es requerido")
    private Long imputadoId;

    @NotNull(message = "El tipo es requerido")
    private String tipo;

    @NotNull(message = "La fecha programada es requerida")
    private LocalDate fechaProgramada;

    private LocalDate fechaRealizada;

    private String estado;

    private String observaciones;

    /** JSON con los destinatarios y sus datos */
    private String destinatariosJson;

    // Opcional
    private Long medidaCautelarId;
}
