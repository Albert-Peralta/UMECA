package mx.edu.utez.umeca.modules.reporte;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class ReporteDiarioResponseDTO {

    private Long id;
    private LocalDate fecha;
    private String zona;
    private String usuarioNombre;

    // Generales
    private int firmasRecabadas;
    private int nuevosCasosMC;
    private int nuevosCasosSCP;
    private int entrevistasEncuadre;
    private int totalOficiosRecibidos;

    // Supervisión
    private int oficiosEmitidosCSP;
    private int oficiosEmitidosDiversos;
    private int reportesIncumplimiento;
    private int reportesNoPresentacion;
    private int solicitudesColaboracion;
    private int solicitudesInfoJuez;
    private int solicitudesInfoMP;
    private int informeFinal;
    private int canalizaciones;
    private int visitasDomiciliarias;
    private int audienciasTTA;
    private int llamadasTelefonicas;

    // Evaluación
    private int oficiosRegistros;
    private int evaluacionRiesgoFC;
    private int evaluacionRiesgoFF;
    private int opinionTecnicaFC;
    private int opinionTecnicaFF;
    private int negacionesFC;
    private int negacionesFF;
    private int informesFC;
    private int informesFF;

    // Adicional
    private int llamadasTelEvaluacion;
    private int sobreseimientos;
    private int cierreCarpetas;
    private int levantamientoMedida;

    // Manuales SUPERVISIÓN
    private int firmasRecabadasSuper;
    private int entrevistaEncuadreSuper;
    private int calendarioSuper;
    private int capturaCarpetas;
    private int capturaOficiosImposicion;

    // Manuales EVALUACIÓN
    private int firmasRecabadasEval;
    private int entrevistaEncuadreEval;
    private int entrevistaEvaluacionEval;
    private int calendarioEval;
    private int capturaCarpetasEval;
    private int capturaOficiosImposicionEval;

    // Manuales CORRESPONDENCIA
    private int oficiosDiversosCorr;
    private int firmasRecabadasCorr;
    private int entrevistaEncuadreCorr;
    private int calendarioCorr;
    private int capturaCarpetasCorr;
    private int capturaOficiosImposicionCorr;

    public static ReporteDiarioResponseDTO from(ReporteDiario r) {
        ReporteDiarioResponseDTO dto = new ReporteDiarioResponseDTO();
        dto.setId(r.getId());
        dto.setFecha(r.getFecha());
        dto.setZona(r.getZona().name());
        dto.setUsuarioNombre(r.getUsuario().getNombre() + " " + r.getUsuario().getApPaterno());

        dto.setFirmasRecabadas(r.getFirmasRecabadas());
        dto.setNuevosCasosMC(r.getNuevosCasosMC());
        dto.setNuevosCasosSCP(r.getNuevosCasosSCP());
        dto.setEntrevistasEncuadre(r.getEntrevistasEncuadre());
        dto.setTotalOficiosRecibidos(r.getTotalOficiosRecibidos());

        dto.setOficiosEmitidosCSP(r.getOficiosEmitidosCSP());
        dto.setOficiosEmitidosDiversos(r.getOficiosEmitidosDiversos());
        dto.setReportesIncumplimiento(r.getReportesIncumplimiento());
        dto.setReportesNoPresentacion(r.getReportesNoPresentacion());
        dto.setSolicitudesColaboracion(r.getSolicitudesColaboracion());
        dto.setSolicitudesInfoJuez(r.getSolicitudesInfoJuez());
        dto.setSolicitudesInfoMP(r.getSolicitudesInfoMP());
        dto.setInformeFinal(r.getInformeFinal());
        dto.setCanalizaciones(r.getCanalizaciones());
        dto.setVisitasDomiciliarias(r.getVisitasDomiciliarias());
        dto.setAudienciasTTA(r.getAudienciasTTA());
        dto.setLlamadasTelefonicas(r.getLlamadasTelefonicas());

        dto.setOficiosRegistros(r.getOficiosRegistros());
        dto.setEvaluacionRiesgoFC(r.getEvaluacionRiesgoFC());
        dto.setEvaluacionRiesgoFF(r.getEvaluacionRiesgoFF());
        dto.setOpinionTecnicaFC(r.getOpinionTecnicaFC());
        dto.setOpinionTecnicaFF(r.getOpinionTecnicaFF());
        dto.setNegacionesFC(r.getNegacionesFC());
        dto.setNegacionesFF(r.getNegacionesFF());
        dto.setInformesFC(r.getInformesFC());
        dto.setInformesFF(r.getInformesFF());

        dto.setLlamadasTelEvaluacion(r.getLlamadasTelEvaluacion());
        dto.setSobreseimientos(r.getSobreseimientos());
        dto.setCierreCarpetas(r.getCierreCarpetas());
        dto.setLevantamientoMedida(r.getLevantamientoMedida());

        dto.setFirmasRecabadasSuper(r.getFirmasRecabadasSuper());
        dto.setEntrevistaEncuadreSuper(r.getEntrevistaEncuadreSuper());
        dto.setCalendarioSuper(r.getCalendarioSuper());
        dto.setCapturaCarpetas(r.getCapturaCarpetas());
        dto.setCapturaOficiosImposicion(r.getCapturaOficiosImposicion());
        dto.setFirmasRecabadasEval(r.getFirmasRecabadasEval());
        dto.setEntrevistaEncuadreEval(r.getEntrevistaEncuadreEval());
        dto.setEntrevistaEvaluacionEval(r.getEntrevistaEvaluacionEval());
        dto.setCalendarioEval(r.getCalendarioEval());
        dto.setCapturaCarpetasEval(r.getCapturaCarpetasEval());
        dto.setCapturaOficiosImposicionEval(r.getCapturaOficiosImposicionEval());
        dto.setOficiosDiversosCorr(r.getOficiosDiversosCorr());
        dto.setFirmasRecabadasCorr(r.getFirmasRecabadasCorr());
        dto.setEntrevistaEncuadreCorr(r.getEntrevistaEncuadreCorr());
        dto.setCalendarioCorr(r.getCalendarioCorr());
        dto.setCapturaCarpetasCorr(r.getCapturaCarpetasCorr());
        dto.setCapturaOficiosImposicionCorr(r.getCapturaOficiosImposicionCorr());

        return dto;
    }
}
