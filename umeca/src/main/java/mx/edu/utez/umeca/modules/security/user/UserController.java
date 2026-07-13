package mx.edu.utez.umeca.modules.security.user;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import mx.edu.utez.umeca.kernel.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping
    @PreAuthorize("hasAuthority('ROLE_ADMINISTRADOR')")
    public ResponseEntity<ApiResponse> findAll() {
        return ResponseEntity.ok(userService.findAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMINISTRADOR')")
    public ResponseEntity<ApiResponse> findById(@PathVariable Long id) {
        ApiResponse response = userService.findById(id);
        return response.isOk()
                ? ResponseEntity.ok(response)
                : ResponseEntity.status(404).body(response);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ROLE_ADMINISTRADOR')")
    public ResponseEntity<ApiResponse> save(@Valid @RequestBody UserRequestDTO dto) {
        ApiResponse response = userService.save(dto.toEntity());
        return response.isOk()
                ? ResponseEntity.ok(response)
                : ResponseEntity.status(400).body(response);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMINISTRADOR')")
    public ResponseEntity<ApiResponse> update(@PathVariable Long id,
                                              @RequestBody UserRequestDTO dto) {
        ApiResponse response = userService.update(id, dto.toEntity());
        return response.isOk()
                ? ResponseEntity.ok(response)
                : ResponseEntity.status(404).body(response);
    }

    @PatchMapping("/{id}/toggle")
    @PreAuthorize("hasAuthority('ROLE_ADMINISTRADOR')")
    public ResponseEntity<ApiResponse> toggle(@PathVariable Long id) {
        ApiResponse response = userService.toggleActivo(id);
        return response.isOk()
                ? ResponseEntity.ok(response)
                : ResponseEntity.status(404).body(response);
    }

    @PatchMapping("/{id}/cambiar-password")
    public ResponseEntity<ApiResponse> cambiarPassword(@PathVariable Long id,
                                                       @RequestBody java.util.Map<String, String> body,
                                                       Authentication auth) {
        String nuevaPassword = body.get("password");
        if (nuevaPassword == null || nuevaPassword.isBlank())
            return ResponseEntity.badRequest().body(new ApiResponse(false, "La contraseña no puede estar vacía"));

        boolean esAdmin = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMINISTRADOR"));

        ApiResponse response = userService.cambiarPassword(id, nuevaPassword, auth.getName(), esAdmin);
        return response.isOk()
                ? ResponseEntity.ok(response)
                : response.getMessage().contains("permiso")
                    ? ResponseEntity.status(403).body(response)
                    : ResponseEntity.status(404).body(response);
    }
}