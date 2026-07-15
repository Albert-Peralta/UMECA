package mx.edu.utez.umeca.modules.evaluacion;

import lombok.RequiredArgsConstructor;
import mx.edu.utez.umeca.kernel.ApiResponse;
import mx.edu.utez.umeca.modules.bitacora.Bitacora;
import mx.edu.utez.umeca.modules.bitacora.BitacoraService;
import mx.edu.utez.umeca.modules.entrevista.EntrevistaEncuadreRepository;
import mx.edu.utez.umeca.modules.imputado.Imputado;
import mx.edu.utez.umeca.modules.imputado.ImputadoRepository;
import mx.edu.utez.umeca.modules.security.user.User;
import mx.edu.utez.umeca.modules.security.user.UserRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/**
 * Lógica de negocio para evaluaciones de riesgo cautelar.
 * Cubre el ciclo completo: registro, actualización, cambio de estatus,
 * asignación de evaluador, resultado y negaciones de entrevista.
 */
@Service
@RequiredArgsConstructor
public class EvaluacionRiesgoService {

    private final EvaluacionRiesgoRepository evaluacionRepository;
    private final ImputadoRepository imputadoRepository;
    private final UserRepository userRepository;
    private final EntrevistaEncuadreRepository entrevistaRepository;
    private final BitacoraService bitacoraService;

    /** Devuelve todas las evaluaciones ordenadas de más reciente a más antigua. */
    @Transactional(readOnly = true)
    public ApiResponse findAll() {
        List<EvaluacionRiesgoResponseDTO> lista = evaluacionRepository
                .findAllByOrderByCreatedAtDesc()
                .stream()
                .map(EvaluacionRiesgoResponseDTO::from)
                .toList();
        return new ApiResponse(true, "Evaluaciones obtenidas", lista);
    }

    /** Evaluaciones de un imputado específico. */
    @Transactional(readOnly = true)
    public ApiResponse findByImputado(Long imputadoId) {
        List<EvaluacionRiesgoResponseDTO> lista = evaluacionRepository
                .findByImputadoId(imputadoId)
                .stream()
                .map(EvaluacionRiesgoResponseDTO::from)
                .toList();
        return new ApiResponse(true, "OK", lista);
    }

    /** Búsqueda por nombre, apellido o causa penal (texto libre). */
    public ApiResponse buscar(String termino) {
        List<EvaluacionRiesgoResponseDTO> lista = evaluacionRepository
                .buscar(termino)
                .stream()
                .map(EvaluacionRiesgoResponseDTO::from)
                .toList();
        return new ApiResponse(true, "Resultados", lista);
    }

