package mx.edu.utez.umeca.modules.consulta;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import mx.edu.utez.umeca.kernel.BaseEntity;
import mx.edu.utez.umeca.modules.security.user.User;

import java.time.LocalDate;

@Getter
@Setter
@Entity
@Table(name = "consultas_registro")
public class ConsultaRegistro extends BaseEntity {

    @Column(name = "fecha_solicitud", nullable = false)
    private LocalDate fechaSolicitud;

    @Column(name = "quien_solicita", nullable = false, length = 300)
    private String quienSolicita;

    @Column(name = "cargo_solicitante", length = 200)
    private String cargoSolicitante;

    @Column(name = "dependencia_solicitante", length = 200)
    private String dependenciaSolicitante;

    @Column(name = "nombre_imputado", nullable = false, length = 200)
    private String nombreImputado;

    @Column(name = "ap_paterno_imputado", length = 100)
    private String apPaternoImputado;

    @Column(name = "ap_materno_imputado", length = 100)
    private String apMaternoImputado;

    @Column(name = "causa_penal", length = 200)
    private String causaPenal;

    @Column(name = "fecha_nacimiento_imputado")
    private LocalDate fechaNacimientoImputado;

    @Column(name = "curp", length = 20)
    private String curp;

    /** JSON array con imputados adicionales (a partir del segundo). Formato: [{nombre,apPaterno,apMaterno,fechaNacimiento},...] */
    @Column(name = "imputados_json", columnDefinition = "TEXT")
    private String imputadosJson;

    @Column(name = "folio_consecutivo")
    private Long folioConsecutivo;

    @Column(name = "oficio_numero", length = 100)
    private String oficioNumero;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Resultado resultado;

    @Column(columnDefinition = "TEXT")
    private String observaciones;

    @JsonIgnoreProperties({"hibernateLazyInitializer","handler","password","authorities",
            "accountNonExpired","accountNonLocked","credentialsNonExpired","enabled"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "registrado_por_id")
    private User registradoPor;

    public enum Resultado {
        POSITIVO, NEGATIVO
    }
}
