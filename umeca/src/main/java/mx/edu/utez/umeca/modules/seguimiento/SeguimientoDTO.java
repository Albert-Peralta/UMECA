package mx.edu.utez.umeca.modules.seguimiento;

import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Getter
@Setter
public class SeguimientoDTO {
    private String tipoActividad;   // nombre del enum TipoActividad
    private String seccion;         // nombre del enum Seccion
    private String detalles;
    private Long imputadoId;
    private Long medidaId;
    private Long entrevistaId;
    private Long evaluacionId;
    private LocalDateTime fechaRegistro; // opcional; si null se usa now()
}
