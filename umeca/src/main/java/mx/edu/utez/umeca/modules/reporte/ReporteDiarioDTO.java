package mx.edu.utez.umeca.modules.reporte;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class ReporteDiarioDTO {

    private LocalDate fecha;

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
}
