package mx.edu.utez.umeca.modules.medidacautelar;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
public class MedidaCautelarResponseDTO {

    private Long id;
    private Long imputadoId;
    private String nombreImputado;
    private boolean imputadoFallecido;
    private String causaPenal;
    private String causaPenalImputado;
    private String delito;
    private String tipo;
    private Long entrevistaId;
    private String folioEntrevista;
    private String registradoPor;
    private LocalDateTime createdAt;
    private String estado;

    // Datos procesales
    private LocalDate fechaRecepcion;
    private String modalidad;
    private String sede;
    private String nombreJuez;
    private LocalDate fechaFormulacion;
    private LocalDate fechaVinculacionProceso;
    private LocalDate fechaEntrevistaEvaluacion;

    // MC específico
    private LocalDate fechaCanalizacion;
    private Boolean aDisposicion;
    private String descripcionDomicilio;
    private String presentacionPeriodica;
    private String noBiometrico;
    private String noLibro;
    private String noPagina;
    private String cumpliendoIncumpliendo;
    private String distritoJudicial;
    private String descripcionInforme;
    private Boolean acuerdoReparatorio;
    private String descripcionAcuerdo;
    private LocalDate fechaCelebracionAcuerdo;
    private LocalDate fechaCumplimientoAcuerdo;
    private String estatusFinal;
    private LocalDate fechaTermino;

    // SCP específico
    private LocalDate fechaImposicionScp;
    private LocalDate plazoScp;
    private String canalizacion;
    private String tipoServicio;
    private LocalDate fechaInformeFinal;
    private LocalDate vencimientoPlazo;
    private String oficioSobreseimiento;
    private String responsableCierre;

    // Fracciones/condiciones
    private List<String> fracciones;
    private String detallesFracciones;

    // Info adicional
    private String advertencia;
    private String observaciones;
    private String responsableSeguimiento;
    private String observacionesGenerales;
    private LocalDate fechaProximaRevision;
    private LocalDate vigenciaInicio;
    private LocalDate vigenciaFin;

    // Revocación
    private LocalDate fechaRevocacion;
    private String oficioRevocacion;
    private String motivoRevocacion;

    // Ampliación
    private LocalDate fechaAmpliacion;
    private LocalDate nuevoPlazoScp;
    private String motivoAmpliacion;

    // Levantamiento
    private LocalDate fechaLevantamiento;
    private String oficioLevantamiento;
    private String firmaLevantamiento;
    private String motivoLevantamiento;
    private Boolean cumplioLevantamiento;

    // Cambio a SCP
    private Boolean cambiadoAScp;
    private LocalDate fechaCambioScp;

    private List<SeguimientoDTO> seguimientos;

    @Getter
    @Setter
    public static class SeguimientoDTO {
        private Long id;
        private LocalDate fechaSeguimiento;
        private String detalles;
        private String registradoPor;

        public static SeguimientoDTO from(SeguimientoMedida s) {
            SeguimientoDTO dto = new SeguimientoDTO();
            dto.setId(s.getId());
            dto.setFechaSeguimiento(s.getFechaSeguimiento());
            dto.setDetalles(s.getDetalles());
            dto.setRegistradoPor(s.getRegistradoPor() != null
                    ? s.getRegistradoPor().getNombre() + " " + s.getRegistradoPor().getApPaterno()
                    : null);
            return dto;
        }
    }

