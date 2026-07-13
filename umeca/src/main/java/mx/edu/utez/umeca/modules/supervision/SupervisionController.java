package mx.edu.utez.umeca.modules.supervision;

import lombok.RequiredArgsConstructor;
import mx.edu.utez.umeca.kernel.ApiResponse;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/supervision")
@RequiredArgsConstructor
public class SupervisionController {

    private final SupervisionService service;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_SUPERVISION','ROLE_EVALUADOR_RIESGO')")
    public ResponseEntity<ApiResponse> findAll() {
        return ResponseEntity.ok(service.findAll());
    }

    @GetMapping("/agenda")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_SUPERVISION','ROLE_EVALUADOR_RIESGO')")
    public ResponseEntity<ApiResponse> agenda(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fin) {
        return ResponseEntity.ok(service.findAgenda(inicio, fin));
    }

    @GetMapping("/buscar")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_SUPERVISION','ROLE_EVALUADOR_RIESGO')")
    public ResponseEntity<ApiResponse> buscar(@RequestParam String q) {
        return ResponseEntity.ok(service.buscar(q));
    }

    @GetMapping("/imputado/{imputadoId}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_SUPERVISION','ROLE_EVALUADOR_RIESGO')")
    public ResponseEntity<ApiResponse> porImputado(@PathVariable Long imputadoId) {
        return ResponseEntity.ok(service.findByImputado(imputadoId));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_SUPERVISION','ROLE_EVALUADOR_RIESGO')")
    public ResponseEntity<ApiResponse> findById(@PathVariable Long id) {
        ApiResponse res = service.findById(id);
        return res.isOk() ? ResponseEntity.ok(res) : ResponseEntity.status(404).body(res);
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_SUPERVISION')")
    public ResponseEntity<ApiResponse> save(@RequestBody SupervisionDTO dto) {
        ApiResponse res = service.save(dto);
        return res.isOk() ? ResponseEntity.ok(res) : ResponseEntity.badRequest().body(res);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_SUPERVISION')")
    public ResponseEntity<ApiResponse> update(@PathVariable Long id, @RequestBody SupervisionDTO dto) {
        ApiResponse res = service.update(id, dto);
        return res.isOk() ? ResponseEntity.ok(res) : ResponseEntity.badRequest().body(res);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR')")
    public ResponseEntity<ApiResponse> delete(@PathVariable Long id) {
        ApiResponse res = service.delete(id);
        return res.isOk() ? ResponseEntity.ok(res) : ResponseEntity.status(404).body(res);
    }
}
