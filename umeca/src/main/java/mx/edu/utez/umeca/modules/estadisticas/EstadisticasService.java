package mx.edu.utez.umeca.modules.estadisticas;

import lombok.RequiredArgsConstructor;
import mx.edu.utez.umeca.kernel.ApiResponse;
import mx.edu.utez.umeca.modules.entrevista.EntrevistaEncuadreRepository;
import mx.edu.utez.umeca.modules.evaluacion.EvaluacionRiesgoRepository;
import mx.edu.utez.umeca.modules.imputado.ImputadoRepository;
import mx.edu.utez.umeca.modules.medidacautelar.MedidaCautelarRepository;
import mx.edu.utez.umeca.modules.seguimiento.Seguimiento;
import mx.edu.utez.umeca.modules.seguimiento.SeguimientoRepository;
import mx.edu.utez.umeca.modules.security.user.User;
import mx.edu.utez.umeca.modules.supervision.SupervisionRepository;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class EstadisticasService {

    private final ImputadoRepository        imputadoRepository;
    private final EntrevistaEncuadreRepository entrevistaRepository;
    private final EvaluacionRiesgoRepository   evaluacionRepository;
    private final MedidaCautelarRepository     medidaRepository;
    private final SupervisionRepository        supervisionRepository;
    private final SeguimientoRepository        seguimientoRepository;

    /**
     * Devuelve el mapa de estadísticas para el rango de fechas indicado.
     * Si no se proporcionan fechas, usa el año en curso completo.
     *
     * @param desdeStr fecha inicio ISO (yyyy-MM-dd), vacío = 1 enero año actual
     * @param hastaStr fecha fin   ISO (yyyy-MM-dd), vacío = 31 dic año actual
     */
    @Transactional(readOnly = true)
    public ApiResponse getEstadisticas(String desdeStr, String hastaStr) {
        return getEstadisticas(desdeStr, hastaStr, null);
    }

    @Transactional(readOnly = true)
    public ApiResponse getEstadisticas(String desdeStr, String hastaStr, String zonaStr) {
        LocalDate today = LocalDate.now();
        LocalDate desde = (desdeStr != null && !desdeStr.isBlank())
                ? LocalDate.parse(desdeStr) : LocalDate.of(today.getYear(), 1, 1);
        LocalDate hasta = (hastaStr != null && !hastaStr.isBlank())
                ? LocalDate.parse(hastaStr) : LocalDate.of(today.getYear(), 12, 31);

        int anio = desde.getYear(); // para series mensuales

        LocalDateTime fInicio  = desde.atStartOfDay();
        LocalDateTime fFin     = hasta.atTime(LocalTime.MAX);
        LocalDate     supInicio = desde;
        LocalDate     supFin    = hasta;

        // zona: null o blank = sin filtro
        final boolean filtrarZona = zonaStr != null && !zonaStr.isBlank() && !zonaStr.equals("TODAS");
        final String  zona        = filtrarZona ? zonaStr : null;

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("desde", desde.toString());
        data.put("hasta", hasta.toString());
        data.put("anio",  anio);
        if (filtrarZona) data.put("zona", zona);

        // ── Tarjetas resumen ──────────────────────────────────────────────────
        // Imputados y evaluaciones: no tienen zona directa → siempre global
        data.put("totalImputados",   imputadoRepository.countByRango(fInicio, fFin));
        data.put("totalFallecidos",  imputadoRepository.countFallecidos());
        data.put("totalActivos",     imputadoRepository.countActivos());
        data.put("totalTta",         medidaRepository.countTtaActivosByRango(fInicio, fFin));
        data.put("totalEvaluaciones",evaluacionRepository.countByRango(fInicio, fFin));

        data.put("totalEntrevistas", filtrarZona
                ? entrevistaRepository.countByRangoYZona(fInicio, fFin, zona)
                : entrevistaRepository.countByRango(fInicio, fFin));
        data.put("totalMedidas", filtrarZona
                ? medidaRepository.countByRangoYZona(fInicio, fFin, zona)
                : medidaRepository.countByRango(fInicio, fFin));

        long totalSup = filtrarZona
                ? supervisionRepository.countByRangoYZona(supInicio, supFin, zona)
                : supervisionRepository.countByRango(supInicio, supFin);
        data.put("totalSupervisiones", totalSup);
        data.put("totalSupervisionPendiente", filtrarZona
                ? supervisionRepository.countByEstadoYRangoYZona("PENDIENTE", supInicio, supFin, zona)
                : supervisionRepository.countByEstadoYRango("PENDIENTE", supInicio, supFin));

        // ── Medidas por tipo, estado, cumplimiento ────────────────────────────
        data.put("medidasPorTipo", filtrarZona ? Map.of(
                "MEDIDA_CAUTELAR",        medidaRepository.countByTipoYRangoYZona("MEDIDA_CAUTELAR",        fInicio, fFin, zona),
                "SUSPENSION_CONDICIONAL", medidaRepository.countByTipoYRangoYZona("SUSPENSION_CONDICIONAL", fInicio, fFin, zona)
        ) : Map.of(
                "MEDIDA_CAUTELAR",        medidaRepository.countByTipoYRango("MEDIDA_CAUTELAR",        fInicio, fFin),
                "SUSPENSION_CONDICIONAL", medidaRepository.countByTipoYRango("SUSPENSION_CONDICIONAL", fInicio, fFin)
        ));
        data.put("medidasPorEstado", filtrarZona ? Map.of(
                "ACTIVO",     medidaRepository.countByEstadoYRangoYZona("ACTIVO",     fInicio, fFin, zona),
                "SUSPENDIDO", medidaRepository.countByEstadoYRangoYZona("SUSPENDIDO", fInicio, fFin, zona),
                "FINALIZADO", medidaRepository.countByEstadoYRangoYZona("FINALIZADO", fInicio, fFin, zona),
                "LEVANTADO",  medidaRepository.countByEstadoYRangoYZona("LEVANTADO",  fInicio, fFin, zona),
                "REVOCADO",   medidaRepository.countByEstadoYRangoYZona("REVOCADO",   fInicio, fFin, zona)
        ) : Map.of(
                "ACTIVO",     medidaRepository.countByEstadoYRango("ACTIVO",     fInicio, fFin),
                "SUSPENDIDO", medidaRepository.countByEstadoYRango("SUSPENDIDO", fInicio, fFin),
                "FINALIZADO", medidaRepository.countByEstadoYRango("FINALIZADO", fInicio, fFin),
                "LEVANTADO",  medidaRepository.countByEstadoYRango("LEVANTADO",  fInicio, fFin),
                "REVOCADO",   medidaRepository.countByEstadoYRango("REVOCADO",   fInicio, fFin)
        ));
        data.put("cambiadoAScp",   filtrarZona ? medidaRepository.countByCambiadoAScpYRangoYZona(fInicio, fFin, zona) : medidaRepository.countByCambiadoAScpYRango(fInicio, fFin));
        data.put("cambiadoAMc",    filtrarZona ? medidaRepository.countByCambiadoAMcYRangoYZona(fInicio, fFin, zona) : medidaRepository.countByCambiadoAMcYRango(fInicio, fFin));
        data.put("levantamientos", filtrarZona ? medidaRepository.countByEstadoYRangoYZona("LEVANTADO", fInicio, fFin, zona) : medidaRepository.countByEstadoYRango("LEVANTADO", fInicio, fFin));
        data.put("revocados",      filtrarZona ? medidaRepository.countByEstadoYRangoYZona("REVOCADO",  fInicio, fFin, zona) : medidaRepository.countByEstadoYRango("REVOCADO",  fInicio, fFin));
        data.put("cumplimientoMC", filtrarZona ? Map.of(
                "CUMPLIENDO",   medidaRepository.countByCumplimientoYTipoYRangoYZona("CUMPLIMIENTO",   "MEDIDA_CAUTELAR",        fInicio, fFin, zona),
                "INCUMPLIENDO", medidaRepository.countByCumplimientoYTipoYRangoYZona("INCUMPLIMIENTO", "MEDIDA_CAUTELAR",        fInicio, fFin, zona)
        ) : Map.of(
                "CUMPLIENDO",   medidaRepository.countByCumplimientoYTipoYRango("CUMPLIMIENTO",   "MEDIDA_CAUTELAR",        fInicio, fFin),
                "INCUMPLIENDO", medidaRepository.countByCumplimientoYTipoYRango("INCUMPLIMIENTO", "MEDIDA_CAUTELAR",        fInicio, fFin)
        ));
        data.put("cumplimientoSCP", filtrarZona ? Map.of(
                "CUMPLIENDO",   medidaRepository.countByCumplimientoYTipoYRangoYZona("CUMPLIMIENTO",   "SUSPENSION_CONDICIONAL", fInicio, fFin, zona),
                "INCUMPLIENDO", medidaRepository.countByCumplimientoYTipoYRangoYZona("INCUMPLIMIENTO", "SUSPENSION_CONDICIONAL", fInicio, fFin, zona)
        ) : Map.of(
                "CUMPLIENDO",   medidaRepository.countByCumplimientoYTipoYRango("CUMPLIMIENTO",   "SUSPENSION_CONDICIONAL", fInicio, fFin),
                "INCUMPLIENDO", medidaRepository.countByCumplimientoYTipoYRango("INCUMPLIMIENTO", "SUSPENSION_CONDICIONAL", fInicio, fFin)
        ));

        // ── Supervisiones ─────────────────────────────────────────────────────
        data.put("supervisionesPorTipo", filtrarZona ? Map.of(
                "LLAMADA",             supervisionRepository.countByTipoYRangoYZona("LLAMADA",             supInicio, supFin, zona),
                "VISITA_DOMICILIARIA", supervisionRepository.countByTipoYRangoYZona("VISITA_DOMICILIARIA", supInicio, supFin, zona)
        ) : Map.of(
                "LLAMADA",             supervisionRepository.countByTipoYRango("LLAMADA",             supInicio, supFin),
                "VISITA_DOMICILIARIA", supervisionRepository.countByTipoYRango("VISITA_DOMICILIARIA", supInicio, supFin)
        ));
        data.put("supervisionesPorEstado", filtrarZona ? Map.of(
                "PENDIENTE",     supervisionRepository.countByEstadoYRangoYZona("PENDIENTE",     supInicio, supFin, zona),
                "REALIZADA",     supervisionRepository.countByEstadoYRangoYZona("REALIZADA",     supInicio, supFin, zona),
                "NO_CONTACTADO", supervisionRepository.countByEstadoYRangoYZona("NO_CONTACTADO", supInicio, supFin, zona),
                "CANCELADA",     supervisionRepository.countByEstadoYRangoYZona("CANCELADA",     supInicio, supFin, zona)
        ) : Map.of(
                "PENDIENTE",     supervisionRepository.countByEstadoYRango("PENDIENTE",     supInicio, supFin),
                "REALIZADA",     supervisionRepository.countByEstadoYRango("REALIZADA",     supInicio, supFin),
                "NO_CONTACTADO", supervisionRepository.countByEstadoYRango("NO_CONTACTADO", supInicio, supFin),
                "CANCELADA",     supervisionRepository.countByEstadoYRango("CANCELADA",     supInicio, supFin)
        ));

        // ── Entrevistas ───────────────────────────────────────────────────────
        data.put("entrevistasPorTipo", filtrarZona ? Map.of(
                "MC",          entrevistaRepository.countByTipoYRangoYZona("MC",  fInicio, fFin, zona),
                "SCP",         entrevistaRepository.countByTipoYRangoYZona("SCP", fInicio, fFin, zona),
                "SIN_ASIGNAR", entrevistaRepository.countByTipoNullYRangoYZona(fInicio, fFin, zona)
        ) : Map.of(
                "MC",          entrevistaRepository.countByTipoYRango("MC",  fInicio, fFin),
                "SCP",         entrevistaRepository.countByTipoYRango("SCP", fInicio, fFin),
                "SIN_ASIGNAR", entrevistaRepository.countByTipoNullYRango(fInicio, fFin)
        ));

        // ── Género ────────────────────────────────────────────────────────────
        data.put("generoPorMC",  agruparGenero(filtrarZona
                ? medidaRepository.countPorGeneroYTipoYRangoYZona("MEDIDA_CAUTELAR",        fInicio, fFin, zona)
                : medidaRepository.countPorGeneroYTipoYRango("MEDIDA_CAUTELAR",        fInicio, fFin)));
        data.put("generoPorSCP", agruparGenero(filtrarZona
                ? medidaRepository.countPorGeneroYTipoYRangoYZona("SUSPENSION_CONDICIONAL", fInicio, fFin, zona)
                : medidaRepository.countPorGeneroYTipoYRango("SUSPENSION_CONDICIONAL", fInicio, fFin)));

        // ── Series mensuales del año de 'desde' (para gráficas de tendencia) ─
        data.put("medidas_por_mes",       medidaRepository.countPorMes(anio));
        data.put("fallecidos_por_mes",    imputadoRepository.countFallecidosPorMes(anio));
        data.put("tta_por_mes",           medidaRepository.countTtaPorMes(anio));
        data.put("levantados_por_mes",    medidaRepository.countPorMesYEstado("LEVANTADO", anio));
        data.put("revocados_por_mes",     medidaRepository.countPorMesYEstado("REVOCADO",  anio));
        data.put("scp_cambio_por_mes",    medidaRepository.countByCambiadoAScpPorMes(anio));
        data.put("mc_cambio_por_mes",     medidaRepository.countByCambiadoAMcPorMes(anio));
        data.put("llamadas_por_mes",      supervisionRepository.countPorMesYTipo(anio, "LLAMADA"));
        data.put("visitas_por_mes",       supervisionRepository.countPorMesYTipo(anio, "VISITA_DOMICILIARIA"));
        data.put("supervisiones_por_mes", supervisionRepository.countPorMes(anio));
        data.put("evaluaciones_por_mes",  evaluacionRepository.countPorMes(anio));

        // ── Fracciones más usadas ─────────────────────────────────────────────
        data.put("fraccionesMasUsadasMC",  medidaRepository.fraccionesMasUsadas("MEDIDA_CAUTELAR"));
        data.put("fraccionesMasUsadasSCP", medidaRepository.fraccionesMasUsadas("SUSPENSION_CONDICIONAL"));

        return new ApiResponse(true, "Estadísticas obtenidas", data);
    }

    // ── Exportación Excel ─────────────────────────────────────────────────────

    /**
     * Genera un libro Excel con 4 hojas: Resumen General, Series Mensuales, Género
     * y Semanal (semanas 1-4 del mes o trimestres si solo se filtra por año).
     * Reutiliza {@link #getEstadisticas} para los datos, por lo que el filtro de
     * semana no aplica aquí.
     *
     * @return bytes del archivo .xlsx listo para descargar
     */
    @Transactional(readOnly = true)
    public byte[] exportarExcel(String desdeStr, String hastaStr) throws Exception {
        return exportarExcel(desdeStr, hastaStr, null);
    }

    @Transactional(readOnly = true)
    public byte[] exportarExcel(String desdeStr, String hastaStr, String zonaStr) throws Exception {
        LocalDate today = LocalDate.now();
        LocalDate desde = (desdeStr != null && !desdeStr.isBlank())
                ? LocalDate.parse(desdeStr) : LocalDate.of(today.getYear(), 1, 1);
        LocalDate hasta = (hastaStr != null && !hastaStr.isBlank())
                ? LocalDate.parse(hastaStr) : LocalDate.of(today.getYear(), 12, 31);

        long diasRango = java.time.temporal.ChronoUnit.DAYS.between(desde, hasta) + 1;

        ApiResponse resp = getEstadisticas(desdeStr, hastaStr, zonaStr);
        @SuppressWarnings("unchecked")
        Map<String, Object> d = (Map<String, Object>) resp.getData();

        String[] MESES_FULL = {"","Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"};
        String periodoLabel = desde.toString() + " — " + hasta.toString();

        // Columnas de las hojas periódicas
        String[] COLS_PERIODICAS = {"Período","Imputados","Entrevistas","Evaluaciones","Medidas MC/SCP","Supervisiones","Sup. Pendientes"};

        try (XSSFWorkbook wb = new XSSFWorkbook()) {

            // ── Estilos ──────────────────────────────────────────────────────
            CellStyle titulo = wb.createCellStyle();
            Font ft = wb.createFont(); ft.setBold(true); ft.setFontHeightInPoints((short) 14); ft.setColor(IndexedColors.WHITE.getIndex());
            titulo.setFont(ft); titulo.setFillForegroundColor(IndexedColors.DARK_GREEN.getIndex()); titulo.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            titulo.setAlignment(HorizontalAlignment.CENTER);

            CellStyle seccion = wb.createCellStyle();
            Font fs = wb.createFont(); fs.setBold(true); fs.setFontHeightInPoints((short) 11); fs.setColor(IndexedColors.WHITE.getIndex());
            seccion.setFont(fs); seccion.setFillForegroundColor(IndexedColors.DARK_TEAL.getIndex()); seccion.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            CellStyle etiqueta = wb.createCellStyle();
            Font fe = wb.createFont(); fe.setBold(true);
            etiqueta.setFont(fe); etiqueta.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex()); etiqueta.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            CellStyle numero = wb.createCellStyle(); numero.setAlignment(HorizontalAlignment.CENTER);

            // ── Hoja 1: Resumen General ───────────────────────────────────────
            Sheet s1 = wb.createSheet("Resumen General");
            s1.setColumnWidth(0, 9000); s1.setColumnWidth(1, 4000);

            Row r0 = s1.createRow(0);
            Cell c0 = r0.createCell(0); c0.setCellValue("ESTADÍSTICAS UMECA — " + periodoLabel); c0.setCellStyle(titulo);
            s1.addMergedRegion(new CellRangeAddress(0, 0, 0, 1));

            int row = 2;
            row = agregarSeccion(s1, row, seccion, "RESUMEN GENERAL");
            row = agregarFila(s1, row, etiqueta, numero, "Imputados registrados",    toLong(d.get("totalImputados")));
            row = agregarFila(s1, row, etiqueta, numero, "Entrevistas de encuadre",  toLong(d.get("totalEntrevistas")));
            row = agregarFila(s1, row, etiqueta, numero, "Evaluaciones de riesgo",   toLong(d.get("totalEvaluaciones")));
            row = agregarFila(s1, row, etiqueta, numero, "Medidas cautelares / SCP", toLong(d.get("totalMedidas")));
            row = agregarFila(s1, row, etiqueta, numero, "Supervisiones totales",    toLong(d.get("totalSupervisiones")));
            row = agregarFila(s1, row, etiqueta, numero, "Supervisiones pendientes", toLong(d.get("totalSupervisionPendiente")));
            row++;

            @SuppressWarnings("unchecked") Map<String,Object> mPorTipo = (Map<String,Object>) d.get("medidasPorTipo");
            row = agregarSeccion(s1, row, seccion, "MEDIDAS POR TIPO");
            row = agregarFila(s1, row, etiqueta, numero, "Medida Cautelar (MC)",         toLong(mPorTipo.get("MEDIDA_CAUTELAR")));
            row = agregarFila(s1, row, etiqueta, numero, "Suspensión Condicional (SCP)", toLong(mPorTipo.get("SUSPENSION_CONDICIONAL")));
            row++;

            @SuppressWarnings("unchecked") Map<String,Object> mPorEstado = (Map<String,Object>) d.get("medidasPorEstado");
            row = agregarSeccion(s1, row, seccion, "MEDIDAS POR ESTADO");
            row = agregarFila(s1, row, etiqueta, numero, "Activo",     toLong(mPorEstado.get("ACTIVO")));
            row = agregarFila(s1, row, etiqueta, numero, "Suspendido", toLong(mPorEstado.get("SUSPENDIDO")));
            row = agregarFila(s1, row, etiqueta, numero, "Finalizado", toLong(mPorEstado.get("FINALIZADO")));
            row++;

            @SuppressWarnings("unchecked") Map<String,Object> supTipo = (Map<String,Object>) d.get("supervisionesPorTipo");
            row = agregarSeccion(s1, row, seccion, "SUPERVISIONES POR TIPO");
            row = agregarFila(s1, row, etiqueta, numero, "Llamadas",              toLong(supTipo.get("LLAMADA")));
            row = agregarFila(s1, row, etiqueta, numero, "Visitas domiciliarias", toLong(supTipo.get("VISITA_DOMICILIARIA")));
            row++;

            @SuppressWarnings("unchecked") Map<String,Object> supEst = (Map<String,Object>) d.get("supervisionesPorEstado");
            row = agregarSeccion(s1, row, seccion, "SUPERVISIONES POR ESTADO");
            row = agregarFila(s1, row, etiqueta, numero, "Pendiente",     toLong(supEst.get("PENDIENTE")));
            row = agregarFila(s1, row, etiqueta, numero, "Realizada",     toLong(supEst.get("REALIZADA")));
            row = agregarFila(s1, row, etiqueta, numero, "No contactado", toLong(supEst.get("NO_CONTACTADO")));
            row = agregarFila(s1, row, etiqueta, numero, "Cancelada",     toLong(supEst.get("CANCELADA")));
            row++;

            @SuppressWarnings("unchecked") Map<String,Object> entTipo = (Map<String,Object>) d.get("entrevistasPorTipo");
            row = agregarSeccion(s1, row, seccion, "ENTREVISTAS POR TIPO");
            row = agregarFila(s1, row, etiqueta, numero, "MC",          toLong(entTipo.get("MC")));
            row = agregarFila(s1, row, etiqueta, numero, "SCP",         toLong(entTipo.get("SCP")));
            row = agregarFila(s1, row, etiqueta, numero, "Sin asignar", toLong(entTipo.get("SIN_ASIGNAR")));

            // ── Hoja 2: Por Año (solo si el rango cubre más de 1 año) ─────────
            if (diasRango > 366) {
                Sheet sAnio = wb.createSheet("Por Año");
                crearEncabezadoPeriodico(sAnio, etiqueta, COLS_PERIODICAS);
                int anioIni = desde.getYear(); int anioFin = hasta.getYear();
                int rAnio = 1;
                for (int a = anioIni; a <= anioFin; a++) {
                    LocalDate ini = a == anioIni ? desde : LocalDate.of(a, 1, 1);
                    LocalDate fin = a == anioFin ? hasta  : LocalDate.of(a, 12, 31);
                    @SuppressWarnings("unchecked")
                    Map<String,Object> da = (Map<String,Object>) getEstadisticas(ini.toString(), fin.toString()).getData();
                    agregarFilaPeriodica(sAnio, rAnio++, numero, etiqueta, String.valueOf(a), da);
                }
            }

            // ── Hoja 3: Por Mes (si el rango es > 1 mes) ─────────────────────
            if (diasRango > 31) {
                Sheet sMes = wb.createSheet("Por Mes");
                crearEncabezadoPeriodico(sMes, etiqueta, COLS_PERIODICAS);
                int rMes = 1;
                LocalDate cursor = desde.withDayOfMonth(1);
                while (!cursor.isAfter(hasta)) {
                    LocalDate ini = cursor.isBefore(desde) ? desde : cursor;
                    LocalDate fin = cursor.withDayOfMonth(cursor.lengthOfMonth());
                    if (fin.isAfter(hasta)) fin = hasta;
                    @SuppressWarnings("unchecked")
                    Map<String,Object> dm = (Map<String,Object>) getEstadisticas(ini.toString(), fin.toString()).getData();
                    String label = MESES_FULL[cursor.getMonthValue()] + " " + cursor.getYear();
                    agregarFilaPeriodica(sMes, rMes++, numero, etiqueta, label, dm);
                    cursor = cursor.plusMonths(1);
                }
            }

            // ── Hoja 4: Por Semana (si el rango es > 7 días) ─────────────────
            if (diasRango > 7) {
                Sheet sSem = wb.createSheet("Por Semana");
                crearEncabezadoPeriodico(sSem, etiqueta, COLS_PERIODICAS);
                int rSem = 1;
                LocalDate semIni = desde;
                while (!semIni.isAfter(hasta)) {
                    LocalDate semFin = semIni.plusDays(6);
                    if (semFin.isAfter(hasta)) semFin = hasta;
                    @SuppressWarnings("unchecked")
                    Map<String,Object> ds = (Map<String,Object>) getEstadisticas(semIni.toString(), semFin.toString()).getData();
                    String label = semIni + " / " + semFin;
                    agregarFilaPeriodica(sSem, rSem++, numero, etiqueta, label, ds);
                    semIni = semFin.plusDays(1);
                }
            }

            // ── Hoja 5: Por Día (solo si el rango es ≤ 92 días ~3 meses) ─────
            if (diasRango <= 92) {
                Sheet sDia = wb.createSheet("Por Día");
                crearEncabezadoPeriodico(sDia, etiqueta, COLS_PERIODICAS);
                int rDia = 1;
                LocalDate dia = desde;
                while (!dia.isAfter(hasta)) {
                    @SuppressWarnings("unchecked")
                    Map<String,Object> dd = (Map<String,Object>) getEstadisticas(dia.toString(), dia.toString()).getData();
                    agregarFilaPeriodica(sDia, rDia++, numero, etiqueta, dia.toString(), dd);
                    dia = dia.plusDays(1);
                }
            }

            // ── Hoja 6: Género ────────────────────────────────────────────────
            Sheet s3 = wb.createSheet("Género");
            s3.setColumnWidth(0, 5000); s3.setColumnWidth(1, 3500); s3.setColumnWidth(2, 3500);

            Row rg0 = s3.createRow(0);
            Cell cg0 = rg0.createCell(0); cg0.setCellValue("Género"); cg0.setCellStyle(etiqueta);
            Cell cg1 = rg0.createCell(1); cg1.setCellValue("MC"); cg1.setCellStyle(etiqueta);
            Cell cg2 = rg0.createCell(2); cg2.setCellValue("SCP"); cg2.setCellStyle(etiqueta);

            @SuppressWarnings("unchecked") Map<String,Long> gMC  = (Map<String,Long>) d.get("generoPorMC");
            @SuppressWarnings("unchecked") Map<String,Long> gSCP = (Map<String,Long>) d.get("generoPorSCP");
            String[] generos = {"Masculino","Femenino","No binario","Sin dato"};
            int gr = 1;
            for (String g : generos) {
                Row rg = s3.createRow(gr++);
                rg.createCell(0).setCellValue(g);
                rg.createCell(1).setCellValue(gMC.getOrDefault(g, 0L));
                rg.createCell(2).setCellValue(gSCP.getOrDefault(g, 0L));
            }

            // ── Hoja 7: Seguimientos por zona ─────────────────────────────────
            Sheet s5 = wb.createSheet("Seguimientos por Zona");
            s5.setColumnWidth(0, 10000);
            String[] ZONAS_SEG = {"XOCHITEPEC", "CUAUTLA", "JOJUTLA"};
            for (int i = 0; i < ZONAS_SEG.length; i++) s5.setColumnWidth(i + 1, 3500);
            s5.setColumnWidth(ZONAS_SEG.length + 1, 3500);

            Row rs5t = s5.createRow(0);
            Cell cs5t = rs5t.createCell(0);
            cs5t.setCellValue("ACTIVIDAD DE SEGUIMIENTOS — " + periodoLabel);
            cs5t.setCellStyle(titulo);
            s5.addMergedRegion(new CellRangeAddress(0, 0, 0, ZONAS_SEG.length + 1));

            Row rs5h = s5.createRow(1);
            Cell cs5h0 = rs5h.createCell(0); cs5h0.setCellValue("TIPO DE ACTIVIDAD"); cs5h0.setCellStyle(etiqueta);
            for (int i = 0; i < ZONAS_SEG.length; i++) {
                Cell c = rs5h.createCell(i + 1); c.setCellValue(ZONAS_SEG[i]); c.setCellStyle(etiqueta);
            }
            Cell cs5hT = rs5h.createCell(ZONAS_SEG.length + 1); cs5hT.setCellValue("TOTAL"); cs5hT.setCellStyle(etiqueta);

            LocalDateTime inicioSeg = desde.atStartOfDay();
            LocalDateTime finSeg    = hasta.atTime(LocalTime.MAX);
            List<Seguimiento> segs = seguimientoRepository.findByRango(inicioSeg, finSeg);

            Map<String, Map<String, Long>> porZona = new java.util.LinkedHashMap<>();
            for (String z : ZONAS_SEG) porZona.put(z, new java.util.HashMap<>());
            for (Seguimiento sg : segs) {
                String zona = (sg.getRegistradoPor() != null && sg.getRegistradoPor().getZona() != null)
                        ? sg.getRegistradoPor().getZona().name() : "SIN_ZONA";
                String tipo = sg.getTipoActividad().name();
                if (porZona.containsKey(zona)) porZona.get(zona).merge(tipo, 1L, Long::sum);
            }

            String[][] TIPOS_SEG = {
                {"SUPERVISIÓN", null},
                {"OFICIO_CSP",             "Oficio emitido de CSP"},
                {"OFICIO_DIVERSO",          "Oficio emitido diverso"},
                {"REPORTE_INCUMPLIMIENTO",  "Reporte de incumplimiento"},
                {"REPORTE_NO_PRESENTACION", "Reporte de no presentación"},
                {"SOLICITUD_COLABORACION",  "Solicitud de colaboración"},
                {"SOLICITUD_INFO_JUEZ",     "Solicitud de información al Juez"},
                {"SOLICITUD_INFO_MP",       "Solicitud de información al M.P."},
                {"INFORME_FINAL",           "Informe final"},
                {"CANALIZACION",            "Canalización"},
                {"VISITA_DOMICILIARIA",     "Visita domiciliaria"},
                {"AUDIENCIA_TTA",           "Audiencia TTA"},
                {"LLAMADA_TELEFONICA",      "Llamada telefónica"},
                {"EVALUACIÓN", null},
                {"OFICIO_REGISTRO",         "Oficio de registro"},
                {"OPINION_TECNICA_FC",      "Opinión técnica F.C."},
                {"OPINION_TECNICA_FF",      "Opinión técnica F.F."},
                {"NEGACION_FC",             "Negación F.C."},
                {"NEGACION_FF",             "Negación F.F."},
                {"INFORME_FC",              "Informe F.C."},
                {"INFORME_FF",              "Informe F.F."},
                {"OTRO",                    "Otro"},
            };

            int rs5row = 2;
            long[] totalesZona = new long[ZONAS_SEG.length];
            long granTotal = 0;

            for (String[] tipo : TIPOS_SEG) {
                if (tipo[1] == null) {
                    Row rSec = s5.createRow(rs5row++);
                    Cell cSec = rSec.createCell(0); cSec.setCellValue(tipo[0]); cSec.setCellStyle(seccion);
                    s5.addMergedRegion(new CellRangeAddress(rs5row - 1, rs5row - 1, 0, ZONAS_SEG.length + 1));
                } else {
                    Row rTipo = s5.createRow(rs5row++);
                    Cell cLabel = rTipo.createCell(0); cLabel.setCellValue(tipo[1]); cLabel.setCellStyle(etiqueta);
                    long totalFila = 0;
                    for (int z = 0; z < ZONAS_SEG.length; z++) {
                        long val = porZona.get(ZONAS_SEG[z]).getOrDefault(tipo[0], 0L);
                        Cell cVal = rTipo.createCell(z + 1); cVal.setCellValue(val); cVal.setCellStyle(numero);
                        totalesZona[z] += val; totalFila += val;
                    }
                    Cell cTotalFila = rTipo.createCell(ZONAS_SEG.length + 1);
                    cTotalFila.setCellValue(totalFila); cTotalFila.setCellStyle(numero);
                    granTotal += totalFila;
                }
            }

            Row rGT = s5.createRow(rs5row);
            Cell cGTLabel = rGT.createCell(0); cGTLabel.setCellValue("TOTAL GENERAL"); cGTLabel.setCellStyle(seccion);
            for (int z = 0; z < ZONAS_SEG.length; z++) {
                Cell cZT = rGT.createCell(z + 1); cZT.setCellValue(totalesZona[z]); cZT.setCellStyle(seccion);
            }
            Cell cGT = rGT.createCell(ZONAS_SEG.length + 1); cGT.setCellValue(granTotal); cGT.setCellStyle(seccion);

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            wb.write(out);
            return out.toByteArray();
        }
    }

    private void crearEncabezadoPeriodico(Sheet sheet, CellStyle estilo, String[] cols) {
        sheet.setColumnWidth(0, 6000);
        for (int i = 1; i < cols.length; i++) sheet.setColumnWidth(i, 3800);
        Row rh = sheet.createRow(0);
        for (int i = 0; i < cols.length; i++) {
            Cell c = rh.createCell(i); c.setCellValue(cols[i]); c.setCellStyle(estilo);
        }
    }

    private void agregarFilaPeriodica(Sheet sheet, int rowNum, CellStyle estiloNum, CellStyle estiloEtq, String periodo, Map<String,Object> d) {
        Row r = sheet.createRow(rowNum);
        Cell cp = r.createCell(0); cp.setCellValue(periodo); cp.setCellStyle(estiloEtq);
        r.createCell(1).setCellValue(toLong(d.get("totalImputados")));
        r.createCell(2).setCellValue(toLong(d.get("totalEntrevistas")));
        r.createCell(3).setCellValue(toLong(d.get("totalEvaluaciones")));
        r.createCell(4).setCellValue(toLong(d.get("totalMedidas")));
        r.createCell(5).setCellValue(toLong(d.get("totalSupervisiones")));
        r.createCell(6).setCellValue(toLong(d.get("totalSupervisionPendiente")));
        for (int i = 1; i <= 6; i++) r.getCell(i).setCellStyle(estiloNum);
    }

    // ── Helpers Excel ─────────────────────────────────────────────────────────

    private int agregarSeccion(Sheet s, int row, CellStyle estilo, String texto) {
        Row r = s.createRow(row); Cell c = r.createCell(0); c.setCellValue(texto); c.setCellStyle(estilo);
        return row + 1;
    }

    private int agregarFila(Sheet s, int row, CellStyle estiloEtiqueta, CellStyle estiloNum, String etiqueta, long valor) {
        Row r = s.createRow(row);
        Cell ce = r.createCell(0); ce.setCellValue(etiqueta); ce.setCellStyle(estiloEtiqueta);
        Cell cv = r.createCell(1); cv.setCellValue(valor); cv.setCellStyle(estiloNum);
        return row + 1;
    }

    private long toLong(Object o) {
        if (o == null) return 0L;
        return ((Number) o).longValue();
    }

    private long[] toArray(List<Object[]> rows) {
        long[] arr = new long[12];
        if (rows != null) rows.forEach(r -> { int m = ((Number) r[0]).intValue(); if (m >= 1 && m <= 12) arr[m-1] = ((Number) r[1]).longValue(); });
        return arr;
    }

    /** Convierte lista de [genero, count] en un Map {Masculino: N, Femenino: N, "No binario": N, null: N} */
    private Map<String, Long> agruparGenero(List<Object[]> rows) {
        Map<String, Long> result = new LinkedHashMap<>();
        result.put("Masculino",  0L);
        result.put("Femenino",   0L);
        result.put("No binario", 0L);
        result.put("Sin dato",   0L);
        for (Object[] row : rows) {
            String g     = row[0] != null ? row[0].toString() : "Sin dato";
            long   count = ((Number) row[1]).longValue();
            result.merge(g, count, Long::sum);
        }
        return result;
    }
}
