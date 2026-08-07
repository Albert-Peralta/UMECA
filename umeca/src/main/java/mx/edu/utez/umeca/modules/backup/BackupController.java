package mx.edu.utez.umeca.modules.backup;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/backup")
public class BackupController {

    @Autowired
    private BackupService backupService;

    @GetMapping("/exportar")
    @PreAuthorize("hasAnyRole('ROLE_ADMINISTRADOR','ROLE_SUPERADMIN')")
    public ResponseEntity<byte[]> exportar() {
        try {
            byte[] zip = backupService.generarZip();
            String filename = "UMECA_Backup_" + LocalDate.now() + ".zip";
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                    .contentType(MediaType.parseMediaType("application/zip"))
                    .contentLength(zip.length)
                    .body(zip);
        } catch (IOException e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
