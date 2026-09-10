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
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_SUPERADMIN', 'ROLE_SUPERVISION', 'ROLE_EVALUADOR_RIESGO', 'ROLE_CORRESPONDENCIA')")
    public ResponseEntity<ApiResponse> findAll(@RequestParam(required = false) String buscar) {
        ApiResponse res = (buscar != null && !buscar.isBlank())
                ? service.buscar(buscar)
                : service.findAll();
        return ResponseEntity.ok(res);
    }

    /** Devuelve todos los imputados que comparten la misma causa penal. */
    @GetMapping("/por-causa")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_SUPERADMIN', 'ROLE_SUPERVISION', 'ROLE_EVALUADOR_RIESGO', 'ROLE_CORRESPONDENCIA')")
    public ResponseEntity<ApiResponse> findByCausaPenal(@RequestParam String causaPenal) {
        ApiResponse res = service.findByCausaPenal(causaPenal);
        return ResponseEntity.ok(res);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_SUPERADMIN', 'ROLE_SUPERVISION', 'ROLE_EVALUADOR_RIESGO', 'ROLE_CORRESPONDENCIA')")
    public ResponseEntity<ApiResponse> findById(@PathVariable Long id) {
        ApiResponse res = service.findById(id);
        return res.isOk() ? ResponseEntity.ok(res) : ResponseEntity.status(404).body(res);
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_SUPERADMIN', 'ROLE_SUPERVISION')")
    public ResponseEntity<ApiResponse> save(@RequestBody Imputado imputado) {
        ApiResponse res = service.save(imputado);
        return res.isOk() ? ResponseEntity.ok(res) : ResponseEntity.badRequest().body(res);
    }

    @PatchMapping("/{id}/foto")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_SUPERADMIN', 'ROLE_SUPERVISION', 'ROLE_EVALUADOR_RIESGO', 'ROLE_CORRESPONDENCIA')")
    public ResponseEntity<ApiResponse> actualizarFoto(@PathVariable Long id,
                                                      @RequestBody Map<String, String> body) {
        ApiResponse res = service.actualizarFoto(id, body.get("foto"));
        return res.isOk() ? ResponseEntity.ok(res) : ResponseEntity.status(404).body(res);
    }

    @PatchMapping("/{id}/fallecimiento")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_SUPERADMIN', 'ROLE_SUPERVISION')")
    public ResponseEntity<ApiResponse> registrarFallecimiento(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body) {
        LocalDate fecha = null;
        if (body != null && body.get("fechaFallecimiento") != null) {
            try { fecha = LocalDate.parse(body.get("fechaFallecimiento")); }
            catch (Exception ignored) { return ResponseEntity.badRequest().body(new ApiResponse(false, "Formato de fecha inválido")); }
        }
        String quienAviso          = body != null ? body.get("quienAviso") : null;
        String parentesco          = body != null ? body.get("parentescoInformante") : null;
        String comoSeComprobo      = body != null ? body.get("comoSeComprobo") : null;
        String noActa              = body != null ? body.get("noActaDefuncion") : null;
        String observaciones       = body != null ? body.get("observacionesFallecimiento") : null;
        ApiResponse res = service.registrarFallecimiento(id, fecha, quienAviso, parentesco, comoSeComprobo, noActa, observaciones);
        return res.isOk() ? ResponseEntity.ok(res) : ResponseEntity.badRequest().body(res);
    }

    @PatchMapping("/{id}/cierre-carpeta")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_SUPERADMIN', 'ROLE_SUPERVISION')")
    public ResponseEntity<ApiResponse> registrarCierreCarpeta(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body) {
        String motivo              = body != null ? body.get("motivoCierreCarpeta") : null;
        String estatusCumplimiento = body != null ? body.get("estatusCumplimientoCierre") : null;
        String notasCierre         = body != null ? body.get("notasCierre") : null;
        java.time.LocalDate fechaIngreso = null;
        if (body != null && body.get("fechaIngresoCierre") != null && !body.get("fechaIngresoCierre").isBlank()) {
            try { fechaIngreso = java.time.LocalDate.parse(body.get("fechaIngresoCierre")); } catch (Exception ignored) {}
        }
        ApiResponse res = service.registrarCierreCarpeta(id, motivo, estatusCumplimiento, fechaIngreso, notasCierre);
        return res.isOk() ? ResponseEntity.ok(res) : ResponseEntity.badRequest().body(res);
    }

    @PatchMapping("/{id}/revertir-cierre")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_SUPERADMIN')")
    public ResponseEntity<ApiResponse> revertirCierreCarpeta(@PathVariable Long id) {
        ApiResponse res = service.revertirCierreCarpeta(id);
        return res.isOk() ? ResponseEntity.ok(res) : ResponseEntity.badRequest().body(res);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_SUPERADMIN')")
    public ResponseEntity<ApiResponse> eliminar(@PathVariable Long id) {
        ApiResponse res = service.eliminar(id);
        return res.isOk() ? ResponseEntity.ok(res) : ResponseEntity.badRequest().body(res);
    }

    /** Cambia la ubicación física del expediente — accesible a todos los roles. */
    @PatchMapping("/{id}/ubicacion-expediente")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_SUPERADMIN','ROLE_SUPERVISION','ROLE_EVALUADOR_RIESGO','ROLE_CORRESPONDENCIA')")
    public ResponseEntity<ApiResponse> cambiarUbicacionExpediente(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        String estado    = (String) body.get("estado");
        Long   usuarioId = body.get("usuarioId") != null ? Long.valueOf(body.get("usuarioId").toString()) : null;
        ApiResponse res  = service.cambiarUbicacionExpediente(id, estado, usuarioId);
        return res.isOk() ? ResponseEntity.ok(res) : ResponseEntity.badRequest().body(res);
    }

    /** Lista usuarios activos para el selector de asignación — accesible a todos los roles. */
    @GetMapping("/usuarios-activos")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_SUPERADMIN','ROLE_SUPERVISION','ROLE_EVALUADOR_RIESGO','ROLE_CORRESPONDENCIA')")
    public ResponseEntity<ApiResponse> listarUsuariosActivos() {
        return ResponseEntity.ok(service.listarUsuariosActivos());
    }

    /** El usuario asignado confirma que tiene físicamente el expediente. */
    @PatchMapping("/{id}/confirmar-expediente")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_SUPERADMIN','ROLE_SUPERVISION','ROLE_EVALUADOR_RIESGO','ROLE_CORRESPONDENCIA')")
    public ResponseEntity<ApiResponse> confirmarExpediente(
            @PathVariable Long id,
            org.springframework.security.core.Authentication auth) {
        ApiResponse res = service.confirmarExpediente(id, auth.getName());
        return res.isOk() ? ResponseEntity.ok(res) : ResponseEntity.badRequest().body(res);
    }

    /** Devuelve el número de expedientes asignados al usuario actual sin confirmar. */
    @GetMapping("/expedientes-pendientes-count")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_SUPERADMIN','ROLE_SUPERVISION','ROLE_EVALUADOR_RIESGO','ROLE_CORRESPONDENCIA')")
    public ResponseEntity<ApiResponse> expedientesPendientesCount(
            org.springframework.security.core.Authentication auth) {
        return ResponseEntity.ok(service.contarExpedientesPendientes(auth.getName()));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_SUPERADMIN', 'ROLE_SUPERVISION')")
    public ResponseEntity<ApiResponse> update(@PathVariable Long id,
                                              @RequestBody Imputado imputado) {
        ApiResponse res = service.update(id, imputado);
        return res.isOk() ? ResponseEntity.ok(res) : ResponseEntity.status(404).body(res);
    }
}
