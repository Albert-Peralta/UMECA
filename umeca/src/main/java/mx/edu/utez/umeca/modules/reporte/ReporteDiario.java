package mx.edu.utez.umeca.modules.reporte;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import mx.edu.utez.umeca.kernel.BaseEntity;
import mx.edu.utez.umeca.modules.security.user.User;

import java.time.LocalDate;

@Getter
@Setter
@Entity
@Table(name = "reportes_diarios",
       uniqueConstraints = @UniqueConstraint(columnNames = {"fecha", "zona", "usuario_id"}))
public class ReporteDiario extends BaseEntity {

    @Column(nullable = false)
    private LocalDate fecha;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private User.Zona zona;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private User usuario;

    // ── Campos generales ──────────────────────────────────────────────────────
    @Column(name = "firmas_recabadas")          private int firmasRecabadas;
    @Column(name = "nuevos_casos_mc")           private int nuevosCasosMC;
    @Column(name = "nuevos_casos_scp")          private int nuevosCasosSCP;
    @Column(name = "entrevistas_encuadre")      private int entrevistasEncuadre;
    @Column(name = "total_oficios_recibidos")   private int totalOficiosRecibidos;

    // ── Sección SUPERVISIÓN ───────────────────────────────────────────────────
    @Column(name = "oficios_emitidos_csp")          private int oficiosEmitidosCSP;
    @Column(name = "oficios_emitidos_diversos")     private int oficiosEmitidosDiversos;
    @Column(name = "reportes_incumplimiento")       private int reportesIncumplimiento;
    @Column(name = "reportes_no_presentacion")      private int reportesNoPresentacion;
    @Column(name = "solicitudes_colaboracion")      private int solicitudesColaboracion;
    @Column(name = "solicitudes_info_juez")         private int solicitudesInfoJuez;
    @Column(name = "solicitudes_info_mp")           private int solicitudesInfoMP;
    @Column(name = "informe_final")                 private int informeFinal;
    @Column(name = "canalizaciones")                private int canalizaciones;
    @Column(name = "visitas_domiciliarias")         private int visitasDomiciliarias;
    @Column(name = "audiencias_tta")                private int audienciasTTA;
    @Column(name = "llamadas_telefonicas")          private int llamadasTelefonicas;

    // ── Sección EVALUACIÓN ────────────────────────────────────────────────────
    @Column(name = "oficios_registros")             private int oficiosRegistros;
    @Column(name = "evaluacion_riesgo_fc")          private int evaluacionRiesgoFC;
    @Column(name = "evaluacion_riesgo_ff")          private int evaluacionRiesgoFF;
    @Column(name = "opinion_tecnica_fc")            private int opinionTecnicaFC;
    @Column(name = "opinion_tecnica_ff")            private int opinionTecnicaFF;
    @Column(name = "negaciones_fc")                 private int negacionesFC;
    @Column(name = "negaciones_ff")                 private int negacionesFF;
    @Column(name = "informes_fc")                   private int informesFC;
    @Column(name = "informes_ff")                   private int informesFF;

    // ── Sección adicional (cierre/seguimiento) ────────────────────────────────
    @Column(name = "llamadas_tel_evaluacion")       private int llamadasTelEvaluacion;
    @Column(name = "sobreseimientos")               private int sobreseimientos;
    @Column(name = "cierre_carpetas")               private int cierreCarpetas;
    @Column(name = "levantamiento_medida")          private int levantamientoMedida;

    // ── Campos manuales SUPERVISIÓN ───────────────────────────────────────────
    @Column(name = "firmas_recabadas_super")        private int firmasRecabadasSuper;
    @Column(name = "entrevista_encuadre_super")     private int entrevistaEncuadreSuper;
    @Column(name = "calendario_super")              private int calendarioSuper;
    @Column(name = "captura_carpetas",           columnDefinition = "int default 0") private int capturaCarpetas;
    @Column(name = "captura_oficios_imposicion", columnDefinition = "int default 0") private int capturaOficiosImposicion;

    // ── Campos manuales EVALUACIÓN ────────────────────────────────────────────
    @Column(name = "firmas_recabadas_eval")              private int firmasRecabadasEval;
    @Column(name = "entrevista_encuadre_eval")           private int entrevistaEncuadreEval;
    @Column(name = "entrevista_evaluacion_eval")         private int entrevistaEvaluacionEval;
    @Column(name = "calendario_eval")                    private int calendarioEval;
    @Column(name = "captura_carpetas_eval")              private int capturaCarpetasEval;
    @Column(name = "captura_oficios_imposicion_eval")    private int capturaOficiosImposicionEval;

    // ── Campos manuales CORRESPONDENCIA ──────────────────────────────────────
    @Column(name = "oficios_diversos_corr")              private int oficiosDiversosCorr;
    @Column(name = "firmas_recabadas_corr")              private int firmasRecabadasCorr;
    @Column(name = "entrevista_encuadre_corr")           private int entrevistaEncuadreCorr;
    @Column(name = "calendario_corr")                    private int calendarioCorr;
    @Column(name = "captura_carpetas_corr")              private int capturaCarpetasCorr;
    @Column(name = "captura_oficios_imposicion_corr")    private int capturaOficiosImposicionCorr;
}
