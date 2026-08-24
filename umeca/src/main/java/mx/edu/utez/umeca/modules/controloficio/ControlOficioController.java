package mx.edu.utez.umeca.modules.controloficio;

import lombok.RequiredArgsConstructor;
import mx.edu.utez.umeca.kernel.ApiResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/control-oficios")
@RequiredArgsConstructor
public class ControlOficioController {

    private final ControlOficioService service;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPERADMIN','ADMINISTRADOR','SUPERVISION','EVALUADOR_RIESGO','CORRESPONDENCIA')")
    public ResponseEntity<ApiResponse> getLista() {
        return ResponseEntity.ok(service.getLista());
    }

    @GetMapping("/contadores")
    @PreAuthorize("hasAnyRole('SUPERADMIN','ADMINISTRADOR','SUPERVISION','EVALUADOR_RIESGO','CORRESPONDENCIA')")
    public ResponseEntity<ApiResponse> getContadores() {
        return ResponseEntity.ok(service.getContadores());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPERADMIN','ADMINISTRADOR','SUPERVISION','EVALUADOR_RIESGO','CORRESPONDENCIA')")
    public ResponseEntity<ApiResponse> crear(@RequestBody ControlOficioDTO dto) {
        return ResponseEntity.ok(service.crear(dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPERADMIN','ADMINISTRADOR')")
    public ResponseEntity<ApiResponse> editar(@PathVariable Long id, @RequestBody ControlOficioDTO dto) {
        return ResponseEntity.ok(service.editar(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPERADMIN','ADMINISTRADOR')")
    public ResponseEntity<ApiResponse> eliminar(@PathVariable Long id) {
        return ResponseEntity.ok(service.eliminar(id));
    }

    @PatchMapping("/{id}/estado")
    @PreAuthorize("hasAnyRole('SUPERADMIN','ADMINISTRADOR','SUPERVISION','EVALUADOR_RIESGO','CORRESPONDENCIA')")
    public ResponseEntity<ApiResponse> cambiarEstado(@PathVariable Long id, @RequestParam String estado) {
        return ResponseEntity.ok(service.cambiarEstado(id, estado));
    }

    @GetMapping("/exportar-excel")
    @PreAuthorize("hasAnyRole('SUPERADMIN','ADMINISTRADOR','SUPERVISION','EVALUADOR_RIESGO','CORRESPONDENCIA')")
    public ResponseEntity<byte[]> exportarExcel() throws Exception {
        byte[] data = service.exportarExcel();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=control-oficios.xlsx")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(data);
    }
}