    public static MedidaCautelarResponseDTO from(MedidaCautelar m) {
        MedidaCautelarResponseDTO dto = new MedidaCautelarResponseDTO();
        dto.setId(m.getId());
        dto.setImputadoId(m.getImputado().getId());
        dto.setNombreImputado(m.getImputado().getNombreCompleto());
        dto.setImputadoFallecido(m.getImputado().isFallecido());
        dto.setCausaPenal(m.getCausaPenal());
        dto.setCausaPenalImputado(m.getImputado().getCausaPenal());
        dto.setDelito(m.getDelito() != null ? m.getDelito() : m.getImputado().getDelito());
        dto.setTipo(m.getTipo().name());
        dto.setEstado(m.getEstado().name());
        dto.setRegistradoPor(m.getRegistradoPor() != null
                ? m.getRegistradoPor().getNombre() + " " + m.getRegistradoPor().getApPaterno()
                : null);
        dto.setCreatedAt(m.getCreatedAt());

        if (m.getEntrevista() != null) {
            dto.setEntrevistaId(m.getEntrevista().getId());
            dto.setFolioEntrevista(m.getEntrevista().getFolio());
        }

        // Datos procesales
        dto.setFechaRecepcion(m.getFechaRecepcion());
        dto.setModalidad(m.getModalidad());
        dto.setSede(m.getSede());
        dto.setNombreJuez(m.getNombreJuez());
        dto.setFechaFormulacion(m.getFechaFormulacion());
        dto.setFechaVinculacionProceso(m.getFechaVinculacionProceso());
        dto.setFechaEntrevistaEvaluacion(m.getFechaEntrevistaEvaluacion());

        // MC específico
        dto.setFechaCanalizacion(m.getFechaCanalizacion());
        dto.setADisposicion(m.getADisposicion());
        dto.setDescripcionDomicilio(m.getDescripcionDomicilio());
        dto.setPresentacionPeriodica(m.getPresentacionPeriodica());
        dto.setNoBiometrico(m.getNoBiometrico());
        dto.setNoLibro(m.getNoLibro());
        dto.setNoPagina(m.getNoPagina());
        dto.setCumpliendoIncumpliendo(m.getCumpliendoIncumpliendo());
        dto.setDistritoJudicial(m.getDistritoJudicial());
        dto.setDescripcionInforme(m.getDescripcionInforme());
        dto.setAcuerdoReparatorio(m.getAcuerdoReparatorio());
        dto.setDescripcionAcuerdo(m.getDescripcionAcuerdo());
        dto.setFechaCelebracionAcuerdo(m.getFechaCelebracionAcuerdo());
        dto.setFechaCumplimientoAcuerdo(m.getFechaCumplimientoAcuerdo());
        dto.setEstatusFinal(m.getEstatusFinal());
        dto.setFechaTermino(m.getFechaTermino());

        // SCP específico
        dto.setFechaImposicionScp(m.getFechaImposicionScp());
        dto.setPlazoScp(m.getPlazoScp());
        dto.setCanalizacion(m.getCanalizacion());
        dto.setTipoServicio(m.getTipoServicio());
        dto.setFechaInformeFinal(m.getFechaInformeFinal());
        dto.setVencimientoPlazo(m.getVencimientoPlazo());
        dto.setOficioSobreseimiento(m.getOficioSobreseimiento());
        dto.setResponsableCierre(m.getResponsableCierre());

        // Fracciones
        dto.setFracciones(m.getFracciones());
        dto.setDetallesFracciones(m.getDetallesFracciones());

        // Info adicional
        dto.setAdvertencia(m.getAdvertencia());
        dto.setObservaciones(m.getObservaciones());
        dto.setResponsableSeguimiento(m.getResponsableSeguimiento());
        dto.setObservacionesGenerales(m.getObservacionesGenerales());
        dto.setFechaProximaRevision(m.getFechaProximaRevision());
        dto.setVigenciaInicio(m.getVigenciaInicio());
        dto.setVigenciaFin(m.getVigenciaFin());

        // Revocación
        dto.setFechaRevocacion(m.getFechaRevocacion());
        dto.setOficioRevocacion(m.getOficioRevocacion());
        dto.setMotivoRevocacion(m.getMotivoRevocacion());

        // Ampliación
        dto.setFechaAmpliacion(m.getFechaAmpliacion());
        dto.setNuevoPlazoScp(m.getNuevoPlazoScp());
        dto.setMotivoAmpliacion(m.getMotivoAmpliacion());

        // Cambio a SCP
        dto.setCambiadoAScp(Boolean.TRUE.equals(m.getCambiadoAScp()));
        dto.setFechaCambioScp(m.getFechaCambioScp());

        // Levantamiento
        dto.setFechaLevantamiento(m.getFechaLevantamiento());
        dto.setOficioLevantamiento(m.getOficioLevantamiento());
        dto.setFirmaLevantamiento(m.getFirmaLevantamiento());
        dto.setMotivoLevantamiento(m.getMotivoLevantamiento());
        dto.setCumplioLevantamiento(m.getCumplioLevantamiento());

        dto.setSeguimientos(m.getSeguimientos().stream().map(SeguimientoDTO::from).toList());
        return dto;
    }
}
