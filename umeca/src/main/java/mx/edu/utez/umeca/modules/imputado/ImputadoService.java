package mx.edu.utez.umeca.modules.imputado;

import lombok.RequiredArgsConstructor;
import mx.edu.utez.umeca.kernel.ApiResponse;
import mx.edu.utez.umeca.modules.bitacora.Bitacora;
import mx.edu.utez.umeca.modules.bitacora.BitacoraService;
import mx.edu.utez.umeca.modules.entrevista.EntrevistaEncuadreRepository;
import mx.edu.utez.umeca.modules.evaluacion.EvaluacionRiesgoRepository;
import mx.edu.utez.umeca.modules.medidacautelar.MedidaCautelarRepository;
import mx.edu.utez.umeca.modules.supervision.Supervision;
import mx.edu.utez.umeca.modules.supervision.SupervisionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import mx.edu.utez.umeca.modules.medidacautelar.MedidaCautelar;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ImputadoService {

    private final ImputadoRepository imputadoRepository;
    private final EntrevistaEncuadreRepository entrevistaRepository;
    private final EvaluacionRiesgoRepository evaluacionRepository;
    private final MedidaCautelarRepository medidaRepository;
    private final SupervisionRepository supervisionRepository;
    private final BitacoraService bitacoraService;

    /**
     * Lista todos los imputados con conteos de entrevistas, evaluaciones,
     * teléfono y medida activa, resueltos en 4 queries en lugar de N+1.
     */
    @Transactional(readOnly = true)
    public ApiResponse findAll() {
        List<Imputado> todos = imputadoRepository.findAllByOrderByCreatedAtDesc();
        if (todos.isEmpty()) return new ApiResponse(true, "Imputados obtenidos", List.of());

        List<Long> ids = todos.stream().map(Imputado::getId).toList();

        // 1 query: conteos de entrevistas por imputado
        Map<Long, Long> conteoEnt = entrevistaRepository.countsPorImputados(ids)
                .stream().collect(Collectors.toMap(r -> (Long) r[0], r -> (Long) r[1]));

        // 1 query: conteos de evaluaciones por imputado
        Map<Long, Long> conteoEval = evaluacionRepository.countsPorImputados(ids)
                .stream().collect(Collectors.toMap(r -> (Long) r[0], r -> (Long) r[1]));

        // 1 query: última entrevista con teléfono (celular preferido sobre teléfono casa)
        Map<Long, String> telefonos = entrevistaRepository.resumenPorImputados(ids)
                .stream().collect(Collectors.toMap(
                        r -> (Long) r[0],
                        r -> r[2] != null ? (String) r[2] : (r[3] != null ? (String) r[3] : ""),
                        (a, b) -> a   // si hay duplicado por sub-query, tomar el primero
                ));

        // 1 query: tipo y estado de la medida más reciente por imputado
        Map<Long, Object[]> medidaInfo = medidaRepository.tipoActivoPorImputados(ids)
                .stream().collect(Collectors.toMap(
                        r -> (Long) r[0],
                        r -> r,
                        (a, b) -> a
                ));

        // 1 query: zona de la última entrevista por imputado
        Map<Long, String> zonas = entrevistaRepository.zonasPorImputados(ids)
                .stream().collect(Collectors.toMap(
                        r -> (Long) r[0],
                        r -> r[1] != null ? r[1].toString() : null,
                        (a, b) -> a
                ));

        List<ImputadoResponseDTO> lista = todos.stream().map(i -> {
            ImputadoResponseDTO dto = ImputadoResponseDTO.fromSimple(i);
            dto.setTotalEntrevistas(conteoEnt.getOrDefault(i.getId(), 0L).intValue());
            dto.setTotalEvaluaciones(conteoEval.getOrDefault(i.getId(), 0L).intValue());
            String tel = telefonos.get(i.getId());
            if (tel != null && !tel.isBlank()) dto.setCelular(tel);
            Object[] mInfo = medidaInfo.get(i.getId());
            if (mInfo != null) {
                dto.setTipoMedidaActiva(mInfo[1].toString());
                dto.setEstadoMedidaActiva(mInfo[2].toString());
                dto.setVieneDeMC(Boolean.TRUE.equals(mInfo[3]));
                dto.setVieneDeScp(Boolean.TRUE.equals(mInfo[4]));
                dto.setCumplimientoMedidaActiva(mInfo.length > 5 && mInfo[5] != null ? mInfo[5].toString() : null);
            }
            dto.setZona(zonas.get(i.getId()));
            return dto;
        }).toList();

        return new ApiResponse(true, "Imputados obtenidos", lista);
    }

    /** Devuelve todos los imputados que comparten la misma causa penal. */
    @Transactional(readOnly = true)
    public ApiResponse findByCausaPenal(String causaPenal) {
        List<ImputadoResponseDTO> lista = imputadoRepository.findAllByCausaPenal(causaPenal)
                .stream().map(ImputadoResponseDTO::fromSimple).toList();
        return new ApiResponse(true, "OK", lista);
    }

    public ApiResponse buscar(String termino) {
        List<ImputadoResponseDTO> lista = imputadoRepository
                .findByNombreContainingIgnoreCaseOrApPaternoContainingIgnoreCase(termino, termino)
                .stream()
                .map(ImputadoResponseDTO::fromSimple)
                .toList();
        return new ApiResponse(true, "Resultados", lista);
    }

    /**
     * Devuelve el expediente completo del imputado: datos básicos, entrevistas,
     * evaluaciones, medidas y teléfono tomado de la entrevista más reciente.
     */
    @Transactional(readOnly = true)
    public ApiResponse findById(Long id) {
        return imputadoRepository.findById(id).map(imputado -> {
            var entrevistas  = entrevistaRepository.findByImputadoId(id);
            var evaluaciones = evaluacionRepository.findByImputadoId(id);
            var medidas      = medidaRepository.findByImputadoIdOrderByCreatedAtDesc(id);
            // Obtener celular de la entrevista más reciente
            String celular = entrevistas.stream()
                    .filter(e -> e.getCelular() != null && !e.getCelular().isBlank())
                    .findFirst()
                    .map(e -> e.getCelular())
                    .orElse(entrevistas.stream()
                            .filter(e -> e.getTelefonoCasa() != null && !e.getTelefonoCasa().isBlank())
                            .findFirst()
                            .map(e -> e.getTelefonoCasa())
                            .orElse(null));
            ImputadoResponseDTO dto = ImputadoResponseDTO.from(imputado, entrevistas, evaluaciones, medidas);
            if (celular != null) dto.setCelular(celular);
            return new ApiResponse(true, "Imputado encontrado", dto);
        }).orElse(new ApiResponse(false, "Imputado no encontrado"));
    }

    /**
     * Registra un imputado nuevo. La causa penal es única en el sistema;
     * si ya existe se rechaza el registro.
     */
    @Transactional
    public ApiResponse save(Imputado imputado) {
        if (imputadoRepository.existsByCausaPenal(imputado.getCausaPenal()))
            return new ApiResponse(false, "Ya existe un imputado con esa causa penal");
        Imputado saved = imputadoRepository.save(imputado);
        bitacoraService.registrar(Bitacora.Entidad.IMPUTADO, saved.getId(),
                saved.getNombre() + " " + saved.getApPaterno(),
                Bitacora.Accion.CREAR, "Imputado registrado");
        return new ApiResponse(true, "Imputado registrado", ImputadoResponseDTO.fromSimple(saved));
    }

    /**
     * Registra el fallecimiento del imputado y cancela automáticamente todas
     * sus supervisiones en estado PENDIENTE. Rechaza la operación si el imputado
     * ya estaba marcado como fallecido.
     *
     * @param id             ID del imputado
     * @param fecha          fecha de fallecimiento (usa la fecha actual si es null)
     * @param quienAviso     nombre de quien notificó el fallecimiento
     * @param parentesco     relación del informante con el imputado
     * @param comoSeComprobo cómo se verificó la muerte (acta, testigo, etc.)
     * @param noActa         número del acta de defunción
     * @param observaciones  notas adicionales
     */
    @Transactional
    public ApiResponse registrarFallecimiento(Long id, LocalDate fecha,
                                               String quienAviso, String parentesco,
                                               String comoSeComprobo, String noActa,
                                               String observaciones) {
        return imputadoRepository.findById(id).map(imp -> {
            if (imp.isFallecido())
                return new ApiResponse(false, "El imputado ya está registrado como fallecido");
            imp.setFallecido(true);
            imp.setFechaFallecimiento(fecha != null ? fecha : LocalDate.now());
            if (quienAviso    != null) imp.setQuienAviso(quienAviso);
            if (parentesco    != null) imp.setParentescoInformante(parentesco);
            if (comoSeComprobo!= null) imp.setComoSeComprobo(comoSeComprobo);
            if (noActa        != null) imp.setNoActaDefuncion(noActa);
            if (observaciones != null) imp.setObservacionesFallecimiento(observaciones);
            imputadoRepository.save(imp);
            bitacoraService.registrar(Bitacora.Entidad.IMPUTADO, imp.getId(),
                    imp.getNombre() + " " + imp.getApPaterno(),
                    Bitacora.Accion.FALLECIMIENTO,
                    "Fallecimiento registrado — fecha: " + imp.getFechaFallecimiento()
                            + (quienAviso != null ? " | informante: " + quienAviso : ""));
            // Cancelar todas las supervisiones pendientes
            List<mx.edu.utez.umeca.modules.supervision.Supervision> pendientes =
                    supervisionRepository.findPendientesByImputadoId(id);
            pendientes.forEach(s -> {
                s.setEstado(Supervision.EstadoSupervision.CANCELADA);
                supervisionRepository.save(s);
            });
            return new ApiResponse(true,
                    "Fallecimiento registrado. " + pendientes.size() + " supervisión(es) cancelada(s).",
                    ImputadoResponseDTO.fromSimple(imp));
        }).orElse(new ApiResponse(false, "Imputado no encontrado"));
    }

    /**
     * Estatus que solo finalizan la medida activa sin cerrar la carpeta completa.
     * MC: Auto de no vinculación, Arraigo domiciliario, Cambio MC→SCP.
     * SCP: Cumplimiento de condiciones, Cumplimiento de reparación del daño, Incumplimiento, Fallecimiento del imputado.
     */
    private static final java.util.Set<String> ESTATUS_SOLO_MEDIDA = java.util.Set.of(
            // MC — solo finaliza medida
            "AUTO_NO_VINCULACION",
            "ARRAIGO_DOMICILIARIO",
            "CAMBIO_MC_A_SCP",
            // SCP — solo finaliza medida
            "NUEVA_CONDENA"
    );

    /**
     * Registra el cierre de carpeta o finalización de medida del imputado.
     * Si el estatus es de cierre total (Sentencia absolutoria/condenatoria, Nueva condena),
     * cierra la carpeta completa y cancela supervisiones pendientes.
     * Si el estatus es de "solo medida", únicamente finaliza las medidas activas
     * sin bloquear el expediente.
     */
    @Transactional
    public ApiResponse registrarCierreCarpeta(Long id, String motivo, String estatusCumplimiento, LocalDate fechaIngreso, String notas) {
        return imputadoRepository.findById(id).map(imp -> {
            if (imp.isCarpetaCerrada())
                return new ApiResponse(false, "La carpeta de este imputado ya fue cerrada");

            boolean soloCierraMedida = estatusCumplimiento != null && ESTATUS_SOLO_MEDIDA.contains(estatusCumplimiento);

            // Responsable = usuario autenticado
            String responsable = "sistema";
            try {
                Authentication auth = SecurityContextHolder.getContext().getAuthentication();
                if (auth != null && auth.getName() != null) responsable = auth.getName();
            } catch (Exception ignored) {}

            // Finalizar todas las medidas activas (siempre)
            List<mx.edu.utez.umeca.modules.medidacautelar.MedidaCautelar> medidasActivas =
                    medidaRepository.findByImputadoId(id).stream()
                            .filter(m -> m.getEstado() == MedidaCautelar.Estado.ACTIVO)
                            .toList();
            medidasActivas.forEach(m -> {
                m.setEstado(MedidaCautelar.Estado.FINALIZADO);
                if (estatusCumplimiento != null) m.setCumpliendoIncumpliendo(estatusCumplimiento);
                medidaRepository.save(m);
            });

            if (soloCierraMedida) {
                // Solo finaliza medidas — el expediente queda abierto
                bitacoraService.registrar(Bitacora.Entidad.IMPUTADO, imp.getId(),
                        imp.getNombre() + " " + imp.getApPaterno(),
                        Bitacora.Accion.CAMBIO_ESTADO,
                        "Cierre de medida — estatus: " + estatusCumplimiento
                                + " | medidas finalizadas: " + medidasActivas.size()
                                + (motivo != null ? " | motivo: " + motivo : ""));
                return new ApiResponse(true,
                        "Medida finalizada correctamente. El expediente permanece abierto.",
                        ImputadoResponseDTO.fromSimple(imp));
            }

            // Cierre total de carpeta
            LocalDate hoy = LocalDate.now();
            int anio = hoy.getYear();
            long secuencia = imputadoRepository.countCierresPorAnio(anio) + 1;
            String numero = String.format("CC-%d-%04d", anio, secuencia);

            imp.setCarpetaCerrada(true);
            imp.setNumeroCierreCarpeta(numero);
            imp.setFechaCierreCarpeta(hoy);
            imp.setResponsableCierreCarpeta(responsable);
            if (motivo != null) imp.setMotivoCierreCarpeta(motivo);
            if (estatusCumplimiento != null) imp.setEstatusCumplimientoCierre(estatusCumplimiento);
            if (fechaIngreso != null) imp.setFechaIngresoCierre(fechaIngreso);
            if (notas != null && !notas.isBlank()) imp.setNotasCierre(notas);
            imputadoRepository.save(imp);

            // Cancelar supervisiones pendientes
            List<mx.edu.utez.umeca.modules.supervision.Supervision> pendientes =
                    supervisionRepository.findPendientesByImputadoId(id);
            pendientes.forEach(s -> {
                s.setEstado(mx.edu.utez.umeca.modules.supervision.Supervision.EstadoSupervision.CANCELADA);
                supervisionRepository.save(s);
            });

            bitacoraService.registrar(Bitacora.Entidad.IMPUTADO, imp.getId(),
                    imp.getNombre() + " " + imp.getApPaterno(),
                    Bitacora.Accion.CIERRE_CARPETA,
                    "Cierre de carpeta — número: " + numero
                            + " | medidas finalizadas: " + medidasActivas.size()
                            + " | supervisiones canceladas: " + pendientes.size());

            return new ApiResponse(true,
                    "Cierre de carpeta registrado exitosamente. Número: " + numero,
                    ImputadoResponseDTO.fromSimple(imp));
        }).orElse(new ApiResponse(false, "Imputado no encontrado"));
    }

    /** Revierte el cierre de carpeta de un imputado, regresándolo a estado activo. */
    @Transactional
    public ApiResponse revertirCierreCarpeta(Long id) {
        return imputadoRepository.findById(id).map(imp -> {
            if (!imp.isCarpetaCerrada())
                return new ApiResponse(false, "La carpeta de este imputado no está cerrada");
            String numeroCierre = imp.getNumeroCierreCarpeta();
            imp.setCarpetaCerrada(false);
            imp.setNumeroCierreCarpeta(null);
            imp.setFechaCierreCarpeta(null);
            imp.setResponsableCierreCarpeta(null);
            imp.setMotivoCierreCarpeta(null);
            imp.setEstatusCumplimientoCierre(null);
            imp.setFechaIngresoCierre(null);
            imp.setNotasCierre(null);
            imputadoRepository.save(imp);
            bitacoraService.registrar(Bitacora.Entidad.IMPUTADO, imp.getId(),
                    imp.getNombre() + " " + imp.getApPaterno(),
                    Bitacora.Accion.EDITAR,
                    "Cierre de carpeta revertido — número anterior: " + numeroCierre);
            return new ApiResponse(true, "Cierre de carpeta revertido exitosamente", ImputadoResponseDTO.fromSimple(imp));
        }).orElse(new ApiResponse(false, "Imputado no encontrado"));
    }

    /** Reemplaza la foto del imputado (base64 o URL) y registra el cambio en bitácora. */
    @Transactional
    public ApiResponse actualizarFoto(Long id, String foto) {
        return imputadoRepository.findById(id).map(existing -> {
            existing.setFoto(foto);
            imputadoRepository.save(existing);
            bitacoraService.registrar(Bitacora.Entidad.IMPUTADO, existing.getId(),
                    existing.getNombre() + " " + existing.getApPaterno(),
                    Bitacora.Accion.FOTO, "Foto actualizada");
            return new ApiResponse(true, "Foto actualizada");
        }).orElse(new ApiResponse(false, "Imputado no encontrado"));
    }

    /**
     * Actualiza los datos editables del imputado.
     * La causa penal no se modifica porque es el identificador único del caso judicial.
     */
    @Transactional
    public ApiResponse update(Long id, Imputado datos) {
        return imputadoRepository.findById(id).map(existing -> {
            java.util.List<String> cambios = new java.util.ArrayList<>();
            if (!java.util.Objects.equals(existing.getNombre(), datos.getNombre())
                    || !java.util.Objects.equals(existing.getApPaterno(), datos.getApPaterno())
                    || !java.util.Objects.equals(existing.getApMaterno(), datos.getApMaterno()))
                cambios.add("Nombre actualizado");
            if (!java.util.Objects.equals(existing.getDelito(), datos.getDelito()) && datos.getDelito() != null)
                cambios.add("Delito: " + datos.getDelito());
            if (!java.util.Objects.equals(existing.getUbicacionFisica(), datos.getUbicacionFisica()))
                cambios.add("Ubicación física: " + datos.getUbicacionFisica());
            String descCambios = cambios.isEmpty() ? "Imputado actualizado" : "Imputado actualizado — " + String.join(" | ", cambios);

            existing.setNombre(datos.getNombre());
            existing.setApPaterno(datos.getApPaterno());
            existing.setApMaterno(datos.getApMaterno());
            existing.setDelito(datos.getDelito());
            existing.setUbicacionFisica(datos.getUbicacionFisica());
            // La causa penal no se actualiza: es el identificador del caso
            Imputado updated = imputadoRepository.save(existing);
            // Propagar el nombre a todas las entrevistas ligadas
            entrevistaRepository.actualizarNombrePorImputado(
                    updated.getId(), updated.getNombre(), updated.getApPaterno(), updated.getApMaterno());
            bitacoraService.registrar(Bitacora.Entidad.IMPUTADO, updated.getId(),
                    updated.getNombre() + " " + updated.getApPaterno(),
                    Bitacora.Accion.EDITAR, descCambios);
            return new ApiResponse(true, "Imputado actualizado",
                    ImputadoResponseDTO.fromSimple(updated));
        }).orElse(new ApiResponse(false, "Imputado no encontrado"));
    }
}
