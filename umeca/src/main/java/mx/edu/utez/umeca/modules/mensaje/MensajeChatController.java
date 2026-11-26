package mx.edu.utez.umeca.modules.mensaje;

import mx.edu.utez.umeca.kernel.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/chat")
public class MensajeChatController {

    private final MensajeChatService service;

    public MensajeChatController(MensajeChatService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse> enviar(@RequestParam String contenido) {
        return ResponseEntity.ok(service.enviar(contenido));
    }

    @GetMapping("/no-leidos")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse> getNoLeidos() {
        return ResponseEntity.ok(service.getNoLeidos());
    }

    @PostMapping("/marcar-visto")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse> marcarVisto() {
        return ResponseEntity.ok(service.marcarVisto());
    }
}
