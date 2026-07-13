package mx.edu.utez.umeca.modules.reporte;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class CumplimientoReporteDTO {
    private Long   usuarioId;
    private String nombreCompleto;
    private String rol;
    private String zona;
    private boolean entrego;          // entregó reporte en la fecha/rango
    private int     totalRegistros;   // total de reportes en el período
    private String  ultimaFecha;      // última fecha en que entregó
}
