package mx.edu.utez.umeca.modules.medidacautelar;

import lombok.RequiredArgsConstructor;
import mx.edu.utez.umeca.kernel.ApiResponse;
import mx.edu.utez.umeca.modules.bitacora.Bitacora;
import mx.edu.utez.umeca.modules.bitacora.BitacoraService;
import mx.edu.utez.umeca.modules.entrevista.EntrevistaEncuadre;
import mx.edu.utez.umeca.modules.entrevista.EntrevistaEncuadreRepository;
import mx.edu.utez.umeca.modules.imputado.ImputadoRepository;
import mx.edu.utez.umeca.modules.security.user.UserRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/**
 * Lógica de negocio para medidas cautelares y suspensiones condicionales del proceso (SCP).
 * Gestiona el ciclo completo: registro, seguimientos, cambios de estado,
 * revocaciones, ampliaciones y levantamientos.
 */
@Service
@RequiredArgsConstructor
public class MedidaCautelarService {

    private final MedidaCautelarRepository repository;
    private final ImputadoRepository imputadoRepository;
    private final EntrevistaEncuadreRepository entrevistaRepository;
    private final UserRepository userRepository;
    private final SeguimientoMedidaRepository seguimientoRepository;
    private final BitacoraService bitacoraService;

    @Transactional(readOnly = true)
    public ApiResponse findAll() {
        List<MedidaCautelarResponseDTO> lista = repository.findAllByOrderByCreatedAtDesc()
                .stream().map(MedidaCautelarResponseDTO::from).toList();
        return new ApiResponse(true, "Medidas obtenidas", lista);
    }

    @Transactional(readOnly = true)
    public ApiResponse buscar(String q) {
        List<MedidaCautelarResponseDTO> lista = repository.buscar(q)
                .stream().map(MedidaCautelarResponseDTO::from).toList();
        return new ApiResponse(true, "Resultados", lista);
    }

    @Transactional(readOnly = true)
    public ApiResponse findByImputado(Long imputadoId) {
        List<MedidaCautelarResponseDTO> lista = repository.findByImputadoIdOrderByCreatedAtDesc(imputadoId)
                .stream().map(MedidaCautelarResponseDTO::from).toList();
        return new ApiResponse(true, "Medidas del imputado", lista);
    }

    @Transactional(readOnly = true)
    public ApiResponse findById(Long id) {
        return repository.findById(id)
                .map(m -> new ApiResponse(true, "Medida encontrada", MedidaCautelarResponseDTO.from(m)))
                .orElse(new ApiResponse(false, "Medida no encontrada"));
    }

