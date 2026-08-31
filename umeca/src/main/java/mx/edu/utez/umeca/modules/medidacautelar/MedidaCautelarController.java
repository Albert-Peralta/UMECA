package mx.edu.utez.umeca.modules.medidacautelar;

import lombok.RequiredArgsConstructor;
import mx.edu.utez.umeca.kernel.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/medidas")
@RequiredArgsConstructor
public class MedidaCautelarController {

    private final MedidaCautelarService service;

    // ── Lectura ─────────────────────────────────────────────────────────────
    @GetMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_SUPERADMIN','ROLE_SUPERVISION','ROLE_EVALUADOR_RIESGO')" +
                  " or @moduloChecker.puedeVer(authentication,'MEDIDAS')")
    public ResponseEntity<ApiResponse> findAll(@RequestParam(required = false) String buscar) {
        ApiResponse res = (buscar != null && !buscar.isBlank())
                ? service.buscar(buscar)
                : service.findAll();
        return ResponseEntity.ok(res);
    }

    @GetMapping("/by-imputado/{imputadoId}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_SUPERADMIN','ROLE_SUPERVISION','ROLE_EVALUADOR_RIESGO')" +
                  " or @moduloChecker.puedeVer(authentication,'MEDIDAS')")
    public ResponseEntity<ApiResponse> findByImputado(@PathVariable Long imputadoId) {
        return ResponseEntity.ok(service.findByImputado(imputadoId));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_SUPERADMIN','ROLE_SUPERVISION','ROLE_EVALUADOR_RIESGO')" +
                  " or @moduloChecker.puedeVer(authentication,'MEDIDAS')")
    public ResponseEntity<ApiResponse> findById(@PathVariable Long id) {
        ApiResponse res = service.findById(id);
        return res.isOk() ? ResponseEntity.ok(res) : ResponseEntity.status(404).body(res);
    }

    // ── Escritura ────────────────────────────────────────────────────────────
    @PostMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_SUPERADMIN','ROLE_SUPERVISION')" +
                  " or @moduloChecker.puedeCrear(authentication,'MEDIDAS')")
    public ResponseEntity<ApiResponse> save(@RequestBody MedidaCautelarDTO dto) {
        ApiResponse res = service.save(dto);
        return res.isOk() ? ResponseEntity.ok(res) : ResponseEntity.badRequest().body(res);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_SUPERADMIN','ROLE_SUPERVISION')" +
                  " or @moduloChecker.puedeEditar(authentication,'MEDIDAS')")
    public ResponseEntity<ApiResponse> update(@PathVariable Long id, @RequestBody MedidaCautelarDTO dto) {
        ApiResponse res = service.update(id, dto);
        return res.isOk() ? ResponseEntity.ok(res) : ResponseEntity.badRequest().body(res);
    }

    @PatchMapping("/{id}/estado")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_SUPERADMIN','ROLE_SUPERVISION')" +
                  " or @moduloChecker.puedeEditar(authentication,'MEDIDAS')")
    public ResponseEntity<ApiResponse> cambiarEstado(@PathVariable Long id, @RequestParam String estado) {
        ApiResponse res = service.cambiarEstado(id, estado);
        return res.isOk() ? ResponseEntity.ok(res) : ResponseEntity.badRequest().body(res);
    }

    @PatchMapping("/{id}/observaciones")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_SUPERADMIN','ROLE_SUPERVISION')" +
                  " or @moduloChecker.puedeEditar(authentication,'MEDIDAS')")
    public ResponseEntity<ApiResponse> guardarObservaciones(
            @PathVariable Long id,
            @RequestBody java.util.Map<String, String> body) {
        ApiResponse res = service.guardarObservaciones(id, body != null ? body.get("observaciones") : null);
        return res.isOk() ? ResponseEntity.ok(res) : ResponseEntity.badRequest().body(res);
    }

    @PatchMapping("/{id}/cumplimiento")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_SUPERADMIN','ROLE_SUPERVISION')" +
                  " or @moduloChecker.puedeEditar(authentication,'MEDIDAS')")
    public ResponseEntity<ApiResponse> cambiarCumplimiento(@PathVariable Long id, @RequestParam String valor) {
        ApiResponse res = service.cambiarCumplimiento(id, valor);
        return res.isOk() ? ResponseEntity.ok(res) : ResponseEntity.badRequest().body(res);
    }

    @PatchMapping("/{id}/sobreseimiento")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_SUPERADMIN','ROLE_SUPERVISION')" +
                  " or @moduloChecker.puedeEditar(authentication,'MEDIDAS')")
    public ResponseEntity<ApiResponse> toggleSobreseimiento(@PathVariable Long id, @RequestParam boolean valor) {
        ApiResponse res = service.toggleSobreseimiento(id, valor);
        return res.isOk() ? ResponseEntity.ok(res) : ResponseEntity.badRequest().body(res);
    }

    @PostMapping("/{id}/revocacion")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_SUPERADMIN','ROLE_SUPERVISION')" +
                  " or @moduloChecker.puedeCrear(authentication,'MEDIDAS')")
    public ResponseEntity<ApiResponse> revocacion(@PathVariable Long id, @RequestBody RevocacionDTO dto) {
        ApiResponse res = service.registrarRevocacion(id, dto);
        return res.isOk() ? ResponseEntity.ok(res) : ResponseEntity.badRequest().body(res);
    }

    @PostMapping("/{id}/ampliacion")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_SUPERADMIN','ROLE_SUPERVISION')" +
                  " or @moduloChecker.puedeCrear(authentication,'MEDIDAS')")
    public ResponseEntity<ApiResponse> ampliacion(@PathVariable Long id, @RequestBody AmpliacionDTO dto) {
        ApiResponse res = service.registrarAmpliacion(id, dto);
        return res.isOk() ? ResponseEntity.ok(res) : ResponseEntity.badRequest().body(res);
    }

    @PostMapping("/{id}/levantamiento")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_SUPERADMIN','ROLE_SUPERVISION')" +
                  " or @moduloChecker.puedeCrear(authentication,'MEDIDAS')")
    public ResponseEntity<ApiResponse> levantamiento(@PathVariable Long id, @RequestBody LevantamientoDTO dto) {
        ApiResponse res = service.registrarLevantamiento(id, dto);
        return res.isOk() ? ResponseEntity.ok(res) : ResponseEntity.badRequest().body(res);
    }

    @PostMapping("/{id}/seguimientos")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_SUPERADMIN','ROLE_SUPERVISION')" +
                  " or @moduloChecker.puedeCrear(authentication,'MEDIDAS')")
    public ResponseEntity<ApiResponse> agregarSeguimiento(@PathVariable Long id, @RequestBody SeguimientoMedidaDTO dto) {
        ApiResponse res = service.agregarSeguimiento(id, dto);
        return res.isOk() ? ResponseEntity.ok(res) : ResponseEntity.status(404).body(res);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_SUPERADMIN')")
    public ResponseEntity<ApiResponse> eliminar(@PathVariable Long id) {
        ApiResponse res = service.eliminar(id);
        return res.isOk() ? ResponseEntity.ok(res) : ResponseEntity.status(404).body(res);
    }
}
