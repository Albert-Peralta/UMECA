package mx.edu.utez.umeca.modules.moduloextra;

import lombok.RequiredArgsConstructor;
import mx.edu.utez.umeca.kernel.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/usuarios/{usuarioId}/modulos-extra")
@RequiredArgsConstructor
public class UsuarioModuloExtraController {

    private final UsuarioModuloExtraService service;

    /** Obtiene los módulos extra de un usuario. Solo SUPERADMIN. */
    @GetMapping
    @PreAuthorize("hasAuthority('ROLE_SUPERADMIN')")
    public ResponseEntity<ApiResponse> get(@PathVariable Long usuarioId) {
        return ResponseEntity.ok(service.getByUsuario(usuarioId));
    }

    /** Guarda (reemplaza) los módulos extra de un usuario. Solo SUPERADMIN. */
    @PutMapping
    @PreAuthorize("hasAuthority('ROLE_SUPERADMIN')")
    public ResponseEntity<ApiResponse> guardar(@PathVariable Long usuarioId,
                                               @RequestBody List<UsuarioModuloExtraDTO> dtos) {
        ApiResponse res = service.guardar(usuarioId, dtos);
        return res.isOk() ? ResponseEntity.ok(res) : ResponseEntity.badRequest().body(res);
    }
}
