package mx.edu.utez.umeca.modules.moduloextra;

import lombok.RequiredArgsConstructor;
import mx.edu.utez.umeca.kernel.ApiResponse;
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

        // Eliminar todos los actuales y reemplazar
        repository.deleteByUsuarioId(usuarioId);

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
        return new ApiResponse(true, "Módulos actualizados correctamente",
                nuevos.stream().map(UsuarioModuloExtraDTO::from).toList());
    }
}
