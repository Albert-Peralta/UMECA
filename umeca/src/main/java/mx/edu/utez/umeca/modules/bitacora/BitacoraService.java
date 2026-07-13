package mx.edu.utez.umeca.modules.bitacora;

import lombok.RequiredArgsConstructor;
import mx.edu.utez.umeca.kernel.ApiResponse;
import mx.edu.utez.umeca.modules.security.user.User;
import mx.edu.utez.umeca.modules.security.user.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class BitacoraService {

    private final BitacoraRepository bitacoraRepository;
    private final UserRepository     userRepository;

    // ── Registro (llamado desde otros servicios) ──────────────────────────────

    /**
     * Registra una entrada en la bitácora.
     * Se ejecuta en una transacción INDEPENDIENTE para que el log no se revierta
     * si la operación principal falla, y viceversa.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void registrar(Bitacora.Entidad entidad, Long entidadId,
                          String entidadNombre, Bitacora.Accion accion,
                          String descripcion) {
        User usuario = usuarioActual();
        Bitacora b = new Bitacora(entidad, entidadId, entidadNombre,
                                  accion, descripcion, usuario);
        bitacoraRepository.save(b);
    }

    // ── Consultas ─────────────────────────────────────────────────────────────

    /** Historial de un registro concreto */
    @Transactional(readOnly = true)
    public ApiResponse historialDeRegistro(String entidad, Long id) {
        Bitacora.Entidad ent;
        try { ent = Bitacora.Entidad.valueOf(entidad.toUpperCase()); }
        catch (IllegalArgumentException e) {
            return new ApiResponse(false, "Entidad inválida: " + entidad);
        }
        List<BitacoraResponseDTO> lista = bitacoraRepository
                .findByEntidadAndEntidadIdOrderByFechaDesc(ent, id)
                .stream().map(BitacoraResponseDTO::from).toList();
        return new ApiResponse(true, "Historial obtenido", lista);
    }

    /** Vista global con filtros opcionales — paginada */
    @Transactional(readOnly = true)
    public ApiResponse buscarGlobal(String entidad, String accion,
                                    Long usuarioId,
                                    LocalDateTime desde, LocalDateTime hasta,
                                    int pagina, int tamano) {
        Bitacora.Entidad ent = null;
        Bitacora.Accion  acc = null;
        try { if (entidad != null && !entidad.isBlank()) ent = Bitacora.Entidad.valueOf(entidad.toUpperCase()); }
        catch (IllegalArgumentException ignored) {}
        try { if (accion  != null && !accion.isBlank())  acc = Bitacora.Accion.valueOf(accion.toUpperCase()); }
        catch (IllegalArgumentException ignored) {}

        var page = bitacoraRepository.buscarGlobal(
                ent, acc, usuarioId, desde, hasta,
                PageRequest.of(pagina, tamano));

        Map<String, Object> resultado = Map.of(
                "contenido",    page.getContent().stream().map(BitacoraResponseDTO::from).toList(),
                "totalPaginas", page.getTotalPages(),
                "totalItems",   page.getTotalElements(),
                "paginaActual", page.getNumber()
        );
        return new ApiResponse(true, "Bitácora obtenida", resultado);
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private User usuarioActual() {
        try {
            String email = SecurityContextHolder.getContext().getAuthentication().getName();
            return userRepository.findByEmail(email).orElse(null);
        } catch (Exception e) {
            return null;
        }
    }
}
