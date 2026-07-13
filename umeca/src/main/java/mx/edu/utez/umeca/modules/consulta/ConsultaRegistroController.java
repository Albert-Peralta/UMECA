package mx.edu.utez.umeca.modules.consulta;

import mx.edu.utez.umeca.kernel.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/consultas")
public class ConsultaRegistroController {

    private final ConsultaRegistroService service;

    public ConsultaRegistroController(ConsultaRegistroService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','SUPERVISION','EVALUADOR_RIESGO')")
    public ResponseEntity<ApiResponse> listar() {
        return ResponseEntity.ok(service.listar());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','SUPERVISION','EVALUADOR_RIESGO')")
    public ResponseEntity<ApiResponse> obtener(@PathVariable Long id) {
        return ResponseEntity.ok(service.obtener(id));
    }

    @GetMapping("/antecedentes")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','SUPERVISION','EVALUADOR_RIESGO')")
    public ResponseEntity<ApiResponse> antecedentes(
            @RequestParam(required = false) String curp,
            @RequestParam(required = false) String nombre,
            @RequestParam(required = false) String apPaterno) {
        return ResponseEntity.ok(service.verificarAntecedentes(curp, nombre, apPaterno));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','SUPERVISION','EVALUADOR_RIESGO')")
    public ResponseEntity<ApiResponse> crear(@RequestBody ConsultaRegistroDTO dto) {
        return ResponseEntity.ok(service.crear(dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','SUPERVISION','EVALUADOR_RIESGO')")
    public ResponseEntity<ApiResponse> actualizar(@PathVariable Long id, @RequestBody ConsultaRegistroDTO dto) {
        return ResponseEntity.ok(service.actualizar(id, dto));
    }

    @GetMapping("/registros")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','SUPERVISION','EVALUADOR_RIESGO')")
    public ResponseEntity<ApiResponse> buscarRegistros(
            @RequestParam(required = false) String curp,
            @RequestParam(required = false) String nombre,
            @RequestParam(required = false) String apPaterno,
            @RequestParam(required = false) String causaPenal) {
        return ResponseEntity.ok(service.buscarRegistros(curp, nombre, apPaterno, causaPenal));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<ApiResponse> eliminar(@PathVariable Long id) {
        return ResponseEntity.ok(service.eliminar(id));
    }
}