    /**
     * Registra una nueva medida cautelar o SCP.
     * Resuelve el imputado por id directo o, si no se proporciona, lo deriva de la entrevista.
     * Rechaza duplicados: mismo imputado + causa penal + tipo de medida.
     * Si es una SCP que reemplaza a una MC existente, marca la MC original con {@code cambiadoAScp=true}.
     */
    @Transactional
    public ApiResponse save(MedidaCautelarDTO dto) {
        // Intentar obtener imputado por id; si no viene (null o 0), buscarlo a través de la entrevista
        var imputado = (dto.getImputadoId() != null && dto.getImputadoId() > 0)
                ? imputadoRepository.findById(dto.getImputadoId()).orElse(null)
                : null;
        if (imputado == null && dto.getEntrevistaId() != null) {
            imputado = entrevistaRepository.findById(dto.getEntrevistaId())
                    .map(e -> e.getImputado())
                    .orElse(null);
        }
        if (imputado == null) return new ApiResponse(false, "Imputado no encontrado");

        if (dto.getCausaPenal() == null || dto.getCausaPenal().isBlank())
            return new ApiResponse(false, "La causa penal es requerida");

        if (dto.getFracciones() == null || dto.getFracciones().isEmpty())
            return new ApiResponse(false, "Debe seleccionar al menos una fracción");

        // Validar duplicado: mismo imputado + causa penal + tipo
        if (dto.getTipo() != null) {
            try {
                MedidaCautelar.TipoMedida tipo = MedidaCautelar.TipoMedida.valueOf(dto.getTipo());
                if (repository.existsByImputadoIdAndCausaPenalIgnoreCaseAndTipo(
                        imputado.getId(), dto.getCausaPenal(), tipo)) {
                    String tipoLabel = tipo == MedidaCautelar.TipoMedida.MEDIDA_CAUTELAR
                            ? "Medida Cautelar" : "Suspensión Condicional del Proceso";
                    return new ApiResponse(false,
                            "Ya existe una " + tipoLabel + " registrada para este imputado con la causa penal \"" + dto.getCausaPenal() + "\"");
                }
            } catch (IllegalArgumentException ignored) {}
        }

        MedidaCautelar medida = new MedidaCautelar();
        medida.setImputado(imputado);

        if (dto.getTipo() != null) {
            try { medida.setTipo(MedidaCautelar.TipoMedida.valueOf(dto.getTipo())); }
            catch (IllegalArgumentException e) { return new ApiResponse(false, "Tipo inválido"); }
        }

        if (dto.getEntrevistaId() != null)
            entrevistaRepository.findById(dto.getEntrevistaId()).ifPresent(medida::setEntrevista);

        String usernameOrEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        userRepository.findByUsername(usernameOrEmail)
                .or(() -> userRepository.findByEmail(usernameOrEmail))
                .ifPresent(medida::setRegistradoPor);

        mapFields(dto, medida);
        MedidaCautelar saved = repository.save(medida);

        // Si es una conversión MC↔SCP, marcar origen y actualizar entrevista
        if (dto.getMedidaOrigenId() != null) {
            repository.findById(dto.getMedidaOrigenId()).ifPresent(origen -> {
                Long imputadoId = saved.getImputado() != null ? saved.getImputado().getId() : null;
                if (origen.getTipo() == MedidaCautelar.TipoMedida.MEDIDA_CAUTELAR) {
                    // MC → SCP
                    origen.setCambiadoAScp(true);
                    origen.setFechaCambioScp(LocalDate.now());
                    saved.setVieneDeMC(true);
                    if (imputadoId != null)
                        entrevistaRepository.actualizarTipoSeguimientoPorImputado(imputadoId, EntrevistaEncuadre.TipoSeguimiento.SCP);
                } else {
                    // SCP → MC
                    origen.setCambiadoAMc(true);
                    origen.setFechaCambioMc(LocalDate.now());
                    saved.setVieneDeScp(true);
                    if (imputadoId != null)
                        entrevistaRepository.actualizarTipoSeguimientoPorImputado(imputadoId, EntrevistaEncuadre.TipoSeguimiento.MC);
                }
                repository.save(origen);
            });
            repository.save(saved);
        }

        String nombre = saved.getImputado() != null
                ? saved.getImputado().getNombre() + " " + saved.getImputado().getApPaterno() : "—";
        bitacoraService.registrar(Bitacora.Entidad.MEDIDA_CAUTELAR, saved.getId(), nombre,
                Bitacora.Accion.CREAR,
                "Nueva medida registrada — tipo: " + (saved.getTipo() != null ? saved.getTipo().name() : "—")
                        + " | causa: " + saved.getCausaPenal());
        return new ApiResponse(true, "Registro guardado", MedidaCautelarResponseDTO.from(saved));
    }

    @Transactional
    public ApiResponse update(Long id, MedidaCautelarDTO dto) {
        MedidaCautelar medida = repository.findById(id).orElse(null);
        if (medida == null) return new ApiResponse(false, "Registro no encontrado");

        if (dto.getImputadoId() != null) {
            var imp = imputadoRepository.findById(dto.getImputadoId()).orElse(null);
            if (imp != null) medida.setImputado(imp);
        }
        if (dto.getEntrevistaId() != null)
            entrevistaRepository.findById(dto.getEntrevistaId()).ifPresent(medida::setEntrevista);

        // Capturar cambios relevantes antes de mapFields
        java.util.List<String> cambiosMC = new java.util.ArrayList<>();
        if (dto.getCausaPenal() != null && !java.util.Objects.equals(medida.getCausaPenal(), dto.getCausaPenal()))
            cambiosMC.add("Causa penal: " + dto.getCausaPenal());
        if (dto.getDelito() != null && !java.util.Objects.equals(medida.getDelito(), dto.getDelito()))
            cambiosMC.add("Delito: " + dto.getDelito());
        if (dto.getDelitosJson() != null && !java.util.Objects.equals(medida.getDelitosJson(), dto.getDelitosJson()))
            cambiosMC.add("Delitos actualizados");
        if (dto.getTipo() != null && (medida.getTipo() == null || !medida.getTipo().name().equals(dto.getTipo())))
            cambiosMC.add("Tipo: " + dto.getTipo());
        if (dto.getEstado() != null && (medida.getEstado() == null || !medida.getEstado().name().equals(dto.getEstado())))
            cambiosMC.add("Estado: " + dto.getEstado());
        if (dto.getFechaTermino() != null && !java.util.Objects.equals(medida.getFechaTermino(), dto.getFechaTermino()))
            cambiosMC.add("Fecha término actualizada");
        if (dto.getObservaciones() != null && !java.util.Objects.equals(medida.getObservaciones(), dto.getObservaciones()))
            cambiosMC.add("Observaciones actualizadas");
        String descCambiosMC = cambiosMC.isEmpty() ? "Medida actualizada" : "Medida actualizada — " + String.join(" | ", cambiosMC);

        mapFields(dto, medida);
        MedidaCautelar updated = repository.save(medida);
        String nombreUpd = updated.getImputado() != null
                ? updated.getImputado().getNombre() + " " + updated.getImputado().getApPaterno() : "—";
        bitacoraService.registrar(Bitacora.Entidad.MEDIDA_CAUTELAR, updated.getId(), nombreUpd,
                Bitacora.Accion.EDITAR, descCambiosMC);
        return new ApiResponse(true, "Registro actualizado", MedidaCautelarResponseDTO.from(updated));
    }