    /**
     * Registra una nueva evaluación de riesgo.
     * Si el imputado ya existe por causa penal, actualiza sus datos en vez de crear uno nuevo.
     * Si quien crea tiene rol de evaluador, se auto-asigna a la evaluación.
     */
    @Transactional
    public ApiResponse save(EvaluacionRiesgoDTO dto) {
        if (dto.getFechaSolicitud() != null && dto.getFechaSolicitud().isAfter(LocalDate.now()))
            return new ApiResponse(false, "La fecha de solicitud no puede ser futura");
        if (dto.getPuestaDisposicion() != null && dto.getPuestaDisposicion().isAfter(LocalDate.now()))
            return new ApiResponse(false, "La puesta a disposición no puede ser futura");

        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User solicitante = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        // Si viene imputadoId se usa ese directamente; si no, se crea uno nuevo
        Imputado imputado;
        if (dto.getImputadoId() != null) {
            imputado = imputadoRepository.findById(dto.getImputadoId())
                    .orElse(null);
            if (imputado == null) return new ApiResponse(false, "Imputado no encontrado");
        } else {
            imputado = new Imputado();
            imputado.setNombre(dto.getNombreImputado());
            imputado.setApPaterno(dto.getApPaternoImputado());
            if (dto.getApMaternoImputado() != null) imputado.setApMaterno(dto.getApMaternoImputado());
            imputado.setCausaPenal(dto.getCausaPenal());
            imputado.setDelito(dto.getDelito());
            if (dto.getUbicacionFisica() != null && !dto.getUbicacionFisica().isBlank()) {
                try {
                    imputado.setUbicacionFisica(Imputado.UbicacionFisica.valueOf(dto.getUbicacionFisica()));
                } catch (IllegalArgumentException ex) {
                    return new ApiResponse(false, "Ubicación física inválida: " + dto.getUbicacionFisica());
                }
            }
            imputadoRepository.save(imputado);
        }

        EvaluacionRiesgo ev = new EvaluacionRiesgo();
        ev.setFechaSolicitud(dto.getFechaSolicitud());
        ev.setNombreSolicitanteTexto(dto.getNombreSolicitante());
        ev.setCargoSolicitante(dto.getCargo());
        ev.setDependenciaSolicitante(dto.getDependencia());
        ev.setSolicitante(solicitante);
        ev.setImputado(imputado);
        // Si quien crea tiene rol de evaluador, se auto-asigna
        boolean esEvaluador = solicitante.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_EVALUADOR_RIESGO") || a.getAuthority().equals("ROLE_ADMINISTRADOR"));
        if (esEvaluador) ev.setEvaluador(solicitante);
        ev.setPuestaDisposicion(dto.getPuestaDisposicion());
        ev.setFechaAudiencia(dto.getFechaAudiencia());
        ev.setEstatus(EvaluacionRiesgo.Estatus.PENDIENTE);

        if (dto.getEntrevistaId() != null)
            entrevistaRepository.findById(dto.getEntrevistaId()).ifPresent(ev::setEntrevista);

        mapDtoToEntity(dto, ev);

        if (dto.getResultado() != null && !dto.getResultado().isBlank()) {
            try {
                ev.setResultado(EvaluacionRiesgo.Resultado.valueOf(dto.getResultado()));
            } catch (IllegalArgumentException ex) {
                return new ApiResponse(false, "Resultado inválido: " + dto.getResultado());
            }
            ev.setEstatus(EvaluacionRiesgo.Estatus.FINALIZADO);
        }

        EvaluacionRiesgo savedEv = evaluacionRepository.save(ev);
        String nombreEv = imputado.getNombre() + " " + imputado.getApPaterno();
        bitacoraService.registrar(Bitacora.Entidad.IMPUTADO, imputado.getId(), nombreEv,
                Bitacora.Accion.CREAR,
                "Evaluación de riesgo registrada. Causa: " + dto.getCausaPenal()
                        + ". Delito: " + dto.getDelito());
        return new ApiResponse(true, "Evaluación registrada", EvaluacionRiesgoResponseDTO.from(savedEv));
    }

    /**
     * Actualiza una evaluación existente.
     * Si todavía no tiene evaluador asignado, se asigna al usuario que edita
     * y el estatus pasa de PENDIENTE a TRABAJANDO.
     */
    @Transactional
    public ApiResponse update(Long id, EvaluacionRiesgoDTO dto) {
        String emailUpdate = SecurityContextHolder.getContext().getAuthentication().getName();
        return evaluacionRepository.findById(id).map(ev -> {
            if (dto.getEntrevistaId() != null)
                entrevistaRepository.findById(dto.getEntrevistaId()).ifPresent(ev::setEntrevista);

            // Auto-asignar evaluador al usuario que edita el formulario
            if (ev.getEvaluador() == null) {
                userRepository.findByEmail(emailUpdate).ifPresent(ev::setEvaluador);
                if (ev.getEstatus() == EvaluacionRiesgo.Estatus.PENDIENTE)
                    ev.setEstatus(EvaluacionRiesgo.Estatus.TRABAJANDO);
            }

            mapDtoToEntity(dto, ev);

            if (dto.getResultado() != null && !dto.getResultado().isBlank()) {
                try {
                    ev.setResultado(EvaluacionRiesgo.Resultado.valueOf(dto.getResultado()));
                } catch (IllegalArgumentException ex) {
                    return new ApiResponse(false, "Resultado inválido: " + dto.getResultado());
                }
                ev.setEstatus(EvaluacionRiesgo.Estatus.FINALIZADO);
            }

            EvaluacionRiesgo updatedEv = evaluacionRepository.save(ev);
            String nombreUpdEv = updatedEv.getImputado() != null
                    ? updatedEv.getImputado().getNombre() + " " + updatedEv.getImputado().getApPaterno() : "—";
            String descUpd = "Evaluación actualizada. Estatus: " + updatedEv.getEstatus();
            if (updatedEv.getResultado() != null) descUpd += ". Resultado: " + updatedEv.getResultado();
            bitacoraService.registrar(Bitacora.Entidad.IMPUTADO,
                    updatedEv.getImputado() != null ? updatedEv.getImputado().getId() : id,
                    nombreUpdEv, Bitacora.Accion.EDITAR, descUpd);
            return new ApiResponse(true, "Evaluación actualizada", EvaluacionRiesgoResponseDTO.from(updatedEv));
        }).orElse(new ApiResponse(false, "Evaluación no encontrada"));
    }

