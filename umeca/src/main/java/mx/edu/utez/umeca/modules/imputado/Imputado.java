package mx.edu.utez.umeca.modules.imputado;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import mx.edu.utez.umeca.kernel.BaseEntity;

import java.time.LocalDate;

@Getter
@Setter
@Entity
@Table(name = "imputados")
public class Imputado extends BaseEntity {

    @Column(nullable = false, length = 100)
    private String nombre;

    @Column(name = "ap_paterno", nullable = false, length = 100)
    private String apPaterno;

    @Column(name = "ap_materno", length = 100)
    private String apMaterno;

    @Column(name = "causa_penal", nullable = false, length = 100)
    private String causaPenal;

    @Column(length = 255)
    private String delito;

    @Enumerated(EnumType.STRING)
    @Column(name = "ubicacion_fisica", length = 20)
    private UbicacionFisica ubicacionFisica;

    @Column(name = "foto", columnDefinition = "LONGTEXT")
    private String foto;  // Base64 data-URL

    @Column(name = "fallecido", nullable = false)
    private boolean fallecido = false;

    @Column(name = "fecha_fallecimiento")
    private LocalDate fechaFallecimiento;

    @Column(name = "quien_aviso", length = 200)
    private String quienAviso;

    @Column(name = "parentesco_informante", length = 100)
    private String parentescoInformante;

    @Column(name = "como_se_comprobo", length = 100)
    private String comoSeComprobo;

    @Column(name = "no_acta_defuncion", length = 100)
    private String noActaDefuncion;

    @Column(name = "observaciones_fallecimiento", length = 500)
    private String observacionesFallecimiento;

    public enum UbicacionFisica {
        FGR, FGE, CERESO, DOMICILIO, UMECA
    }

    public String getNombreCompleto() {
        return nombre + " " + apPaterno + (apMaterno != null ? " " + apMaterno : "");
    }
}