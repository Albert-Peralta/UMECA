package mx.edu.utez.umeca.modules.reporte;

import lombok.RequiredArgsConstructor;
import mx.edu.utez.umeca.kernel.ApiResponse;
import mx.edu.utez.umeca.modules.bitacora.Bitacora;
import mx.edu.utez.umeca.modules.bitacora.BitacoraService;
import mx.edu.utez.umeca.modules.security.user.User;
import mx.edu.utez.umeca.modules.security.user.UserRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReporteDiarioService {

    private final ReporteDiarioRepository repo;
    private final UserRepository           userRepo;
    private final BitacoraService          bitacoraService;

    /** Extrae el usuario autenticado del contexto de seguridad. Lanza excepción si no existe. */
    private User usuarioActual() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepo.findByEmail(email).orElseThrow();
    }

    /**
     * Crea o actualiza el reporte diario del usuario autenticado para la fecha indicada.
     * Solo puede existir un reporte por (fecha, zona, usuario); si ya existe se sobreescribe.
     */
    @Transactional
    public ApiResponse guardar(ReporteDiarioDTO dto) {
        User user = usuarioActual();
        LocalDate fecha = dto.getFecha() != null ? dto.getFecha() : LocalDate.now();

        Optional<ReporteDiario> existente = repo.findByFechaAndZonaAndUsuarioId(fecha, user.getZona(), user.getId());

        boolean esNuevo = existente.isEmpty();
        ReporteDiario r = existente.orElse(new ReporteDiario());

        r.setFecha(fecha);
        r.setZona(user.getZona());
        r.setUsuario(user);

        mapDtoToEntity(dto, r);
        repo.save(r);

        String desc = (esNuevo ? "Creación" : "Actualización") + " de reporte diario — " + fecha + " — " + user.getZona();
        bitacoraService.registrar(
            Bitacora.Entidad.REPORTE_DIARIO, r.getId(),
            "Reporte " + fecha + " (" + user.getZona() + ")",
            esNuevo ? Bitacora.Accion.CREAR : Bitacora.Accion.EDITAR,
            desc
        );

        return new ApiResponse(true, esNuevo ? "Reporte creado" : "Reporte actualizado", ReporteDiarioResponseDTO.from(r));
    }

    // ── Obtener reporte del día actual del usuario ────────────────────────────
    @Transactional(readOnly = true)
    public ApiResponse getMiReporteHoy() {
        return getMiReportePorFecha(LocalDate.now());
    }

    // ── Obtener reporte de una fecha específica del usuario ───────────────────
    @Transactional(readOnly = true)
    public ApiResponse getMiReportePorFecha(LocalDate fecha) {
        User user = usuarioActual();
        Optional<ReporteDiario> r = repo.findByFechaAndZonaAndUsuarioId(fecha, user.getZona(), user.getId());
        return r.map(reporte -> new ApiResponse(true, "ok", ReporteDiarioResponseDTO.from(reporte)))
                .orElse(new ApiResponse(true, "Sin reporte", null));
    }

    /**
     * Consolida los reportes del rango agrupados por zona, sumando todos los
     * contadores. Útil para la tabla resumen que el administrador ve por zona.
     */
    @Transactional(readOnly = true)
    public ApiResponse getConsolidado(LocalDate inicio, LocalDate fin) {
        List<ReporteDiario> lista = repo.findByRangoFecha(inicio, fin);
        // Agrupar por zona y sumar
        Map<String, ReporteDiarioResponseDTO> consolidado = lista.stream()
            .collect(Collectors.groupingBy(
                r -> r.getZona().name(),
                Collectors.collectingAndThen(
                    Collectors.toList(),
                    this::sumarPorZona
                )
            ));
        return new ApiResponse(true, "ok", consolidado);
    }

    /**
     * Lista los registros individuales del rango. El ADMINISTRADOR ve todos;
     * los demás roles solo ven los de su propia zona.
     */
    @Transactional(readOnly = true)
    public ApiResponse getLista(LocalDate inicio, LocalDate fin) {
        User user = usuarioActual();
        List<ReporteDiario> lista;
        if (user.getRol() == User.Rol.ADMINISTRADOR) {
            lista = repo.findByRangoFecha(inicio, fin);
        } else {
            lista = repo.findByRangoFechaYZona(inicio, fin, user.getZona());
        }
        List<ReporteDiarioResponseDTO> dtos = lista.stream()
            .map(ReporteDiarioResponseDTO::from)
            .collect(Collectors.toList());
        return new ApiResponse(true, "ok", dtos);
    }

    // ── Helper: sumar todos los registros de una zona ─────────────────────────
    private ReporteDiarioResponseDTO sumarPorZona(List<ReporteDiario> lista) {
        ReporteDiarioResponseDTO total = new ReporteDiarioResponseDTO();
        if (lista.isEmpty()) return total;
        total.setZona(lista.get(0).getZona().name());

        total.setFirmasRecabadas(         lista.stream().mapToInt(ReporteDiario::getFirmasRecabadas).sum());
        total.setNuevosCasosMC(           lista.stream().mapToInt(ReporteDiario::getNuevosCasosMC).sum());
        total.setNuevosCasosSCP(          lista.stream().mapToInt(ReporteDiario::getNuevosCasosSCP).sum());
        total.setEntrevistasEncuadre(     lista.stream().mapToInt(ReporteDiario::getEntrevistasEncuadre).sum());
        total.setTotalOficiosRecibidos(   lista.stream().mapToInt(ReporteDiario::getTotalOficiosRecibidos).sum());
        total.setOficiosEmitidosCSP(      lista.stream().mapToInt(ReporteDiario::getOficiosEmitidosCSP).sum());
        total.setOficiosEmitidosDiversos( lista.stream().mapToInt(ReporteDiario::getOficiosEmitidosDiversos).sum());
        total.setReportesIncumplimiento(  lista.stream().mapToInt(ReporteDiario::getReportesIncumplimiento).sum());
        total.setReportesNoPresentacion(  lista.stream().mapToInt(ReporteDiario::getReportesNoPresentacion).sum());
        total.setSolicitudesColaboracion( lista.stream().mapToInt(ReporteDiario::getSolicitudesColaboracion).sum());
        total.setSolicitudesInfoJuez(     lista.stream().mapToInt(ReporteDiario::getSolicitudesInfoJuez).sum());
        total.setSolicitudesInfoMP(       lista.stream().mapToInt(ReporteDiario::getSolicitudesInfoMP).sum());
        total.setInformeFinal(            lista.stream().mapToInt(ReporteDiario::getInformeFinal).sum());
        total.setCanalizaciones(          lista.stream().mapToInt(ReporteDiario::getCanalizaciones).sum());
        total.setVisitasDomiciliarias(    lista.stream().mapToInt(ReporteDiario::getVisitasDomiciliarias).sum());
        total.setAudienciasTTA(           lista.stream().mapToInt(ReporteDiario::getAudienciasTTA).sum());
        total.setLlamadasTelefonicas(     lista.stream().mapToInt(ReporteDiario::getLlamadasTelefonicas).sum());
        total.setOficiosRegistros(        lista.stream().mapToInt(ReporteDiario::getOficiosRegistros).sum());
        total.setEvaluacionRiesgoFC(      lista.stream().mapToInt(ReporteDiario::getEvaluacionRiesgoFC).sum());
        total.setEvaluacionRiesgoFF(      lista.stream().mapToInt(ReporteDiario::getEvaluacionRiesgoFF).sum());
        total.setOpinionTecnicaFC(        lista.stream().mapToInt(ReporteDiario::getOpinionTecnicaFC).sum());
        total.setOpinionTecnicaFF(        lista.stream().mapToInt(ReporteDiario::getOpinionTecnicaFF).sum());
        total.setNegacionesFC(            lista.stream().mapToInt(ReporteDiario::getNegacionesFC).sum());
        total.setNegacionesFF(            lista.stream().mapToInt(ReporteDiario::getNegacionesFF).sum());
        total.setInformesFC(              lista.stream().mapToInt(ReporteDiario::getInformesFC).sum());
        total.setInformesFF(              lista.stream().mapToInt(ReporteDiario::getInformesFF).sum());
        total.setLlamadasTelEvaluacion(   lista.stream().mapToInt(ReporteDiario::getLlamadasTelEvaluacion).sum());
        total.setSobreseimientos(         lista.stream().mapToInt(ReporteDiario::getSobreseimientos).sum());
        total.setCierreCarpetas(          lista.stream().mapToInt(ReporteDiario::getCierreCarpetas).sum());
        total.setLevantamientoMedida(     lista.stream().mapToInt(ReporteDiario::getLevantamientoMedida).sum());

        return total;
    }

    /**
     * Devuelve el cumplimiento de entrega de reportes por usuario, para usuarios
     * con rol SUPERVISION o EVALUADOR_RIESGO activos. El resultado se ordena
     * mostrando primero quienes entregaron.
     */
    @Transactional(readOnly = true)
    public ApiResponse getCumplimiento(LocalDate inicio, LocalDate fin) {
        // Usuarios con rol SUPERVISION o EVALUADOR_RIESGO activos
        List<User> usuarios = userRepo.findAll().stream()
            .filter(u -> u.isActivo()
                && (u.getRol() == User.Rol.SUPERVISION || u.getRol() == User.Rol.EVALUADOR_RIESGO))
            .collect(Collectors.toList());

        List<ReporteDiario> reportes = repo.findByRangoFecha(inicio, fin);

        List<CumplimientoReporteDTO> resultado = usuarios.stream().map(u -> {
            List<ReporteDiario> suyos = reportes.stream()
                .filter(r -> r.getUsuario() != null && r.getUsuario().getId().equals(u.getId()))
                .collect(Collectors.toList());

            CumplimientoReporteDTO dto = new CumplimientoReporteDTO();
            dto.setUsuarioId(u.getId());
            String nombre = ((u.getNombre() != null ? u.getNombre() : "") + " "
                + (u.getApPaterno() != null ? u.getApPaterno() : "")).trim();
            dto.setNombreCompleto(nombre);
            dto.setRol(u.getRol().name());
            dto.setZona(u.getZona() != null ? u.getZona().name() : "—");
            dto.setEntrego(!suyos.isEmpty());
            dto.setTotalRegistros(suyos.size());
            dto.setUltimaFecha(suyos.stream()
                .map(ReporteDiario::getFecha)
                .max(LocalDate::compareTo)
                .map(LocalDate::toString)
                .orElse(null));
            return dto;
        }).sorted((a, b) -> Boolean.compare(a.isEntrego(), b.isEntrego()) * -1) // entregaron primero
          .collect(Collectors.toList());

        return new ApiResponse(true, "ok", resultado);
    }

    private void mapDtoToEntity(ReporteDiarioDTO dto, ReporteDiario r) {
        r.setFirmasRecabadas(dto.getFirmasRecabadas());
        r.setNuevosCasosMC(dto.getNuevosCasosMC());
        r.setNuevosCasosSCP(dto.getNuevosCasosSCP());
        r.setEntrevistasEncuadre(dto.getEntrevistasEncuadre());
        r.setTotalOficiosRecibidos(dto.getTotalOficiosRecibidos());
        r.setOficiosEmitidosCSP(dto.getOficiosEmitidosCSP());
        r.setOficiosEmitidosDiversos(dto.getOficiosEmitidosDiversos());
        r.setReportesIncumplimiento(dto.getReportesIncumplimiento());
        r.setReportesNoPresentacion(dto.getReportesNoPresentacion());
        r.setSolicitudesColaboracion(dto.getSolicitudesColaboracion());
        r.setSolicitudesInfoJuez(dto.getSolicitudesInfoJuez());
        r.setSolicitudesInfoMP(dto.getSolicitudesInfoMP());
        r.setInformeFinal(dto.getInformeFinal());
        r.setCanalizaciones(dto.getCanalizaciones());
        r.setVisitasDomiciliarias(dto.getVisitasDomiciliarias());
        r.setAudienciasTTA(dto.getAudienciasTTA());
        r.setLlamadasTelefonicas(dto.getLlamadasTelefonicas());
        r.setOficiosRegistros(dto.getOficiosRegistros());
        r.setEvaluacionRiesgoFC(dto.getEvaluacionRiesgoFC());
        r.setEvaluacionRiesgoFF(dto.getEvaluacionRiesgoFF());
        r.setOpinionTecnicaFC(dto.getOpinionTecnicaFC());
        r.setOpinionTecnicaFF(dto.getOpinionTecnicaFF());
        r.setNegacionesFC(dto.getNegacionesFC());
        r.setNegacionesFF(dto.getNegacionesFF());
        r.setInformesFC(dto.getInformesFC());
        r.setInformesFF(dto.getInformesFF());
        r.setLlamadasTelEvaluacion(dto.getLlamadasTelEvaluacion());
        r.setSobreseimientos(dto.getSobreseimientos());
        r.setCierreCarpetas(dto.getCierreCarpetas());
        r.setLevantamientoMedida(dto.getLevantamientoMedida());
    }
}