    /**
     * Copia todos los campos del DTO a la entidad.
     * Separado para reutilizarlo tanto en save como en update.
     */
    private void mapDtoToEntity(EvaluacionRiesgoDTO dto, EvaluacionRiesgo ev) {
        if (dto.getNombreSolicitante() != null) ev.setNombreSolicitanteTexto(dto.getNombreSolicitante());
        if (dto.getCargo() != null) ev.setCargoSolicitante(dto.getCargo());
        if (dto.getDependencia() != null) ev.setDependenciaSolicitante(dto.getDependencia());

        // Fechas de la solicitud (actualizables en edición)
        if (dto.getFechaSolicitud() != null) ev.setFechaSolicitud(dto.getFechaSolicitud());
        ev.setPuestaDisposicion(dto.getPuestaDisposicion());
        ev.setFechaAudiencia(dto.getFechaAudiencia());

        // Datos personales imputado del formulario
        ev.setGenero(dto.getGenero());
        ev.setFechaNacimiento(dto.getFechaNacimiento());
        ev.setEdad(dto.getEdad());
        ev.setLugarNacimientoImp(dto.getLugarNacimientoImp());
        ev.setMunicipioImp(dto.getMunicipioImp());
        ev.setEstadoNacimiento(dto.getEstadoNacimiento());
        ev.setPaisImp(dto.getPaisImp());
        ev.setEstadoCivil(dto.getEstadoCivil());
        ev.setGradoEstudios(dto.getGradoEstudios());
        ev.setDomicilioActualCalle(dto.getDomicilioActualCalle());
        ev.setDomicilioActualNo(dto.getDomicilioActualNo());
        ev.setDomicilioActualColonia(dto.getDomicilioActualColonia());
        ev.setDomicilioActualMunicipio(dto.getDomicilioActualMunicipio());
        ev.setDomicilioActualEstado(dto.getDomicilioActualEstado());
        ev.setEmpresaImp(dto.getEmpresaImp());
        ev.setTelEmpresaImp(dto.getTelEmpresaImp());
        ev.setPuestoImp(dto.getPuestoImp());
        ev.setNombreJefeImp(dto.getNombreJefeImp());
        ev.setHorarioTrabajoImp(dto.getHorarioTrabajoImp());
        ev.setDomicilioTrabajoImp(dto.getDomicilioTrabajoImp());
        ev.setSalarioMensualImp(dto.getSalarioMensualImp());
        ev.setUltimoEmpleoImp(dto.getUltimoEmpleoImp());

        ev.setHoraInicio(dto.getHoraInicio());
        ev.setHoraFinal(dto.getHoraFinal());
        ev.setLugarEntrevista(dto.getLugarEntrevista());

        ev.setCurp(dto.getCurp());
        ev.setHijos(dto.getHijos());
        ev.setNumHijos(dto.getNumHijos());
        ev.setNumHijosMenores(dto.getNumHijosMenores());
        ev.setTiempoEnDomicilio(dto.getTiempoEnDomicilio());
        ev.setTipoDomicilioActual(dto.getTipoDomicilioActual());
        ev.setNombreArrendador(dto.getNombreArrendador());
        ev.setMontoDomicilio(dto.getMontoDomicilio());
        ev.setTelefonoDomicilio(dto.getTelefonoDomicilio());
        ev.setCelularDomicilio(dto.getCelularDomicilio());
        ev.setCalleSecundaria(dto.getCalleSecundaria());
        ev.setNoSecundaria(dto.getNoSecundaria());
        ev.setColoniaSecundaria(dto.getColoniaSecundaria());
        ev.setMunicipioSecundario(dto.getMunicipioSecundario());
        ev.setRazonDomicilio(dto.getRazonDomicilio());
        ev.setDomiciliosAnterioresJson(dto.getDomiciliosAnterioresJson());
        ev.setEmpleosAnterioresJson(dto.getEmpleosAnterioresJson());
        ev.setNombreEscuela(dto.getNombreEscuela());
        ev.setAnioEscolar(dto.getAnioEscolar());
        ev.setAtrasoEscolar(dto.getAtrasoEscolar());

        ev.setTiempoEnMorelos(dto.getTiempoEnMorelos());
        ev.setFamiliaresOtroPais(dto.getFamiliaresOtroPais());
        ev.setMediosComunicacion(dto.getMediosComunicacion());
        ev.setDondeHabitanFamiliares(dto.getDondeHabitanFamiliares());
        ev.setTieneVisa(dto.getTieneVisa());
        ev.setTienePasaporte(dto.getTienePasaporte());
        ev.setPersonasDependientes(dto.getPersonasDependientes());
        ev.setDondeHabitanDependientes(dto.getDondeHabitanDependientes());

        ev.setEnfermedades(dto.getEnfermedades());
        ev.setHobbies(dto.getHobbies());
        ev.setEnfermedadFamiliar(dto.getEnfermedadFamiliar());
        ev.setOrganizaciones(dto.getOrganizaciones());
        ev.setObservacionesGenerales(dto.getObservacionesGenerales());

        ev.setSabeDenunciante(dto.getSabeDenunciante());
        ev.setViveConImputado(dto.getViveConImputado());
        ev.setSabenDondeVive(dto.getSabenDondeVive());
        ev.setNombreDenunciante(dto.getNombreDenunciante());
        ev.setBasesVictima(dto.getBasesVictima());
        ev.setTipoSolicitud(dto.getTipoSolicitud());

        ev.setArticuloDelito(dto.getArticuloDelito());
        ev.setReincidencia(dto.getReincidencia());
        ev.setRelacionVictima(dto.getRelacionVictima());
        ev.setDescripcionCompromiso(dto.getDescripcionCompromiso());

        ev.setNumOficio(dto.getNumOficio());
        ev.setFolioEscrito(dto.getFolioEscrito());
        ev.setFiscalia(dto.getFiscalia());
        ev.setProcesosAnteriores(dto.getProcesosAnteriores());
        ev.setJustificacionResultado(dto.getJustificacionResultado());
        ev.setConclusionGeneral(dto.getConclusionGeneral());
        ev.setRiesgosProcesalesJson(dto.getRiesgosProcesalesJson());
        ev.setFactoresEstabilidadJson(dto.getFactoresEstabilidadJson());

        // Verificaciones por sección (s1–s11)
        ev.setVerifS1Metodo(dto.getVerifS1Metodo()); ev.setVerifS1Resultado(dto.getVerifS1Resultado());
        ev.setVerifS2Metodo(dto.getVerifS2Metodo()); ev.setVerifS2Resultado(dto.getVerifS2Resultado());
        ev.setVerifS3Metodo(dto.getVerifS3Metodo()); ev.setVerifS3Resultado(dto.getVerifS3Resultado());
        ev.setVerifS4Metodo(dto.getVerifS4Metodo()); ev.setVerifS4Resultado(dto.getVerifS4Resultado());
        ev.setVerifS5Metodo(dto.getVerifS5Metodo()); ev.setVerifS5Resultado(dto.getVerifS5Resultado());
        ev.setVerifS6Metodo(dto.getVerifS6Metodo()); ev.setVerifS6Resultado(dto.getVerifS6Resultado());
        ev.setVerifS7Metodo(dto.getVerifS7Metodo()); ev.setVerifS7Resultado(dto.getVerifS7Resultado());
        ev.setVerifS8Metodo(dto.getVerifS8Metodo()); ev.setVerifS8Resultado(dto.getVerifS8Resultado());
        ev.setVerifS9Metodo(dto.getVerifS9Metodo()); ev.setVerifS9Resultado(dto.getVerifS9Resultado());
        ev.setVerifS10Metodo(dto.getVerifS10Metodo()); ev.setVerifS10Resultado(dto.getVerifS10Resultado());
        ev.setVerifS11Metodo(dto.getVerifS11Metodo()); ev.setVerifS11Resultado(dto.getVerifS11Resultado());
    }