    @Transactional
    public ApiResponse cambiarEstado(Long id, String estado) {
        return repository.findById(id).map(m -> {
            String estadoAnterior = m.getEstado() != null ? m.getEstado().name() : "—";
            try { m.setEstado(MedidaCautelar.Estado.valueOf(estado)); }
            catch (IllegalArgumentException e) { return new ApiResponse(false, "Estado inválido: " + estado); }
            MedidaCautelar savedM = repository.save(m);
            String nombreM = savedM.getImputado() != null
                    ? savedM.getImputado().getNombre() + " " + savedM.getImputado().getApPaterno() : "—";
            bitacoraService.registrar(Bitacora.Entidad.MEDIDA_CAUTELAR, savedM.getId(), nombreM,
                    Bitacora.Accion.CAMBIO_ESTADO,
                    "Estado actualizado — anterior: " + estadoAnterior + " | nuevo: " + estado);
            return new ApiResponse(true, "Estado actualizado",
                    MedidaCautelarResponseDTO.from(savedM));
        }).orElse(new ApiResponse(false, "Registro no encontrado"));
    }

    @Transactional
    public ApiResponse cambiarCumplimiento(Long id, String valor) {
        if (valor != null && !valor.isEmpty() && !valor.equals("CUMPLIMIENTO") && !valor.equals("INCUMPLIMIENTO") && !valor.equals("SIN_ASIGNAR"))
            return new ApiResponse(false, "Valor inválido. Use CUMPLIMIENTO, INCUMPLIMIENTO o SIN_ASIGNAR");
        return repository.findById(id).map(m -> {
            String anterior = m.getCumpliendoIncumpliendo() != null ? m.getCumpliendoIncumpliendo() : "Sin asignar";
            m.setCumpliendoIncumpliendo((valor == null || valor.isEmpty() || valor.equals("SIN_ASIGNAR")) ? null : valor);
            MedidaCautelar saved = repository.save(m);
            String nombre = saved.getImputado() != null
                    ? saved.getImputado().getNombre() + " " + saved.getImputado().getApPaterno() : "—";
            bitacoraService.registrar(Bitacora.Entidad.MEDIDA_CAUTELAR, saved.getId(), nombre,
                    Bitacora.Accion.EDITAR,
                    "Cumplimiento actualizado — anterior: " + anterior + " | nuevo: " + valor);
            return new ApiResponse(true, "Cumplimiento actualizado", MedidaCautelarResponseDTO.from(saved));
        }).orElse(new ApiResponse(false, "Registro no encontrado"));
    }

    @Transactional
    public ApiResponse agregarSeguimiento(Long medidaId, SeguimientoMedidaDTO dto) {
        return repository.findById(medidaId).map(medida -> {
            SeguimientoMedida seg = new SeguimientoMedida();
            seg.setMedida(medida);
            seg.setFechaSeguimiento(dto.getFechaSeguimiento());
            seg.setDetalles(dto.getDetalles());
            String usernameOrEmail = SecurityContextHolder.getContext().getAuthentication().getName();
            userRepository.findByUsername(usernameOrEmail)
                    .or(() -> userRepository.findByEmail(usernameOrEmail))
                    .ifPresent(seg::setRegistradoPor);
            seguimientoRepository.save(seg);
            String nombreSeg = medida.getImputado() != null
                    ? medida.getImputado().getNombre() + " " + medida.getImputado().getApPaterno() : "—";
            bitacoraService.registrar(Bitacora.Entidad.MEDIDA_CAUTELAR, medidaId, nombreSeg,
                    Bitacora.Accion.EDITAR,
                    "Seguimiento registrado — fecha: " + dto.getFechaSeguimiento()
                            + (dto.getDetalles() != null ? " | detalles: " + dto.getDetalles() : ""));
            return new ApiResponse(true, "Seguimiento agregado",
                    MedidaCautelarResponseDTO.from(medida));
        }).orElse(new ApiResponse(false, "Registro no encontrado"));
    }

