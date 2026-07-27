package mx.edu.utez.umeca.modules.suspension;

import lombok.RequiredArgsConstructor;
import mx.edu.utez.umeca.kernel.ApiResponse;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;

@Service
@RequiredArgsConstructor
public class SuspensionCondicionalService {

    private final SuspensionCondicionalRepository repo;
    private final DataFormatter fmt = new DataFormatter();

    // ── Listar paginado ─────────────────────────────────────
    @Transactional(readOnly = true)
    public ApiResponse listar(String fuero, Integer anio, String busqueda, int pagina, int tam) {
        String f = (fuero    != null && !fuero.isBlank())    ? fuero.trim()    : null;
        String q = (busqueda != null && !busqueda.isBlank()) ? busqueda.trim() : null;
        Page<SuspensionCondicional> page = repo.buscar(f, anio, q, PageRequest.of(pagina, tam));
        return new ApiResponse(true, "ok", page);
    }

    // ── Detalle ──────────────────────────────────────────────
    @Transactional(readOnly = true)
    public ApiResponse detalle(Long id) {
        return repo.findById(id)
            .map(s -> new ApiResponse(true, "ok", s))
            .orElse(new ApiResponse(false, "Registro no encontrado"));
    }

    // ── Crear ────────────────────────────────────────────────
    @Transactional
    public ApiResponse crear(SuspensionCondicionalDTO dto) {
        SuspensionCondicional e = toEntity(new SuspensionCondicional(), dto);
        repo.save(e);
        return new ApiResponse(true, "Registro creado correctamente", e);
    }

    // ── Actualizar ───────────────────────────────────────────
    @Transactional
    public ApiResponse actualizar(Long id, SuspensionCondicionalDTO dto) {
        Optional<SuspensionCondicional> opt = repo.findById(id);
        if (opt.isEmpty()) return new ApiResponse(false, "Registro no encontrado");
        SuspensionCondicional e = toEntity(opt.get(), dto);
        repo.save(e);
        return new ApiResponse(true, "Registro actualizado correctamente", e);
    }

    // ── Eliminar ─────────────────────────────────────────────
    @Transactional
    public ApiResponse eliminar(Long id) {
        if (!repo.existsById(id)) return new ApiResponse(false, "Registro no encontrado");
        repo.deleteById(id);
        return new ApiResponse(true, "Registro eliminado correctamente");
    }

    // ── Importar Excel (multi-hoja por año) ──────────────────
    @Transactional
    public ApiResponse importar(MultipartFile file) {
        try (InputStream is = file.getInputStream();
             Workbook wb = new XSSFWorkbook(is)) {

            List<SuspensionCondicional> todos = new ArrayList<>();
            int omitidos = 0;

            for (int si = 0; si < wb.getNumberOfSheets(); si++) {
                Sheet sheet = wb.getSheetAt(si);
                String nombreHoja = sheet.getSheetName().trim();

                // Intentar extraer el año del nombre de la hoja
                Integer anio = null;
                try { anio = Integer.parseInt(nombreHoja); } catch (NumberFormatException ignored) {}

                // Leer fila de encabezados (fila 0)
                Row headerRow = sheet.getRow(0);
                if (headerRow == null) continue;
                Map<String, Integer> cols = mapearHeaders(headerRow);

                for (int ri = 1; ri <= sheet.getLastRowNum(); ri++) {
                    Row row = sheet.getRow(ri);
                    if (row == null) continue;

                    String causa    = strH(row, cols, "CAUSA");
                    String oficio   = strH(row, cols, "OFICIO");
                    String imputado = strH(row, cols, "IMPUTADO");

                    if (isBlank(causa) && isBlank(oficio) && isBlank(imputado)) {
                        omitidos++;
                        continue;
                    }

                    SuspensionCondicional e = new SuspensionCondicional();
                    e.setCausa(causa);
                    e.setOficio(oficio);
                    e.setRecibido(parseDate(strH(row, cols, "RECIBIDO")));
                    e.setImputado(imputado);
                    e.setAsunto(strH(row, cols, "ASUNTO"));
                    e.setPlazo(strH(row, cols, "PLAZO"));
                    e.setDelito(strH(row, cols, "DELITO"));
                    e.setSobreseguimiento(strH(row, cols, "SOBRESEGUIMIENTO", "SOBRESEIMIENTO"));
                    e.setObservaciones(strH(row, cols, "OBSERVACIONES"));
                    e.setAnio(anio);

                    String fueroStr = strH(row, cols, "FUERO");
                    if (fueroStr != null) {
                        String fu = fueroStr.toUpperCase().trim();
                        if (fu.contains("FEDERAL"))  e.setFuero(SuspensionCondicional.Fuero.FEDERAL);
                        else if (fu.contains("ESTATAL") || fu.contains("LOCAL")) e.setFuero(SuspensionCondicional.Fuero.ESTATAL);
                    }

                    todos.add(e);
                }
            }

            if (todos.isEmpty())
                return new ApiResponse(false, "No se encontraron registros válidos en el archivo.");

            // Guardar en lotes
            int batchSize = 500;
            for (int i = 0; i < todos.size(); i += batchSize)
                repo.saveAll(todos.subList(i, Math.min(i + batchSize, todos.size())));

            String msg = "Se importaron " + todos.size() + " registro(s) correctamente.";
            if (omitidos > 0) msg += " Se omitieron " + omitidos + " fila(s) vacías.";

            Map<String, Object> res = new HashMap<>();
            res.put("importados", todos.size());
            res.put("omitidos", omitidos);
            return new ApiResponse(true, msg, res);

        } catch (Exception e) {
            return new ApiResponse(false, "Error al procesar el archivo: " + e.getMessage());
        }
    }

