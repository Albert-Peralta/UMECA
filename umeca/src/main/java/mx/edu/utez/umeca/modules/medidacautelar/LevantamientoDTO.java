package mx.edu.utez.umeca.modules.medidacautelar;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class LevantamientoDTO {
    private String oficioLevantamiento;
    private String firmaLevantamiento;
    private String motivoLevantamiento;
    private Boolean cumplioLevantamiento;
}