    /**
     * Registra una negación de evaluación: el imputado se negó a proporcionar información.
     * El estatus queda en FINALIZADO y el tipo de documento como NEGACION.
     */
    @Transactional
    public ApiResponse saveNegacion(NegacionDTO dto) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User solicitante = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        // Si viene imputadoId se usa ese directamente; si no, se crea uno nuevo
        Imputado imputado;
        if (dto.getImputadoId() != null) {
            imputado = imputadoRepository.findById(dto.getImputadoId()).orElse(null);
            if (imputado == null) return new ApiResponse(false, "Imputado no encontrado");
        } else {
            imputado = new Imputado();
            imputado.setNombre(dto.getNombreImputado());
            imputado.setApPaterno(dto.getApPaternoImputado());
            if (dto.getApMaternoImputado() != null) imputado.setApMaterno(dto.getApMaternoImputado());
            imputado.setCausaPenal(dto.getCausaPenal());
            imputado.setDelito("—");
            imputadoRepository.save(imputado);
        }

        EvaluacionRiesgo ev = new EvaluacionRiesgo();
        ev.setFechaSolicitud(dto.getFechaSolicitud() != null ? dto.getFechaSolicitud() : LocalDate.now());
        ev.setNombreSolicitanteTexto(dto.getNombreSolicitante());
        ev.setCargoSolicitante(dto.getCargo());
        ev.setDependenciaSolicitante(dto.getDependencia());
        ev.setHoraInicio(dto.getHoraInicio());
        ev.setLugarEntrevista(dto.getLugarEntrevista());
        ev.setEdad(dto.getEdad());
        ev.setSolicitante(solicitante);
        ev.setImputado(imputado);
        ev.setEvaluador(solicitante);
        ev.setEstatus(EvaluacionRiesgo.Estatus.FINALIZADO);
        ev.setTipoDocumento(EvaluacionRiesgo.TipoDocumento.NEGACION);

