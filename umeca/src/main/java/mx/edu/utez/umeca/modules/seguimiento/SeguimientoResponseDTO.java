package mx.edu.utez.umeca.modules.seguimiento;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class SeguimientoResponseDTO {
    private Long id;
    private Long imputadoId;
    private String imputadoNombre;
    private String tipoActividad;
    private String tipoActividadLabel;
    private String seccion;
    private String detalles;
    private LocalDateTime fechaRegistro;
    private String registradoPor;
    private Long medidaId;
    private Long entrevistaId;
    private Long evaluacionId;

    public static SeguimientoResponseDTO from(Seguimiento s) {
        SeguimientoResponseDTO dto = new SeguimientoResponseDTO();
        dto.setId(s.getId());
        if (s.getImputado() != null) {
            dto.setImputadoId(s.getImputado().getId());
            dto.setImputadoNombre(s.getImputado().getNombre() + " " + s.getImputado().getApPaterno());
        }
        dto.setTipoActividad(s.getTipoActividad() != null ? s.getTipoActividad().name() : null);
        dto.setTipoActividadLabel(labelDe(s.getTipoActividad()));
        dto.setSeccion(s.getSeccion() != null ? s.getSeccion().name() : null);
        dto.setDetalles(s.getDetalles());
        dto.setFechaRegistro(s.getFechaRegistro());
        if (s.getRegistradoPor() != null) {
            dto.setRegistradoPor(s.getRegistradoPor().getNombre() + " " + s.getRegistradoPor().getApPaterno());
        }
        dto.setMedidaId(s.getMedidaId());
        dto.setEntrevistaId(s.getEntrevistaId());
        dto.setEvaluacionId(s.getEvaluacionId());
        return dto;
    }

    private static String labelDe(Seguimiento.TipoActividad tipo) {
        if (tipo == null) return "";
        return switch (tipo) {
            case OFICIO_CSP              -> "Oficio emitido de CSP";
            case OFICIO_DIVERSO          -> "Oficio emitido diverso";
            case REPORTE_INCUMPLIMIENTO  -> "Reporte de incumplimiento";
            case REPORTE_NO_PRESENTACION -> "Reporte de no presentación";
            case SOLICITUD_COLABORACION  -> "Solicitud de colaboración";
            case SOLICITUD_INFO_JUEZ     -> "Solicitud de información al Juez";
            case SOLICITUD_INFO_MP       -> "Solicitud de información al M.P.";
            case INFORME_FINAL           -> "Informe final";
            case CANALIZACION            -> "Canalización";
            case VISITA_DOMICILIARIA     -> "Visita domiciliaria";
            case AUDIENCIA_TTA           -> "Audiencia TTA";
            case LLAMADA_TELEFONICA      -> "Llamada telefónica";
            case OFICIO_REGISTRO         -> "Oficio de registro";
            case OPINION_TECNICA_FC      -> "Opinión técnica F.C.";
            case OPINION_TECNICA_FF      -> "Opinión técnica F.F.";
            case NEGACION_FC             -> "Negación F.C.";
            case NEGACION_FF             -> "Negación F.F.";
            case INFORME_FC              -> "Informe F.C.";
            case INFORME_FF              -> "Informe F.F.";
            case EVALUACION_RIESGO_FC    -> "Evaluación de riesgo F.C.";
            case EVALUACION_RIESGO_FF    -> "Evaluación de riesgo F.F.";
            case OTRO                    -> "Otro";
        };
    }
}
