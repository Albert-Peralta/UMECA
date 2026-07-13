package mx.edu.utez.umeca.modules.medidacautelar;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import mx.edu.utez.umeca.kernel.BaseEntity;
import mx.edu.utez.umeca.modules.entrevista.EntrevistaEncuadre;
import mx.edu.utez.umeca.modules.imputado.Imputado;
import mx.edu.utez.umeca.modules.security.user.User;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Entity
@Table(name = "medidas_cautelares")
public class MedidaCautelar extends BaseEntity {

    public enum TipoMedida {
        MEDIDA_CAUTELAR, SUSPENSION_CONDICIONAL
    }

    public enum Estado {
        ACTIVO, SUSPENDIDO, FINALIZADO, LEVANTADO, REVOCADO
    }

    // ── Relaciones ───────────────────────────────────────────────────────────
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "imputado_id", nullable = false)
    private Imputado imputado;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "entrevista_id")
    private EntrevistaEncuadre entrevista;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "registrado_por_id")
    private User registradoPor;

    // ── Tipo y causa ─────────────────────────────────────────────────────────
    @Enumerated(EnumType.STRING)
    @Column(name = "tipo", nullable = false, length = 30)
    private TipoMedida tipo = TipoMedida.MEDIDA_CAUTELAR;

    @Column(name = "causa_penal", nullable = false, length = 100)
    private String causaPenal;

    // ── Datos procesales (compartidos MC y SCP) ──────────────────────────────
    @Column(name = "fecha_recepcion")
    private LocalDate fechaRecepcion;

    @Column(length = 255)
    private String delito;

    @Column(length = 100)
    private String modalidad;

    /** JSON array: [{"delito":"...","modalidad":"..."},...] */
    @Column(name = "delitos_json", columnDefinition = "TEXT")
    private String delitosJson;

    @Column(length = 100)
    private String sede;

    @Column(name = "nombre_juez", length = 200)
    private String nombreJuez;

    @Column(name = "fecha_formulacion")
    private LocalDate fechaFormulacion;

    @Column(name = "fecha_vinculacion_proceso")
    private LocalDate fechaVinculacionProceso;

    @Column(name = "fecha_entrevista_evaluacion")
    private LocalDate fechaEntrevistaEvaluacion;

    // ── Sección MC: Medidas Cautelares Art.155 ────────────────────────────────
    @Column(name = "fecha_canalizacion")
    private LocalDate fechaCanalizacion;

    @Column(name = "a_disposicion")
    private Boolean aDisposicion = false;

    @Column(name = "descripcion_domicilio", columnDefinition = "TEXT")
    private String descripcionDomicilio;

    @Column(name = "presentacion_periodica", length = 100)
    private String presentacionPeriodica;

    @Column(name = "no_biometrico", length = 50)
    private String noBiometrico;

    @Column(name = "no_libro", length = 50)
    private String noLibro;

    @Column(name = "no_pagina", length = 50)
    private String noPagina;

    @Column(name = "cumpliendo_incumpliendo", length = 50)
    private String cumpliendoIncumpliendo;

    @Column(name = "distrito_judicial", length = 200)
    private String distritoJudicial;

    @Column(name = "descripcion_informe", columnDefinition = "TEXT")
    private String descripcionInforme;

    @Column(name = "acuerdo_reparatorio")
    private Boolean acuerdoReparatorio = false;

    @Column(name = "descripcion_acuerdo", columnDefinition = "TEXT")
    private String descripcionAcuerdo;

    @Column(name = "fecha_celebracion_acuerdo")
    private LocalDate fechaCelebracionAcuerdo;

    @Column(name = "fecha_cumplimiento_acuerdo")
    private LocalDate fechaCumplimientoAcuerdo;

    @Column(name = "estatus_final", length = 50)
    private String estatusFinal;

    @Column(name = "fecha_termino")
    private LocalDate fechaTermino;

    // ── Sección SCP específica ────────────────────────────────────────────────
    @Column(name = "fecha_imposicion_scp")
    private LocalDate fechaImposicionScp;

    @Column(name = "plazo_scp")
    private LocalDate plazoScp;

    @Column(name = "canalizacion", length = 200)
    private String canalizacion;

    @Column(name = "tipo_servicio", length = 100)
    private String tipoServicio;

    @Column(name = "fecha_informe_final")
    private LocalDate fechaInformeFinal;

    @Column(name = "vencimiento_plazo")
    private LocalDate vencimientoPlazo;

    @Column(name = "oficio_sobreseimiento", length = 200)
    private String oficioSobreseimiento;

    @Column(name = "responsable_cierre", length = 200)
    private String responsableCierre;

    // ── Fracciones/condiciones ────────────────────────────────────────────────
    @ElementCollection
    @CollectionTable(name = "medida_fracciones", joinColumns = @JoinColumn(name = "medida_id"))
    @Column(name = "fraccion", length = 20)
    private List<String> fracciones = new ArrayList<>();

    /** JSON con campos específicos de cada fracción/condición seleccionada */
    @Column(name = "detalles_fracciones", columnDefinition = "TEXT")
    private String detallesFracciones;

    // ── Información adicional ─────────────────────────────────────────────────
    @Column(name = "advertencia", columnDefinition = "TEXT")
    private String advertencia;

    @Column(name = "observaciones", columnDefinition = "TEXT")
    private String observaciones;

    @Column(name = "responsable_seguimiento", length = 200)
    private String responsableSeguimiento;

    @Column(name = "observaciones_generales", columnDefinition = "TEXT")
    private String observacionesGenerales;

    @Column(name = "fecha_proxima_revision")
    private LocalDate fechaProximaRevision;

    @Column(name = "vigencia_inicio")
    private LocalDate vigenciaInicio;

    @Column(name = "vigencia_fin")
    private LocalDate vigenciaFin;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Estado estado = Estado.ACTIVO;

    // ── Revocación SCP ───────────────────────────────────────────────────────
    @Column(name = "fecha_revocacion")
    private LocalDate fechaRevocacion;

    @Column(name = "oficio_revocacion", length = 200)
    private String oficioRevocacion;

    @Column(name = "motivo_revocacion", columnDefinition = "TEXT")
    private String motivoRevocacion;

    // ── Ampliación SCP ────────────────────────────────────────────────────────
    @Column(name = "fecha_ampliacion")
    private LocalDate fechaAmpliacion;

    @Column(name = "nuevo_plazo_scp")
    private LocalDate nuevoPlazoScp;

    @Column(name = "motivo_ampliacion", columnDefinition = "TEXT")
    private String motivoAmpliacion;

    // ── Cambio a SCP ────────────────────────────────────────────────────────
    @Column(name = "cambiado_a_scp")
    private Boolean cambiadoAScp = false;

    @Column(name = "fecha_cambio_scp")
    private LocalDate fechaCambioScp;

    // ── Levantamiento ────────────────────────────────────────────────────────
    @Column(name = "fecha_levantamiento")
    private LocalDate fechaLevantamiento;

    @Column(name = "oficio_levantamiento", length = 200)
    private String oficioLevantamiento;

    @Column(name = "firma_levantamiento", length = 200)
    private String firmaLevantamiento;

    @Column(name = "motivo_levantamiento", columnDefinition = "TEXT")
    private String motivoLevantamiento;

    @Column(name = "cumplio_levantamiento")
    private Boolean cumplioLevantamiento;

    @OneToMany(mappedBy = "medida", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<SeguimientoMedida> seguimientos = new ArrayList<>();
}
