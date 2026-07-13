package mx.edu.utez.umeca.modules.estadisticas;

import lombok.RequiredArgsConstructor;
import mx.edu.utez.umeca.kernel.ApiResponse;
import mx.edu.utez.umeca.modules.entrevista.EntrevistaEncuadreRepository;
import mx.edu.utez.umeca.modules.evaluacion.EvaluacionRiesgoRepository;
import mx.edu.utez.umeca.modules.imputado.ImputadoRepository;
import mx.edu.utez.umeca.modules.medidacautelar.MedidaCautelarRepository;
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

    /**
     * Devuelve el mapa de estadísticas para el período indicado.
     * Soporta tres niveles de granularidad en cascada:
     * <ol>
     *   <li><b>Semana</b>: rango de días dentro de un mes (semana 1-4)</li>
     *   <li><b>Mes</b>: mes completo dentro del año</li>
     *   <li><b>Año</b>: todo el año (valor por defecto)</li>
     * </ol>
     * Siempre se incluyen series mensuales del año completo para las gráficas de tendencia.
     *
     * @param anioParam  año (0 = año actual)
     * @param mesParam   mes 1-12 (0 = sin filtro de mes)
     * @param semanaParam semana 1-4 dentro del mes (solo válida cuando mesParam > 0)
     */
    @Transactional(readOnly = true)
    public ApiResponse getEstadisticas(int anioParam, int mesParam, int semanaParam) {
        int anio   = anioParam  > 0 ? anioParam  : LocalDate.now().getYear();
        int mes    = mesParam   > 0 ? mesParam   : 0;
        int semana = semanaParam > 0 && mes > 0 ? semanaParam : 0; // semana solo válida con mes

        // Calcular rango de fechas para semana (LocalDateTime para comparar con createdAt)
        LocalDateTime rangoInicio = null;
        LocalDateTime rangoFin    = null;
        if (semana > 0) {
            int diaInicio = (semana - 1) * 7 + 1;
            int ultimoDia = LocalDate.of(anio, mes, 1).lengthOfMonth();
            int diaFin    = semana == 4 ? ultimoDia : Math.min(semana * 7, ultimoDia);
            rangoInicio = LocalDateTime.of(anio, mes, diaInicio, 0, 0, 0);
            rangoFin    = LocalDateTime.of(anio, mes, diaFin, 23, 59, 59);
        }

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("anio",   anio);
        data.put("mes",    mes);
        data.put("semana", semana);

        final LocalDateTime fInicio = rangoInicio;
        final LocalDateTime fFin    = rangoFin;

        // ── Tarjetas resumen ──────────────────────────────────────────────────
        data.put("totalImputados", semana > 0
                ? imputadoRepository.countByRango(fInicio, fFin)
                : mes > 0 ? imputadoRepository.countByAnioMes(anio, mes) : imputadoRepository.countByAnio(anio));

        // Fallecidos: siempre total acumulado (independiente del filtro año/mes)
        data.put("totalFallecidos", imputadoRepository.countFallecidos());
        data.put("totalActivos",    imputadoRepository.countActivos());

        // TTA: personas activas en programa TTA
        data.put("totalTta", mes > 0
                ? medidaRepository.countTtaActivosByAnioMes(anio, mes)
                : medidaRepository.countTtaActivosByAnio(anio));

        data.put("totalEntrevistas", semana > 0
                ? entrevistaRepository.countByRango(fInicio, fFin)
                : mes > 0 ? entrevistaRepository.countByAnioMes(anio, mes) : entrevistaRepository.countByAnio(anio));

        data.put("totalEvaluaciones", semana > 0
                ? evaluacionRepository.countByRango(fInicio, fFin)
                : mes > 0 ? evaluacionRepository.countByAnioMes(anio, mes) : evaluacionRepository.countByAnio(anio));

        data.put("totalMedidas", semana > 0
                ? medidaRepository.countByRango(fInicio, fFin)
                : mes > 0 ? medidaRepository.countByAnioMes(anio, mes) : medidaRepository.countByAnio(anio));

        // Supervisión usa fechaProgramada (LocalDate), convertir desde LocalDateTime
        LocalDate supInicio = semana > 0 ? fInicio.toLocalDate() : null;
        LocalDate supFin    = semana > 0 ? fFin.toLocalDate()    : null;

        long totalSup = semana > 0
                ? supervisionRepository.countByRango(supInicio, supFin)
                : mes > 0 ? supervisionRepository.countByAnioMes(anio, mes) : supervisionRepository.countByAnio(anio);
        data.put("totalSupervisionPendiente", semana > 0
                ? supervisionRepository.countByEstadoYRango("PENDIENTE", supInicio, supFin)
                : mes > 0 ? supervisionRepository.countByEstadoAndAnioMes("PENDIENTE", anio, mes) : supervisionRepository.countByEstadoAndAnio("PENDIENTE", anio));
        data.put("totalSupervisiones", totalSup);

        // ── Medidas por tipo, estado, cumplimiento, supervisiones, entrevistas ─
        if (semana > 0) {
            data.put("medidasPorTipo", Map.of(
                    "MEDIDA_CAUTELAR",        medidaRepository.countByTipoYRango("MEDIDA_CAUTELAR",        fInicio, fFin),
                    "SUSPENSION_CONDICIONAL", medidaRepository.countByTipoYRango("SUSPENSION_CONDICIONAL", fInicio, fFin)
            ));
            data.put("medidasPorEstado", Map.of(
                    "ACTIVO",     medidaRepository.countByEstadoYRango("ACTIVO",     fInicio, fFin),
                    "SUSPENDIDO", medidaRepository.countByEstadoYRango("SUSPENDIDO", fInicio, fFin),
                    "FINALIZADO", medidaRepository.countByEstadoYRango("FINALIZADO", fInicio, fFin),
                    "LEVANTADO",  medidaRepository.countByEstadoYRango("LEVANTADO",  fInicio, fFin),
                    "REVOCADO",   medidaRepository.countByEstadoYRango("REVOCADO",   fInicio, fFin)
            ));
            data.put("cambiadoAScp",   medidaRepository.countByCambiadoAScpYRango(fInicio, fFin));
            data.put("levantamientos", medidaRepository.countByEstadoYRango("LEVANTADO", fInicio, fFin));
            data.put("revocados",      medidaRepository.countByEstadoYRango("REVOCADO",  fInicio, fFin));
            data.put("cumplimientoMC", Map.of(
                    "CUMPLIENDO",   medidaRepository.countByCumplimientoYTipoYRango("CUMPLIENDO",   "MEDIDA_CAUTELAR",        fInicio, fFin),
                    "INCUMPLIENDO", medidaRepository.countByCumplimientoYTipoYRango("INCUMPLIENDO", "MEDIDA_CAUTELAR",        fInicio, fFin)
            ));
            data.put("cumplimientoSCP", Map.of(
                    "CUMPLIENDO",   medidaRepository.countByCumplimientoYTipoYRango("CUMPLIENDO",   "SUSPENSION_CONDICIONAL", fInicio, fFin),
                    "INCUMPLIENDO", medidaRepository.countByCumplimientoYTipoYRango("INCUMPLIENDO", "SUSPENSION_CONDICIONAL", fInicio, fFin)
            ));
            data.put("supervisionesPorTipo", Map.of(
                    "LLAMADA",             supervisionRepository.countByTipoYRango("LLAMADA",             supInicio, supFin),
                    "VISITA_DOMICILIARIA", supervisionRepository.countByTipoYRango("VISITA_DOMICILIARIA", supInicio, supFin)
            ));
            data.put("supervisionesPorEstado", Map.of(
                    "PENDIENTE",     supervisionRepository.countByEstadoYRango("PENDIENTE",     supInicio, supFin),
                    "REALIZADA",     supervisionRepository.countByEstadoYRango("REALIZADA",     supInicio, supFin),
                    "NO_CONTACTADO", supervisionRepository.countByEstadoYRango("NO_CONTACTADO", supInicio, supFin),
                    "CANCELADA",     supervisionRepository.countByEstadoYRango("CANCELADA",     supInicio, supFin)
            ));
            data.put("entrevistasPorTipo", Map.of(
                    "MC",          entrevistaRepository.countByTipoYRango("MC",  fInicio, fFin),
                    "SCP",         entrevistaRepository.countByTipoYRango("SCP", fInicio, fFin),
                    "SIN_ASIGNAR", entrevistaRepository.countByTipoNullYRango(fInicio, fFin)
            ));
            List<Object[]> rawGeneroMCr  = medidaRepository.countPorGeneroYTipoYRango("MEDIDA_CAUTELAR",        fInicio, fFin);
            List<Object[]> rawGeneroSCPr = medidaRepository.countPorGeneroYTipoYRango("SUSPENSION_CONDICIONAL", fInicio, fFin);
            data.put("generoPorMC",  agruparGenero(rawGeneroMCr));
            data.put("generoPorSCP", agruparGenero(rawGeneroSCPr));
        } else if (mes > 0) {
            data.put("medidasPorTipo", Map.of(
                    "MEDIDA_CAUTELAR",        medidaRepository.countByTipoAndAnioMes("MEDIDA_CAUTELAR", anio, mes),
                    "SUSPENSION_CONDICIONAL", medidaRepository.countByTipoAndAnioMes("SUSPENSION_CONDICIONAL", anio, mes)
            ));
            data.put("medidasPorEstado", Map.of(
                    "ACTIVO",     medidaRepository.countByEstadoAndAnioMes("ACTIVO",     anio, mes),
                    "SUSPENDIDO", medidaRepository.countByEstadoAndAnioMes("SUSPENDIDO", anio, mes),
                    "FINALIZADO", medidaRepository.countByEstadoAndAnioMes("FINALIZADO", anio, mes),
                    "LEVANTADO",  medidaRepository.countByEstadoAndAnioMes("LEVANTADO",  anio, mes),
                    "REVOCADO",   medidaRepository.countByEstadoAndAnioMes("REVOCADO",   anio, mes)
            ));
            data.put("cambiadoAScp",  medidaRepository.countByCambiadoAScpAndAnioMes(anio, mes));
            data.put("levantamientos", medidaRepository.countByEstadoAndAnioMes("LEVANTADO", anio, mes));
            data.put("revocados",      medidaRepository.countByEstadoAndAnioMes("REVOCADO",  anio, mes));
            data.put("cumplimientoMC", Map.of(
                    "CUMPLIENDO",   medidaRepository.countByCumplimientoAndTipoAndAnioMes("CUMPLIENDO",   "MEDIDA_CAUTELAR", anio, mes),
                    "INCUMPLIENDO", medidaRepository.countByCumplimientoAndTipoAndAnioMes("INCUMPLIENDO", "MEDIDA_CAUTELAR", anio, mes)
            ));
            data.put("cumplimientoSCP", Map.of(
                    "CUMPLIENDO",   medidaRepository.countByCumplimientoAndTipoAndAnioMes("CUMPLIENDO",   "SUSPENSION_CONDICIONAL", anio, mes),
                    "INCUMPLIENDO", medidaRepository.countByCumplimientoAndTipoAndAnioMes("INCUMPLIENDO", "SUSPENSION_CONDICIONAL", anio, mes)
            ));
            data.put("supervisionesPorTipo", Map.of(
                    "LLAMADA",             supervisionRepository.countByTipoAndAnioMes("LLAMADA",             anio, mes),
                    "VISITA_DOMICILIARIA", supervisionRepository.countByTipoAndAnioMes("VISITA_DOMICILIARIA", anio, mes)
            ));
            data.put("supervisionesPorEstado", Map.of(
                    "PENDIENTE",     supervisionRepository.countByEstadoAndAnioMes("PENDIENTE",     anio, mes),
                    "REALIZADA",     supervisionRepository.countByEstadoAndAnioMes("REALIZADA",     anio, mes),
                    "NO_CONTACTADO", supervisionRepository.countByEstadoAndAnioMes("NO_CONTACTADO", anio, mes),
                    "CANCELADA",     supervisionRepository.countByEstadoAndAnioMes("CANCELADA",     anio, mes)
            ));
            data.put("entrevistasPorTipo", Map.of(
                    "MC",          entrevistaRepository.countByTipoSeguimientoAndAnioMes("MC",  anio, mes),
                    "SCP",         entrevistaRepository.countByTipoSeguimientoAndAnioMes("SCP", anio, mes),
                    "SIN_ASIGNAR", entrevistaRepository.countByTipoSeguimientoIsNullAndAnioMes(anio, mes)
            ));
        } else {
            data.put("medidasPorTipo", Map.of(
                    "MEDIDA_CAUTELAR",        medidaRepository.countByTipoAndAnio("MEDIDA_CAUTELAR", anio),
                    "SUSPENSION_CONDICIONAL", medidaRepository.countByTipoAndAnio("SUSPENSION_CONDICIONAL", anio)
            ));
            data.put("medidasPorEstado", Map.of(
                    "ACTIVO",     medidaRepository.countByEstadoAndAnio("ACTIVO",     anio),
                    "SUSPENDIDO", medidaRepository.countByEstadoAndAnio("SUSPENDIDO", anio),
                    "FINALIZADO", medidaRepository.countByEstadoAndAnio("FINALIZADO", anio),
                    "LEVANTADO",  medidaRepository.countByEstadoAndAnio("LEVANTADO",  anio),
                    "REVOCADO",   medidaRepository.countByEstadoAndAnio("REVOCADO",   anio)
            ));
            data.put("cambiadoAScp",  medidaRepository.countByCambiadoAScpAndAnio(anio));
            data.put("levantamientos", medidaRepository.countByEstadoAndAnio("LEVANTADO", anio));
            data.put("revocados",      medidaRepository.countByEstadoAndAnio("REVOCADO",  anio));
            data.put("cumplimientoMC", Map.of(
                    "CUMPLIENDO",   medidaRepository.countByCumplimientoAndTipoAndAnio("CUMPLIENDO",   "MEDIDA_CAUTELAR", anio),
                    "INCUMPLIENDO", medidaRepository.countByCumplimientoAndTipoAndAnio("INCUMPLIENDO", "MEDIDA_CAUTELAR", anio)
            ));
            data.put("cumplimientoSCP", Map.of(
                    "CUMPLIENDO",   medidaRepository.countByCumplimientoAndTipoAndAnio("CUMPLIENDO",   "SUSPENSION_CONDICIONAL", anio),
                    "INCUMPLIENDO", medidaRepository.countByCumplimientoAndTipoAndAnio("INCUMPLIENDO", "SUSPENSION_CONDICIONAL", anio)
            ));
            data.put("supervisionesPorTipo", Map.of(
                    "LLAMADA",             supervisionRepository.countByTipoAndAnio("LLAMADA",             anio),
                    "VISITA_DOMICILIARIA", supervisionRepository.countByTipoAndAnio("VISITA_DOMICILIARIA", anio)
            ));
            data.put("supervisionesPorEstado", Map.of(
                    "PENDIENTE",     supervisionRepository.countByEstadoAndAnio("PENDIENTE",     anio),
                    "REALIZADA",     supervisionRepository.countByEstadoAndAnio("REALIZADA",     anio),
                    "NO_CONTACTADO", supervisionRepository.countByEstadoAndAnio("NO_CONTACTADO", anio),
                    "CANCELADA",     supervisionRepository.countByEstadoAndAnio("CANCELADA",     anio)
            ));
            data.put("entrevistasPorTipo", Map.of(
                    "MC",          entrevistaRepository.countByTipoSeguimientoAndAnio("MC",  anio),
                    "SCP",         entrevistaRepository.countByTipoSeguimientoAndAnio("SCP", anio),
                    "SIN_ASIGNAR", entrevistaRepository.countByTipoSeguimientoIsNullAndAnio(anio)
            ));
        }

        // ── Series mensuales (solo por año, no aplica filtro de mes) ─────────
        data.put("medidas_por_mes",       medidaRepository.countPorMes(anio));
        data.put("fallecidos_por_mes",    imputadoRepository.countFallecidosPorMes(anio));
        data.put("tta_por_mes",           medidaRepository.countTtaPorMes(anio));
        data.put("levantados_por_mes",    medidaRepository.countPorMesYEstado("LEVANTADO", anio));
        data.put("revocados_por_mes",     medidaRepository.countPorMesYEstado("REVOCADO",  anio));
        data.put("scp_cambio_por_mes",    medidaRepository.countByCambiadoAScpPorMes(anio));
        data.put("llamadas_por_mes",      supervisionRepository.countPorMesYTipo(anio, "LLAMADA"));
        data.put("visitas_por_mes",       supervisionRepository.countPorMesYTipo(anio, "VISITA_DOMICILIARIA"));
        data.put("supervisiones_por_mes", supervisionRepository.countPorMes(anio));
        data.put("evaluaciones_por_mes",  evaluacionRepository.countPorMes(anio));

        // ── Fracciones más usadas ─────────────────────────────────────────────
        data.put("fraccionesMasUsadasMC",  medidaRepository.fraccionesMasUsadas("MEDIDA_CAUTELAR"));
        data.put("fraccionesMasUsadasSCP", medidaRepository.fraccionesMasUsadas("SUSPENSION_CONDICIONAL"));

        // ── Género por tipo de medida (solo si no viene del bloque semana) ───
        if (semana == 0) {
            List<Object[]> rawGeneroMC  = mes > 0
                    ? medidaRepository.countPorGeneroYTipoAndAnioMes("MEDIDA_CAUTELAR",        anio, mes)
                    : medidaRepository.countPorGeneroYTipoAndAnio(   "MEDIDA_CAUTELAR",        anio);
            List<Object[]> rawGeneroSCP = mes > 0
                    ? medidaRepository.countPorGeneroYTipoAndAnioMes("SUSPENSION_CONDICIONAL", anio, mes)
                    : medidaRepository.countPorGeneroYTipoAndAnio(   "SUSPENSION_CONDICIONAL", anio);
            data.put("generoPorMC",  agruparGenero(rawGeneroMC));
            data.put("generoPorSCP", agruparGenero(rawGeneroSCP));
        }

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
    public byte[] exportarExcel(int anioParam, int mesParam) throws Exception {
        int anio = anioParam > 0 ? anioParam : LocalDate.now().getYear();
        int mes  = mesParam  > 0 ? mesParam  : 0;

        // Reutilizamos los mismos datos (sin filtro de semana para el Excel)
        ApiResponse resp = getEstadisticas(anioParam, mesParam, 0);
        @SuppressWarnings("unchecked")
        Map<String, Object> d = (Map<String, Object>) resp.getData();

        String[] MESES_FULL = {"","Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"};
        String periodoLabel = mes > 0 ? MESES_FULL[mes] + " " + anio : "Año " + anio;

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
            CellStyle normal = wb.createCellStyle();

            // ── Hoja 1: Resumen General ───────────────────────────────────────
            Sheet s1 = wb.createSheet("Resumen General");
            s1.setColumnWidth(0, 9000); s1.setColumnWidth(1, 4000);

            Row r0 = s1.createRow(0);
            Cell c0 = r0.createCell(0); c0.setCellValue("ESTADÍSTICAS UMECA — " + periodoLabel); c0.setCellStyle(titulo);
            s1.addMergedRegion(new CellRangeAddress(0, 0, 0, 1));

            int row = 2;
            row = agregarSeccion(s1, row, seccion, "RESUMEN GENERAL");
            row = agregarFila(s1, row, etiqueta, numero, "Imputados registrados",  toLong(d.get("totalImputados")));
            row = agregarFila(s1, row, etiqueta, numero, "Entrevistas de encuadre", toLong(d.get("totalEntrevistas")));
            row = agregarFila(s1, row, etiqueta, numero, "Evaluaciones de riesgo",  toLong(d.get("totalEvaluaciones")));
            row = agregarFila(s1, row, etiqueta, numero, "Medidas cautelares / SCP", toLong(d.get("totalMedidas")));
            row = agregarFila(s1, row, etiqueta, numero, "Supervisiones totales",    toLong(d.get("totalSupervisiones")));
            row = agregarFila(s1, row, etiqueta, numero, "Supervisiones pendientes", toLong(d.get("totalSupervisionPendiente")));
            row++;

            @SuppressWarnings("unchecked") Map<String,Object> mPorTipo = (Map<String,Object>) d.get("medidasPorTipo");
            row = agregarSeccion(s1, row, seccion, "MEDIDAS POR TIPO");
            row = agregarFila(s1, row, etiqueta, numero, "Medida Cautelar (MC)",        toLong(mPorTipo.get("MEDIDA_CAUTELAR")));
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
            row = agregarFila(s1, row, etiqueta, numero, "Llamadas",           toLong(supTipo.get("LLAMADA")));
            row = agregarFila(s1, row, etiqueta, numero, "Visitas domiciliarias", toLong(supTipo.get("VISITA_DOMICILIARIA")));
            row++;

            @SuppressWarnings("unchecked") Map<String,Object> supEst = (Map<String,Object>) d.get("supervisionesPorEstado");
            row = agregarSeccion(s1, row, seccion, "SUPERVISIONES POR ESTADO");
            row = agregarFila(s1, row, etiqueta, numero, "Pendiente",      toLong(supEst.get("PENDIENTE")));
            row = agregarFila(s1, row, etiqueta, numero, "Realizada",      toLong(supEst.get("REALIZADA")));
            row = agregarFila(s1, row, etiqueta, numero, "No contactado",  toLong(supEst.get("NO_CONTACTADO")));
            row = agregarFila(s1, row, etiqueta, numero, "Cancelada",      toLong(supEst.get("CANCELADA")));
            row++;

            @SuppressWarnings("unchecked") Map<String,Object> entTipo = (Map<String,Object>) d.get("entrevistasPorTipo");
            row = agregarSeccion(s1, row, seccion, "ENTREVISTAS POR TIPO");
            row = agregarFila(s1, row, etiqueta, numero, "MC",          toLong(entTipo.get("MC")));
            row = agregarFila(s1, row, etiqueta, numero, "SCP",         toLong(entTipo.get("SCP")));
            row = agregarFila(s1, row, etiqueta, numero, "Sin asignar", toLong(entTipo.get("SIN_ASIGNAR")));

            // ── Hoja 2: Series Mensuales ──────────────────────────────────────
            Sheet s2 = wb.createSheet("Series Mensuales");
            String[] cols = {"Mes","Medidas","Supervisiones","Llamadas","Visitas","Evaluaciones"};
            s2.setColumnWidth(0, 4000);
            for (int i = 1; i < cols.length; i++) s2.setColumnWidth(i, 3500);

            Row rh = s2.createRow(0);
            for (int i = 0; i < cols.length; i++) { Cell ch = rh.createCell(i); ch.setCellValue(cols[i]); ch.setCellStyle(etiqueta); }

            String[] MESES_CORTO = {"Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"};
            List<Object[]> mc   = (List<Object[]>) d.get("medidas_por_mes");
            List<Object[]> sup  = (List<Object[]>) d.get("supervisiones_por_mes");
            List<Object[]> llam = (List<Object[]>) d.get("llamadas_por_mes");
            List<Object[]> vis  = (List<Object[]>) d.get("visitas_por_mes");
            List<Object[]> eval = (List<Object[]>) d.get("evaluaciones_por_mes");

            long[] aMC = toArray(mc); long[] aSup = toArray(sup); long[] aLlam = toArray(llam);
            long[] aVis = toArray(vis); long[] aEval = toArray(eval);

            for (int i = 0; i < 12; i++) {
                Row rm = s2.createRow(i + 1);
                rm.createCell(0).setCellValue(MESES_CORTO[i]);
                rm.createCell(1).setCellValue(aMC[i]);
                rm.createCell(2).setCellValue(aSup[i]);
                rm.createCell(3).setCellValue(aLlam[i]);
                rm.createCell(4).setCellValue(aVis[i]);
                rm.createCell(5).setCellValue(aEval[i]);
            }

            // ── Hoja 3: Género ────────────────────────────────────────────────
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

            // ── Hoja 4: Semanal ───────────────────────────────────────────────
            Sheet s4 = wb.createSheet("Semanal");
            s4.setColumnWidth(0, 9000);
            for (int i = 1; i <= 4; i++) s4.setColumnWidth(i, 3500);

            // Encabezado
            String[] semLabels = {"ACTIVIDAD", "Semana 1 (1–7)", "Semana 2 (8–14)", "Semana 3 (15–21)", "Semana 4 (22–fin)"};
            Row rsh = s4.createRow(0);
            for (int i = 0; i < semLabels.length; i++) { Cell c = rsh.createCell(i); c.setCellValue(semLabels[i]); c.setCellStyle(etiqueta); }

            // Obtener datos por semana (solo si hay mes seleccionado, si no usar mes=1..12)
            String[][] actividadesSem = {
                {"Imputados registrados",    "totalImputados"},
                {"Entrevistas de encuadre",  "totalEntrevistas"},
                {"Evaluaciones de riesgo",   "totalEvaluaciones"},
                {"Medidas cautelares / SCP", "totalMedidas"},
                {"Supervisiones totales",    "totalSupervisiones"},
                {"Supervisiones pendientes", "totalSupervisionPendiente"},
            };

            long[][] valoresSem = new long[actividadesSem.length][4];
            if (mes > 0) {
                // Con mes: semanas 1-4 del mes
                for (int sem = 1; sem <= 4; sem++) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> ds = (Map<String, Object>) getEstadisticas(anio, mes, sem).getData();
                    for (int a = 0; a < actividadesSem.length; a++) {
                        valoresSem[a][sem - 1] = toLong(ds.get(actividadesSem[a][1]));
                    }
                }
            } else {
                // Sin mes: agrupa por trimestre (Q1..Q4)
                int[][] trimestres = {{1,2,3},{4,5,6},{7,8,9},{10,11,12}};
                String[] trimLabels = {"T1 (Ene–Mar)", "T2 (Abr–Jun)", "T3 (Jul–Sep)", "T4 (Oct–Dic)"};
                // Actualizar encabezados
                for (int i = 0; i < trimLabels.length; i++) rsh.getCell(i + 1).setCellValue(trimLabels[i]);
                for (int t = 0; t < 4; t++) {
                    for (int m2 : trimestres[t]) {
                        @SuppressWarnings("unchecked")
                        Map<String, Object> dm = (Map<String, Object>) getEstadisticas(anio, m2, 0).getData();
                        for (int a = 0; a < actividadesSem.length; a++) {
                            valoresSem[a][t] += toLong(dm.get(actividadesSem[a][1]));
                        }
                    }
                }
            }

            int rowSem = 1;
            for (int a = 0; a < actividadesSem.length; a++) {
                Row rs = s4.createRow(rowSem++);
                Cell ce = rs.createCell(0); ce.setCellValue(actividadesSem[a][0]); ce.setCellStyle(etiqueta);
                for (int s = 0; s < 4; s++) {
                    Cell cv = rs.createCell(s + 1); cv.setCellValue(valoresSem[a][s]); cv.setCellStyle(numero);
                }
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            wb.write(out);
            return out.toByteArray();
        }
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
