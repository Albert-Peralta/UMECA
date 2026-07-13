package mx.edu.utez.umeca.modules.consulta;

import mx.edu.utez.umeca.kernel.ApiResponse;
import mx.edu.utez.umeca.modules.bitacora.Bitacora;
import mx.edu.utez.umeca.modules.bitacora.BitacoraService;
import mx.edu.utez.umeca.modules.entrevista.EntrevistaEncuadre;
import mx.edu.utez.umeca.modules.entrevista.EntrevistaEncuadreRepository;
import mx.edu.utez.umeca.modules.evaluacion.EvaluacionRiesgo;
import mx.edu.utez.umeca.modules.evaluacion.EvaluacionRiesgoRepository;
import mx.edu.utez.umeca.modules.imputado.Imputado;
import mx.edu.utez.umeca.modules.imputado.ImputadoRepository;
import mx.edu.utez.umeca.modules.medidacautelar.MedidaCautelar;
import mx.edu.utez.umeca.modules.medidacautelar.MedidaCautelarRepository;
import mx.edu.utez.umeca.modules.security.user.User;
import mx.edu.utez.umeca.modules.security.user.UserRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional
public class ConsultaRegistroService {

    private final ConsultaRegistroRepository repo;
    private final UserRepository userRepo;
    private final ImputadoRepository imputadoRepo;
    private final EntrevistaEncuadreRepository entrevistaRepo;
    private final EvaluacionRiesgoRepository evaluacionRepo;
    private final MedidaCautelarRepository medidaRepo;
    private final BitacoraService bitacoraService;

    public ConsultaRegistroService(ConsultaRegistroRepository repo, UserRepository userRepo,
                                   ImputadoRepository imputadoRepo,
                                   EntrevistaEncuadreRepository entrevistaRepo,
                                   EvaluacionRiesgoRepository evaluacionRepo,
                                   MedidaCautelarRepository medidaRepo,
                                   BitacoraService bitacoraService) {
        this.repo = repo;
        this.userRepo = userRepo;
        this.imputadoRepo = imputadoRepo;
        this.entrevistaRepo = entrevistaRepo;
        this.evaluacionRepo = evaluacionRepo;
        this.medidaRepo = medidaRepo;
        this.bitacoraService = bitacoraService;
    }

