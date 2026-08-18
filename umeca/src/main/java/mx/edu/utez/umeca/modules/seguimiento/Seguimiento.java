package mx.edu.utez.umeca.modules.seguimiento;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import mx.edu.utez.umeca.kernel.BaseEntity;
import mx.edu.utez.umeca.modules.imputado.Imputado;
import mx.edu.utez.umeca.modules.security.user.User;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "seguimientos")
public class Seguimiento extends BaseEntity {

    public enum TipoActividad {
        // Supervisión
        OFICIO_CSP,
        OFICIO_DIVERSO,
        REPORTE_INCUMPLIMIENTO,
        REPORTE_NO_PRESENTACION,
        SOLICITUD_COLABORACION,
        SOLICITUD_INFO_JUEZ,
        SOLICITUD_INFO_MP,
        INFORME_FINAL,
        CANALIZACION,
        VISITA_DOMICILIARIA,
        AUDIENCIA_TTA,
        LLAMADA_TELEFONICA,
        FIRMA_RECABADA,
        ENTREVISTA_ENCUADRE_SUPER,
        CALENDARIO,
        // Evaluación
        OFICIO_REGISTRO,
        OPINION_TECNICA_FC,
        OPINION_TECNICA_FF,
        NEGACION_FC,
        NEGACION_FF,
        INFORME_FC,
        INFORME_FF,
        EVALUACION_RIESGO_FC,
        EVALUACION_RIESGO_FF,
        FIRMA_RECABADA_EVAL,
        ENTREVISTA_ENCUADRE_EVAL,
        ENTREVISTA_EVALUACION,
        // Correspondencia
        OFICIO_RECIBIDO,
        NUEVO_CASO_MC,
        NUEVO_CASO_SCP,
        SOBRESEIMIENTO,
        LEVANTAMIENTO_MEDIDA,
        OFICIO_DIVERSO_CORR,
        // General
        OTRO,
        OTRO_SUPERVISION
    }

    public enum Seccion {
        MEDIDA,
        ENTREVISTA,
        EVALUACION,
        EXPEDIENTE
    }

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "imputado_id", nullable = false)
    private Imputado imputado;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_actividad", nullable = false, length = 40)
    private TipoActividad tipoActividad;

    @Enumerated(EnumType.STRING)
    @Column(name = "seccion", nullable = false, length = 20)
    private Seccion seccion;

    @Column(columnDefinition = "TEXT")
    private String detalles;

    @Column(name = "fecha_registro", nullable = false)
    private LocalDateTime fechaRegistro;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "registrado_por_id")
    private User registradoPor;

    // Referencias opcionales para trazabilidad
    @Column(name = "medida_id")
    private Long medidaId;

    @Column(name = "entrevista_id")
    private Long entrevistaId;

    @Column(name = "evaluacion_id")
    private Long evaluacionId;
}
