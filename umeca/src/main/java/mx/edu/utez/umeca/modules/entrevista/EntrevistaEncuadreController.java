package mx.edu.utez.umeca.modules.entrevista;

import lombok.RequiredArgsConstructor;
import mx.edu.utez.umeca.kernel.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/entrevistas")
@RequiredArgsConstructor
public class EntrevistaEncuadreController {

    private final EntrevistaEncuadreService service;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR', 'ROLE_SUPERVISION', 'ROLE_EVALUADOR_RIESGO')")
    public ResponseEntity<ApiResponse> findAll() {
        return ResponseEntity.ok(service.findAll());
    }

    /** Buscar entrevistas para pre-llenado de medidas (por nombre o causa penal) */
    @GetMapping("/buscar")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR', 'ROLE_SUPERVISION', 'ROLE_EVALUADOR_RIESGO')")
    public ResponseEntity<ApiResponse> buscar(@RequestParam String q) {
        return ResponseEntity.ok(service.buscar(q));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR', 'ROLE_SUPERVISION', 'ROLE_EVALUADOR_RIESGO')")
    public ResponseEntity<ApiResponse> findById(@PathVariable Long id) {
        ApiResponse res = service.findById(id);
        return res.isOk() ? ResponseEntity.ok(res) : ResponseEntity.status(404).body(res);
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR', 'ROLE_SUPERVISION')")
    public ResponseEntity<ApiResponse> save(@RequestBody EntrevistaEncuadre entrevista) {
        return ResponseEntity.ok(service.save(entrevista));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR', 'ROLE_SUPERVISION')")
    public ResponseEntity<ApiResponse> update(@PathVariable Long id,
                                              @RequestBody EntrevistaEncuadre entrevista) {
        ApiResponse res = service.update(id, entrevista);
        return res.isOk() ? ResponseEntity.ok(res) : ResponseEntity.status(404).body(res);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMINISTRADOR')")
    public ResponseEntity<ApiResponse> delete(@PathVariable Long id) {
        ApiResponse res = service.delete(id);
        return res.isOk() ? ResponseEntity.ok(res) : ResponseEntity.status(404).body(res);
    }
}