    /** Revoca una SCP: cambia estado a REVOCADO y guarda número de oficio y motivo. */
    @Transactional
    public ApiResponse registrarRevocacion(Long id, RevocacionDTO dto) {
        return repository.findById(id).map(m -> {
            m.setEstado(MedidaCautelar.Estado.REVOCADO);
            m.setFechaRevocacion(LocalDate.now());
            m.setOficioRevocacion(dto.getOficioRevocacion());
            m.setMotivoRevocacion(dto.getMotivoRevocacion());
            MedidaCautelar saved = repository.save(m);
            String nombreRev = saved.getImputado() != null
                    ? saved.getImputado().getNombre() + " " + saved.getImputado().getApPaterno() : "—";
            bitacoraService.registrar(Bitacora.Entidad.MEDIDA_CAUTELAR, saved.getId(), nombreRev,
                    Bitacora.Accion.CAMBIO_ESTADO,
                    "S.C.P. revocada — oficio: " + dto.getOficioRevocacion()
                            + (dto.getMotivoRevocacion() != null ? " | motivo: " + dto.getMotivoRevocacion() : ""));
            return new ApiResponse(true, "S.C.P. revocada", MedidaCautelarResponseDTO.from(saved));
        }).orElse(new ApiResponse(false, "Registro no encontrado"));
    }

    /** Amplía el plazo de una SCP y actualiza {@code plazoScp} si se proporciona nuevo valor. */
    @Transactional
    public ApiResponse registrarAmpliacion(Long id, AmpliacionDTO dto) {
        return repository.findById(id).map(m -> {
            m.setFechaAmpliacion(LocalDate.now());
            m.setNuevoPlazoScp(dto.getNuevoPlazoScp());
            m.setMotivoAmpliacion(dto.getMotivoAmpliacion());
            if (dto.getNuevoPlazoScp() != null) m.setPlazoScp(dto.getNuevoPlazoScp());
            MedidaCautelar saved = repository.save(m);
            String nombreAmp = saved.getImputado() != null
                    ? saved.getImputado().getNombre() + " " + saved.getImputado().getApPaterno() : "—";
            bitacoraService.registrar(Bitacora.Entidad.MEDIDA_CAUTELAR, saved.getId(), nombreAmp,
                    Bitacora.Accion.EDITAR,
                    "Plazo ampliado — nuevo plazo: " + dto.getNuevoPlazoScp()
                            + (dto.getMotivoAmpliacion() != null ? " | motivo: " + dto.getMotivoAmpliacion() : ""));
            return new ApiResponse(true, "Plazo ampliado", MedidaCautelarResponseDTO.from(saved));
        }).orElse(new ApiResponse(false, "Registro no encontrado"));
    }

    /** Levanta la medida cautelar: cambia estado a LEVANTADO y registra oficio y motivo. */
    @Transactional
    public ApiResponse registrarLevantamiento(Long id, LevantamientoDTO dto) {
        return repository.findById(id).map(m -> {
            m.setEstado(MedidaCautelar.Estado.LEVANTADO);
            m.setFechaLevantamiento(LocalDate.now());
            m.setOficioLevantamiento(dto.getOficioLevantamiento());
            m.setFirmaLevantamiento(dto.getFirmaLevantamiento());
            m.setMotivoLevantamiento(dto.getMotivoLevantamiento());
            m.setCumplioLevantamiento(dto.getCumplioLevantamiento());
            MedidaCautelar saved = repository.save(m);
            String nombreLev = saved.getImputado() != null
                    ? saved.getImputado().getNombre() + " " + saved.getImputado().getApPaterno() : "—";
            bitacoraService.registrar(Bitacora.Entidad.MEDIDA_CAUTELAR, saved.getId(), nombreLev,
                    Bitacora.Accion.CAMBIO_ESTADO,
                    "Medida levantada — oficio: " + dto.getOficioLevantamiento()
                            + (dto.getMotivoLevantamiento() != null ? " | motivo: " + dto.getMotivoLevantamiento() : ""));
            return new ApiResponse(true, "Medida levantada", MedidaCautelarResponseDTO.from(saved));
        }).orElse(new ApiResponse(false, "Registro no encontrado"));
    }

