package mx.edu.utez.umeca.modules.medidacautelar;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import mx.edu.utez.umeca.modules.suspension.SuspensionCondicional;

import java.time.LocalDateTime;

@Entity
@Table(name = "observaciones_medida")
@Getter @Setter @NoArgsConstructor
public class ObservacionMedida {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String texto;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion = LocalDateTime.now();

    @Column(name = "autor_nombre", length = 200, nullable = false)
    private String autorNombre;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "medida_id")
    private MedidaCautelar medida;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "scp_id")
    private SuspensionCondicional suspension;
}
