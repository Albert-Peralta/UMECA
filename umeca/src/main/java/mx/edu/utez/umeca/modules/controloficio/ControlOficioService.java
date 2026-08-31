package mx.edu.utez.umeca.modules.controloficio;

import lombok.RequiredArgsConstructor;
import mx.edu.utez.umeca.kernel.ApiResponse;
import mx.edu.utez.umeca.modules.bitacora.Bitacora;
import mx.edu.utez.umeca.modules.bitacora.BitacoraService;
import mx.edu.utez.umeca.modules.security.user.User;
import mx.edu.utez.umeca.modules.security.user.UserRepository;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ControlOficioService {

    private final ControlOficioRepository repository;
    private final UserRepository userRepository;
    private final BitacoraService bitacoraService;

    private User usuarioActual() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username).orElse(null);
    }

    // ── Listar ───────────────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public ApiResponse getLista() {
        List<ControlOficioResponseDTO> lista = repository.findAllByOrderByNumeroSecuencialDesc()
                .stream().map(ControlOficioResponseDTO::from).toList();
        return new ApiResponse(true, "OK", lista);
    }

    // ── Contadores ────────────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public ApiResponse getContadores() {
        long pendientes = repository.countPendientes();
        return new ApiResponse(true, "OK", Map.of("pendientes", pendientes));
    }

    // ── Crear ─────────────────────────────────────────────────────────────────
    @Transactional
    public ApiResponse crear(ControlOficioDTO dto) {
        User autor = usuarioActual();
        if (autor == null) return new ApiResponse(false, "Usuario no encontrado");

        int siguiente = repository.findMaxSecuencial() + 1;

        ControlOficio c = new ControlOficio();
        c.setNumeroSecuencial(siguiente);
        c.setNoOficio(String.valueOf(siguiente));
        c.setFecha(LocalDate.now());
        c.setSolicitante(autor);
        c.setEstado(ControlOficio.Estado.PENDIENTE);
        mapDto(dto, c);

        ControlOficio saved = repository.save(c);
        bitacoraService.registrar(Bitacora.Entidad.CONTROL_OFICIO, saved.getId(),
                saved.getNoOficio(), Bitacora.Accion.CREAR,
                "Control de oficio registrado — No. " + saved.getNoOficio() + " — asunto: " + saved.getAsunto());
        return new ApiResponse(true, "Oficio registrado correctamente", ControlOficioResponseDTO.from(saved));
    }

    // ── Editar ────────────────────────────────────────────────────────────────
    @Transactional
    public ApiResponse editar(Long id, ControlOficioDTO dto) {
        return repository.findById(id).map(c -> {
            mapDto(dto, c);
            ControlOficio saved = repository.save(c);
            bitacoraService.registrar(Bitacora.Entidad.CONTROL_OFICIO, saved.getId(),
                    saved.getNoOficio(), Bitacora.Accion.EDITAR,
                    "Control de oficio editado — No. " + saved.getNoOficio());
            return new ApiResponse(true, "Oficio actualizado correctamente", ControlOficioResponseDTO.from(saved));
        }).orElse(new ApiResponse(false, "Registro no encontrado"));
    }

    // ── Eliminar ──────────────────────────────────────────────────────────────
    @Transactional
    public ApiResponse eliminar(Long id) {
        return repository.findById(id).map(c -> {
            String noOficio = c.getNoOficio();
            bitacoraService.registrar(Bitacora.Entidad.CONTROL_OFICIO, id,
                    noOficio, Bitacora.Accion.ELIMINAR,
                    "Control de oficio eliminado — No. " + noOficio);
            repository.deleteById(id);
            return new ApiResponse(true, "Oficio eliminado correctamente");
        }).orElse(new ApiResponse(false, "Registro no encontrado"));
    }

    // ── Cambiar estado ────────────────────────────────────────────────────────
    @Transactional
    public ApiResponse cambiarEstado(Long id, String estado) {
        return repository.findById(id).map(c -> {
            try {
                ControlOficio.Estado nuevoEstado = ControlOficio.Estado.valueOf(estado);
                c.setEstado(nuevoEstado);
                repository.save(c);
                bitacoraService.registrar(Bitacora.Entidad.CONTROL_OFICIO, id,
                        c.getNoOficio(), Bitacora.Accion.EDITAR,
                        "Estado actualizado a " + estado);
                return new ApiResponse(true, "Estado actualizado");
            } catch (Exception e) {
                return new ApiResponse(false, "Estado inválido");
            }
        }).orElse(new ApiResponse(false, "Registro no encontrado"));
    }

    // ── Cancelar ──────────────────────────────────────────────────────────────
    @Transactional
    public ApiResponse cancelar(Long id, String motivo) {
        if (motivo == null || motivo.isBlank())
            return new ApiResponse(false, "El motivo de cancelación es obligatorio");
        return repository.findById(id).map(c -> {
            c.setEstado(ControlOficio.Estado.CANCELADO);
            c.setMotivoCancelacion(motivo.trim());
            repository.save(c);
            bitacoraService.registrar(Bitacora.Entidad.CONTROL_OFICIO, id,
                    c.getNoOficio(), Bitacora.Accion.EDITAR,
                    "Oficio cancelado — motivo: " + motivo.trim());
            return new ApiResponse(true, "Oficio cancelado correctamente");
        }).orElse(new ApiResponse(false, "Registro no encontrado"));
    }

    // ── Revertir cancelación ──────────────────────────────────────────────────
    @Transactional
    public ApiResponse revertirCancelacion(Long id) {
        return repository.findById(id).map(c -> {
            if (c.getEstado() != ControlOficio.Estado.CANCELADO)
                return new ApiResponse(false, "El registro no está cancelado");
            c.setEstado(ControlOficio.Estado.PENDIENTE);
            c.setMotivoCancelacion(null);
            repository.save(c);
            bitacoraService.registrar(Bitacora.Entidad.CONTROL_OFICIO, id,
                    c.getNoOficio(), Bitacora.Accion.EDITAR,
                    "Cancelación revertida — estado vuelto a PENDIENTE");
            return new ApiResponse(true, "Cancelación revertida correctamente");
        }).orElse(new ApiResponse(false, "Registro no encontrado"));
    }

    // ── Exportar Excel ────────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public byte[] exportarExcel() throws IOException {
        List<ControlOficio> lista = repository.findAllByOrderByNumeroSecuencialDesc();
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");

        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            Sheet sheet = wb.createSheet("Control de Oficios");

            // Estilo encabezado
            CellStyle hdrStyle = wb.createCellStyle();
            hdrStyle.setFillForegroundColor(IndexedColors.DARK_GREEN.getIndex());
            hdrStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            Font hdrFont = wb.createFont();
            hdrFont.setBold(true);
            hdrFont.setColor(IndexedColors.WHITE.getIndex());
            hdrStyle.setFont(hdrFont);

            String[] cols = {"No. Oficio", "Fecha", "Destinatario", "Asunto", "Supervisado", "Solicitante", "Estado"};
            Row header = sheet.createRow(0);
            for (int i = 0; i < cols.length; i++) {
                Cell cell = header.createCell(i);
                cell.setCellValue(cols[i]);
                cell.setCellStyle(hdrStyle);
                sheet.setColumnWidth(i, 5000);
            }

            int rowIdx = 1;
            for (ControlOficio c : lista) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(c.getNoOficio());
                row.createCell(1).setCellValue(c.getFecha() != null ? c.getFecha().format(fmt) : "");
                row.createCell(2).setCellValue(c.getDestinatario() != null ? c.getDestinatario() : "");
                row.createCell(3).setCellValue(c.getAsunto() != null ? c.getAsunto() : "");
                row.createCell(4).setCellValue(c.getSupervisado() != null ? c.getSupervisado() : "");
                row.createCell(5).setCellValue(c.getSolicitante() != null ?
                        c.getSolicitante().getNombre() + " " + c.getSolicitante().getApPaterno() : "");
                row.createCell(6).setCellValue(c.getEstado().name());
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            wb.write(out);
            return out.toByteArray();
        }
    }

    private void mapDto(ControlOficioDTO dto, ControlOficio c) {
        if (dto.getDestinatario() != null) c.setDestinatario(dto.getDestinatario());
        if (dto.getAsunto()       != null) c.setAsunto(dto.getAsunto());
        if (dto.getSupervisado()  != null) c.setSupervisado(dto.getSupervisado());
    }
}
