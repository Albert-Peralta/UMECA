package mx.edu.utez.umeca.modules.suspension;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import mx.edu.utez.umeca.kernel.BaseEntity;

import java.time.LocalDate;

@Getter
@Setter
@Entity
@Table(name = "suspension_condicional")
public class SuspensionCondicional extends BaseEntity {

    @Column(name = "causa", length = 200)
    private String causa;

    @Column(name = "oficio", length = 200)
    private String oficio;

    @Column(name = "recibido")
    private LocalDate recibido;

    @Column(name = "imputado", length = 300)
    private String imputado;

    @Column(name = "asunto", columnDefinition = "TEXT")
    private String asunto;

    @Column(name = "plazo", length = 200)
    private String plazo;

    @Column(name = "delito", columnDefinition = "TEXT")
    private String delito;

    @Enumerated(EnumType.STRING)
    @Column(name = "fuero", length = 10)
    private Fuero fuero;

    @Column(name = "sobreseguimiento", columnDefinition = "TEXT")
    private String sobreseguimiento;

    @Column(name = "observaciones", columnDefinition = "TEXT")
    private String observaciones;

    /** Año de la hoja del Excel (2018, 2019, …) */
    @Column(name = "anio")
    private Integer anio;

    public enum Fuero {
        FEDERAL, ESTATAL
    }
}
