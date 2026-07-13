package mx.edu.utez.umeca.modules.estadisticas;

import lombok.RequiredArgsConstructor;
import mx.edu.utez.umeca.kernel.ApiResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/estadisticas")
@RequiredArgsConstructor
public class EstadisticasController {

    private final EstadisticasService service;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','SUPERVISION','EVALUADOR_RIESGO')")
    public ResponseEntity<ApiResponse> getEstadisticas(
            @RequestParam(defaultValue = "0") int anio,
            @RequestParam(defaultValue = "0") int mes,
            @RequestParam(defaultValue = "0") int semana) {
        return ResponseEntity.ok(service.getEstadisticas(anio, mes, semana));
    }

    @GetMapping("/exportar")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','SUPERVISION','EVALUADOR_RIESGO')")
    public ResponseEntity<byte[]> exportarExcel(
            @RequestParam(defaultValue = "0") int anio,
            @RequestParam(defaultValue = "0") int mes) throws Exception {
        byte[] excel = service.exportarExcel(anio, mes);
        String nombre = "estadisticas_" + (anio > 0 ? anio : "todos") + (mes > 0 ? "_mes" + mes : "") + ".xlsx";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + nombre + "\"")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(excel);
    }
}
