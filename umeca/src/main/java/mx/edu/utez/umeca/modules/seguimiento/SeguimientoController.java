package mx.edu.utez.umeca.modules.seguimiento;

import lombok.RequiredArgsConstructor;
import mx.edu.utez.umeca.kernel.ApiResponse;
import mx.edu.utez.umeca.modules.security.user.User;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/seguimientos")
@RequiredArgsConstructor
public class SeguimientoController {

    private final SeguimientoService service;

    // Registrar seguimiento (desde cualquier sección)
    @PostMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_SUPERADMIN','ROLE_SUPERVISION','ROLE_EVALUADOR_RIESGO')")
    public ResponseEntity<ApiResponse> registrar(@RequestBody SeguimientoDTO dto) {
        ApiResponse res = service.registrar(dto);
        return res.isOk() ? ResponseEntity.ok(res) : ResponseEntity.badRequest().body(res);
    }

    // Todos los seguimientos de un imputado (para expediente)
    @GetMapping("/imputado/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_SUPERADMIN','ROLE_SUPERVISION','ROLE_EVALUADOR_RIESGO','ROLE_CORRESPONDENCIA')")
    public ResponseEntity<ApiResponse> porImputado(@PathVariable Long id) {
        return ResponseEntity.ok(service.getPorImputado(id));
    }

    // Seguimientos de una medida
    @GetMapping("/medida/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_SUPERADMIN','ROLE_SUPERVISION','ROLE_EVALUADOR_RIESGO')")
    public ResponseEntity<ApiResponse> porMedida(@PathVariable Long id) {
        return ResponseEntity.ok(service.getPorMedida(id));
    }

    // Seguimientos de una entrevista
    @GetMapping("/entrevista/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_SUPERADMIN','ROLE_SUPERVISION','ROLE_EVALUADOR_RIESGO')")
    public ResponseEntity<ApiResponse> porEntrevista(@PathVariable Long id) {
        return ResponseEntity.ok(service.getPorEntrevista(id));
    }

    // Seguimientos de una evaluación
    @GetMapping("/evaluacion/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_SUPERADMIN','ROLE_SUPERVISION','ROLE_EVALUADOR_RIESGO')")
    public ResponseEntity<ApiResponse> porEvaluacion(@PathVariable Long id) {
        return ResponseEntity.ok(service.getPorEvaluacion(id));
    }

    // Reporte automático por fecha y zona (vista propia del usuario)
    @GetMapping("/reporte-automatico")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_SUPERADMIN','ROLE_SUPERVISION','ROLE_EVALUADOR_RIESGO','ROLE_CORRESPONDENCIA')")
    public ResponseEntity<ApiResponse> reporteAutomatico(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha,
            @RequestParam User.Zona zona) {
        return ResponseEntity.ok(service.getReporteAutomatico(fecha, zona));
    }

    // Reporte consolidado por zona para el admin (rango de fechas)
    @GetMapping("/reporte-consolidado")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_SUPERADMIN','ROLE_CORRESPONDENCIA') or @moduloChecker.puedeVer(authentication,'ESTADISTICAS')")
    public ResponseEntity<ApiResponse> reporteConsolidado(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {
        return ResponseEntity.ok(service.getReporteConsolidado(desde, hasta));
    }

    // Historial detallado de seguimientos agrupado por usuario y zona
    @GetMapping("/historial-por-usuario")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_SUPERADMIN','ROLE_CORRESPONDENCIA')")
    public ResponseEntity<ApiResponse> historialPorUsuario(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {
        return ResponseEntity.ok(service.getHistorialPorUsuario(desde, hasta));
    }
}
