package mx.edu.utez.umeca.modules.mensaje;

import mx.edu.utez.umeca.kernel.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/mensajes-admin")
public class MensajeAdminController {

    private final MensajeAdminService service;

    public MensajeAdminController(MensajeAdminService service) {
        this.service = service;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPERADMIN','ADMINISTRADOR')")
    public ResponseEntity<ApiResponse> enviar(
            @RequestParam String contenido,
            @RequestParam(required = false, defaultValue = "GENERAL") String zona) {
        return ResponseEntity.ok(service.enviar(contenido, zona));
    }

    @GetMapping("/activo")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse> getActivo() {
        return ResponseEntity.ok(service.getMensajeActivo());
    }

    @GetMapping("/historial")
    @PreAuthorize("hasAnyRole('SUPERADMIN','ADMINISTRADOR')")
    public ResponseEntity<ApiResponse> getHistorial() {
        return ResponseEntity.ok(service.getHistorial());
    }

    @GetMapping("/mis-mensajes")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse> getHistorialPersonal() {
        return ResponseEntity.ok(service.getHistorialPersonal());
    }

    @PatchMapping("/{id}/editar")
    @PreAuthorize("hasAnyRole('SUPERADMIN','ADMINISTRADOR')")
    public ResponseEntity<ApiResponse> editar(
            @PathVariable Long id,
            @RequestParam String contenido) {
        return ResponseEntity.ok(service.editar(id, contenido));
    }

    @PatchMapping("/{id}/desactivar")
    @PreAuthorize("hasAnyRole('SUPERADMIN','ADMINISTRADOR')")
    public ResponseEntity<ApiResponse> desactivar(@PathVariable Long id) {
        return ResponseEntity.ok(service.desactivar(id));
    }

    @PatchMapping("/{id}/activar")
    @PreAuthorize("hasAnyRole('SUPERADMIN','ADMINISTRADOR')")
    public ResponseEntity<ApiResponse> activar(@PathVariable Long id) {
        return ResponseEntity.ok(service.activar(id));
    }
}
