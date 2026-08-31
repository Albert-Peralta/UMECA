package mx.edu.utez.umeca.modules.correspondencia;

import lombok.RequiredArgsConstructor;
import mx.edu.utez.umeca.kernel.ApiResponse;
import mx.edu.utez.umeca.modules.bitacora.Bitacora;
import mx.edu.utez.umeca.modules.bitacora.BitacoraService;
import mx.edu.utez.umeca.modules.security.user.User;
import mx.edu.utez.umeca.modules.security.user.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Year;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CorrespondenciaService {

    private final CorrespondenciaRepository repository;
    private final UserRepository userRepository;
    private final BitacoraService bitacoraService;

    @Value("${app.upload.dir}")
    private String UPLOAD_DIR;

    // ── Utilidad: usuario autenticado ─────────────────────────────────────────
    private User usuarioActual() {
        String auth = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(auth)
                .or(() -> userRepository.findByEmail(auth))
                .orElse(null);
    }

    // ── Generar No. Turno automático ─────────────────────────────────────────
    private String generarNoTurno() {
        int anio = Year.now().getValue();
        Long maxId = repository.maxIdDelAnio(anio);
        long siguiente = (maxId == null ? 0 : maxId) + 1;
        return String.format("TURNO-%d-%04d", anio, siguiente);
    }

    // ── Guardar PDF ───────────────────────────────────────────────────────────
    private String guardarPdf(MultipartFile file) throws IOException {
        Path dir = Paths.get(UPLOAD_DIR);
        if (!Files.exists(dir)) Files.createDirectories(dir);
        String nombre = UUID.randomUUID() + "_" + file.getOriginalFilename();
        Files.copy(file.getInputStream(), dir.resolve(nombre));
        return nombre; // solo el nombre, la ruta base la maneja el servidor
    }

    // ── Listar todos (admin) ──────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public ApiResponse findAll() {
        List<CorrespondenciaResponseDTO> lista = repository.findAllByOrderByCreatedAtDesc()
                .stream().map(CorrespondenciaResponseDTO::from).toList();
        return new ApiResponse(true, "OK", lista);
    }

    // ── Listar asignados al usuario actual ────────────────────────────────────
    @Transactional(readOnly = true)
    public ApiResponse findMisAsignados() {
        User u = usuarioActual();
        if (u == null) return new ApiResponse(false, "Usuario no encontrado");
        List<CorrespondenciaResponseDTO> lista = repository.findByAsignadoAIdOrderByCreatedAtDesc(u.getId())
                .stream().map(CorrespondenciaResponseDTO::from).toList();
        return new ApiResponse(true, "OK", lista);
    }

    // ── Listar registros creados por el usuario actual (CORRESPONDENCIA) ──────
    @Transactional(readOnly = true)
    public ApiResponse findMisRegistros() {
        User u = usuarioActual();
        if (u == null) return new ApiResponse(false, "Usuario no encontrado");
        List<CorrespondenciaResponseDTO> lista = repository.findByRegistradoPorIdOrderByCreatedAtDesc(u.getId())
                .stream().map(CorrespondenciaResponseDTO::from).toList();
        return new ApiResponse(true, "OK", lista);
    }

    // ── Buscar ────────────────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public ApiResponse buscar(String q) {
        List<CorrespondenciaResponseDTO> lista = repository.buscar(q)
                .stream().map(CorrespondenciaResponseDTO::from).toList();
        return new ApiResponse(true, "OK", lista);
    }

    // ── Crear ─────────────────────────────────────────────────────────────────
    @Transactional
    public ApiResponse crear(CorrespondenciaDTO dto, MultipartFile archivo) {
        User autor = usuarioActual();
        if (autor == null) return new ApiResponse(false, "Usuario no encontrado");

        Correspondencia c = new Correspondencia();
        c.setNoTurno(generarNoTurno());
        c.setRegistradoPor(autor);
        mapDto(dto, c);

        if (archivo != null && !archivo.isEmpty()) {
            try { c.setArchivoPdf(guardarPdf(archivo)); }
            catch (IOException e) { return new ApiResponse(false, "Error al guardar el archivo PDF"); }
        }

        Correspondencia saved = repository.save(c);
        bitacoraService.registrar(Bitacora.Entidad.CORRESPONDENCIA, saved.getId(),
                saved.getNoTurno(), Bitacora.Accion.CREAR,
                "Correspondencia registrada — asunto: " + saved.getAsunto());
        return new ApiResponse(true, "Correspondencia registrada correctamente", CorrespondenciaResponseDTO.from(saved));
    }

    // ── Editar ────────────────────────────────────────────────────────────────
    @Transactional
    public ApiResponse editar(Long id, CorrespondenciaDTO dto, MultipartFile archivo) {
        return repository.findById(id).map(c -> {
            String cambios = "Oficio editado — asunto: " + dto.getAsunto();
            mapDto(dto, c);
            if (archivo != null && !archivo.isEmpty()) {
                try { c.setArchivoPdf(guardarPdf(archivo)); }
                catch (IOException e) { return new ApiResponse(false, "Error al guardar el archivo PDF"); }
            }
            Correspondencia saved = repository.save(c);
            bitacoraService.registrar(Bitacora.Entidad.CORRESPONDENCIA, saved.getId(),
                    saved.getNoTurno(), Bitacora.Accion.EDITAR, cambios);
            return new ApiResponse(true, "Correspondencia actualizada correctamente", CorrespondenciaResponseDTO.from(saved));
        }).orElse(new ApiResponse(false, "Registro no encontrado"));
    }

    // ── Eliminar ──────────────────────────────────────────────────────────────
    @Transactional
    public ApiResponse eliminar(Long id) {
        return repository.findById(id).map(c -> {
            String turno = c.getNoTurno();
            bitacoraService.registrar(Bitacora.Entidad.CORRESPONDENCIA, id,
                    turno, Bitacora.Accion.ELIMINAR,
                    "Correspondencia eliminada — asunto: " + c.getAsunto());
            repository.deleteById(id);
            return new ApiResponse(true, "Correspondencia eliminada correctamente");
        }).orElse(new ApiResponse(false, "Registro no encontrado"));
    }

    // ── Revertir cancelación (vuelve a PENDIENTE y limpia motivo) ────────────
    @Transactional
    public ApiResponse revertirCancelacion(Long id) {
        return repository.findById(id).map(c -> {
            if (c.getEstado() != Correspondencia.Estado.CANCELADO)
                return new ApiResponse(false, "El registro no está cancelado");
            c.setEstado(Correspondencia.Estado.PENDIENTE);
            c.setMotivoCancelacion(null);
            repository.save(c);
            bitacoraService.registrar(Bitacora.Entidad.CORRESPONDENCIA, id,
                    c.getNoTurno(), Bitacora.Accion.EDITAR, "Cancelación revertida — estado vuelto a PENDIENTE");
            return new ApiResponse(true, "Cancelación revertida correctamente");
        }).orElse(new ApiResponse(false, "Registro no encontrado"));
    }

    // ── Cancelar (cambia estado a CANCELADO y guarda motivo) ─────────────────
    @Transactional
    public ApiResponse cancelar(Long id, String motivo) {
        if (motivo == null || motivo.isBlank())
            return new ApiResponse(false, "El motivo de cancelación es obligatorio");
        return repository.findById(id).map(c -> {
            c.setEstado(Correspondencia.Estado.CANCELADO);
            c.setMotivoCancelacion(motivo.trim());
            repository.save(c);
            bitacoraService.registrar(Bitacora.Entidad.CORRESPONDENCIA, id,
                    c.getNoTurno(), Bitacora.Accion.EDITAR,
                    "Correspondencia cancelada — motivo: " + motivo.trim());
            return new ApiResponse(true, "Registro cancelado correctamente");
        }).orElse(new ApiResponse(false, "Registro no encontrado"));
    }

    // ── Usuarios que han registrado correspondencia ───────────────────────────
    @Transactional(readOnly = true)
    public ApiResponse getRegistradores() {
        List<java.util.Map<String, Object>> lista = repository.findRegistradoreDistintos()
                .stream()
                .map(row -> {
                    Long   id     = ((Number) row[0]).longValue();
                    String nombre = (String) row[1];
                    String apPat  = (String) row[2];
                    String apMat  = row[3] != null ? (String) row[3] : "";
                    String user   = (String) row[4];
                    String nombreCompleto = nombre + " " + apPat +
                            (apMat != null && !apMat.isBlank() ? " " + apMat : "");
                    return java.util.Map.<String, Object>of(
                            "id", id, "nombre", nombreCompleto, "username", user);
                })
                .toList();
        return new ApiResponse(true, "OK", lista);
    }

    // ── Obtener personal asignable ────────────────────────────────────────────
    @Transactional(readOnly = true)
    public ApiResponse getPersonalAsignable() {
        List<UserResponseMini> lista = userRepository.findPersonalAsignable()
                .stream().map(u -> new UserResponseMini(u.getId(),
                        u.getNombre() + " " + u.getApPaterno(),
                        u.getRol() != null ? u.getRol().name() : "",
                        u.getZona() != null ? u.getZona().name() : ""))
                .toList();
        return new ApiResponse(true, "OK", lista);
    }

    // ── Asignar ───────────────────────────────────────────────────────────────
    @Transactional
    public ApiResponse asignar(Long id, Long usuarioId) {
        return repository.findById(id).map(c -> {
            User personal = userRepository.findById(usuarioId).orElse(null);
            if (personal == null) return new ApiResponse(false, "Usuario no encontrado");
            User admin = usuarioActual();

            String anteriorNombre = c.getAsignadoA() != null ? c.getAsignadoA().getNombre() + " " + c.getAsignadoA().getApPaterno() : "nadie";
            c.setAsignadoA(personal);
            c.setEstado(Correspondencia.Estado.ASIGNADO);
            c.setFechaAsignacion(LocalDateTime.now());
            Correspondencia saved = repository.save(c);

            bitacoraService.registrar(Bitacora.Entidad.CORRESPONDENCIA, saved.getId(),
                    saved.getNoTurno(), Bitacora.Accion.ASIGNACION,
                    "Asignación — asignado a: " + personal.getNombre() + " " + personal.getApPaterno()
                    + " | anterior: " + anteriorNombre);
            return new ApiResponse(true, "Asignado correctamente", CorrespondenciaResponseDTO.from(saved));
        }).orElse(new ApiResponse(false, "Registro no encontrado"));
    }

    // ── Quitar asignación ────────────────────────────────────────────────────
    @Transactional
    public ApiResponse quitarAsignacion(Long id) {
        return repository.findById(id).map(c -> {
            String anteriorNombre = c.getAsignadoA() != null ? c.getAsignadoA().getNombre() + " " + c.getAsignadoA().getApPaterno() : "—";
            c.setAsignadoA(null);
            c.setEstado(Correspondencia.Estado.PENDIENTE);
            c.setFechaAsignacion(null);
            Correspondencia saved = repository.save(c);
            bitacoraService.registrar(Bitacora.Entidad.CORRESPONDENCIA, saved.getId(),
                    saved.getNoTurno(), Bitacora.Accion.ASIGNACION,
                    "Asignación removida — anterior: " + anteriorNombre);
            return new ApiResponse(true, "Asignación removida", CorrespondenciaResponseDTO.from(saved));
        }).orElse(new ApiResponse(false, "Registro no encontrado"));
    }

    // ── Cambiar estado (personal) ─────────────────────────────────────────────
    @Transactional
    public ApiResponse cambiarEstado(Long id, String estado) {
        return repository.findById(id).map(c -> {
            try {
                Correspondencia.Estado nuevoEstado = Correspondencia.Estado.valueOf(estado);
                if (nuevoEstado == Correspondencia.Estado.PENDIENTE || nuevoEstado == Correspondencia.Estado.ASIGNADO)
                    return new ApiResponse(false, "Estado no permitido");
                c.setEstado(nuevoEstado);
                Correspondencia saved = repository.save(c);
                bitacoraService.registrar(Bitacora.Entidad.CORRESPONDENCIA, saved.getId(),
                        saved.getNoTurno(), Bitacora.Accion.CAMBIO_ESTADO,
                        "Estado actualizado — nuevo: " + estado);
                return new ApiResponse(true, "Estado actualizado", CorrespondenciaResponseDTO.from(saved));
            } catch (IllegalArgumentException e) {
                return new ApiResponse(false, "Estado inválido");
            }
        }).orElse(new ApiResponse(false, "Registro no encontrado"));
    }

    // ── Estadísticas de correspondencia ──────────────────────────────────────
    @Transactional(readOnly = true)
    public ApiResponse getEstadisticas(int anio) {
        java.util.Map<String, Object> datos = new java.util.HashMap<>();
        datos.put("total",          repository.contarPorAnio(anio));
        datos.put("porTipo",        repository.contarPorTipo(anio).stream()
                .map(r -> new Object[]{r[0].toString(), r[1]}).toList());
        datos.put("porEstado",      repository.contarPorEstado(anio).stream()
                .map(r -> new Object[]{r[0].toString(), r[1]}).toList());
        datos.put("porPrioridad",   repository.contarPorPrioridad(anio).stream()
                .map(r -> new Object[]{r[0].toString(), r[1]}).toList());
        datos.put("porMes",         repository.contarPorMes(anio).stream()
                .map(r -> new Object[]{r[0], r[1]}).toList());
        datos.put("conTermino",     repository.contarPorRequiereRespuesta(anio).stream()
                .filter(r -> Boolean.TRUE.equals(r[0])).mapToLong(r -> ((Number)r[1]).longValue()).sum());
        datos.put("sinTermino",     repository.contarPorRequiereRespuesta(anio).stream()
                .filter(r -> Boolean.FALSE.equals(r[0])).mapToLong(r -> ((Number)r[1]).longValue()).sum());
        return new ApiResponse(true, "OK", datos);
    }

    // ── Contadores para notificaciones ────────────────────────────────────────
    @Transactional(readOnly = true)
    public ApiResponse getContadores() {
        User u = usuarioActual();
        if (u == null) return new ApiResponse(false, "Usuario no encontrado");
        long pendientesAdmin = repository.contarPendientes();
        long misAsignados = u.getId() != null ? repository.contarAsignadosPendientesParaUsuario(u.getId()) : 0;
        return new ApiResponse(true, "OK", new java.util.HashMap<String, Long>() {{
            put("pendientesAdmin", pendientesAdmin);
            put("misAsignados", misAsignados);
        }});
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private void mapDto(CorrespondenciaDTO dto, Correspondencia c) {
        if (dto.getSede() != null) {
            try { c.setSede(Correspondencia.Sede.valueOf(dto.getSede())); } catch (Exception ignored) {}
        }
        c.setNoOficio(dto.getNoOficio());
        if (dto.getFechaOficio() != null && !dto.getFechaOficio().isBlank())
            try { c.setFechaOficio(LocalDate.parse(dto.getFechaOficio())); } catch (Exception ignored) {}
        if (dto.getFechaRecibido() != null && !dto.getFechaRecibido().isBlank())
            try { c.setFechaRecibido(LocalDate.parse(dto.getFechaRecibido())); } catch (Exception ignored) {}
        if (dto.getTipo() != null) {
            try { c.setTipo(Correspondencia.Tipo.valueOf(dto.getTipo())); } catch (Exception ignored) {}
        }
        c.setRemitente(dto.getRemitente());
        c.setAsunto(dto.getAsunto());
        c.setTerminoRespuestaHoras(dto.getTerminoRespuestaHoras());
        c.setRequiereRespuesta(dto.getRequiereRespuesta() != null && dto.getRequiereRespuesta());
        if (dto.getPrioridad() != null) {
            try {
                Correspondencia.Prioridad p = Correspondencia.Prioridad.valueOf(dto.getPrioridad());
                c.setPrioridad(p);
                if (p == Correspondencia.Prioridad.TURNO || p == Correspondencia.Prioridad.CIRCULAR) {
                    c.setEstado(Correspondencia.Estado.ARCHIVADO);
                    c.setAsignadoA(null);
                    c.setFechaAsignacion(null);
                }
            } catch (Exception ignored) {}
        }
    }

    // ── Exportar Excel ────────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public byte[] exportarExcel() throws IOException {
        User u = usuarioActual();
        List<Correspondencia> lista;
        if (u != null && u.getRol() != null && u.getRol().name().equals("CORRESPONDENCIA"))
            lista = repository.findByRegistradoPorIdOrderByCreatedAtDesc(u.getId());
        else if (u != null && u.getRol() != null &&
                (u.getRol().name().equals("SUPERVISION") || u.getRol().name().equals("EVALUADOR_RIESGO")))
            lista = repository.findByAsignadoAIdOrderByCreatedAtDesc(u.getId());
        else
            lista = repository.findAllByOrderByCreatedAtDesc();

        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            Sheet sheet = wb.createSheet("Correspondencia");

            // Estilos
            CellStyle headerStyle = wb.createCellStyle();
            Font headerFont = wb.createFont();
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.WHITE.getIndex());
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.DARK_GREEN.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);
            headerStyle.setBorderBottom(BorderStyle.THIN);

            CellStyle dataStyle = wb.createCellStyle();
            dataStyle.setBorderBottom(BorderStyle.THIN);
            dataStyle.setBorderLeft(BorderStyle.THIN);
            dataStyle.setBorderRight(BorderStyle.THIN);
            dataStyle.setVerticalAlignment(VerticalAlignment.CENTER);

            CellStyle altStyle = wb.createCellStyle();
            altStyle.cloneStyleFrom(dataStyle);
            altStyle.setFillForegroundColor(IndexedColors.LIGHT_GREEN.getIndex());
            altStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            // Encabezados
            String[] cols = {"No. Turno","Sede","No. Oficio","Fecha Oficio","Fecha Recibido",
                             "Tipo","Remitente","Asunto","Prioridad","Estado",
                             "Término de Respuesta","Asignado A","Registrado Por","Fecha Registro"};
            Row header = sheet.createRow(0);
            for (int i = 0; i < cols.length; i++) {
                Cell cell = header.createCell(i);
                cell.setCellValue(cols[i]);
                cell.setCellStyle(headerStyle);
                sheet.setColumnWidth(i, 5000);
            }

            // Datos
            int rowIdx = 1;
            for (Correspondencia c : lista) {
                Row row = sheet.createRow(rowIdx);
                CellStyle style = (rowIdx % 2 == 0) ? altStyle : dataStyle;
                String[] vals = {
                    c.getNoTurno(),
                    c.getSede() != null ? c.getSede().name() : "",
                    c.getNoOficio() != null ? c.getNoOficio() : "",
                    c.getFechaOficio() != null ? c.getFechaOficio().toString() : "",
                    c.getFechaRecibido() != null ? c.getFechaRecibido().toString() : "",
                    c.getTipo() != null ? c.getTipo().name() : "",
                    c.getRemitente() != null ? c.getRemitente() : "",
                    c.getAsunto() != null ? c.getAsunto() : "",
                    c.getPrioridad() != null ? c.getPrioridad().name() : "",
                    c.getEstado() != null ? c.getEstado().name() : "",
                    (c.getRequiereRespuesta() != null && c.getRequiereRespuesta())
                        ? "Sí - " + (c.getTerminoRespuestaHoras() != null ? c.getTerminoRespuestaHoras() + " hrs" : "—")
                        : "No",
                    c.getAsignadoA() != null ? c.getAsignadoA().getNombre() + " " + c.getAsignadoA().getApPaterno() : "",
                    c.getRegistradoPor() != null ? c.getRegistradoPor().getNombre() + " " + c.getRegistradoPor().getApPaterno() : "",
                    c.getCreatedAt() != null ? c.getCreatedAt().toLocalDate().toString() : ""
                };
                for (int i = 0; i < vals.length; i++) {
                    Cell cell = row.createCell(i);
                    cell.setCellValue(vals[i]);
                    cell.setCellStyle(style);
                }
                rowIdx++;
            }

            // Auto-size primeras columnas importantes
            sheet.setColumnWidth(0, 3500);
            sheet.setColumnWidth(6, 7000);
            sheet.setColumnWidth(7, 9000);

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            wb.write(out);
            return out.toByteArray();
        }
    }

    // Mini DTO para lista de personal
    public record UserResponseMini(Long id, String nombre, String rol, String zona) {}
}
