package mx.edu.utez.umeca.modules.expediente;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import mx.edu.utez.umeca.kernel.BaseEntity;

import java.time.LocalDate;

/**
 * Registro histórico de expedientes anteriores al sistema.
 * Tipos: MC (Medida Cautelar), SCP (Suspensión Condicional del Proceso), HISTORICO.
 * Es de solo lectura una vez importado.
 */
@Getter
@Setter
@Entity
@Table(name = "expedientes_anteriores", indexes = {
    @Index(name = "idx_exp_tipo",       columnList = "tipo"),
    @Index(name = "idx_exp_zona",       columnList = "zona"),
    @Index(name = "idx_exp_lote",       columnList = "lote_id"),
    @Index(name = "idx_exp_ap_paterno", columnList = "ap_paterno"),
    @Index(name = "idx_exp_numero",     columnList = "numero"),
})
public class ExpedienteAnterior extends BaseEntity {

    // ── Lote de importación ───────────────────────────────────
    @Column(name = "lote_id")
    private Long loteId;

    // ── Tipo y zona ──────────────────────────────────────────
    @Enumerated(EnumType.STRING)
    @Column(name = "tipo", nullable = false, length = 50)
    private TipoExpediente tipo;

    @Enumerated(EnumType.STRING)
    @Column(name = "zona", length = 20)
    private Zona zona;

    // ── Datos del imputado ───────────────────────────────────
    @Column(name = "numero", length = 50)
    private String numero;

    @Column(name = "estatus", columnDefinition = "TEXT")
    private String estatus;

    @Column(name = "responsable", columnDefinition = "TEXT")
    private String responsable;

    @Column(name = "ap_paterno", columnDefinition = "TEXT")
    private String apPaterno;

    @Column(name = "ap_materno", columnDefinition = "TEXT")
    private String apMaterno;

    @Column(name = "nombre", columnDefinition = "TEXT")
    private String nombre;

    @Column(name = "genero", columnDefinition = "TEXT")
    private String genero;

    @Column(name = "fecha_nacimiento")
    private LocalDate fechaNacimiento;

    @Column(name = "edad")
    private Integer edad;

    // ── Grupos vulnerables ───────────────────────────────────
    @Column(name = "indigena")
    private Boolean indigena;

    @Column(name = "etnia_pueblo", columnDefinition = "TEXT")
    private String etniaPueblo;

    @Column(name = "afrodescendiente")
    private Boolean afrodescendiente;

    @Column(name = "extranjero_migrante")
    private Boolean extranjeroMigrante;

    @Column(name = "comunidad_lgbt")
    private Boolean comunidadLgbt;

    @Column(name = "discapacidad")
    private Boolean discapacidad;

    @Column(name = "grupo_vulnerable_otro", columnDefinition = "TEXT")
    private String grupoVulnerableOtro;

    // ── Domicilio ─────────────────────────────────────────────
    @Column(name = "calle", columnDefinition = "TEXT")
    private String calle;

    @Column(name = "numero_ext", columnDefinition = "TEXT")
    private String numeroExt;

    @Column(name = "colonia", columnDefinition = "TEXT")
    private String colonia;

    @Column(name = "municipio", columnDefinition = "TEXT")
    private String municipio;

    @Column(name = "estado_domicilio", columnDefinition = "TEXT")
    private String estadoDomicilio;

    @Column(name = "telefono1", columnDefinition = "TEXT")
    private String telefono1;

    @Column(name = "telefono2", columnDefinition = "TEXT")
    private String telefono2;

    @Column(name = "ocupacion", columnDefinition = "TEXT")
    private String ocupacion;

    // ── Víctima 1 ─────────────────────────────────────────────
    @Column(name = "victima1_tipo", length = 100)
    private String victima1Tipo;

    @Column(name = "victima1_nombre", columnDefinition = "TEXT")
    private String victima1Nombre;

    @Column(name = "victima1_genero", columnDefinition = "TEXT")
    private String victima1Genero;

    @Column(name = "victima1_domicilio", columnDefinition = "TEXT")
    private String victima1Domicilio;

    @Column(name = "victima1_telefono", columnDefinition = "TEXT")
    private String victima1Telefono;

    // ── Víctima 2 ─────────────────────────────────────────────
    @Column(name = "victima2_tipo", length = 100)
    private String victima2Tipo;

    @Column(name = "victima2_nombre", columnDefinition = "TEXT")
    private String victima2Nombre;

    @Column(name = "victima2_genero", columnDefinition = "TEXT")
    private String victima2Genero;

    @Column(name = "victima2_domicilio", columnDefinition = "TEXT")
    private String victima2Domicilio;

    @Column(name = "victima2_telefono", columnDefinition = "TEXT")
    private String victima2Telefono;

    // ── Campos exclusivos SCP ─────────────────────────────────
    @Column(name = "fecha_inicio_supervision")
    private LocalDate fechaInicioSupervision;

    @Column(name = "fecha_imposicion_scp")
    private LocalDate fechaImposicionScp;

