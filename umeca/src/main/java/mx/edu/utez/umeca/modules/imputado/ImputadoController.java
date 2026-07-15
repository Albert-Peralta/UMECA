package mx.edu.utez.umeca.modules.imputado;

import lombok.RequiredArgsConstructor;
import mx.edu.utez.umeca.kernel.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/imputados")
@RequiredArgsConstructor
public class ImputadoController {

    private final ImputadoService service;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR', 'ROLE_SUPERVISION', 'ROLE_EVALUADOR_RIESGO')")
    public ResponseEntity<ApiResponse> findAll(@RequestParam(required = false) String buscar) {
        ApiResponse res = (buscar != null && !buscar.isBlank())
                ? service.buscar(buscar)
                : service.findAll();
        return ResponseEntity.ok(res);
    }

    /** Devuelve todos los imputados que comparten la misma causa penal. */
    @GetMapping("/por-causa")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR', 'ROLE_SUPERVISION', 'ROLE_EVALUADOR_RIESGO')")
    public ResponseEntity<ApiResponse> findByCausaPenal(@RequestParam String causaPenal) {
        ApiResponse res = service.findByCausaPenal(causaPenal);
        return ResponseEntity.ok(res);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR', 'ROLE_SUPERVISION', 'ROLE_EVALUADOR_RIESGO')")
    public ResponseEntity<ApiResponse> findById(@PathVariable Long id) {
        ApiResponse res = service.findById(id);
        return res.isOk() ? ResponseEntity.ok(res) : ResponseEntity.status(404).body(res);
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR', 'ROLE_SUPERVISION')")
    public ResponseEntity<ApiResponse> save(@RequestBody Imputado imputado) {
        ApiResponse res = service.save(imputado);
        return res.isOk() ? ResponseEntity.ok(res) : ResponseEntity.badRequest().body(res);
    }

    @PatchMapping("/{id}/foto")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR', 'ROLE_SUPERVISION')")
    public ResponseEntity<ApiResponse> actualizarFoto(@PathVariable Long id,
                                                      @RequestBody Map<String, String> body) {
        ApiResponse res = service.actualizarFoto(id, body.get("foto"));
        return res.isOk() ? ResponseEntity.ok(res) : ResponseEntity.status(404).body(res);
    }

    @PatchMapping("/{id}/fallecimiento")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR', 'ROLE_SUPERVISION')")
    public ResponseEntity<ApiResponse> registrarFallecimiento(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body) {
        LocalDate fecha = null;
        if (body != null && body.get("fechaFallecimiento") != null) {
            fecha = LocalDate.parse(body.get("fechaFallecimiento"));
        }
        String quienAviso          = body != null ? body.get("quienAviso") : null;
        String parentesco          = body != null ? body.get("parentescoInformante") : null;
        String comoSeComprobo      = body != null ? body.get("comoSeComprobo") : null;
        String noActa              = body != null ? body.get("noActaDefuncion") : null;
        String observaciones       = body != null ? body.get("observacionesFallecimiento") : null;
        ApiResponse res = service.registrarFallecimiento(id, fecha, quienAviso, parentesco, comoSeComprobo, noActa, observaciones);
        return res.isOk() ? ResponseEntity.ok(res) : ResponseEntity.badRequest().body(res);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR', 'ROLE_SUPERVISION')")
    public ResponseEntity<ApiResponse> update(@PathVariable Long id,
                                              @RequestBody Imputado imputado) {
        ApiResponse res = service.update(id, imputado);
        return res.isOk() ? ResponseEntity.ok(res) : ResponseEntity.status(404).body(res);
    }
}