    // ── helper ───────────────────────────────────────────────────────────────
    private void mapFields(MedidaCautelarDTO dto, MedidaCautelar m) {
        if (dto.getCausaPenal() != null)  m.setCausaPenal(dto.getCausaPenal());
        if (dto.getTipo() != null) {
            try { m.setTipo(MedidaCautelar.TipoMedida.valueOf(dto.getTipo())); } catch (Exception ignored) {}
        }

        // Datos procesales
        m.setFechaRecepcion(dto.getFechaRecepcion());
        m.setDelito(dto.getDelito());
        if (dto.getDelitosJson() != null) m.setDelitosJson(dto.getDelitosJson());
        m.setModalidad(dto.getModalidad());
        m.setSede(dto.getSede());
        m.setNombreJuez(dto.getNombreJuez());
        m.setFechaFormulacion(dto.getFechaFormulacion());
        m.setFechaVinculacionProceso(dto.getFechaVinculacionProceso());
        m.setFechaEntrevistaEvaluacion(dto.getFechaEntrevistaEvaluacion());

        // MC Art. 155
        m.setFechaCanalizacion(dto.getFechaCanalizacion());
        m.setADisposicion(dto.getADisposicion());
        m.setDescripcionDomicilio(dto.getDescripcionDomicilio());
        m.setPresentacionPeriodica(dto.getPresentacionPeriodica());
        m.setNoBiometrico(dto.getNoBiometrico());
        m.setNoLibro(dto.getNoLibro());
        m.setNoPagina(dto.getNoPagina());
        m.setCumpliendoIncumpliendo(dto.getCumpliendoIncumpliendo());
        m.setDistritoJudicial(dto.getDistritoJudicial());
        m.setDescripcionInforme(dto.getDescripcionInforme());
        m.setAcuerdoReparatorio(dto.getAcuerdoReparatorio());
        m.setDescripcionAcuerdo(dto.getDescripcionAcuerdo());
        m.setFechaCelebracionAcuerdo(dto.getFechaCelebracionAcuerdo());
        m.setFechaCumplimientoAcuerdo(dto.getFechaCumplimientoAcuerdo());
        m.setEstatusFinal(dto.getEstatusFinal());
        m.setFechaTermino(dto.getFechaTermino());

        // SCP
        m.setFechaImposicionScp(dto.getFechaImposicionScp());
        m.setPlazoScp(dto.getPlazoScp());
        m.setCanalizacion(dto.getCanalizacion());
        m.setTipoServicio(dto.getTipoServicio());
        m.setFechaInformeFinal(dto.getFechaInformeFinal());
        m.setVencimientoPlazo(dto.getVencimientoPlazo());
        m.setOficioSobreseimiento(dto.getOficioSobreseimiento());
        m.setResponsableCierre(dto.getResponsableCierre());

        // Fracciones
        if (dto.getFracciones() != null) m.setFracciones(dto.getFracciones());
        m.setDetallesFracciones(dto.getDetallesFracciones());

        // Info adicional
        m.setAdvertencia(dto.getAdvertencia());
        m.setObservaciones(dto.getObservaciones());
        m.setResponsableSeguimiento(dto.getResponsableSeguimiento());
        m.setObservacionesGenerales(dto.getObservacionesGenerales());
        m.setFechaProximaRevision(dto.getFechaProximaRevision());
        m.setVigenciaInicio(dto.getVigenciaInicio());
        m.setVigenciaFin(dto.getVigenciaFin());

        if (dto.getEstado() != null) {
            try { m.setEstado(MedidaCautelar.Estado.valueOf(dto.getEstado())); } catch (Exception ignored) {}
        }
    }

    @Transactional
    public ApiResponse eliminar(Long id) {
        return repository.findById(id).map(m -> {
            String nombre = m.getImputado() != null
                    ? m.getImputado().getNombre() + " " + m.getImputado().getApPaterno() : "—";
            bitacoraService.registrar(Bitacora.Entidad.IMPUTADO,
                    m.getImputado() != null ? m.getImputado().getId() : id,
                    nombre, Bitacora.Accion.ELIMINAR,
                    "Medida eliminada — tipo: " + m.getTipo() + " | causa: " + m.getCausaPenal());
            repository.delete(m);
            return new ApiResponse(true, "Medida eliminada correctamente");
        }).orElse(new ApiResponse(false, "Medida no encontrada"));
    }
}
