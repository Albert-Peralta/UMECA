package mx.edu.utez.umeca.modules.bitacora;

import lombok.RequiredArgsConstructor;
import mx.edu.utez.umeca.kernel.ApiResponse;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/bitacora")
@RequiredArgsConstructor
public class BitacoraController {

    private final BitacoraService bitacoraService;

    /**
     * Vista global — solo ADMINISTRADOR.
     * GET /api/bitacora?entidad=IMPUTADO&accion=CREAR&usuarioId=1&desde=...&hasta=...&pagina=0&tamano=20
     */
    @GetMapping
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<ApiResponse> global(
            @RequestParam(required = false) String entidad,
            @RequestParam(required = false) String accion,
            @RequestParam(required = false) Long   usuarioId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime hasta,
            @RequestParam(defaultValue = "0")  int pagina,
            @RequestParam(defaultValue = "50") int tamano) {
        return ResponseEntity.ok(
                bitacoraService.buscarGlobal(entidad, accion, usuarioId,
                        desde, hasta, pagina, tamano));
    }

    /**
     * Historial de un registro concreto.
     * GET /api/bitacora/{entidad}/{id}
     * Accesible para todos los roles autenticados.
     */
    @GetMapping("/{entidad}/{id}")
    public ResponseEntity<ApiResponse> historial(
            @PathVariable String entidad,
            @PathVariable Long   id) {
        return ResponseEntity.ok(bitacoraService.historialDeRegistro(entidad, id));
    }
}
