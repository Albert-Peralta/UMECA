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

        return dto;
    }
}
