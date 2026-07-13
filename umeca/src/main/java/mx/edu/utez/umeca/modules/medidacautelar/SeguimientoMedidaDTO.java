package mx.edu.utez.umeca.modules.medidacautelar;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class SeguimientoMedidaDTO {
    private LocalDate fechaSeguimiento;
    private String detalles;
}
