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
    @PreAuthorize("hasAnyRole('SUPERADMIN','ADMINISTRADOR','SUPERVISION','EVALUADOR_RIESGO','CORRESPONDENCIA')")
    public ResponseEntity<ApiResponse> getEstadisticas(
            @RequestParam(defaultValue = "") String desde,
            @RequestParam(defaultValue = "") String hasta) {
        return ResponseEntity.ok(service.getEstadisticas(desde, hasta));
    }

    @GetMapping("/exportar")
    @PreAuthorize("hasAnyRole('SUPERADMIN','ADMINISTRADOR','SUPERVISION','EVALUADOR_RIESGO','CORRESPONDENCIA')")
    public ResponseEntity<byte[]> exportarExcel(
            @RequestParam(defaultValue = "") String desde,
            @RequestParam(defaultValue = "") String hasta) throws Exception {
        byte[] excel = service.exportarExcel(desde, hasta);
        String nombre = "estadisticas_" + (desde.isBlank() ? "completo" : desde + "_" + hasta) + ".xlsx";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + nombre + "\"")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(excel);
    }
}
