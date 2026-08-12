package mx.edu.utez.umeca.modules.seguimiento;

import lombok.RequiredArgsConstructor;
import mx.edu.utez.umeca.kernel.ApiResponse;
import mx.edu.utez.umeca.modules.bitacora.Bitacora;
import mx.edu.utez.umeca.modules.bitacora.BitacoraService;
import mx.edu.utez.umeca.modules.imputado.Imputado;
import mx.edu.utez.umeca.modules.imputado.ImputadoRepository;
import mx.edu.utez.umeca.modules.security.user.User;
import mx.edu.utez.umeca.modules.security.user.UserRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SeguimientoService {

    private final SeguimientoRepository repository;
    private final ImputadoRepository    imputadoRepository;
    private final UserRepository        userRepository;
    private final BitacoraService       bitacoraService;

    private User usuarioActual() {
        String id = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(id)
                .or(() -> userRepository.findByEmail(id))
                .orElseThrow();
    }

    // ── Registrar seguimiento ─────────────────────────────────────────────────
    @Transactional
    public ApiResponse registrar(SeguimientoDTO dto) {
        if (dto.getImputadoId() == null)
            return new ApiResponse(false, "Se requiere el imputado");

        Imputado imputado = imputadoRepository.findById(dto.getImputadoId())
                .orElse(null);
        if (imputado == null)
            return new ApiResponse(false, "Imputado no encontrado");

        Seguimiento.TipoActividad tipo;
        try {
            tipo = Seguimiento.TipoActividad.valueOf(dto.getTipoActividad());
        } catch (Exception e) {
            return new ApiResponse(false, "Tipo de actividad inválido");
        }

        Seguimiento.Seccion seccion;
        try {
            seccion = Seguimiento.Seccion.valueOf(dto.getSeccion());
        } catch (Exception e) {
            seccion = Seguimiento.Seccion.EXPEDIENTE;
        }

        User usuario = usuarioActual();
        Seguimiento seg = new Seguimiento();
        seg.setImputado(imputado);
        seg.setTipoActividad(tipo);
        seg.setSeccion(seccion);
        seg.setDetalles(dto.getDetalles());
        seg.setFechaRegistro(LocalDateTime.now());
        seg.setRegistradoPor(usuario);
        seg.setMedidaId(dto.getMedidaId());
        seg.setEntrevistaId(dto.getEntrevistaId());
        seg.setEvaluacionId(dto.getEvaluacionId());

        repository.save(seg);

        String nombreImputado = imputado.getNombre() + " " + imputado.getApPaterno();
        bitacoraService.registrar(
            Bitacora.Entidad.IMPUTADO, imputado.getId(), nombreImputado,
            Bitacora.Accion.EDITAR,
            "Seguimiento registrado — sección: " + seccion.name() + " | tipo: " + SeguimientoResponseDTO.from(seg).getTipoActividadLabel()
        );

        return new ApiResponse(true, "Seguimiento registrado", SeguimientoResponseDTO.from(seg));
    }

    // ── Obtener todos los seguimientos de un imputado ─────────────────────────
    @Transactional(readOnly = true)
    public ApiResponse getPorImputado(Long imputadoId) {
        List<SeguimientoResponseDTO> lista = repository
                .findByImputadoIdOrderByFechaRegistroDesc(imputadoId)
                .stream().map(SeguimientoResponseDTO::from)
                .collect(Collectors.toList());
        return new ApiResponse(true, "ok", lista);
    }

    // ── Obtener seguimientos por medida ───────────────────────────────────────
    @Transactional(readOnly = true)
    public ApiResponse getPorMedida(Long medidaId) {
        List<SeguimientoResponseDTO> lista = repository
                .findByMedidaIdOrderByFechaRegistroDesc(medidaId)
                .stream().map(SeguimientoResponseDTO::from)
                .collect(Collectors.toList());
        return new ApiResponse(true, "ok", lista);
    }

    // ── Obtener seguimientos por entrevista ───────────────────────────────────
    @Transactional(readOnly = true)
    public ApiResponse getPorEntrevista(Long entrevistaId) {
        List<SeguimientoResponseDTO> lista = repository
                .findByEntrevistaIdOrderByFechaRegistroDesc(entrevistaId)
                .stream().map(SeguimientoResponseDTO::from)
                .collect(Collectors.toList());
        return new ApiResponse(true, "ok", lista);
    }

    // ── Obtener seguimientos por evaluacion ───────────────────────────────────
    @Transactional(readOnly = true)
    public ApiResponse getPorEvaluacion(Long evaluacionId) {
        List<SeguimientoResponseDTO> lista = repository
                .findByEvaluacionIdOrderByFechaRegistroDesc(evaluacionId)
                .stream().map(SeguimientoResponseDTO::from)
                .collect(Collectors.toList());
        return new ApiResponse(true, "ok", lista);
    }

    // ── Calcular reporte diario automático por zona (vista propia) ───────────
    @Transactional(readOnly = true)
    public ApiResponse getReporteAutomatico(LocalDate fecha, User.Zona zona) {
        User usuario = usuarioActual();
        LocalDateTime inicio = fecha.atStartOfDay();
        LocalDateTime fin    = fecha.plusDays(1).atStartOfDay();

        List<Seguimiento> segs = repository.findByZonaYRangoYUsuario(zona, inicio, fin, usuario.getId());

        Map<String, Long> conteo = segs.stream()
                .collect(Collectors.groupingBy(
                        s -> s.getTipoActividad().name(),
                        Collectors.counting()
                ));

        return new ApiResponse(true, "ok", conteo);
    }

    // ── Reporte consolidado para admin: todos los seguimientos en un rango ────
    // Devuelve Map<zona, Map<tipoActividad, count>>
    // Si el usuario no tiene zona asignada, se agrupa bajo "SIN_ZONA"
    @Transactional(readOnly = true)
    public ApiResponse getReporteConsolidado(LocalDate desde, LocalDate hasta) {
        LocalDateTime inicio = desde.atStartOfDay();
        LocalDateTime fin    = hasta.plusDays(1).atStartOfDay();

        List<Seguimiento> segs = repository.findByRango(inicio, fin);

        Map<String, Map<String, Long>> resultado = new java.util.HashMap<>();

        for (Seguimiento s : segs) {
            String zona = s.getRegistradoPor() != null && s.getRegistradoPor().getZona() != null
                    ? s.getRegistradoPor().getZona().name()
                    : "SIN_ZONA";
            String tipo = s.getTipoActividad().name();
            resultado.computeIfAbsent(zona, k -> new java.util.HashMap<>())
                     .merge(tipo, 1L, Long::sum);
        }

        return new ApiResponse(true, "ok", resultado);
    }

    // ── Historial detallado por usuario agrupado por zona ────────────────────
    // Devuelve Map<zona, Map<nombreUsuario, List<SeguimientoResponseDTO>>>
    @Transactional(readOnly = true)
    public ApiResponse getHistorialPorUsuario(LocalDate desde, LocalDate hasta) {
        LocalDateTime inicio = desde.atStartOfDay();
        LocalDateTime fin    = hasta.plusDays(1).atStartOfDay();

        List<Seguimiento> segs = repository.findHistorialPorUsuario(inicio, fin);

        // Agrupar: zona → usuario → lista de seguimientos
        Map<String, Map<String, List<SeguimientoResponseDTO>>> resultado = new java.util.LinkedHashMap<>();

        for (Seguimiento s : segs) {
            String zona = (s.getRegistradoPor() != null && s.getRegistradoPor().getZona() != null)
                    ? s.getRegistradoPor().getZona().name()
                    : "SIN_ZONA";
            String usuario = s.getRegistradoPor() != null
                    ? s.getRegistradoPor().getNombre() + " " + s.getRegistradoPor().getApPaterno()
                    : "Sin usuario";
            resultado
                .computeIfAbsent(zona, k -> new java.util.LinkedHashMap<>())
                .computeIfAbsent(usuario, k -> new java.util.ArrayList<>())
                .add(SeguimientoResponseDTO.from(s));
        }

        return new ApiResponse(true, "ok", resultado);
    }
}
