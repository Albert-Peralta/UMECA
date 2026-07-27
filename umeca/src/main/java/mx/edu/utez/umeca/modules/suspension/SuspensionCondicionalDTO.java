package mx.edu.utez.umeca.modules.suspension;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SuspensionCondicionalDTO {
    private Long id;
    private String causa;
    private String oficio;
    private String recibido;   // "YYYY-MM-DD" o texto libre del Excel
    private String imputado;
    private String asunto;
    private String plazo;
    private String delito;
    private String fuero;      // "FEDERAL" | "ESTATAL"
    private String sobreseguimiento;
    private String observaciones;
    private Integer anio;
}