    /** Extrae el usuario autenticado del contexto de seguridad. */
    private User usuarioActual() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepo.findByEmail(email).orElse(null);
    }

    /** Devuelve todas las consultas ordenadas por fecha descendente. */
    @Transactional(readOnly = true)
    public ApiResponse listar() {
        List<ConsultaRegistroResponseDTO> lista = repo.findAllByOrderByFechaSolicitudDesc()
                .stream().map(ConsultaRegistroResponseDTO::from).collect(Collectors.toList());
        return new ApiResponse(true, "OK", lista);
    }

    /**
     * Devuelve el detalle de una consulta, incluyendo las consultas previas
     * del mismo imputado detectadas por CURP o por nombre+apellido.
     */
    @Transactional(readOnly = true)
    public ApiResponse obtener(Long id) {
        Optional<ConsultaRegistro> opt = repo.findById(id);
        if (opt.isEmpty()) return new ApiResponse(false, "No encontrado");

        ConsultaRegistro c = opt.get();
        ConsultaRegistroResponseDTO dto = ConsultaRegistroResponseDTO.from(c);

        // Adjuntar consultas previas del mismo imputado
        List<ConsultaRegistro> previas = buscarPrevias(c);
        List<ConsultaRegistroResponseDTO.ConsultaPreviaDTO> previasDTOs = previas.stream().map(p -> {
            ConsultaRegistroResponseDTO.ConsultaPreviaDTO pd = new ConsultaRegistroResponseDTO.ConsultaPreviaDTO();
            pd.setId(p.getId());
            pd.setFechaSolicitud(p.getFechaSolicitud());
            pd.setResultado(p.getResultado().name());
            pd.setQuienSolicita(p.getQuienSolicita());
            pd.setCausaPenal(p.getCausaPenal());
            return pd;
        }).collect(Collectors.toList());
        dto.setConsultasPrevias(previasDTOs);

        return new ApiResponse(true, "OK", dto);
    }

    /**
     * Registra una consulta nueva. El folio consecutivo lo genera el sistema si no
     * viene en el DTO. La respuesta incluye las consultas previas del mismo imputado.
     */
    public ApiResponse crear(ConsultaRegistroDTO dto) {
        ConsultaRegistro c = new ConsultaRegistro();
        try {
            mapDtoToEntity(dto, c);
        } catch (IllegalArgumentException ex) {
            return new ApiResponse(false, ex.getMessage());
        }
        c.setRegistradoPor(usuarioActual());
        // Folio: usa el del DTO si viene, si no genera automático
        c.setFolioConsecutivo(dto.getFolioConsecutivo() != null
                ? dto.getFolioConsecutivo()
                : repo.findMaxFolio() + 1);

        ConsultaRegistro saved = repo.save(c);

        String nombreImp = ((saved.getApPaternoImputado() != null ? saved.getApPaternoImputado() + " " : "")
                + saved.getNombreImputado()).trim();
        bitacoraService.registrar(Bitacora.Entidad.CONSULTA, saved.getId(), nombreImp,
                Bitacora.Accion.CREAR,
                "Consulta registrada con resultado " + saved.getResultado().name()
                + (saved.getCausaPenal() != null ? " · Causa: " + saved.getCausaPenal() : ""));

        ConsultaRegistroResponseDTO response = ConsultaRegistroResponseDTO.from(saved);

        // Adjuntar consultas previas detectadas
        List<ConsultaRegistro> previas = buscarPrevias(saved);
        List<ConsultaRegistroResponseDTO.ConsultaPreviaDTO> previasDTOs = previas.stream().map(p -> {
            ConsultaRegistroResponseDTO.ConsultaPreviaDTO pd = new ConsultaRegistroResponseDTO.ConsultaPreviaDTO();
            pd.setId(p.getId());
            pd.setFechaSolicitud(p.getFechaSolicitud());
            pd.setResultado(p.getResultado().name());
            pd.setQuienSolicita(p.getQuienSolicita());
            pd.setCausaPenal(p.getCausaPenal());
            return pd;
        }).collect(Collectors.toList());
        response.setConsultasPrevias(previasDTOs);

        return new ApiResponse(true, "Consulta registrada", response);
    }

    public ApiResponse actualizar(Long id, ConsultaRegistroDTO dto) {
        Optional<ConsultaRegistro> opt = repo.findById(id);
        if (opt.isEmpty()) return new ApiResponse(false, "No encontrado");
        ConsultaRegistro c = opt.get();
        try {
            mapDtoToEntity(dto, c);
        } catch (IllegalArgumentException ex) {
            return new ApiResponse(false, ex.getMessage());
        }
        ConsultaRegistro updated = repo.save(c);
        String nombreImp = ((updated.getApPaternoImputado() != null ? updated.getApPaternoImputado() + " " : "")
                + updated.getNombreImputado()).trim();
        bitacoraService.registrar(Bitacora.Entidad.CONSULTA, updated.getId(), nombreImp,
                Bitacora.Accion.EDITAR,
                "Consulta actualizada · Resultado: " + updated.getResultado().name());
        return new ApiResponse(true, "Consulta actualizada", ConsultaRegistroResponseDTO.from(updated));
    }

    public ApiResponse eliminar(Long id) {
        Optional<ConsultaRegistro> opt = repo.findById(id);
        if (opt.isEmpty()) return new ApiResponse(false, "No encontrado");
        ConsultaRegistro c = opt.get();
        String nombreImp = ((c.getApPaternoImputado() != null ? c.getApPaternoImputado() + " " : "")
                + c.getNombreImputado()).trim();
        repo.deleteById(id);
        bitacoraService.registrar(Bitacora.Entidad.CONSULTA, id, nombreImp,
                Bitacora.Accion.ELIMINAR, "Consulta eliminada");
        return new ApiResponse(true, "Eliminado");
    }

    // Verifica si hay consultas previas del mismo imputado (por CURP o por nombre+apellido)
    private List<ConsultaRegistro> buscarPrevias(ConsultaRegistro c) {
        if (c.getCurp() != null && !c.getCurp().isBlank()) {
            return repo.findByCurpIgnoreCaseAndIdNot(c.getCurp(), c.getId());
        } else if (c.getNombreImputado() != null && c.getApPaternoImputado() != null) {
            return repo.findByNombreImputadoIgnoreCaseAndApPaternoImputadoIgnoreCaseAndIdNot(
                    c.getNombreImputado(), c.getApPaternoImputado(), c.getId());
        }
        return List.of();
    }

    // Verificar antecedentes antes de crear (para alertar en el formulario)
    /**
     * Verifica si existen consultas previas antes de crear el registro, para alertar
     * al capturista en el formulario. Busca primero por CURP y, si no tiene, por nombre+apellido.
     */
    @Transactional(readOnly = true)
    public ApiResponse verificarAntecedentes(String curp, String nombre, String apPaterno) {
        List<ConsultaRegistro> previas;
        if (curp != null && !curp.isBlank()) {
            previas = repo.findByCurpIgnoreCase(curp);
        } else if (nombre != null && apPaterno != null) {
            previas = repo.findByNombreImputadoIgnoreCaseAndApPaternoImputadoIgnoreCase(nombre, apPaterno);
        } else {
            return new ApiResponse(true, "OK", List.of());
        }
        List<ConsultaRegistroResponseDTO.ConsultaPreviaDTO> dtos = previas.stream().map(p -> {
            ConsultaRegistroResponseDTO.ConsultaPreviaDTO pd = new ConsultaRegistroResponseDTO.ConsultaPreviaDTO();
            pd.setId(p.getId());
            pd.setFechaSolicitud(p.getFechaSolicitud());
            pd.setResultado(p.getResultado().name());
            pd.setQuienSolicita(p.getQuienSolicita());
            pd.setCausaPenal(p.getCausaPenal());
            return pd;
        }).collect(Collectors.toList());
        return new ApiResponse(true, "OK", dtos);
    }

    /**
     * Localiza un imputado (por causa penal o nombre) y devuelve todos sus
     * registros asociados: entrevistas, evaluaciones y medidas cautelares/SCP.
     * Se usa en la pantalla de Consulta de Registros para dar una vista unificada.
     */
    @Transactional(readOnly = true)
    public ApiResponse buscarRegistros(String curp, String nombre, String apPaterno, String causaPenal) {
        RegistrosImputadoDTO result = new RegistrosImputadoDTO();

        // 1. Buscar el imputado
        List<Imputado> candidatos = new ArrayList<>();

        if (causaPenal != null && !causaPenal.isBlank()) {
            imputadoRepo.findByCausaPenal(causaPenal).ifPresent(candidatos::add);
        }
        if (candidatos.isEmpty() && nombre != null && apPaterno != null) {
            candidatos = imputadoRepo
                    .findByNombreContainingIgnoreCaseOrApPaternoContainingIgnoreCase(nombre, apPaterno)
                    .stream()
                    .filter(i -> i.getApPaterno().equalsIgnoreCase(apPaterno))
                    .collect(Collectors.toList());
        }

        if (candidatos.isEmpty()) {
            result.setEncontrado(false);
            return new ApiResponse(true, "OK", result);
        }

        Imputado imp = candidatos.get(0);
        result.setEncontrado(true);
        result.setImputadoId(imp.getId());
        result.setNombreCompleto(imp.getNombre() + " " + imp.getApPaterno()
                + (imp.getApMaterno() != null ? " " + imp.getApMaterno() : ""));
        result.setCausaPenal(imp.getCausaPenal());
        result.setDelito(imp.getDelito());

        // 2. Entrevistas
        List<RegistrosImputadoDTO.RegistroItem> entrevistas = entrevistaRepo
                .findByImputadoId(imp.getId()).stream().map(e -> {
                    RegistrosImputadoDTO.RegistroItem item = new RegistrosImputadoDTO.RegistroItem();
                    item.setId(e.getId());
                    item.setFecha(e.getFechaRegistro() != null ? e.getFechaRegistro().toString() : "—");
                    item.setEstatus(e.getFechaCompletado() != null ? "Completada" : "Pendiente");
                    item.setDetalle("Folio: " + (e.getFolio() != null ? e.getFolio() : "—"));
                    return item;
                }).collect(Collectors.toList());
        result.setEntrevistas(entrevistas);

        // 3. Evaluaciones
        List<RegistrosImputadoDTO.RegistroItem> evaluaciones = evaluacionRepo
                .findByImputadoId(imp.getId()).stream().map(e -> {
                    RegistrosImputadoDTO.RegistroItem item = new RegistrosImputadoDTO.RegistroItem();
                    item.setId(e.getId());
                    item.setFecha(e.getFechaSolicitud() != null ? e.getFechaSolicitud().toString() : "—");
                    item.setEstatus(e.getEstatus() != null ? e.getEstatus().name() : "—");
                    item.setDetalle(e.getResultado() != null ? e.getResultado().name() : "Sin resultado");
                    return item;
                }).collect(Collectors.toList());
        result.setEvaluaciones(evaluaciones);

        // 4. Medidas cautelares / SCP
        List<RegistrosImputadoDTO.RegistroItem> medidas = medidaRepo
                .findByImputadoId(imp.getId()).stream().map(m -> {
                    RegistrosImputadoDTO.RegistroItem item = new RegistrosImputadoDTO.RegistroItem();
                    item.setId(m.getId());
                    item.setFecha(m.getFechaRecepcion() != null ? m.getFechaRecepcion().toString() : "—");
                    item.setEstatus(m.getEstado() != null ? m.getEstado().name() : "—");
                    item.setDetalle(m.getTipo() != null ? m.getTipo().name() : "—");
                    item.setCumplioLevantamiento(m.getCumplioLevantamiento());
                    item.setFechaLevantamiento(m.getFechaLevantamiento() != null ? m.getFechaLevantamiento().toString() : null);
                    return item;
                }).collect(Collectors.toList());
        result.setMedidas(medidas);

        return new ApiResponse(true, "OK", result);
    }

    private void mapDtoToEntity(ConsultaRegistroDTO dto, ConsultaRegistro c) {
        c.setFechaSolicitud(dto.getFechaSolicitud());
        c.setQuienSolicita(dto.getQuienSolicita());
        c.setCargoSolicitante(dto.getCargoSolicitante());
        c.setDependenciaSolicitante(dto.getDependenciaSolicitante());
        c.setNombreImputado(dto.getNombreImputado());
        c.setApPaternoImputado(dto.getApPaternoImputado());
        c.setApMaternoImputado(dto.getApMaternoImputado());
        c.setCausaPenal(dto.getCausaPenal());
        if (dto.getFolioConsecutivo() != null) c.setFolioConsecutivo(dto.getFolioConsecutivo());
        c.setFechaNacimientoImputado(dto.getFechaNacimientoImputado());
        c.setCurp(dto.getCurp());
        c.setOficioNumero(dto.getOficioNumero());
        try {
            c.setResultado(ConsultaRegistro.Resultado.valueOf(dto.getResultado()));
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Resultado de consulta inválido: " + dto.getResultado());
        }
        c.setObservaciones(dto.getObservaciones());
    }
}
