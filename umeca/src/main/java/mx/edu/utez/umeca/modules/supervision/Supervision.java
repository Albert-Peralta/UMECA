package mx.edu.utez.umeca.modules.supervision;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import mx.edu.utez.umeca.kernel.BaseEntity;
import mx.edu.utez.umeca.modules.imputado.Imputado;
import mx.edu.utez.umeca.modules.medidacautelar.MedidaCautelar;
import mx.edu.utez.umeca.modules.security.user.User;

import java.time.LocalDate;

@Getter
@Setter
@Entity
@Table(name = "supervisions")
public class Supervision extends BaseEntity {

    public enum TipoSupervision {
        LLAMADA, VISITA_DOMICILIARIA
    }

    public enum EstadoSupervision {
        PENDIENTE, REALIZADA, NO_CONTACTADO, CANCELADA
    }

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "imputado_id", nullable = false)
    private Imputado imputado;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo", nullable = false, length = 30)
    private TipoSupervision tipo;

    @Column(name = "fecha_programada", nullable = false)
    private LocalDate fechaProgramada;

    @Column(name = "fecha_realizada")
    private LocalDate fechaRealizada;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado", nullable = false, length = 20)
    private EstadoSupervision estado = EstadoSupervision.PENDIENTE;

    /**
     * JSON: {"imputado":{"activo":true,"telefono":"..."},
     *        "victima":{"activo":false,"nombre":"","telefono":""},
     *        "medioLaboral":{"activo":false,"nombre":"","telefono":""}}
     */
    @Column(name = "destinatarios_json", columnDefinition = "TEXT")
    private String destinatariosJson;

    @Column(columnDefinition = "TEXT")
    private String observaciones;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "registrado_por_id")
    private User registradoPor;

    // Vínculo opcional a medida cautelar
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "medida_cautelar_id")
    private MedidaCautelar medidaCautelar;
}
