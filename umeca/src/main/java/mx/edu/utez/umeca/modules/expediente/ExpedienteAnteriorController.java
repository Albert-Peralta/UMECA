package mx.edu.utez.umeca.modules.expediente;

import lombok.RequiredArgsConstructor;
import mx.edu.utez.umeca.kernel.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/expedientes-anteriores")
@RequiredArgsConstructor
public class ExpedienteAnteriorController {

    private final ExpedienteAnteriorService service;
    private final ExpedienteExcelParser parser;

    /**
     * Importación masiva por archivo Excel — solo ADMINISTRADOR.
     * Params: tipo (MC|SCP|HISTORICO), zona (XOCHITEPEC|CUAUTLA|JOJUTLA)
     */
    @PostMapping("/importar-excel")
    @PreAuthorize("hasAnyRole('SUPERADMIN','ADMINISTRADOR')")
    public ResponseEntity<ApiResponse> importarExcel(
            @RequestParam("archivo") MultipartFile archivo,
            @RequestParam("zona") String zona) {
        try {
            List<ExpedienteAnteriorDTO> dtos = parser.parsear(archivo, zona);
            return ResponseEntity.ok(service.importar(dtos, archivo.getOriginalFilename()));
        } catch (Exception e) {
            return ResponseEntity.ok(new ApiResponse(false, "Error al procesar el archivo: " + e.getMessage()));
        }
    }

    /**
     * Importación de Registro Histórico — solo ADMINISTRADOR.
     * El archivo tiene formato simple 4 columnas (CAUSA PENAL, NOMBRE, FECHA, SITUACION JURIDICA).
     */
    @PostMapping("/importar-registro-historico")
    @PreAuthorize("hasAnyRole('SUPERADMIN','ADMINISTRADOR')")
    public ResponseEntity<ApiResponse> importarRegistroHistorico(
            @RequestParam("archivo") MultipartFile archivo,
            @RequestParam(value = "zona", required = false) String zona) {
        return ResponseEntity.ok(service.importarRegistroHistorico(archivo, zona));
    }

    /**
     * Importación de Sustraídos — solo ADMINISTRADOR.
     * El archivo contiene 3 hojas (CUERNAVACA/JOJUTLA/CUAUTLA) con zona en el nombre de la hoja.
     */
    @PostMapping("/importar-sustraidos")
    @PreAuthorize("hasAnyRole('SUPERADMIN','ADMINISTRADOR')")
    public ResponseEntity<ApiResponse> importarSustraidos(
            @RequestParam("archivo") MultipartFile archivo) {
        return ResponseEntity.ok(service.importarSustraidos(archivo));
    }

    /**
     * Importación de Base Jojutla — solo ADMINISTRADOR.
     */
    @PostMapping("/importar-base-jojutla")
    @PreAuthorize("hasAnyRole('SUPERADMIN','ADMINISTRADOR')")
    public ResponseEntity<ApiResponse> importarBaseJojutla(
            @RequestParam("archivo") MultipartFile archivo) {
        return ResponseEntity.ok(service.importarBaseJojutla(archivo));
    }

    /**
     * Importación de Base Cuautla — solo ADMINISTRADOR.
     */
    @PostMapping("/importar-base-cuautla")
    @PreAuthorize("hasAnyRole('SUPERADMIN','ADMINISTRADOR')")
    public ResponseEntity<ApiResponse> importarBaseCuautla(
            @RequestParam("archivo") MultipartFile archivo) {
        return ResponseEntity.ok(service.importarBaseCuautla(archivo));
    }

    /**
     * Importación masiva por JSON — solo ADMINISTRADOR.
     */
    @PostMapping("/importar")
    @PreAuthorize("hasAnyRole('SUPERADMIN','ADMINISTRADOR')")
    public ResponseEntity<ApiResponse> importar(@RequestBody List<ExpedienteAnteriorDTO> dtos) {
        return ResponseEntity.ok(service.importar(dtos, "manual"));
    }

    /** Lista todos los lotes de importación — solo ADMINISTRADOR */
    @GetMapping("/lotes")
    @PreAuthorize("hasAnyRole('SUPERADMIN','ADMINISTRADOR')")
    public ResponseEntity<ApiResponse> listarLotes() {
        return ResponseEntity.ok(service.listarLotes());
    }

    /** Elimina un lote completo y todos sus expedientes — solo ADMINISTRADOR */
    @DeleteMapping("/lotes/{id}")
    @PreAuthorize("hasAnyRole('SUPERADMIN','ADMINISTRADOR')")
    public ResponseEntity<ApiResponse> eliminarLote(@PathVariable Long id) {
        return ResponseEntity.ok(service.eliminarLote(id));
    }

    /**
     * Listado paginado con filtros — todos los roles.
     * Params: tipo, zona, busqueda, pagina (0-based), tam (default 20)
     */
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse> listar(
            @RequestParam(required = false) String tipo,
            @RequestParam(required = false) String tipoIn,
            @RequestParam(required = false) String zona,
            @RequestParam(required = false) String busqueda,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "20") int tam) {
        return ResponseEntity.ok(service.listar(tipo, tipoIn, zona, busqueda, pagina, tam));
    }

    /**
     * Detalle completo por id — todos los roles.
     */
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse> detalle(@PathVariable Long id) {
        return ResponseEntity.ok(service.detalle(id));
    }
}
