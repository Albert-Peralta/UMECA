package mx.edu.utez.umeca.modules.evaluacion;

import lombok.RequiredArgsConstructor;
import mx.edu.utez.umeca.kernel.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * Endpoints REST para evaluaciones de riesgo cautelar.
 * Base path: {@code /api/evaluaciones}
 * Requiere JWT; cada endpoint define sus roles permitidos con @PreAuthorize.
 */
@RestController
@RequestMapping("/api/evaluaciones")
@RequiredArgsConstructor
public class EvaluacionRiesgoController {

    private final EvaluacionRiesgoService evaluacionService;

    /** Lista todas las evaluaciones, más recientes primero. */
    @GetMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_EVALUADOR_RIESGO','ROLE_SUPERVISION')")
    public ResponseEntity<ApiResponse> findAll() {
        return ResponseEntity.ok(evaluacionService.findAll());
    }

    /** Búsqueda por nombre, apellido o causa penal. */
    @GetMapping("/buscar")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_EVALUADOR_RIESGO','ROLE_SUPERVISION')")
    public ResponseEntity<ApiResponse> buscar(@RequestParam String termino) {
        return ResponseEntity.ok(evaluacionService.buscar(termino));
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_EVALUADOR_RIESGO','ROLE_SUPERVISION')")
    public ResponseEntity<ApiResponse> save(@RequestBody EvaluacionRiesgoDTO dto) {
        ApiResponse response = evaluacionService.save(dto);
        return response.isOk()
                ? ResponseEntity.ok(response)
                : ResponseEntity.status(400).body(response);
    }

    @PatchMapping("/{id}/estatus")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_EVALUADOR_RIESGO')")
    public ResponseEntity<ApiResponse> cambiarEstatus(@PathVariable Long id,
                                                      @RequestParam String estatus) {
        ApiResponse response = evaluacionService.cambiarEstatus(id, estatus);
        return response.isOk()
                ? ResponseEntity.ok(response)
                : ResponseEntity.status(400).body(response);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_EVALUADOR_RIESGO','ROLE_SUPERVISION')")
    public ResponseEntity<ApiResponse> findById(@PathVariable Long id) {
        ApiResponse response = evaluacionService.findById(id);
        return response.isOk()
                ? ResponseEntity.ok(response)
                : ResponseEntity.status(404).body(response);
    }

    @PatchMapping("/{id}/evaluador")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_EVALUADOR_RIESGO')")
    public ResponseEntity<ApiResponse> asignarEvaluador(@PathVariable Long id) {
        ApiResponse response = evaluacionService.asignarEvaluador(id);
        return response.isOk()
                ? ResponseEntity.ok(response)
                : ResponseEntity.status(404).body(response);
    }

    @PatchMapping("/{id}/resultado")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_EVALUADOR_RIESGO')")
    public ResponseEntity<ApiResponse> asignarResultado(@PathVariable Long id,
                                                        @RequestParam String resultado) {
        ApiResponse response = evaluacionService.asignarResultado(id, resultado);
        return response.isOk()
                ? ResponseEntity.ok(response)
                : ResponseEntity.status(400).body(response);
    }

    /** Registra que el imputado se negó a ser entrevistado. */
    @PostMapping("/negacion")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_EVALUADOR_RIESGO','ROLE_SUPERVISION')")
    public ResponseEntity<ApiResponse> saveNegacion(@RequestBody NegacionDTO dto) {
        ApiResponse response = evaluacionService.saveNegacion(dto);
        return response.isOk()
                ? ResponseEntity.ok(response)
                : ResponseEntity.status(400).body(response);
    }

    @GetMapping("/imputado/{imputadoId}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_EVALUADOR_RIESGO','ROLE_SUPERVISION')")
    public ResponseEntity<ApiResponse> findByImputado(@PathVariable Long imputadoId) {
        return ResponseEntity.ok(evaluacionService.findByImputado(imputadoId));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_EVALUADOR_RIESGO','ROLE_SUPERVISION')")
    public ResponseEntity<ApiResponse> update(@PathVariable Long id,
                                              @RequestBody EvaluacionRiesgoDTO dto) {
        ApiResponse response = evaluacionService.update(id, dto);
        return response.isOk()
                ? ResponseEntity.ok(response)
                : ResponseEntity.status(400).body(response);
    }
}