    // ── Años disponibles ─────────────────────────────────────
    @Transactional(readOnly = true)
    public ApiResponse aniosDisponibles() {
        List<Integer> anios = repo.findAll().stream()
            .map(SuspensionCondicional::getAnio)
            .filter(Objects::nonNull)
            .distinct()
            .sorted(Comparator.reverseOrder())
            .toList();
        return new ApiResponse(true, "ok", anios);
    }

    // ── Helpers ──────────────────────────────────────────────
    private SuspensionCondicional toEntity(SuspensionCondicional e, SuspensionCondicionalDTO d) {
        e.setCausa(d.getCausa());
        e.setOficio(d.getOficio());
        e.setRecibido(parseDate(d.getRecibido()));
        e.setImputado(d.getImputado());
        e.setAsunto(d.getAsunto());
        e.setPlazo(d.getPlazo());
        e.setDelito(d.getDelito());
        e.setSobreseguimiento(d.getSobreseguimiento());
        e.setObservaciones(d.getObservaciones());
        e.setAnio(d.getAnio());
        try { e.setFuero(SuspensionCondicional.Fuero.valueOf(d.getFuero())); }
        catch (Exception ignored) { e.setFuero(null); }
        return e;
    }

    private Map<String, Integer> mapearHeaders(Row row) {
        Map<String, Integer> map = new HashMap<>();
        for (int c = 0; c <= row.getLastCellNum(); c++) {
            Cell cell = row.getCell(c, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
            if (cell == null) continue;
            String nombre = fmt.formatCellValue(cell).toUpperCase().trim().replaceAll("\\s+", " ");
            if (!nombre.isBlank()) map.put(nombre, c);
        }
        return map;
    }

    private String strH(Row row, Map<String, Integer> cols, String... variantes) {
        for (String v : variantes) {
            Integer idx = cols.get(v.toUpperCase().trim());
            if (idx != null) {
                String val = fmt.formatCellValue(row.getCell(idx, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL));
                if (val != null && !val.isBlank()) return val.trim();
            }
        }
        // fallback: contains
        for (String v : variantes) {
            String nv = v.toUpperCase().trim();
            for (Map.Entry<String, Integer> entry : cols.entrySet()) {
                if (entry.getKey().contains(nv) || nv.contains(entry.getKey())) {
                    String val = fmt.formatCellValue(row.getCell(entry.getValue(), Row.MissingCellPolicy.RETURN_BLANK_AS_NULL));
                    if (val != null && !val.isBlank()) return val.trim();
                }
            }
        }
        return null;
    }

    private LocalDate parseDate(String s) {
        if (s == null || s.isBlank()) return null;
        String[] patterns = {"yyyy-MM-dd","dd/MM/yyyy","d/M/yyyy","MM/dd/yyyy","dd-MM-yyyy"};
        for (String p : patterns) {
            try { return LocalDate.parse(s.trim(), DateTimeFormatter.ofPattern(p)); }
            catch (DateTimeParseException ignored) {}
        }
        return null;
    }

    private boolean isBlank(String s) { return s == null || s.isBlank(); }
}
