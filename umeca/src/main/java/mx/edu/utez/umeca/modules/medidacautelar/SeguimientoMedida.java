package mx.edu.utez.umeca.modules.medidacautelar;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import mx.edu.utez.umeca.kernel.BaseEntity;
import mx.edu.utez.umeca.modules.security.user.User;

import java.time.LocalDate;

@Getter
@Setter
@Entity
@Table(name = "seguimientos_medida")
public class SeguimientoMedida extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "medida_id", nullable = false)
    private MedidaCautelar medida;

    @Column(name = "fecha_seguimiento", nullable = false)
    private LocalDate fechaSeguimiento;

    @Column(columnDefinition = "TEXT")
    private String detalles;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "registrado_por_id")
    private User registradoPor;
}
