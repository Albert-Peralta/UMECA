package mx.edu.utez.umeca.modules.imputado;

import lombok.Getter;
import lombok.Setter;
import mx.edu.utez.umeca.modules.entrevista.EntrevistaEncuadre;
import mx.edu.utez.umeca.modules.evaluacion.EvaluacionRiesgo;
import mx.edu.utez.umeca.modules.medidacautelar.MedidaCautelar;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
public class ImputadoResponseDTO {

    private Long id;
    private String nombre;
    private String apPaterno;
    private String apMaterno;
    private String nombreCompleto;
    private String causaPenal;
    private String delito;
    private String ubicacionFisica;
    private String foto;
    private LocalDateTime createdAt;
    private int totalEntrevistas;
    private int totalEvaluaciones;
    private String celular;  // teléfono de la última entrevista
    private boolean fallecido;
    private LocalDate fechaFallecimiento;
    private String tipoMedidaActiva;   // null = sin medida, "MEDIDA_CAUTELAR" | "SUSPENSION_CONDICIONAL"
    private String estadoMedidaActiva; // "ACTIVO" | "LEVANTADO" | "FINALIZADO" | etc.

    // Resúmenes relacionados
    private List<EntrevistaResumen> entrevistas;
    private List<EvaluacionResumen> evaluaciones;
    private List<MedidaResumen>     medidas;

    // ── Constructores de resúmenes ────────────────────

    @Getter
    @Setter
    public static class EntrevistaResumen {
        private Long id;
        private String folio;
        private LocalDate fechaRegistro;
        private String estado;
        private String tipoSeguimiento;
        private String registradoPor;

        public static EntrevistaResumen from(EntrevistaEncuadre e) {
            EntrevistaResumen r = new EntrevistaResumen();
            r.setId(e.getId());
            r.setFolio(e.getFolio());
            r.setFechaRegistro(e.getFechaRegistro());
            r.setEstado(e.getEstado().name());
            r.setTipoSeguimiento(e.getTipoSeguimiento() != null ? e.getTipoSeguimiento().name() : null);
            r.setRegistradoPor(e.getRegistradoPor() != null
                    ? e.getRegistradoPor().getNombre() + " " + e.getRegistradoPor().getApPaterno()
                    : null);
            return r;
        }
    }

    @Getter
    @Setter
    public static class EvaluacionResumen {
        private Long id;
        private LocalDate fechaSolicitud;
        private String estatus;
        private String resultado;
        private String evaluador;

        public static EvaluacionResumen from(EvaluacionRiesgo e) {
            EvaluacionResumen r = new EvaluacionResumen();
            r.setId(e.getId());
            r.setFechaSolicitud(e.getFechaSolicitud());
            r.setEstatus(e.getEstatus().name());
            r.setResultado(e.getResultado() != null ? e.getResultado().name() : null);
            r.setEvaluador(e.getEvaluador() != null
                    ? e.getEvaluador().getNombre() + " " + e.getEvaluador().getApPaterno()
                    : null);
            return r;
        }
    }

    @Getter
    @Setter
    public static class MedidaResumen {
        private Long id;
        private String tipo;
        private String estado;
        private LocalDate fechaRecepcion;
        private LocalDate fechaTermino;

        public static MedidaResumen from(MedidaCautelar m) {
            MedidaResumen r = new MedidaResumen();
            r.setId(m.getId());
            r.setTipo(m.getTipo() != null ? m.getTipo().name() : null);
            r.setEstado(m.getEstado() != null ? m.getEstado().name() : null);
            r.setFechaRecepcion(m.getFechaRecepcion());
            r.setFechaTermino(m.getFechaTermino());
            return r;
        }
    }

    public static ImputadoResponseDTO from(Imputado i,
                                           List<EntrevistaEncuadre> entrevistas,
                                           List<EvaluacionRiesgo> evaluaciones,
                                           List<MedidaCautelar> medidas) {
        ImputadoResponseDTO dto = new ImputadoResponseDTO();
        dto.setId(i.getId());
        dto.setNombre(i.getNombre());
        dto.setApPaterno(i.getApPaterno());
        dto.setApMaterno(i.getApMaterno());
        dto.setNombreCompleto(i.getNombreCompleto());
        dto.setCausaPenal(i.getCausaPenal());
        dto.setDelito(i.getDelito());
        dto.setUbicacionFisica(i.getUbicacionFisica() != null ? i.getUbicacionFisica().name() : null);
        dto.setFoto(i.getFoto());
        dto.setCreatedAt(i.getCreatedAt());
        dto.setFallecido(i.isFallecido());
        dto.setFechaFallecimiento(i.getFechaFallecimiento());
        dto.setEntrevistas(entrevistas.stream().map(EntrevistaResumen::from).toList());
        dto.setEvaluaciones(evaluaciones.stream().map(EvaluacionResumen::from).toList());
        dto.setMedidas(medidas.stream().map(MedidaResumen::from).toList());
        return dto;
    }

    /** Versión sin relaciones para la lista general */
    public static ImputadoResponseDTO fromSimple(Imputado i) {
        ImputadoResponseDTO dto = new ImputadoResponseDTO();
        dto.setId(i.getId());
        dto.setNombre(i.getNombre());
        dto.setApPaterno(i.getApPaterno());
        dto.setApMaterno(i.getApMaterno());
        dto.setNombreCompleto(i.getNombreCompleto());
        dto.setCausaPenal(i.getCausaPenal());
        dto.setDelito(i.getDelito());
        dto.setUbicacionFisica(i.getUbicacionFisica() != null ? i.getUbicacionFisica().name() : null);
        dto.setFoto(i.getFoto());
        dto.setCreatedAt(i.getCreatedAt());
        dto.setFallecido(i.isFallecido());
        dto.setFechaFallecimiento(i.getFechaFallecimiento());
        return dto;
    }
}