    @Column(name = "plazo_scp", columnDefinition = "TEXT")
    private String plazoScp;

    @Column(name = "fecha_conclusion_scp")
    private LocalDate fechaConclusionScp;

    @Column(name = "primera_visita")
    private LocalDate primeraVisita;

    @Column(name = "segunda_visita")
    private LocalDate segundaVisita;

    @Column(name = "tercera_visita")
    private LocalDate terceraVisita;

    @Column(name = "tipo_servicio", columnDefinition = "TEXT")
    private String tipoServicio;

    @Column(name = "fecha_informe_final")
    private LocalDate fechaInformeFinal;

    @Column(name = "vencimiento_plazo_scp")
    private LocalDate vencimientoPlazoScp;

    @Column(name = "oficio_sobreseimiento", columnDefinition = "TEXT")
    private String oficioSobreseimiento;

    @Column(name = "responsable_cierre_carpeta", columnDefinition = "TEXT")
    private String responsableCierreCarpeta;

    @Column(name = "ajuste", columnDefinition = "TEXT")
    private String ajuste;

    @Column(name = "numero_expediente_archivo", columnDefinition = "TEXT")
    private String numeroExpedienteArchivo;

    // ── Oficio de imposición ──────────────────────────────────
    @Column(name = "fecha_recepcion")
    private LocalDate fechaRecepcion;

    @Column(name = "causa_penal", columnDefinition = "TEXT")
    private String causaPenal;

    @Column(name = "delito", columnDefinition = "TEXT")
    private String delito;

    @Column(name = "modalidad", columnDefinition = "TEXT")
    private String modalidad;

    @Column(name = "sede", columnDefinition = "TEXT")
    private String sede;

    @Column(name = "nombre_juez", columnDefinition = "TEXT")
    private String nombreJuez;

    @Column(name = "fecha_formulacion")
    private LocalDate fechaFormulacion;

    @Column(name = "fecha_vinculacion_proceso")
    private LocalDate fechaVinculacionProceso;

    @Column(name = "fecha_entrevista_evaluacion")
    private LocalDate fechaEntrevistaEvaluacion;

    // ── Evaluación / Audiencia ────────────────────────────────
    @Column(name = "fecha_audiencia_imposicion")
    private LocalDate fechaAudienciaImposicion;

    @Column(name = "fecha_entrevista_encuadre")
    private LocalDate fechaEntrevistaEncuadre;

    // Riesgos procesales (checkboxes del Excel)
    @Column(name = "riesgo_sustraccion")
    private Boolean riesgoSustraccion;

    @Column(name = "riesgo_obstaculizacion")
    private Boolean riesgoObstaculizacion;

    @Column(name = "riesgo_victima")
    private Boolean riesgoVictima;

    @Column(name = "opinion_tecnica_riesgos", columnDefinition = "TEXT")
    private String opinionTecnicaRiesgos;

    @Column(name = "informe", columnDefinition = "TEXT")
    private String informe;

    // Motivos de no aplica
    @Column(name = "no_aplica_mp_no_solicito")
    private Boolean noAplicaMpNoSolicito;

    @Column(name = "no_aplica_sin_tiempo")
    private Boolean noAplicaSinTiempo;

    @Column(name = "no_aplica_persona_no_accedio")
    private Boolean noAplicaPersonaNoAccedio;

    @Column(name = "no_aplica_sin_fuentes")
    private Boolean noAplicaSinFuentes;

    @Column(name = "no_aplica_otro", columnDefinition = "TEXT")
    private String noAplicaOtro;

    // ── Medidas Cautelares Art. 155 (I–XIV) ──────────────────
    @Column(name = "mc_i")   private Boolean mcI;
    @Column(name = "mc_ii")  private Boolean mcIi;
    @Column(name = "mc_iii") private Boolean mcIii;
    @Column(name = "mc_iv")  private Boolean mcIv;
    @Column(name = "mc_v")   private Boolean mcV;
    @Column(name = "mc_vi")  private Boolean mcVi;
    @Column(name = "mc_vii") private Boolean mcVii;
    @Column(name = "mc_viii")private Boolean mcViii;
    @Column(name = "mc_ix")  private Boolean mcIx;
    @Column(name = "mc_x")   private Boolean mcX;
    @Column(name = "mc_xi")  private Boolean mcXi;
    @Column(name = "mc_xii") private Boolean mcXii;
    @Column(name = "mc_xiii")private Boolean mcXiii;
    @Column(name = "mc_xiv") private Boolean mcXiv;

    // ── Datos de la Medida Cautelar ───────────────────────────
    @Column(name = "fecha_canalizacion")
    private LocalDate fechaCanalizacion;

    @Column(name = "a_disposicion", columnDefinition = "TEXT")
    private String aDisposicion;

    @Column(name = "coordenadas_domicilio", columnDefinition = "TEXT")
    private String coordenadasDomicilio;

    @Column(name = "presentacion_periodica", columnDefinition = "TEXT")
    private String presentacionPeriodica;

