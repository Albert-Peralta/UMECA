package mx.edu.utez.umeca.modules.correspondencia;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import mx.edu.utez.umeca.kernel.ApiResponse;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import java.io.IOException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.MalformedURLException;
import java.nio.file.Path;
import java.nio.file.Paths;

@RestController
@RequestMapping("/api/correspondencia")
@RequiredArgsConstructor
public class CorrespondenciaController {

    private final CorrespondenciaService service;
    private final ObjectMapper objectMapper;

    /** Admin: ver todos los registros */
    @GetMapping
    @PreAuthorize("hasAuthority('ROLE_ADMINISTRADOR')")
    public ResponseEntity<ApiResponse> findAll(@RequestParam(required = false) String buscar) {
        ApiResponse res = (buscar != null && !buscar.isBlank()) ? service.buscar(buscar) : service.findAll();
        return ResponseEntity.ok(res);
    }

    /** Personal (SUPERVISION/EVALUADOR): ver solo los asignados a ellos */
    @GetMapping("/mis-asignados")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPERVISION','ROLE_EVALUADOR_RIESGO')")
    public ResponseEntity<ApiResponse> misAsignados() {
        return ResponseEntity.ok(service.findMisAsignados());
    }

    /** CORRESPONDENCIA: ver los registros que él mismo creó */
    @GetMapping("/mis-registros")
    @PreAuthorize("hasAuthority('ROLE_CORRESPONDENCIA')")
    public ResponseEntity<ApiResponse> misRegistros() {
        return ResponseEntity.ok(service.findMisRegistros());
    }

    /** Admin: buscar en todos */
    @GetMapping("/buscar")
    @PreAuthorize("hasAuthority('ROLE_ADMINISTRADOR')")
    public ResponseEntity<ApiResponse> buscar(@RequestParam String q) {
        return ResponseEntity.ok(service.buscar(q));
    }

    /** CORRESPONDENCIA: crear nuevo registro con PDF */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyAuthority('ROLE_CORRESPONDENCIA','ROLE_ADMINISTRADOR')")
    public ResponseEntity<ApiResponse> crear(
            @RequestPart("datos") String datosJson,
            @RequestPart(value = "archivo", required = false) MultipartFile archivo) {
        try {
            CorrespondenciaDTO dto = objectMapper.readValue(datosJson, CorrespondenciaDTO.class);
            ApiResponse res = service.crear(dto, archivo);
            return res.isOk() ? ResponseEntity.ok(res) : ResponseEntity.badRequest().body(res);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ApiResponse(false, "Error al procesar la solicitud"));
        }
    }

    /** Admin: obtener lista de personal asignable */
    @GetMapping("/personal-asignable")
    @PreAuthorize("hasAuthority('ROLE_ADMINISTRADOR')")
    public ResponseEntity<ApiResponse> personalAsignable() {
        return ResponseEntity.ok(service.getPersonalAsignable());
    }

    /** Admin: asignar a un usuario */
    @PatchMapping("/{id}/asignar")
    @PreAuthorize("hasAuthority('ROLE_ADMINISTRADOR')")
    public ResponseEntity<ApiResponse> asignar(@PathVariable Long id, @RequestParam Long usuarioId) {
        ApiResponse res = service.asignar(id, usuarioId);
        return res.isOk() ? ResponseEntity.ok(res) : ResponseEntity.badRequest().body(res);
    }

    /** Admin: quitar asignación */
    @PatchMapping("/{id}/quitar-asignacion")
    @PreAuthorize("hasAuthority('ROLE_ADMINISTRADOR')")
    public ResponseEntity<ApiResponse> quitarAsignacion(@PathVariable Long id) {
        ApiResponse res = service.quitarAsignacion(id);
        return res.isOk() ? ResponseEntity.ok(res) : ResponseEntity.badRequest().body(res);
    }

    /** Personal: cambiar estado (LEIDO, EN_ESPERA, FINALIZADO) */
    @PatchMapping("/{id}/estado")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPERVISION','ROLE_EVALUADOR_RIESGO','ROLE_ADMINISTRADOR')")
    public ResponseEntity<ApiResponse> cambiarEstado(@PathVariable Long id, @RequestParam String estado) {
        ApiResponse res = service.cambiarEstado(id, estado);
        return res.isOk() ? ResponseEntity.ok(res) : ResponseEntity.badRequest().body(res);
    }

    /** Contadores para notificaciones en el dashboard */
    @GetMapping("/contadores")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_SUPERVISION','ROLE_EVALUADOR_RIESGO')")
    public ResponseEntity<ApiResponse> contadores() {
        return ResponseEntity.ok(service.getContadores());
    }

    /** Estadísticas de correspondencia para el módulo de estadísticas */
    @GetMapping("/estadisticas")
    @PreAuthorize("hasAuthority('ROLE_ADMINISTRADOR')")
    public ResponseEntity<ApiResponse> estadisticas(@RequestParam(defaultValue = "0") int anio) {
        int a = anio > 0 ? anio : java.time.Year.now().getValue();
        return ResponseEntity.ok(service.getEstadisticas(a));
    }

    /** Exportar Excel */
    @GetMapping("/exportar-excel")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_CORRESPONDENCIA','ROLE_SUPERVISION','ROLE_EVALUADOR_RIESGO')")
    public ResponseEntity<byte[]> exportarExcel() {
        try {
            byte[] bytes = service.exportarExcel();
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"correspondencia.xlsx\"")
                    .body(bytes);
        } catch (IOException e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    /** Descargar/ver PDF — solo archivos dentro del directorio uploads/correspondencia/ */
    @GetMapping("/pdf")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_CORRESPONDENCIA','ROLE_SUPERVISION','ROLE_EVALUADOR_RIESGO')")
    public ResponseEntity<Resource> verPdf(@RequestParam String ruta) {
        try {
            Path baseDir = Paths.get("uploads/correspondencia").toAbsolutePath().normalize();
            Path path = Paths.get(ruta).toAbsolutePath().normalize();
            // Seguridad: rechazar cualquier ruta fuera del directorio base
            if (!path.startsWith(baseDir)) {
                return ResponseEntity.status(403).build();
            }
            Resource resource = new UrlResource(path.toUri());
            if (!resource.exists()) return ResponseEntity.notFound().build();
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_PDF)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + path.getFileName() + "\"")
                    .body(resource);
        } catch (MalformedURLException e) {
            return ResponseEntity.badRequest().build();
        }
    }
}