        EvaluacionRiesgo savedEv = evaluacionRepository.save(ev);
        String nombreEv = imputado.getNombre() + " " + imputado.getApPaterno();
        bitacoraService.registrar(Bitacora.Entidad.IMPUTADO, imputado.getId(), nombreEv,
                Bitacora.Accion.CREAR,
                "Negación de evaluación registrada. Causa: " + dto.getCausaPenal()
                        + ". El imputado se negó a proporcionar información.");
        return new ApiResponse(true, "Negación registrada", EvaluacionRiesgoResponseDTO.from(savedEv));
    }

    /** Cambia el estatus de una evaluación (PENDIENTE, TRABAJANDO, FINALIZADO). */
    @Transactional
    public ApiResponse cambiarEstatus(Long id, String estatus) {
        EvaluacionRiesgo.Estatus nuevoEstatus;
        try {
            nuevoEstatus = EvaluacionRiesgo.Estatus.valueOf(estatus);
        } catch (IllegalArgumentException ex) {
            return new ApiResponse(false, "Estatus inválido: " + estatus);
        }
        return evaluacionRepository.findById(id).map(e -> {
            String estatusAnt = e.getEstatus() != null ? e.getEstatus().name() : "—";
            e.setEstatus(nuevoEstatus);
            EvaluacionRiesgo saved = evaluacionRepository.save(e);
            String nombreCE = saved.getImputado() != null
                    ? saved.getImputado().getNombre() + " " + saved.getImputado().getApPaterno() : "—";
            bitacoraService.registrar(Bitacora.Entidad.IMPUTADO,
                    saved.getImputado() != null ? saved.getImputado().getId() : id,
                    nombreCE, Bitacora.Accion.CAMBIO_ESTADO,
                    "Estatus evaluación: " + estatusAnt + " → " + estatus);
            return new ApiResponse(true, "Estatus actualizado", EvaluacionRiesgoResponseDTO.from(saved));
        }).orElse(new ApiResponse(false, "Evaluación no encontrada"));
    }

    @Transactional(readOnly = true)
    public ApiResponse findById(Long id) {
        return evaluacionRepository.findById(id)
                .map(e -> new ApiResponse(true, "Evaluación encontrada", EvaluacionRiesgoResponseDTO.from(e)))
                .orElse(new ApiResponse(false, "Evaluación no encontrada"));
    }

    /**
     * El usuario autenticado se auto-asigna como evaluador.
     * Si el estatus era PENDIENTE, pasa a TRABAJANDO automáticamente.
     */
    @Transactional
    public ApiResponse asignarEvaluador(Long id) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User evaluador = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        return evaluacionRepository.findById(id).map(e -> {
            e.setEvaluador(evaluador);
            if (e.getEstatus() == EvaluacionRiesgo.Estatus.PENDIENTE)
                e.setEstatus(EvaluacionRiesgo.Estatus.TRABAJANDO);
            EvaluacionRiesgo saved = evaluacionRepository.save(e);
            String nombreAsig = saved.getImputado() != null
                    ? saved.getImputado().getNombre() + " " + saved.getImputado().getApPaterno() : "—";
            bitacoraService.registrar(Bitacora.Entidad.IMPUTADO,
                    saved.getImputado() != null ? saved.getImputado().getId() : id,
                    nombreAsig, Bitacora.Accion.EDITAR,
                    "Evaluador asignado: " + evaluador.getNombre() + " " + evaluador.getApPaterno());
            return new ApiResponse(true, "Evaluador asignado", EvaluacionRiesgoResponseDTO.from(saved));
        }).orElse(new ApiResponse(false, "Evaluación no encontrada"));
    }

    /** Registra el resultado final de la evaluación y cambia el estatus a FINALIZADO. */
    @Transactional
    public ApiResponse asignarResultado(Long id, String resultado) {
        return evaluacionRepository.findById(id).map(e -> {
            try {
                e.setResultado(EvaluacionRiesgo.Resultado.valueOf(resultado));
            } catch (IllegalArgumentException ex) {
                throw new RuntimeException("Resultado inválido: " + resultado);
            }
            e.setEstatus(EvaluacionRiesgo.Estatus.FINALIZADO);
            EvaluacionRiesgo saved = evaluacionRepository.save(e);
            String nombreRes = saved.getImputado() != null
                    ? saved.getImputado().getNombre() + " " + saved.getImputado().getApPaterno() : "—";
            bitacoraService.registrar(Bitacora.Entidad.IMPUTADO,
                    saved.getImputado() != null ? saved.getImputado().getId() : id,
                    nombreRes, Bitacora.Accion.CAMBIO_ESTADO,
                    "Resultado de evaluación registrado: " + resultado + ". Estatus: FINALIZADO");
            return new ApiResponse(true, "Resultado registrado", EvaluacionRiesgoResponseDTO.from(saved));
        }).orElse(new ApiResponse(false, "Evaluación no encontrada"));
    }
}
