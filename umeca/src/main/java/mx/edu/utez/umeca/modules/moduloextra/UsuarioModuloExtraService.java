package mx.edu.utez.umeca.modules.moduloextra;

import lombok.RequiredArgsConstructor;
import mx.edu.utez.umeca.kernel.ApiResponse;
import mx.edu.utez.umeca.modules.bitacora.Bitacora;
import mx.edu.utez.umeca.modules.bitacora.BitacoraService;
import mx.edu.utez.umeca.modules.security.user.User;
import mx.edu.utez.umeca.modules.security.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UsuarioModuloExtraService {

    private final UsuarioModuloExtraRepository repository;
    private final UserRepository userRepository;
    private final BitacoraService bitacoraService;

    /** Devuelve los módulos extra asignados a un usuario. */
    @Transactional(readOnly = true)
    public ApiResponse getByUsuario(Long usuarioId) {
        List<UsuarioModuloExtraDTO> lista = repository.findByUsuarioId(usuarioId)
                .stream().map(UsuarioModuloExtraDTO::from).toList();
        return new ApiResponse(true, "Módulos obtenidos", lista);
    }

    /**
     * Reemplaza completamente los módulos extra de un usuario.
     * Recibe la lista completa — elimina los que ya no están y guarda los nuevos.
     */
    @Transactional
    public ApiResponse guardar(Long usuarioId, List<UsuarioModuloExtraDTO> dtos) {
        User usuario = userRepository.findById(usuarioId).orElse(null);
        if (usuario == null) return new ApiResponse(false, "Usuario no encontrado");

        // Eliminar todos los actuales — flush fuerza el DELETE en BD antes del INSERT
        repository.deleteByUsuarioId(usuarioId);
        repository.flush();

        List<UsuarioModuloExtra> nuevos = dtos.stream()
                .filter(d -> d.getModulo() != null && !d.getModulo().isBlank())
                .map(d -> {
                    UsuarioModuloExtra e = new UsuarioModuloExtra();
                    e.setUsuario(usuario);
                    e.setModulo(d.getModulo().toUpperCase());
                    e.setPuedeVer(d.isPuedeVer());
                    e.setPuedeCrear(d.isPuedeCrear());
                    e.setPuedeEditar(d.isPuedeEditar());
                    return e;
                }).toList();

        repository.saveAll(nuevos);

        String nombreUsuario = usuario.getNombre() != null ? usuario.getNombre() : usuario.getUsername();
        String descripcion;
        if (nuevos.isEmpty()) {
            descripcion = "Se quitaron todos los permisos de módulos extra al usuario " + nombreUsuario + ".";
        } else {
            String lista = nuevos.stream().map(m -> {
                String label = nombreModulo(m.getModulo());
                java.util.List<String> permisos = new java.util.ArrayList<>();
                if (m.isPuedeVer())    permisos.add("Ver");
                if (m.isPuedeCrear())  permisos.add("Crear");
                if (m.isPuedeEditar()) permisos.add("Editar");
                return label + " (" + String.join(", ", permisos) + ")";
            }).collect(java.util.stream.Collectors.joining("; "));
            descripcion = "Módulos extra asignados a " + nombreUsuario + ": " + lista + ".";
        }
        bitacoraService.registrar(Bitacora.Entidad.MODULOS_EXTRA, usuarioId,
                nombreUsuario, Bitacora.Accion.ASIGNACION, descripcion);

        return new ApiResponse(true, "Módulos actualizados correctamente",
                nuevos.stream().map(UsuarioModuloExtraDTO::from).toList());
    }

    private String nombreModulo(String modulo) {
        return switch (modulo) {
            case "ENTREVISTA"      -> "Entrevista de Encuadre";
            case "MEDIDAS"         -> "Medidas y Suspensiones";
            case "SUPERVISION"     -> "Supervisión";
            case "EVALUACION"      -> "Evaluación de Riesgos";
            case "CONSULTAS"       -> "Consulta de Registros";
            case "SUSPENSION"      -> "Suspensión Condicional";
            case "CORRESPONDENCIA" -> "Correspondencia";
            case "CONTROL_OFICIOS" -> "Control de Oficios";
            case "ESTADISTICAS"    -> "Estadísticas";
            case "EXPEDIENTES"     -> "Expedientes Anteriores";
            default                -> modulo;
        };
    }
}
