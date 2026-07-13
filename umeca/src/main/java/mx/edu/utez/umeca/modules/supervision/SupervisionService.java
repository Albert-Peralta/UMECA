package mx.edu.utez.umeca.modules.supervision;

import lombok.RequiredArgsConstructor;
import mx.edu.utez.umeca.kernel.ApiResponse;
import mx.edu.utez.umeca.modules.bitacora.Bitacora;
import mx.edu.utez.umeca.modules.bitacora.BitacoraService;
import mx.edu.utez.umeca.modules.entrevista.DomicilioEntrevista;
import mx.edu.utez.umeca.modules.entrevista.EntrevistaEncuadreRepository;
import mx.edu.utez.umeca.modules.imputado.ImputadoRepository;
import mx.edu.utez.umeca.modules.medidacautelar.MedidaCautelarRepository;
import mx.edu.utez.umeca.modules.security.user.UserRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SupervisionService {

    private final SupervisionRepository repo;
    private final ImputadoRepository imputadoRepo;
    private final UserRepository userRepo;
    private final MedidaCautelarRepository medidaRepo;
    private final EntrevistaEncuadreRepository entrevistaRepo;
    private final BitacoraService bitacoraService;

    /** Devuelve todas las supervisiones con domicilio, coordenadas y teléfono enriquecidos. */
    @Transactional(readOnly = true)
    public ApiResponse findAll() {
        List<SupervisionResponseDTO> list = repo.findAll().stream()
                .map(this::toDto).toList();
        return new ApiResponse(true, "OK", list);
    }

    /**
     * Devuelve las supervisiones dentro de un rango de fechas.
     * Si no se especifica rango, usa la semana actual (hoy + 6 días).
     */
    @Transactional(readOnly = true)
    public ApiResponse findAgenda(LocalDate inicio, LocalDate fin) {
        if (inicio == null) inicio = LocalDate.now();
        if (fin == null) fin = inicio.plusDays(6);
        List<SupervisionResponseDTO> list = repo.findAgenda(inicio, fin)
                .stream().map(this::toDto).toList();
        return new ApiResponse(true, "OK", list);
    }

    @Transactional(readOnly = true)
    public ApiResponse findByImputado(Long imputadoId) {
        List<SupervisionResponseDTO> list = repo.findByImputadoIdOrderByFechaProgramadaDesc(imputadoId)
                .stream().map(this::toDto).toList();
        return new ApiResponse(true, "OK", list);
    }

    @Transactional(readOnly = true)
    public ApiResponse buscar(String q) {
        List<SupervisionResponseDTO> list = repo.buscar(q)
                .stream().map(this::toDto).toList();
        return new ApiResponse(true, "OK", list);
    }

    @Transactional(readOnly = true)
    public ApiResponse findById(Long id) {
        return repo.findById(id)
                .map(s -> new ApiResponse(true, "OK", toDto(s)))
                .orElse(new ApiResponse(false, "Supervisión no encontrada"));
    }

    /**
     * Crea una supervisión nueva. Rechaza si el imputado está fallecido o si la
     * fecha programada es anterior a hoy. El usuario autenticado queda registrado
     * como responsable del registro.
     */
    @Transactional
    public ApiResponse save(SupervisionDTO dto) {
        var imputado = imputadoRepo.findById(dto.getImputadoId()).orElse(null);
        if (imputado == null) return new ApiResponse(false, "Imputado no encontrado");
        if (imputado.isFallecido()) return new ApiResponse(false, "No se pueden registrar supervisiones para un imputado fallecido");

        if (dto.getFechaProgramada() != null && dto.getFechaProgramada().isBefore(LocalDate.now()))
            return new ApiResponse(false, "La fecha programada debe ser hoy o en el futuro");

        Supervision s = new Supervision();
        s.setImputado(imputado);
        try {
            mapFromDto(dto, s);
        } catch (IllegalArgumentException ex) {
            return new ApiResponse(false, ex.getMessage());
        }

        // Usuario autenticado
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        userRepo.findByEmail(email).ifPresent(s::setRegistradoPor);

        repo.save(s);
        String nombreS = imputado.getNombre() + " " + imputado.getApPaterno();
        bitacoraService.registrar(Bitacora.Entidad.SUPERVISION, s.getId(), nombreS,
                Bitacora.Accion.CREAR,
                "Supervisión tipo " + dto.getTipo() + " programada para " + dto.getFechaProgramada());
        return new ApiResponse(true, "Supervisión registrada", toDto(s));
    }

    /**
     * Actualiza una supervisión existente. Si el estado cambió, registra la acción
     * en bitácora como CAMBIO_ESTADO; si no, como EDITAR.
     */
    @Transactional
    public ApiResponse update(Long id, SupervisionDTO dto) {
        Supervision s = repo.findById(id).orElse(null);
        if (s == null) return new ApiResponse(false, "Supervisión no encontrada");

        if (dto.getImputadoId() != null && !dto.getImputadoId().equals(s.getImputado().getId())) {
            var imp = imputadoRepo.findById(dto.getImputadoId()).orElse(null);
            if (imp == null) return new ApiResponse(false, "Imputado no encontrado");
            s.setImputado(imp);
        }
        String estadoAnt = s.getEstado() != null ? s.getEstado().name() : "—";
        try {
            mapFromDto(dto, s);
        } catch (IllegalArgumentException ex) {
            return new ApiResponse(false, ex.getMessage());
        }
        repo.save(s);
        String nombreSUpd = s.getImputado().getNombre() + " " + s.getImputado().getApPaterno();
        boolean cambioEstado = dto.getEstado() != null && !dto.getEstado().equals(estadoAnt);
        bitacoraService.registrar(Bitacora.Entidad.SUPERVISION, s.getId(), nombreSUpd,
                cambioEstado ? Bitacora.Accion.CAMBIO_ESTADO : Bitacora.Accion.EDITAR,
                cambioEstado
                        ? "Estado cambiado de " + estadoAnt + " → " + dto.getEstado()
                        : "Supervisión actualizada");
        return new ApiResponse(true, "Supervisión actualizada", toDto(s));
    }

    @Transactional
    public ApiResponse delete(Long id) {
        if (!repo.existsById(id)) return new ApiResponse(false, "Supervisión no encontrada");
        repo.deleteById(id);
        return new ApiResponse(true, "Supervisión eliminada");
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    /** Obtiene domicilio y coordenadas del imputado desde su última entrevista */
    private String[] getDomicilioYCoordenadas(Long imputadoId) {
        return entrevistaRepo.findTopByImputadoIdOrderByCreatedAtDesc(imputadoId)
                .map(e -> {
                    if (e.getDomicilios() == null || e.getDomicilios().isEmpty()) return null;
                    DomicilioEntrevista d = e.getDomicilios().get(0);

                    // Construir dirección legible
                    StringBuilder sb = new StringBuilder();
                    String calle = d.getCalle() != null ? d.getCalle() : d.getCalleNumero();
                    if (calle != null) sb.append(calle);
                    if (d.getNumero() != null) sb.append(" ").append(d.getNumero());
                    if (d.getColonia() != null)   sb.append(", Col. ").append(d.getColonia());
                    if (d.getMunicipio() != null)  sb.append(", ").append(d.getMunicipio());
                    if (d.getEstado() != null)     sb.append(", ").append(d.getEstado());
                    String direccion = sb.length() > 0 ? sb.toString() : null;

                    // Coordenadas exactas si existen
                    String coords = d.getCoordenadas();

                    return new String[]{ direccion, coords };
                }).orElse(null);
    }

    /** Convierte a DTO incluyendo domicilio, coordenadas y teléfono del imputado */
    private SupervisionResponseDTO toDto(Supervision s) {
        SupervisionResponseDTO dto = SupervisionResponseDTO.from(s);
        Long imputadoId = s.getImputado().getId();

        entrevistaRepo.findTopByImputadoIdOrderByCreatedAtDesc(imputadoId).ifPresent(e -> {
            // Teléfono del imputado (celular preferido)
            String tel = e.getCelular() != null ? e.getCelular() : e.getTelefonoCasa();
            dto.setTelefonoImputado(tel);

            // Domicilio y coordenadas solo para visita domiciliaria
            if (s.getTipo() == Supervision.TipoSupervision.VISITA_DOMICILIARIA) {
                if (e.getDomicilios() != null && !e.getDomicilios().isEmpty()) {
                    var d = e.getDomicilios().get(0);
                    StringBuilder sb = new StringBuilder();
                    String calle = d.getCalle() != null ? d.getCalle() : d.getCalleNumero();
                    if (calle != null) sb.append(calle);
                    if (d.getNumero() != null) sb.append(" ").append(d.getNumero());
                    if (d.getColonia() != null)  sb.append(", Col. ").append(d.getColonia());
                    if (d.getMunicipio() != null) sb.append(", ").append(d.getMunicipio());
                    if (d.getEstado() != null)    sb.append(", ").append(d.getEstado());
                    if (sb.length() > 0) dto.setDomicilioImputado(sb.toString());
                    dto.setCoordenadasImputado(d.getCoordenadas());
                }
            }
        });
        return dto;
    }

    /**
     * Aplica los campos del DTO sobre la entidad. Lanza {@link IllegalArgumentException}
     * si el tipo o el estado no corresponden a un valor de enum válido.
     */
    private void mapFromDto(SupervisionDTO dto, Supervision s) {
        try {
            s.setTipo(Supervision.TipoSupervision.valueOf(dto.getTipo()));
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Tipo de supervisión inválido: " + dto.getTipo());
        }
        s.setFechaProgramada(dto.getFechaProgramada());
        s.setFechaRealizada(dto.getFechaRealizada());
        s.setObservaciones(dto.getObservaciones());

        if (dto.getEstado() != null) {
            try {
                s.setEstado(Supervision.EstadoSupervision.valueOf(dto.getEstado()));
            } catch (IllegalArgumentException ex) {
                throw new IllegalArgumentException("Estado de supervisión inválido: " + dto.getEstado());
            }
        }

        if (dto.getMedidaCautelarId() != null) {
            medidaRepo.findById(dto.getMedidaCautelarId()).ifPresent(s::setMedidaCautelar);
        } else {
            s.setMedidaCautelar(null);
        }

        s.setDestinatariosJson(dto.getDestinatariosJson());
    }
}
