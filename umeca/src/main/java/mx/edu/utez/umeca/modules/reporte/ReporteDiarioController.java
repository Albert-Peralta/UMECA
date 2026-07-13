package mx.edu.utez.umeca.modules.reporte;

import lombok.RequiredArgsConstructor;
import mx.edu.utez.umeca.kernel.ApiResponse;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;

@RestController
@RequestMapping("/api/reportes-diarios")
@RequiredArgsConstructor
public class ReporteDiarioController {

    private final ReporteDiarioService service;

    /** Guardar o actualizar el reporte del usuario autenticado */
    @PostMapping
    @PreAuthorize("hasAnyRole('SUPERVISION','EVALUADOR_RIESGO','ADMINISTRADOR')")
    public ResponseEntity<ApiResponse> guardar(@RequestBody ReporteDiarioDTO dto) {
        return ResponseEntity.ok(service.guardar(dto));
    }

    /** Reporte de hoy del usuario actual (para pre-llenar el formulario) */
    @GetMapping("/mi-reporte-hoy")
    @PreAuthorize("hasAnyRole('SUPERVISION','EVALUADOR_RIESGO','ADMINISTRADOR')")
    public ResponseEntity<ApiResponse> getMiReporteHoy() {
        return ResponseEntity.ok(service.getMiReporteHoy());
    }

    /** Reporte de una fecha específica del usuario actual */
    @GetMapping("/mi-reporte")
    @PreAuthorize("hasAnyRole('SUPERVISION','EVALUADOR_RIESGO','ADMINISTRADOR')")
    public ResponseEntity<ApiResponse> getMiReportePorFecha(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha) {
        return ResponseEntity.ok(service.getMiReportePorFecha(fecha));
    }

    /** Lista de reportes individuales por rango de fechas */
    @GetMapping
    @PreAuthorize("hasAnyRole('SUPERVISION','EVALUADOR_RIESGO','ADMINISTRADOR')")
    public ResponseEntity<ApiResponse> getLista(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fin) {

        LocalDate desde = inicio != null ? inicio : LocalDate.now();
        LocalDate hasta = fin     != null ? fin     : LocalDate.now();
        return ResponseEntity.ok(service.getLista(desde, hasta));
    }

    /** Consolidado por zona para la tabla resumen */
    @GetMapping("/consolidado")
    @PreAuthorize("hasAnyRole('SUPERVISION','EVALUADOR_RIESGO','ADMINISTRADOR')")
    public ResponseEntity<ApiResponse> getConsolidado(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fin) {

        LocalDate desde = inicio != null ? inicio : LocalDate.now();
        LocalDate hasta = fin     != null ? fin     : LocalDate.now();
        return ResponseEntity.ok(service.getConsolidado(desde, hasta));
    }

    /** Cumplimiento: quién entregó su reporte en el período */
    @GetMapping("/cumplimiento")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<ApiResponse> getCumplimiento(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fin) {
        LocalDate desde = inicio != null ? inicio : LocalDate.now();
        LocalDate hasta = fin     != null ? fin     : LocalDate.now();
        return ResponseEntity.ok(service.getCumplimiento(desde, hasta));
    }

    /** Semana actual: lunes a hoy */
    @GetMapping("/semana-actual")
    @PreAuthorize("hasAnyRole('SUPERVISION','EVALUADOR_RIESGO','ADMINISTRADOR')")
    public ResponseEntity<ApiResponse> getSemanaActual() {
        LocalDate hoy   = LocalDate.now();
        LocalDate lunes = hoy.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        return ResponseEntity.ok(service.getConsolidado(lunes, hoy));
    }
}
