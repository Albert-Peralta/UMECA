package mx.edu.utez.umeca.modules.suspension;

import lombok.RequiredArgsConstructor;
import mx.edu.utez.umeca.kernel.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/suspension-condicional")
@RequiredArgsConstructor
public class SuspensionCondicionalController {

    private final SuspensionCondicionalService service;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPERADMIN','ADMINISTRADOR','SUPERVISION','EVALUADOR_RIESGO') or @moduloChecker.puedeVer(authentication,'SUSPENSION')")
    public ResponseEntity<ApiResponse> listar(
            @RequestParam(required = false) String fuero,
            @RequestParam(required = false) Integer anio,
            @RequestParam(required = false) String busqueda,
            @RequestParam(defaultValue = "0")  int pagina,
            @RequestParam(defaultValue = "50") int tam) {
        return ResponseEntity.ok(service.listar(fuero, anio, busqueda, pagina, tam));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPERADMIN','ADMINISTRADOR','SUPERVISION','EVALUADOR_RIESGO') or @moduloChecker.puedeVer(authentication,'SUSPENSION')")
    public ResponseEntity<ApiResponse> detalle(@PathVariable Long id) {
        return ResponseEntity.ok(service.detalle(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPERADMIN','ADMINISTRADOR','SUPERVISION','EVALUADOR_RIESGO') or @moduloChecker.puedeCrear(authentication,'SUSPENSION')")
    public ResponseEntity<ApiResponse> crear(@RequestBody SuspensionCondicionalDTO dto) {
        return ResponseEntity.ok(service.crear(dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPERADMIN','ADMINISTRADOR','SUPERVISION','EVALUADOR_RIESGO') or @moduloChecker.puedeEditar(authentication,'SUSPENSION')")
    public ResponseEntity<ApiResponse> actualizar(@PathVariable Long id,
                                                   @RequestBody SuspensionCondicionalDTO dto) {
        return ResponseEntity.ok(service.actualizar(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPERADMIN','ADMINISTRADOR')")
    public ResponseEntity<ApiResponse> eliminar(@PathVariable Long id) {
        return ResponseEntity.ok(service.eliminar(id));
    }

    @PostMapping("/importar")
    @PreAuthorize("hasAnyRole('SUPERADMIN','ADMINISTRADOR','SUPERVISION')")
    public ResponseEntity<ApiResponse> importar(@RequestParam("archivo") MultipartFile archivo) {
        return ResponseEntity.ok(service.importar(archivo));
    }

    @GetMapping("/anios")
    @PreAuthorize("hasAnyRole('SUPERADMIN','ADMINISTRADOR','SUPERVISION','EVALUADOR_RIESGO') or @moduloChecker.puedeVer(authentication,'SUSPENSION')")
    public ResponseEntity<ApiResponse> anios() {
        return ResponseEntity.ok(service.aniosDisponibles());
    }
}