    @Column(name = "no_biometrico", columnDefinition = "TEXT")
    private String noBiometrico;

    @Column(name = "no_libro", columnDefinition = "TEXT")
    private String noLibro;

    @Column(name = "no_pagina", columnDefinition = "TEXT")
    private String noPagina;

    @Column(name = "cumpliendo_incumpliendo", columnDefinition = "TEXT")
    private String cumpliendoIncumpliendo;

    @Column(name = "distrito_judicial", columnDefinition = "TEXT")
    private String distritoJudicial;

    @Column(name = "ultimo_informe_mc", columnDefinition = "TEXT")
    private String ultimoInformeMc;

    @Column(name = "acuerdo_reparatorio", columnDefinition = "TEXT")
    private String acuerdoReparatorio;

    @Column(name = "fecha_acuerdo_reparatorio")
    private LocalDate fechaAcuerdoReparatorio;

    @Column(name = "fecha_cumplimiento_acuerdo")
    private LocalDate fechaCumplimientoAcuerdo;

    @Column(name = "estatus_final", columnDefinition = "TEXT")
    private String estatusFinal;

    @Column(name = "fecha_termino_mc")
    private LocalDate fechaTerminoMc;

    @Column(name = "estado_final", columnDefinition = "TEXT")
    private String estadoFinal;

    // ── Seguimientos (hasta 15) ───────────────────────────────
    @Column(name = "seguimientos", columnDefinition = "TEXT")
    private String seguimientos; // JSON array de strings

    // ── Observaciones ─────────────────────────────────────────
    @Column(name = "observaciones", columnDefinition = "TEXT")
    private String observaciones;

    // ── Campos REGISTRO_HISTORICO ─────────────────────────────
    @Column(name = "fecha_registro_hist")
    private LocalDate fechaRegistroHist;

    @Column(name = "situacion_juridica", columnDefinition = "TEXT")
    private String situacionJuridica;

    // ── Campos SUSTRAIDO ──────────────────────────────────────
    @Column(name = "archivo", columnDefinition = "TEXT")
    private String archivo;

    @Column(name = "tipo_mc_scp", columnDefinition = "TEXT")
    private String tipoMcScp;

    @Column(name = "sustraccion", columnDefinition = "TEXT")
    private String sustraccion;

    @Column(name = "supervisor", columnDefinition = "TEXT")
    private String supervisor;

    // ── Campos nuevos Base Jojutla / Cuautla ──────────────────
    @Column(name = "resolucion", columnDefinition = "TEXT")
    private String resolucion;

    @Column(name = "sexo", columnDefinition = "TEXT")
    private String sexo;

    @Column(name = "bitacora", columnDefinition = "TEXT")
    private String bitacora;

    @Column(name = "juez", columnDefinition = "TEXT")
    private String juez;

    @Column(name = "fecha_imposicion")
    private LocalDate fechaImposicion;

    @Column(name = "plazo", columnDefinition = "TEXT")
    private String plazo;

    @Column(name = "fecha_vencimiento")
    private LocalDate fechaVencimiento;

    @Column(name = "asignado", columnDefinition = "TEXT")
    private String asignado;

    @Column(name = "vencimiento")
    private LocalDate vencimiento;

    @Column(name = "motivo_cierre", columnDefinition = "TEXT")
    private String motivoCierre;

    @Column(name = "cierre", columnDefinition = "TEXT")
    private String cierre;

    @Column(name = "observaciones2", columnDefinition = "TEXT")
    private String observaciones2;

    @Column(name = "observaciones3", columnDefinition = "TEXT")
    private String observaciones3;

    @Column(name = "observaciones4", columnDefinition = "TEXT")
    private String observaciones4;

    @Column(name = "observaciones5", columnDefinition = "TEXT")
    private String observaciones5;

    @Column(name = "observaciones6", columnDefinition = "TEXT")
    private String observaciones6;

    @Column(name = "carpeta_xochitepec", columnDefinition = "TEXT")
    private String carpetaXochitepec;

    public enum TipoExpediente {
        MC, SCP, HISTORICO, REGISTRO_HISTORICO, SUSTRAIDO,
        JOJU_SUSTRAIDO, JOJU_PRISION, JOJU_DEFUNCION, JOJU_SOBRESEIMIENTO, JOJU_ARCHIVO, JOJU_CARPETAS_INACTIVAS,
        CUAT_PRISION, CUAT_ESPERA, CUAT_CARPETAS_CERRAR, CUAT_OFICIOS, CUAT_SUSTRAIDO, CUAT_TTA, CUAT_ARCHIVO,
        // Inactivos Xochitepec
        XOCHI_MC_INACTIVA, XOCHI_SCP_INACTIVO, XOCHI_HISTORICO_INACTIVO,
        // Bitácora Cierre de Carpetas (3 zonas)
        CIERRE_CARPETA
    }
    public enum Zona { XOCHITEPEC, CUAUTLA, JOJUTLA }
}
